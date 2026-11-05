import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as joint from 'jointjs';
import { Map as MapIcon, PanelRightOpen } from 'lucide-react';
import { HistoryManager } from '../diagram/history';
import { JSONConverter, setElementLane } from '../diagram/converter';
import { DiagramLayout } from '../diagram/layout';
import { createLink, createNode, createNodeAt } from '../diagram/shapes';
import { exportToPNG, exportToSVG, exportToPDF, exportToJSON, getDiagramJpegForPdf } from '../export/file-export';
import { extractFragment, instantiateFragment, readClipboard, writeClipboard } from '../diagram/clipboard';
import { alignBoxes, distributeBoxes } from '../diagram/arrange';
import { layoutSelection } from '../diagram/partial-layout';
import { generateUUID } from '../utils/uuid';
import { addFocusHighlight, clearFocusHighlight, setPresentationDim } from '../diagram/highlight';
import { attachWheelZoom, createAutoFit, pasteOffset, scrollToLocalRect, trackPointer, visibleCenterLocal, zoomAroundPoint } from '../diagram/viewport';
import { attachPortHover, createPaper } from '../diagram/paper';
import { createSelectionController, hasSelectedAncestor } from '../diagram/selection';
import { attachPanAndRubberBand } from '../diagram/pan-select';
import { attachVertexDrag } from '../diagram/vertex-drag';
import { assignLane, attachLaneEmbedding, growLaneToFit, isLane, moveLane } from '../diagram/lane-embedding';
import { nextDecisionLabel, nextEdgePorts, placeNextNode } from '../diagram/add-next';
import { getLinkLabelText, setLinkLabelText, setNodeText } from '../diagram/text-editing';
import { attachSnaplines } from '../diagram/snapline-drag';
import { attachOverviewTracking } from '../diagram/overview-tracking';
import { fitZoom, isFullyVisible } from '../diagram/overview';
import Minimap from './Minimap';
import { bridgeEdges } from '../diagram/bridge';
import { getNodeDetails } from '../diagram/converter';
import { useDiagramSearch } from '../hooks/useDiagramSearch';
import DiagramSearch from './DiagramSearch';
import PropertiesPanel from './PropertiesPanel';
import AddNextMenu from './AddNextMenu';
import InlineTextEditor from './InlineTextEditor';

// Versatz beim Einfügen und Duplizieren, damit Kopien nicht verdeckt sind
const PASTE_OFFSET = 30;
// Dauer der roten Markierung beim Springen zu einem Element
const FOCUS_HIGHLIGHT_MS = 1800;
// Eigenschaften-Leiste ausgeblendet (pro Browser gemerkt)
const PANEL_HIDDEN_KEY = 'vhs-properties-panel-hidden';
// Übersichtskarte ausgeblendet (pro Browser gemerkt)
const MINIMAP_HIDDEN_KEY = 'vhs-minimap-hidden';

const readFlag = (key) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (key, value) => {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Ohne Speicher gilt die Einstellung nur bis zum Neuladen
  }
};

const readPanelHidden = () => {
  try {
    return localStorage.getItem(PANEL_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
};

// Offenes Textfeld auf der Fläche übernehmen (es übernimmt beim Verlassen des Fokus)
const commitOpenInlineEditor = () => {
  const active = document.activeElement;
  if (active?.dataset?.inlineEditor) active.blur();
};

const DiagramCanvas = forwardRef(({
  onGraphChange, onDiagramLoaded, onHistoryChange, onSelectionChange, zoomLevel, onZoomSet,
  currentDiagramId, onOpenSubprocess, onNotify, onDeleteRequest
}, ref) => {
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

  // Eigenschaften-Leiste: genau eine ausgewählte Zelle
  const [selectedCell, setSelectedCell] = useState(null);
  const [panelHidden, setPanelHidden] = useState(readPanelHidden);
  // Menü am „+“-Griff: { x, y, sourceId, direction } in Koordinaten des Wrappers
  const [addMenu, setAddMenu] = useState(null);
  // Übersichtskarte: { items, content, view } in Diagrammkoordinaten (siehe overview-tracking.js)
  const [overview, setOverview] = useState(null);
  const [minimapHidden, setMinimapHidden] = useState(() => readFlag(MINIMAP_HIDDEN_KEY));
  const overviewRef = useRef(null);
  // „Alles einpassen“: nach dem Zoomen den Inhalt mittig zeigen
  const fitAfterZoomRef = useRef(false);
  const wrapperRef = useRef(null);

  const scrollContainer = () => canvasRef.current.parentNode;
  const getSelection = () => selectionRef.current?.get() || [];
  const setSelection = (cells) => selectionRef.current?.set(cells);
  const selectedElements = () => getSelection().filter((cell) => cell.isElement());

  const searchApi = useDiagramSearch({ paperRef, graphRef, converterRef, getContainer: scrollContainer });

  const showPanel = useCallback((hidden) => {
    setPanelHidden(hidden);
    try {
      localStorage.setItem(PANEL_HIDDEN_KEY, hidden ? '1' : '0');
    } catch {
      // Ohne Speicher gilt die Einstellung nur bis zum Neuladen
    }
  }, []);

  // --- Text direkt auf der Fläche bearbeiten (Doppelklick, F2/Enter, Lostippen) ---
  // { cellId, initialValue, selectAll, rect, fontSize, label }
  const [inlineEdit, setInlineEdit] = useState(null);
  const typeName = (cell) => String(cell.get('type')).replace('vhs.', '').toLowerCase();

  // Lage des Textfelds (Diagrammkoordinaten): Element, Kopfzeile einer Lane bzw. Beschriftung der Verbindung
  const editRectFor = (cell) => {
    if (cell.isLink()) {
      const view = paperRef.current.findViewByModel(cell);
      const distance = cell.labels()[0]?.position?.distance ?? 0.5;
      const point = view?.getPointAtRatio(distance) || cell.getBBox().center();
      return { x: point.x - 80, y: point.y - 16, width: 160, height: 32 };
    }
    const box = cell.getBBox();
    return typeName(cell) === 'lane' ? { ...box, height: 40 } : box;
  };

  /**
   * Startet die Bearbeitung. `initialText`: ersetzt den Text (Lostippen), sonst wird er markiert.
   * @returns {boolean}
   */
  const startInlineEdit = (cell, initialText = null) => {
    const paper = paperRef.current;
    if (!cell?.graph || !paper || !wrapperRef.current) return false;
    const local = editRectFor(cell);
    const client = paper.localToClientRect(local);
    const bounds = wrapperRef.current.getBoundingClientRect();
    const current = cell.isLink() ? getLinkLabelText(cell) : (cell.attr('label/text') || '');
    setSelection([cell]);
    setInlineEdit({
      cellId: cell.id,
      initialValue: initialText ?? current,
      selectAll: initialText === null,
      rect: { left: client.x - bounds.left, top: client.y - bounds.top, width: client.width, height: client.height },
      fontSize: Math.max(10, Math.round(13 * (zoomRef.current || 1))),
      label: cell.isLink() ? 'Beschriftung der Verbindung' : 'Text des Elements'
    });
    return true;
  };

  // Nach dem Bearbeiten zurück auf die Fläche, damit Tastenkürzel wieder dort wirken
  const refocusCanvas = () => {
    const active = document.activeElement;
    if (!active || active === document.body || active.dataset?.inlineEditor) canvasRef.current?.focus({ preventScroll: true });
  };

  const commitInlineEdit = (text) => {
    const cell = inlineEdit && graphRef.current?.getCell(inlineEdit.cellId);
    setInlineEdit(null);
    refocusCanvas();
    if (!cell) return;
    if (cell.isLink()) {
      if (text !== getLinkLabelText(cell)) setLinkLabelText(cell, text);
    } else if (text !== (cell.attr('label/text') || '')) {
      setNodeText(cell, text);
    }
  };

  // Doppelklick: direkt auf der Fläche bearbeiten
  const editCell = (cell) => startInlineEdit(cell);

  // Rechtsklick: Eigenschaften der Zelle ein- bzw. ausblenden. Ist die Zelle noch nicht
  // (allein) ausgewählt, wird sie ausgewählt und die Leiste eingeblendet.
  const togglePropertiesFor = (cell) => {
    const selection = getSelection();
    if (selection.length === 1 && selection[0] === cell) {
      showPanel(!panelHiddenRef.current);
    } else {
      setSelection([cell]);
      showPanel(false);
    }
  };

  // Entfernen über das X am Element: wie die Entf-Taste (mit Angebot, den Ablauf zu erhalten)
  const requestDelete = (cell) => {
    setSelection([cell]);
    if (onDeleteRequest) onDeleteRequest();
    else cell.remove();
  };

  // Folgeschritt anhängen („+“-Griff, Menü oder Eigenschaften-Leiste)
  const addNextStep = (source, direction, type = 'process') => {
    const graph = graphRef.current;
    if (!graph || !source) return null;
    const node = createNode(type, 0, 0);
    const obstacles = graph.getElements().filter((cell) => !isLane(cell)).map((cell) => cell.getBBox());
    const { x, y } = placeNextNode(source.getBBox(), node.size(), direction, obstacles);
    node.position(x, y);

    const sourceType = String(source.get('type'));
    const label = sourceType === 'vhs.Decision'
      ? nextDecisionLabel(graph.getConnectedLinks(source, { outbound: true }).map(getLinkLabelText))
      : '';
    const ports = nextEdgePorts(direction);
    const link = createLink(source.id, node.id, label);
    link.source({ id: source.id, port: ports.sourcePort });
    link.target({ id: node.id, port: ports.targetPort });

    graph.startBatch('add-next');
    graph.addCell(node);
    // Gleiche Lane wie die Quelle, auch wenn der neue Schritt über ihren Rand hinausragt
    const lane = source.getParentCell();
    if (isLane(lane)) {
      setElementLane(node, lane);
      growLaneToFit(lane);
    }
    graph.addCell(link);
    graph.stopBatch('add-next');
    setSelection([node]);
    return node;
  };

  const openSubprocess = (element) => {
    const id = getNodeDetails(element).subprocessId;
    if (id) {
      onOpenSubprocess?.(id, 'ask');
    } else {
      setSelection([element]);
      showPanel(false);
      onNotify?.('Dieser Teilprozess ist noch mit keinem Diagramm verknüpft. Bitte in den Eigenschaften auswählen.', 'info');
    }
  };

  // Die Ereignisbehandlung wird nur einmal angemeldet; sie ruft die jeweils aktuellen Funktionen auf
  const handlersRef = useRef({});
  const panelHiddenRef = useRef(false);
  useEffect(() => {
    handlersRef.current = { editCell, addNextStep, openSubprocess, requestDelete, togglePropertiesFor };
    panelHiddenRef.current = panelHidden;
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
      onChange: (count) => {
        onSelectionChangeRef.current?.(count);
        setSelectedCell(count === 1 ? selectionRef.current.get()[0] : null);
        setAddMenu(null);
      }
    });

    graph.on('all', (eventName) => {
      onHistoryChangeRef.current?.(history.canUndo(), history.canRedo());
      if (eventName === 'add' || eventName === 'remove' || eventName === 'reset' || eventName.includes('change:')) {
        onGraphChangeRef.current?.();
      }
    });

    const detachPan = attachPanAndRubberBand({ paper, graph, container, getSelection, setSelection });
    const detachPortHover = attachPortHover(paper);
    const detachLanes = attachLaneEmbedding({ graph, paper, getSelection });
    const detachVertexDrag = attachVertexDrag({ paper });
    const detachSnaplines = attachSnaplines({ paper, graph, getSelection });
    overviewRef.current = attachOverviewTracking({ paper, graph, container, onChange: setOverview });
    const detachWheelZoom = attachWheelZoom(container, {
      getZoom: () => zoomRef.current,
      setZoom: (zoom, anchor) => {
        zoomAnchorRef.current = anchor;
        onZoomSetRef.current?.(zoom);
      }
    });

    paper.on('element:pointerdblclick', (view) => handlersRef.current.editCell(view.model));
    paper.on('link:pointerdblclick', (view) => handlersRef.current.editCell(view.model));
    paper.on('element:remove-request', (view) => handlersRef.current.requestDelete(view.model));
    // Rechtsklick auf Element oder Verbindung: Eigenschaften ein-/ausblenden statt Browser-Kontextmenü
    const onCellContextMenu = (view, evt) => {
      evt.preventDefault();
      handlersRef.current.togglePropertiesFor(view.model);
    };
    paper.on('element:contextmenu', onCellContextMenu);
    paper.on('link:contextmenu', onCellContextMenu);
    // Beim Scrollen passt die Lage des Textfelds nicht mehr: Text übernehmen
    container.addEventListener('scroll', commitOpenInlineEditor, { passive: true });
    // Klick auf die Fläche: Fokus dorthin holen. JointJS verhindert den Fokuswechsel beim Klicken,
    // sonst bliebe er z. B. auf einer Schaltfläche, und Tab/Enter/Lostippen gingen an diese.
    const focusCanvas = () => canvasRef.current?.focus({ preventScroll: true });
    container.addEventListener('pointerdown', focusCanvas);
    paper.on('element:add-next', (view, direction) => handlersRef.current.addNextStep(view.model, direction));
    paper.on('element:add-next-menu', (view, direction, { clientX, clientY }) => {
      const bounds = wrapperRef.current.getBoundingClientRect();
      setAddMenu({ x: clientX - bounds.left + 8, y: clientY - bounds.top + 8, sourceId: view.model.id, direction });
    });
    paper.on('element:subprocess:open', (view, evt) => {
      evt.stopPropagation();
      handlersRef.current.openSubprocess(view.model);
    });

    return () => {
      if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
      detachPan();
      detachPortHover();
      detachLanes();
      detachVertexDrag();
      detachSnaplines();
      overviewRef.current?.detach();
      container.removeEventListener('scroll', commitOpenInlineEditor);
      container.removeEventListener('pointerdown', focusCanvas);
      detachWheelZoom();
      autoFitRef.current?.detach();
      pointerRef.current?.detach();
      selectionRef.current?.detach();
    };
  }, []);

  // Zoom um die Mausposition (Mausrad) bzw. die Bildmitte (Tasten, Schaltflächen)
  useEffect(() => {
    commitOpenInlineEditor();
    const paper = paperRef.current;
    if (!paper) return;
    const anchor = zoomAnchorRef.current;
    zoomAnchorRef.current = null;
    zoomAroundPoint(paper, scrollContainer(), zoomLevel, anchor, () => autoFitRef.current?.fit());
    if (fitAfterZoomRef.current) {
      fitAfterZoomRef.current = false;
      scrollToLocalRect(paper, scrollContainer(), paper.getContentArea({ useModelGeometry: true }), 'center');
    }
  }, [zoomLevel]);

  const fitPaper = () => autoFitRef.current?.fit();

  const centerContent = () => {
    const paper = paperRef.current;
    if (!paper || !graphRef.current?.getElements().length) return;
    fitPaper();
    scrollToLocalRect(paper, scrollContainer(), paper.getContentArea({ useModelGeometry: true }), 'top');
  };

  // Zoom so wählen, dass das ganze Diagramm sichtbar ist (höchstens 100 %), und mittig zeigen
  const fitToView = () => {
    const paper = paperRef.current;
    if (!paper || !graphRef.current?.getElements().length) return false;
    const container = scrollContainer();
    const content = paper.getContentArea({ useModelGeometry: true });
    const zoom = fitZoom(content, { width: container.clientWidth, height: container.clientHeight });
    if (zoom === zoomRef.current) {
      fitPaper();
      scrollToLocalRect(paper, container, content, 'center');
    } else {
      fitAfterZoomRef.current = true;
      onZoomSetRef.current?.(zoom);
    }
    return true;
  };

  const setMinimapHiddenStored = (hidden) => {
    setMinimapHidden(hidden);
    writeFlag(MINIMAP_HIDDEN_KEY, hidden);
  };

  // Klick auf die Übersichtskarte: Ansicht auf diesen Punkt zentrieren
  const navigateTo = (point) => {
    const paper = paperRef.current;
    if (!paper) return;
    scrollToLocalRect(paper, scrollContainer(), { x: point.x, y: point.y, width: 0, height: 0 }, 'center', 0);
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
    const graph = graphRef.current;
    const { nodes, edges } = instantiateFragment(fragment, { offset, createId: generateUUID });
    converterRef.current.fromJson({ nodes, edges });
    const cells = nodes.map((node) => graph.getCell(node.id)).filter(Boolean);
    // Elemente ohne mitkopierte Lane landen in der Lane, über der sie eingefügt wurden
    cells.filter((cell) => !cell.getParentCell()).forEach((cell) => assignLane(graph, cell));
    setSelection(cells);
    return nodes.length;
  };

  // Ausgewählte Elemente; bei Lanes samt ihrem Inhalt
  const selectedFragment = () => {
    const elements = selectedElements();
    const withContent = elements.flatMap((cell) => (isLane(cell) ? [cell, ...cell.getEmbeddedCells({ deep: true })] : [cell]));
    const ids = [...new Set(withContent.filter((cell) => cell.isElement()).map((cell) => cell.id))];
    return ids.length ? extractFragment(converterRef.current.toJson(), ids) : null;
  };

  // Nach dem Verschieben per Tastatur oder Ausrichten: Lanes neu zuordnen
  const reassignLanes = (cells) => cells.forEach((cell) => assignLane(graphRef.current, cell));

  const selectedBoxes = () => selectedElements().map((cell) => ({ id: cell.id, ...cell.position(), ...cell.size() }));

  // Ergebnis von layoutSelection anwenden: nur die betroffenen Elemente und Verbindungen ändern sich
  const applyPartialLayout = (result) => {
    const graph = graphRef.current;
    const entries = Object.entries(result.positions);
    if (!entries.length) return 0;
    graph.startBatch('layout');
    const moved = entries.map(([id, { x, y }]) => {
      const cell = graph.getCell(id);
      cell?.position(x, y, { deep: true });
      return cell;
    }).filter(Boolean);
    Object.entries(result.ports).forEach(([id, ports]) => {
      const link = graph.getCell(id);
      if (!link?.isLink()) return;
      link.vertices([]);
      link.source({ id: link.source().id, port: ports.sourcePort });
      link.target({ id: link.target().id, port: ports.targetPort });
    });
    // Elemente in einer Lane bleiben dort (die Lane wächst mit), freie Elemente werden neu zugeordnet
    moved.forEach((cell) => {
      const lane = cell.getParentCell();
      if (isLane(lane)) growLaneToFit(lane);
      else assignLane(graph, cell);
    });
    graph.stopBatch('layout');
    setSelection(getSelection());
    setTimeout(() => fitPaper(), 50);
    return moved.length;
  };

  const applyPositions = (positions) => {
    const entries = Object.entries(positions);
    if (!entries.length) return false;
    graphRef.current.startBatch('arrange');
    entries.forEach(([id, { x, y }]) => graphRef.current.getCell(id)?.position(x, y, { deep: true }));
    reassignLanes(entries.map(([id]) => graphRef.current.getCell(id)).filter(Boolean));
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

    // Löscht die Auswahl. `bridge`: bei einem einzelnen Schritt Vorgänger und Nachfolger verbinden
    deleteSelected: ({ bridge = false } = {}) => {
      const graph = graphRef.current;
      const selection = getSelection();
      if (!selection.length) return 0;
      const bridges = bridge && selection.length === 1 ? bridgeEdges(converterRef.current.toJson(), String(selection[0].id)) || [] : [];
      graph.startBatch('delete');
      graph.removeCells(selection);
      bridges.forEach((edge) => {
        const link = createLink(edge.from, edge.to, edge.label);
        if (edge.sourcePort) link.source({ id: edge.from, port: edge.sourcePort });
        if (edge.targetPort) link.target({ id: edge.to, port: edge.targetPort });
        graph.addCell(link);
      });
      graph.stopBatch('delete');
      setSelection([]);
      return selection.length;
    },

    // Liegt der einzeln ausgewählte Schritt im Ablauf (Vorgänger und genau ein Nachfolger)?
    getBridgeInfo: () => {
      const selection = getSelection();
      if (selection.length !== 1 || !selection[0].isElement()) return null;
      const edges = bridgeEdges(converterRef.current.toJson(), String(selection[0].id));
      return edges ? { label: selection[0].attr('label/text') || '', count: edges.length } : null;
    },

    // F2/Enter bzw. Lostippen: Text der einzeln ausgewählten Zelle bearbeiten
    editSelection: (initialText = null) => {
      const selection = getSelection();
      if (selection.length !== 1) return false;
      return startInlineEdit(selection[0], initialText);
    },

    isEditingText: () => Boolean(inlineEdit),

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
      // Elemente in einer mit ausgewählten Lane wandern mit ihr
      const movable = elements.filter((cell) => !hasSelectedAncestor(cell, elements));
      graphRef.current.startBatch('move');
      movable.forEach((cell) => cell.translate(dx, dy));
      reassignLanes(movable);
      graphRef.current.stopBatch('move');
      return true;
    },

    alignSelection: (mode) => applyPositions(alignBoxes(selectedBoxes(), mode)),
    distributeSelection: (axis) => applyPositions(distributeBoxes(selectedBoxes(), axis)),

    // Räumt das Diagramm automatisch auf (rückgängig machbar); liefert die verwendete Richtung
    autoLayout: (direction = 'TB') => {
      if (!layoutRef.current || !graphRef.current.getElements().length) return null;
      const result = layoutRef.current.applyLayout(direction);
      // Zuordnung zu den (neu angeordneten) Lanes nach Lage
      reassignLanes(graphRef.current.getElements().filter((cell) => !isLane(cell)));
      // Auswahlrahmen an die neuen Positionen anpassen
      setSelection(getSelection());
      // An den Anfang des Diagramms scrollen, damit Start und Lane-Titel sichtbar sind
      setTimeout(() => {
        fitPaper();
        scrollToLocalRect(paperRef.current, scrollContainer(), paperRef.current.getContentArea({ useModelGeometry: true }), 'topLeft');
      }, 50);
      return result.direction;
    },

    // Nur die Auswahl anordnen; liefert { count, direction }
    autoLayoutSelection: (direction = 'TB') => {
      const ids = getSelection().filter((cell) => cell.isElement()).map((cell) => cell.id);
      const result = layoutSelection(converterRef.current.toJson(), ids, { direction });
      return { count: applyPartialLayout(result), direction: result.direction };
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
    fitToView: () => fitToView(),

    // Lane mit der Nachbarin oben/unten tauschen (Eigenschaften-Leiste)
    moveLane: (lane, direction) => moveLane(graphRef.current, lane, direction),

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
  // Gelöschte Zellen haben keinen Graphen mehr
  const panelCell = selectedCell?.graph ? selectedCell : null;
  const panelTop = search.isOpen ? 'top-16' : 'top-3';

  return (
    <div ref={wrapperRef} className="flex-grow h-full relative min-w-0">
      <div id="vhs-canvas-scroll" className="absolute inset-0 overflow-auto bg-[var(--color-vhs-blau-10)] rounded-tl-lg border-l border-t border-[var(--color-vhs-blau-20)]" style={{ scrollBehavior: 'auto' }}>
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
      {overview && !isFullyVisible(overview.content, overview.view) && (minimapHidden ? (
        <button
          type="button"
          onClick={() => setMinimapHiddenStored(false)}
          className="absolute left-3 bottom-5 z-10 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-vhs-blau-20)] bg-white px-2 py-1 text-xs font-bold text-[var(--color-vhs-blau)] shadow-md hover:bg-[var(--color-vhs-blau-10)] focus:outline-none focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)]"
          title="Übersichtskarte einblenden"
        >
          <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Übersicht
        </button>
      ) : (
        <Minimap overview={overview} onNavigate={navigateTo} onClose={() => setMinimapHiddenStored(true)} />
      ))}
      {inlineEdit && (
        <InlineTextEditor
          key={inlineEdit.cellId}
          rect={inlineEdit.rect}
          initialValue={inlineEdit.initialValue}
          selectAll={inlineEdit.selectAll}
          fontSize={inlineEdit.fontSize}
          label={inlineEdit.label}
          onCommit={commitInlineEdit}
          onCancel={() => { setInlineEdit(null); refocusCanvas(); }}
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
