import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as joint from 'jointjs';
import { HistoryManager } from '../diagram/history';
import { JSONConverter } from '../diagram/converter';
import { DiagramLayout } from '../diagram/layout';
import { createNodeAt } from '../diagram/shapes';
import { exportToPNG, exportToSVG, exportToPDF, exportToJSON, getDiagramJpegForPdf } from '../export/file-export';
import { extractFragment, instantiateFragment, readClipboard, writeClipboard } from '../diagram/clipboard';
import { alignBoxes, distributeBoxes } from '../diagram/arrange';
import { generateUUID } from '../utils/uuid';
import { COLORS } from '../utils/constants';
import { addFocusHighlight, clearFocusHighlight, setPresentationDim } from '../diagram/highlight';
import { attachWheelZoom, createAutoFit, pasteOffset, scrollToLocalRect, trackPointer, visibleCenterLocal, zoomAroundPoint } from '../diagram/viewport';
import { attachPortHover, createPaper } from '../diagram/paper';
import { createSelectionController } from '../diagram/selection';
import { attachPanAndRubberBand } from '../diagram/pan-select';
import { decisionLabelSuggestions, getLinkLabelText, setLaneLabelAndColor, setLinkLabelText, setNodeText } from '../diagram/text-editing';
import { useDiagramSearch } from '../hooks/useDiagramSearch';
import DiagramSearch from './DiagramSearch';
import EditTextModal from './EditTextModal';
import EditLaneModal from './EditLaneModal';

// Versatz beim Einfügen und Duplizieren, damit Kopien nicht verdeckt sind
const PASTE_OFFSET = 30;
// Dauer der roten Markierung beim Springen zu einem Element
const FOCUS_HIGHLIGHT_MS = 1800;

const DiagramCanvas = forwardRef(({ onGraphChange, onDiagramLoaded, onHistoryChange, onSelectionChange, zoomLevel, onZoomSet }, ref) => {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const historyRef = useRef(null);
  const converterRef = useRef(null);
  const layoutRef = useRef(null);
  const initializedRef = useRef(false);
  // Teile der Arbeitsfläche aus diagram/* (werden im Init-Effekt angelegt)
  const selectionRef = useRef(null);
  const autoFitRef = useRef(null);
  const pointerRef = useRef(null);
  // Letzte Einfügestelle und wie oft dort eingefügt wurde (für versetzte Mehrfachkopien)
  const lastPasteRef = useRef({ key: null, count: 0 });
  // Punkt, um den der nächste Zoom erfolgt (Mausrad); null = Bildmitte
  const zoomAnchorRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  // Aktuelle Props für die Ereignisbehandlung, die nur einmal angemeldet wird
  const zoomRef = useRef(zoomLevel);
  const onZoomSetRef = useRef(onZoomSet);
  const onGraphChangeRef = useRef(onGraphChange);
  const onHistoryChangeRef = useRef(onHistoryChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onZoomSetRef.current = onZoomSet;
    zoomRef.current = zoomLevel;
    onGraphChangeRef.current = onGraphChange;
    onHistoryChangeRef.current = onHistoryChange;
    onSelectionChangeRef.current = onSelectionChange;
  }, [onZoomSet, zoomLevel, onGraphChange, onHistoryChange, onSelectionChange]);

  const [editModal, setEditModal] = useState({ isOpen: false, title: '', value: '', onSave: null });
  const [laneEditModal, setLaneEditModal] = useState({ isOpen: false, label: '', headerColor: COLORS.vhsBlue, onSave: null });

  const scrollContainer = () => canvasRef.current.parentNode;
  const getSelection = () => selectionRef.current?.get() || [];
  const setSelection = (cells) => selectionRef.current?.set(cells);
  const selectedElements = () => getSelection().filter((cell) => cell.isElement());

  const searchApi = useDiagramSearch({ paperRef, graphRef, converterRef, getContainer: scrollContainer });

  // Doppelklick: Text bzw. Lane bearbeiten (Dialog)
  const openNodeEditor = (node) => {
    if (node.get('type') === 'vhs.Lane') {
      setLaneEditModal({
        isOpen: true,
        label: node.attr('label/text') || '',
        headerColor: node.attr('header/fill') || COLORS.vhsBlue,
        onSave: (value) => {
          setLaneLabelAndColor(node, value);
          onGraphChangeRef.current?.();
          setLaneEditModal((prev) => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }
    setEditModal({
      isOpen: true,
      title: 'Text bearbeiten',
      value: node.attr('label/text') || '',
      onSave: (text) => {
        setNodeText(node, text);
        onGraphChangeRef.current?.();
        setEditModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const openLinkEditor = (link) => {
    setEditModal({
      isOpen: true,
      title: 'Verbindungstext bearbeiten (z.B. Ja/Nein)',
      value: getLinkLabelText(link),
      suggestions: decisionLabelSuggestions(graphRef.current, link),
      onSave: (text) => {
        setLinkLabelText(link, text);
        onGraphChangeRef.current?.();
        setEditModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Die Ereignisbehandlung wird nur einmal angemeldet; sie ruft die jeweils aktuellen Editor-Funktionen auf
  const editorsRef = useRef({ openNodeEditor, openLinkEditor });
  useEffect(() => {
    editorsRef.current = { openNodeEditor, openLinkEditor };
  });

  useEffect(() => {
    if (initializedRef.current) return;
    if (!canvasRef.current) return;
    initializedRef.current = true;

    const container = canvasRef.current.parentNode;
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    const paper = createPaper(canvasRef.current, graph, {
      width: container.clientWidth || 1000,
      height: container.clientHeight || 800
    });
    const history = new HistoryManager(graph);

    graphRef.current = graph;
    paperRef.current = paper;
    historyRef.current = history;
    converterRef.current = new JSONConverter(graph);
    layoutRef.current = new DiagramLayout(graph);
    history.isTracking = true;

    autoFitRef.current = createAutoFit({ paper, graph, container });
    pointerRef.current = trackPointer(container);
    selectionRef.current = createSelectionController({
      graph,
      paper,
      onChange: (count) => onSelectionChangeRef.current?.(count)
    });

    graph.on('all', (eventName) => {
      onHistoryChangeRef.current?.(history.canUndo(), history.canRedo());
      if (eventName === 'add' || eventName === 'remove' || eventName === 'reset' || eventName.includes('change:')) {
        onGraphChangeRef.current?.();
      }
    });

    const detachPan = attachPanAndRubberBand({ paper, graph, container, getSelection, setSelection });
    const detachPortHover = attachPortHover(paper);
    const detachWheelZoom = attachWheelZoom(container, {
      getZoom: () => zoomRef.current,
      setZoom: (zoom, anchor) => {
        zoomAnchorRef.current = anchor;
        onZoomSetRef.current?.(zoom);
      }
    });

    paper.on('element:pointerdblclick', (view) => editorsRef.current.openNodeEditor(view.model));
    paper.on('link:pointerdblclick', (view) => editorsRef.current.openLinkEditor(view.model));

    return () => {
      if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
      detachPan();
      detachPortHover();
      detachWheelZoom();
      autoFitRef.current?.detach();
      pointerRef.current?.detach();
      selectionRef.current?.detach();
    };
  }, []);

  // Zoom um die Mausposition (Mausrad) bzw. die Bildmitte (Tasten, Schaltflächen)
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const anchor = zoomAnchorRef.current;
    zoomAnchorRef.current = null;
    zoomAroundPoint(paper, scrollContainer(), zoomLevel, anchor, () => autoFitRef.current?.fit());
  }, [zoomLevel]);

  const fitPaper = () => autoFitRef.current?.fit();

  const centerContent = () => {
    const paper = paperRef.current;
    if (!paper || !graphRef.current?.getElements().length) return;
    fitPaper();
    scrollToLocalRect(paper, scrollContainer(), paper.getContentArea({ useModelGeometry: true }), 'top');
  };

  const notifyHistory = () => {
    onHistoryChangeRef.current?.(historyRef.current?.canUndo() || false, historyRef.current?.canRedo() || false);
  };

  const loadJsonData = (json, shouldLayout = false) => {
    if (!graphRef.current) return;
    graphRef.current.clear();
    if (json) converterRef.current.fromJson(json);
    if (shouldLayout) layoutRef.current.applyLayout();
    historyRef.current?.clear();
    historyRef.current?.saveState();
    // Beim Laden gemeldete „Rückgängig möglich“-Zustände (entprellte Änderungen) zurücksetzen
    notifyHistory();
    searchApi.close();
    fitPaper();
    setTimeout(centerContent, 100);
  };

  // Entfernt die rote Markierung sofort (Hervorhebungen wirken nur auf die Darstellung)
  const clearHighlight = () => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    clearFocusHighlight(paperRef.current);
  };

  const focusNode = (nodeId) => {
    const node = graphRef.current?.getCell(nodeId);
    if (!node || !node.isElement()) return;
    scrollToLocalRect(paperRef.current, scrollContainer(), node.getBBox(), 'center');
    clearHighlight();
    addFocusHighlight(paperRef.current, node);
    highlightTimeoutRef.current = window.setTimeout(clearHighlight, FOCUS_HIGHLIGHT_MS);
  };

  const setPresentationFocus = (nodeId = null) => {
    setPresentationDim(paperRef.current, graphRef.current, nodeId);
    if (nodeId) {
      focusNode(nodeId);
    } else {
      clearHighlight();
    }
  };

  // Fügt einen Diagrammausschnitt mit neuen IDs ein und wählt ihn aus
  const insertFragment = (fragment, offset) => {
    const { nodes, edges } = instantiateFragment(fragment, { offset, createId: generateUUID });
    converterRef.current.fromJson({ nodes, edges });
    setSelection(nodes.map((node) => graphRef.current.getCell(node.id)));
    return nodes.length;
  };

  const selectedFragment = () => {
    const ids = selectedElements().map((cell) => cell.id);
    return ids.length ? extractFragment(converterRef.current.toJson(), ids) : null;
  };

  const selectedBoxes = () => selectedElements().map((cell) => ({ id: cell.id, ...cell.position(), ...cell.size() }));

  const applyPositions = (positions) => {
    const entries = Object.entries(positions);
    if (!entries.length) return false;
    graphRef.current.startBatch('arrange');
    entries.forEach(([id, { x, y }]) => graphRef.current.getCell(id)?.position(x, y));
    graphRef.current.stopBatch('arrange');
    return true;
  };

  const stepHistory = (action) => {
    const ok = historyRef.current?.[action]();
    if (!ok) return;
    notifyHistory();
    onGraphChangeRef.current?.();
  };

  useImperativeHandle(ref, () => ({
    loadDiagram: (data) => {
      loadJsonData(data?.diagram || null, false);
      if (onDiagramLoaded) onDiagramLoaded(data);
    },
    loadGeneratedData: (json) => loadJsonData(json, true),
    loadJson: (json, options = {}) => loadJsonData(json, options.shouldLayout || false),

    getCurrentData: () => converterRef.current?.toJson(),
    clear: () => {
      graphRef.current?.clear();
      historyRef.current?.saveState();
      notifyHistory();
    },
    resetHistory: () => {
      historyRef.current?.clear();
      notifyHistory();
    },

    undo: () => stepHistory('undo'),
    redo: () => stepHistory('redo'),
    canUndo: () => historyRef.current?.canUndo() || false,
    canRedo: () => historyRef.current?.canRedo() || false,

    deleteSelected: () => {
      const selection = getSelection();
      if (!selection.length) return 0;
      graphRef.current.startBatch('delete');
      graphRef.current.removeCells(selection);
      graphRef.current.stopBatch('delete');
      setSelection([]);
      return selection.length;
    },

    // --- Auswahl und Bearbeitung mehrerer Elemente ---

    selectAll: () => setSelection(graphRef.current?.getElements() || []),
    clearSelection: () => setSelection([]),
    getSelectionCount: () => getSelection().length,

    // Kopiert die ausgewählten Elemente inkl. Verbindungen untereinander in die Ablage
    copySelection: () => {
      const fragment = selectedFragment();
      if (!fragment) return 0;
      writeClipboard(fragment);
      lastPasteRef.current = { key: null, count: 0 };
      return fragment.nodes.length;
    },

    // Fügt mittig an der Mausposition ein (Maus außerhalb: Bildmitte).
    // Mehrfaches Einfügen an derselben Stelle versetzt die Kopien.
    paste: () => {
      const fragment = readClipboard();
      if (!fragment?.nodes?.length) return 0;
      const paper = paperRef.current;
      const pointer = pointerRef.current?.get();
      const target = pointer
        ? paper.clientToLocalPoint(pointer.x, pointer.y)
        : visibleCenterLocal(paper, scrollContainer());
      const key = Math.round(target.x) + ':' + Math.round(target.y);
      const repeat = lastPasteRef.current.key === key ? lastPasteRef.current.count : 0;
      lastPasteRef.current = { key, count: repeat + 1 };
      return insertFragment(fragment, pasteOffset(fragment, target, repeat, PASTE_OFFSET));
    },

    duplicateSelection: () => {
      const fragment = selectedFragment();
      return fragment ? insertFragment(fragment, { x: PASTE_OFFSET, y: PASTE_OFFSET }) : 0;
    },

    // Verschiebt die Auswahl (Pfeiltasten)
    moveSelection: (dx, dy) => {
      const elements = selectedElements();
      if (!elements.length) return false;
      graphRef.current.startBatch('move');
      elements.forEach((cell) => cell.translate(dx, dy));
      graphRef.current.stopBatch('move');
      return true;
    },

    alignSelection: (mode) => applyPositions(alignBoxes(selectedBoxes(), mode)),
    distributeSelection: (axis) => applyPositions(distributeBoxes(selectedBoxes(), axis)),

    // Räumt das Diagramm automatisch auf (rückgängig machbar); liefert die verwendete Richtung
    autoLayout: (direction = 'TB') => {
      if (!layoutRef.current || !graphRef.current.getElements().length) return null;
      const result = layoutRef.current.applyLayout(direction);
      // Auswahlrahmen an die neuen Positionen anpassen
      setSelection(getSelection());
      // An den Anfang des Diagramms scrollen, damit Start und Lane-Titel sichtbar sind
      setTimeout(() => {
        fitPaper();
        scrollToLocalRect(paperRef.current, scrollContainer(), paperRef.current.getContentArea({ useModelGeometry: true }), 'topLeft');
      }, 50);
      return result.direction;
    },

    // Tastatur-/Klick-Alternative zu Drag & Drop: Element in der Mitte des sichtbaren Bereichs einfügen
    addNodeAtCenter: (type) => {
      const paper = paperRef.current;
      if (!paper || !graphRef.current) return;
      const { x, y } = visibleCenterLocal(paper, scrollContainer());
      // Leicht versetzt, damit mehrere Klicks nicht exakt übereinander landen
      const offset = (graphRef.current.getElements().length % 5) * 20;
      graphRef.current.addCell(createNodeAt(type, x + offset, y + offset));
    },

    center: () => centerContent(),

    // Strg+F: Suche öffnen bzw. wieder ins Suchfeld springen
    openSearch: searchApi.open,
    closeSearch: searchApi.close,

    // Zum Element springen, kurz markieren und auswählen (z. B. aus dem Struktur-Check)
    revealNode: (nodeId) => {
      focusNode(nodeId);
      const cell = graphRef.current?.getCell(nodeId);
      if (cell) setSelection([cell]);
    },
    getZoom: () => zoomLevel,
    focusNode,
    setPresentationFocus,

    exportAsPNG: (filename, title) => exportToPNG(paperRef.current, filename, title),
    exportAsSVG: (filename, title) => exportToSVG(paperRef.current, filename, title),
    exportAsPDF: (filename, title) => exportToPDF(paperRef.current, filename, title),
    exportAsJSON: (filename) => exportToJSON(converterRef.current.toJson(), filename),
    captureDiagramImage: () => getDiagramJpegForPdf(paperRef.current)
  }));

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    try {
      const nodeData = JSON.parse(dataStr);
      const { x, y } = paperRef.current.clientToLocalPoint(e.clientX, e.clientY);
      graphRef.current?.addCell(createNodeAt(nodeData.type, x, y));
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const { search } = searchApi;

  return (
    <div className="flex-grow h-full relative min-w-0">
      <div className="absolute inset-0 overflow-auto bg-[var(--color-vhs-blau-10)] rounded-tl-lg border-l border-t border-[var(--color-vhs-blau-20)]" style={{ scrollBehavior: 'auto' }}>
        <div
          ref={canvasRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="cursor-grab active:cursor-grabbing focus:outline-none"
          id="vhs-jointjs-paper"
          tabIndex={-1}
          role="region"
          aria-label="Diagramm-Arbeitsfläche"
        />
      </div>
      {search.isOpen && (
        <DiagramSearch
          query={search.query}
          matchCount={search.matches.length}
          currentIndex={search.index}
          focusToken={search.focusToken}
          onQueryChange={searchApi.updateQuery}
          onNext={() => searchApi.step(1)}
          onPrevious={() => searchApi.step(-1)}
          onClose={searchApi.close}
        />
      )}
      {editModal.isOpen && (
        <EditTextModal
          title={editModal.title}
          initialValue={editModal.value}
          suggestions={editModal.suggestions}
          onSave={editModal.onSave || (() => {})}
          onCancel={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
      {laneEditModal.isOpen && (
        <EditLaneModal
          initialLabel={laneEditModal.label}
          initialHeaderColor={laneEditModal.headerColor}
          onSave={laneEditModal.onSave || (() => {})}
          onCancel={() => setLaneEditModal((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
});

export default DiagramCanvas;
