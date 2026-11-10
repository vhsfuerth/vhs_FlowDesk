import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as joint from 'jointjs';
import { PanelRightOpen } from 'lucide-react';
import { HistoryManager } from '../diagram/history';
import { JSONConverter, getNodeDetails } from '../diagram/converter';
import { DiagramLayout } from '../diagram/layout';
import { createNodeAt } from '../diagram/shapes';
import { exportToPNG, exportToSVG, exportToPDF, exportToJSON, getDiagramJpegForPdf } from '../export/file-export';
import { readClipboard, writeClipboard } from '../diagram/clipboard';
import { alignBoxes, distributeBoxes } from '../diagram/arrange';
import { layoutSelection } from '../diagram/partial-layout';
import { generateUUID } from '../utils/uuid';
import { attachWheelZoom, createAutoFit, pasteOffset, trackPointer, visibleCenterLocal } from '../diagram/viewport';
import { attachPortHover, createPaper } from '../diagram/paper';
import { createSelectionController } from '../diagram/selection';
import { attachPanAndRubberBand } from '../diagram/pan-select';
import { attachVertexDrag } from '../diagram/vertex-drag';
import { attachLaneEmbedding, isLane, moveLane } from '../diagram/lane-embedding';
import { attachSnaplines } from '../diagram/snapline-drag';
import { attachOverviewTracking, createOverviewStore } from '../diagram/overview-tracking';
import { attachChangeNotifier } from '../diagram/change-notifier';
import { attachCanvasEvents } from '../diagram/canvas-events';
import {
  addNextStep as addNextStepTo, applyPartialLayout, applyPositions, bridgeInfo, deleteCells,
  fragmentOf, insertFragment, moveElements, reassignLanes
} from '../diagram/canvas-editing';
import { readFlag, writeFlag } from '../utils/stored-flag';
import { useDiagramSearch } from '../hooks/useDiagramSearch';
import { useInlineEdit } from '../hooks/useInlineEdit';
import { useCanvasViewport } from '../hooks/useCanvasViewport';
import MinimapOverlay from './MinimapOverlay';
import DiagramSearch from './DiagramSearch';
import PropertiesPanel from './PropertiesPanel';
import AddNextMenu from './AddNextMenu';
import InlineTextEditor from './InlineTextEditor';

// Die Arbeitsfläche verdrahtet nur: Interaktionen liegen in src/diagram/ (je Modul mit detach),
// Bearbeitungsbefehle in diagram/canvas-editing.js, Ansicht und Textbearbeitung in Hooks.

// Versatz beim Einfügen und Duplizieren, damit Kopien nicht verdeckt sind
const PASTE_OFFSET = 30;
// Eigenschaften-Leiste ausgeblendet (pro Browser gemerkt)
const PANEL_HIDDEN_KEY = 'vhs-properties-panel-hidden';

const DiagramCanvas = forwardRef(({
  onGraphChange, onDiagramLoaded, onHistoryChange, onSelectionChange, zoomLevel, onZoomSet,
  currentDiagramId, onOpenSubprocess, onNotify, onDeleteRequest
}, ref) => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
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
  const overviewRef = useRef(null);
  // Letzte Einfügestelle und wie oft dort eingefügt wurde (für versetzte Mehrfachkopien)
  const lastPasteRef = useRef({ key: null, count: 0 });
  // Punkt, um den der nächste Zoom erfolgt (Mausrad); null = Bildmitte
  const zoomAnchorRef = useRef(null);

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

  // Eigenschaften-Leiste: genau eine ausgewählte Zelle
  const [selectedCell, setSelectedCell] = useState(null);
  const [panelHidden, setPanelHidden] = useState(() => readFlag(PANEL_HIDDEN_KEY));
  // Menü am „+“-Griff: { x, y, sourceId, direction } in Koordinaten des Wrappers
  const [addMenu, setAddMenu] = useState(null);
  // Übersichtskarte: eigener Speicher, damit Scrollen nicht die ganze Arbeitsfläche neu zeichnet
  const [overviewStore] = useState(createOverviewStore);

  const scrollContainer = () => canvasRef.current.parentNode;
  const getSelection = () => selectionRef.current?.get() || [];
  const setSelection = (cells) => selectionRef.current?.set(cells);
  const selectedElements = () => getSelection().filter((cell) => cell.isElement());

  const searchApi = useDiagramSearch({ paperRef, graphRef, converterRef, getContainer: scrollContainer });
  const { inlineEdit, startInlineEdit, commitInlineEdit, cancelInlineEdit } = useInlineEdit({
    paperRef, graphRef, wrapperRef, canvasRef, zoomRef, setSelection
  });
  const view = useCanvasViewport({
    paperRef, graphRef, autoFitRef, getContainer: scrollContainer, zoomLevel, zoomRef, zoomAnchorRef, onZoomSetRef
  });

  const showPanel = useCallback((hidden) => {
    setPanelHidden(hidden);
    writeFlag(PANEL_HIDDEN_KEY, hidden);
  }, []);

  const addNextStep = (source, direction, type) => {
    const node = addNextStepTo(graphRef.current, source, direction, type);
    if (node) setSelection([node]);
    return node;
  };

  // Funktionen für die Ereignisse der Fläche (canvas-events.js); immer die aktuelle Fassung
  const handlersRef = useRef(null);
  const panelHiddenRef = useRef(panelHidden);
  useEffect(() => {
    panelHiddenRef.current = panelHidden;
    handlersRef.current = {
      editCell: (cell) => startInlineEdit(cell),
      addNextStep,
      // Entfernen über das X am Element: wie die Entf-Taste (mit Angebot, den Ablauf zu erhalten)
      requestDelete: (cell) => {
        setSelection([cell]);
        if (onDeleteRequest) onDeleteRequest();
        else cell.remove();
      },
      // Rechtsklick: Eigenschaften der Zelle ein- bzw. ausblenden. Ist die Zelle noch nicht
      // (allein) ausgewählt, wird sie ausgewählt und die Leiste eingeblendet.
      togglePropertiesFor: (cell) => {
        const selection = getSelection();
        if (selection.length === 1 && selection[0] === cell) {
          showPanel(!panelHiddenRef.current);
        } else {
          setSelection([cell]);
          showPanel(false);
        }
      },
      openAddNextMenu: (cell, direction, { clientX, clientY }) => {
        const bounds = wrapperRef.current.getBoundingClientRect();
        setAddMenu({ x: clientX - bounds.left + 8, y: clientY - bounds.top + 8, sourceId: cell.id, direction });
      },
      openSubprocess: (element) => {
        const id = getNodeDetails(element).subprocessId;
        if (id) {
          onOpenSubprocess?.(id, 'ask');
        } else {
          setSelection([element]);
          showPanel(false);
          onNotify?.('Dieser Teilprozess ist noch mit keinem Diagramm verknüpft. Bitte in den Eigenschaften auswählen.', 'info');
        }
      }
    };
  });

  // Einmalig: Graph, Paper und Verlauf anlegen und die Module der Fläche anmelden
  useEffect(() => {
    if (initializedRef.current || !canvasRef.current) return undefined;
    initializedRef.current = true;

    const container = canvasRef.current.parentNode;
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    const paper = createPaper(canvasRef.current, graph, {
      width: container.clientWidth || 1000,
      height: container.clientHeight || 800
    });
    const history = new HistoryManager(graph);
    const reportHistory = () => onHistoryChangeRef.current?.(history.canUndo(), history.canRedo());

    graphRef.current = graph;
    paperRef.current = paper;
    historyRef.current = history;
    // Nach dem entprellten Sichern ändert sich z. B. „Wiederholen“, ohne dass der Graph ein Ereignis sendet
    history.onStateChange = reportHistory;
    converterRef.current = new JSONConverter(graph);
    layoutRef.current = new DiagramLayout(graph);
    history.isTracking = true;

    autoFitRef.current = createAutoFit({ paper, graph, container });
    pointerRef.current = trackPointer(container);
    selectionRef.current = createSelectionController({
      graph,
      paper,
      onChange: (count) => {
        onSelectionChangeRef.current?.(count);
        setSelectedCell(count === 1 ? selectionRef.current.get()[0] : null);
        setAddMenu(null);
      }
    });
    overviewRef.current = attachOverviewTracking({ paper, graph, container, onChange: overviewStore.set });

    const detachers = [
      // Beim Ziehen meldet der Notifier erst beim Loslassen (siehe change-notifier.js)
      attachChangeNotifier({ graph, paper, onGraphChange: () => onGraphChangeRef.current?.(), onHistoryChange: reportHistory }),
      attachPanAndRubberBand({ paper, graph, container, getSelection, setSelection }),
      attachPortHover(paper),
      attachLaneEmbedding({ graph, paper, getSelection }),
      attachVertexDrag({ paper }),
      attachSnaplines({ paper, graph, getSelection }),
      attachWheelZoom(container, {
        getZoom: () => zoomRef.current,
        setZoom: (zoom, anchor) => {
          zoomAnchorRef.current = anchor;
          onZoomSetRef.current?.(zoom);
        }
      }),
      attachCanvasEvents({ paper, container, focusTarget: () => canvasRef.current, getHandlers: () => handlersRef.current })
    ];

    return () => {
      detachers.forEach((detach) => detach());
      overviewRef.current?.detach();
      autoFitRef.current?.detach();
      pointerRef.current?.detach();
      selectionRef.current?.detach();
      history.destroy();
    };
    // overviewStore bleibt über die ganze Lebensdauer gleich (useState ohne Setter)
  }, [overviewStore]);

  const notifyHistory = () => {
    onHistoryChangeRef.current?.(historyRef.current?.canUndo() || false, historyRef.current?.canRedo() || false);
  };

  const loadJsonData = (json, shouldLayout = false) => {
    if (!graphRef.current) return;
    // Während des Einlesens nicht zeichnen; danach einmal alles auf einmal
    const paper = paperRef.current;
    paper?.freeze();
    try {
      graphRef.current.clear();
      if (json) converterRef.current.fromJson(json);
      if (shouldLayout) layoutRef.current.applyLayout();
    } finally {
      paper?.unfreeze();
    }
    historyRef.current?.clear();
    historyRef.current?.saveState();
    // Beim Laden gemeldete „Rückgängig möglich“-Zustände (entprellte Änderungen) zurücksetzen
    notifyHistory();
    searchApi.close();
    view.fitPaper();
    setTimeout(view.centerContent, 100);
  };

  const stepHistory = (action) => {
    if (!historyRef.current?.[action]()) return;
    notifyHistory();
    onGraphChangeRef.current?.();
  };

  const insertAndSelect = (fragment, offset) => {
    const cells = insertFragment(graphRef.current, converterRef.current, fragment, offset, generateUUID);
    setSelection(cells);
    return cells.length;
  };

  const selectedBoxes = () => selectedElements().map((cell) => ({ id: cell.id, ...cell.position(), ...cell.size() }));

  useImperativeHandle(ref, () => ({
    // --- Laden, Inhalt, Verlauf ---
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

    // --- Bearbeiten ---
    // Löscht die Auswahl. `bridge`: bei einem einzelnen Schritt Vorgänger und Nachfolger verbinden
    deleteSelected: ({ bridge = false } = {}) => {
      const count = deleteCells(graphRef.current, converterRef.current, getSelection(), { bridge });
      if (count) setSelection([]);
      return count;
    },
    getBridgeInfo: () => bridgeInfo(converterRef.current, getSelection()),
    // F2/Enter bzw. Lostippen: Text der einzeln ausgewählten Zelle bearbeiten
    editSelection: (initialText = null) => {
      const selection = getSelection();
      return selection.length === 1 ? startInlineEdit(selection[0], initialText) : false;
    },
    isEditingText: () => Boolean(inlineEdit),
    selectAll: () => setSelection(graphRef.current?.getElements() || []),
    clearSelection: () => setSelection([]),
    getSelectionCount: () => getSelection().length,
    // Kopiert die ausgewählten Elemente inkl. Verbindungen untereinander in die Ablage
    copySelection: () => {
      const fragment = fragmentOf(converterRef.current, selectedElements());
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
      const target = pointer ? paper.clientToLocalPoint(pointer.x, pointer.y) : visibleCenterLocal(paper, scrollContainer());
      const key = Math.round(target.x) + ':' + Math.round(target.y);
      const repeat = lastPasteRef.current.key === key ? lastPasteRef.current.count : 0;
      lastPasteRef.current = { key, count: repeat + 1 };
      return insertAndSelect(fragment, pasteOffset(fragment, target, repeat, PASTE_OFFSET));
    },
    duplicateSelection: () => {
      const fragment = fragmentOf(converterRef.current, selectedElements());
      return fragment ? insertAndSelect(fragment, { x: PASTE_OFFSET, y: PASTE_OFFSET }) : 0;
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
    // Lane mit der Nachbarin oben/unten tauschen (Eigenschaften-Leiste)
    moveLane: (lane, direction) => moveLane(graphRef.current, lane, direction),

    // --- Anordnen ---
    moveSelection: (dx, dy) => moveElements(graphRef.current, selectedElements(), dx, dy),
    alignSelection: (mode) => applyPositions(graphRef.current, alignBoxes(selectedBoxes(), mode)),
    distributeSelection: (axis) => applyPositions(graphRef.current, distributeBoxes(selectedBoxes(), axis)),
    // Räumt das Diagramm automatisch auf (rückgängig machbar); liefert die verwendete Richtung
    autoLayout: (direction = 'TB') => {
      if (!layoutRef.current || !graphRef.current.getElements().length) return null;
      const result = layoutRef.current.applyLayout(direction);
      // Zuordnung zu den (neu angeordneten) Lanes nach Lage
      reassignLanes(graphRef.current, graphRef.current.getElements().filter((cell) => !isLane(cell)));
      setSelection(getSelection());
      setTimeout(view.showStart, 50);
      return result.direction;
    },
    // Nur die Auswahl anordnen; liefert { count, direction }
    autoLayoutSelection: (direction = 'TB') => {
      const ids = getSelection().filter((cell) => cell.isElement()).map((cell) => cell.id);
      const result = layoutSelection(converterRef.current.toJson(), ids, { direction });
      const count = applyPartialLayout(graphRef.current, result);
      if (count) {
        setSelection(getSelection());
        setTimeout(view.fitPaper, 50);
      }
      return { count, direction: result.direction };
    },

    // --- Ansicht und Suche ---
    center: view.centerContent,
    fitToView: view.fitToView,
    getZoom: () => zoomLevel,
    focusNode: view.focusNode,
    setPresentationFocus: view.setPresentationFocus,
    // Zum Element springen, kurz markieren und auswählen (z. B. aus dem Struktur-Check)
    revealNode: (nodeId) => {
      view.focusNode(nodeId);
      const cell = graphRef.current?.getCell(nodeId);
      if (cell) setSelection([cell]);
    },
    // Strg+F: Suche öffnen bzw. wieder ins Suchfeld springen
    openSearch: searchApi.open,
    closeSearch: searchApi.close,

    // --- Export ---
    exportAsPNG: (filename, title) => exportToPNG(paperRef.current, filename, title),
    exportAsSVG: (filename, title) => exportToSVG(paperRef.current, filename, title),
    exportAsPDF: (filename, title) => exportToPDF(paperRef.current, filename, title),
    exportAsJSON: (filename) => exportToJSON(converterRef.current.toJson(), filename),
    captureDiagramImage: () => getDiagramJpegForPdf(paperRef.current)
  }));

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
  // Gelöschte Zellen haben keinen Graphen mehr
  const panelCell = selectedCell?.graph ? selectedCell : null;
  const panelTop = search.isOpen ? 'top-16' : 'top-3';

  return (
    <div ref={wrapperRef} className="flex-grow h-full relative min-w-0">
      <div id="vhs-canvas-scroll" className="absolute inset-0 overflow-auto bg-[var(--color-vhs-blau-10)] rounded-tl-lg border-l border-t border-[var(--color-vhs-blau-20)]" style={{ scrollBehavior: 'auto' }}>
        <div
          ref={canvasRef}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
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
      {panelCell && !panelHidden && (
        <PropertiesPanel
          cell={panelCell}
          currentDiagramId={currentDiagramId}
          className={`${panelTop} max-h-[calc(100%-5rem)]`}
          onClose={() => showPanel(true)}
          onOpenSubprocess={onOpenSubprocess}
          onAddNext={(cell, direction, type) => addNextStep(cell, direction, type)}
          onMoveLane={(lane, direction) => {
            if (!moveLane(graphRef.current, lane, direction)) {
              onNotify?.(direction === 'up' ? 'Darüber liegt keine Swimlane.' : 'Darunter liegt keine Swimlane.', 'info');
            }
          }}
        />
      )}
      {panelCell && panelHidden && (
        <button
          type="button"
          onClick={() => showPanel(false)}
          className={`absolute right-3 ${panelTop} z-10 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-vhs-blau)] px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-[var(--color-vhs-blau-80)] focus:outline-none focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)]`}
        >
          <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
          Eigenschaften
        </button>
      )}
      <MinimapOverlay store={overviewStore} onNavigate={view.navigateTo} />
      {inlineEdit && (
        <InlineTextEditor
          key={inlineEdit.cellId}
          rect={inlineEdit.rect}
          initialValue={inlineEdit.initialValue}
          selectAll={inlineEdit.selectAll}
          fontSize={inlineEdit.fontSize}
          label={inlineEdit.label}
          onCommit={commitInlineEdit}
          onCancel={cancelInlineEdit}
        />
      )}
      {addMenu && (
        <AddNextMenu
          x={addMenu.x}
          y={addMenu.y}
          onClose={() => setAddMenu(null)}
          onSelect={(type) => {
            const source = graphRef.current?.getCell(addMenu.sourceId);
            setAddMenu(null);
            addNextStep(source, addMenu.direction, type);
          }}
        />
      )}
    </div>
  );
});

export default DiagramCanvas;
