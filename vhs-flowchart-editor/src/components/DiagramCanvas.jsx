import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as joint from 'jointjs';
import { HistoryManager } from '../diagram/history';
import { JSONConverter } from '../diagram/converter';
import { DiagramLayout } from '../diagram/layout';
import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createAnnotationNode, createLaneNode, autoSizeForText, linkLabelStyle } from '../diagram/shapes';
import { exportToPNG, exportToSVG, exportToPDF, exportToJSON, getDiagramJpegForPdf } from '../export/file-export';
import { extractFragment, instantiateFragment, readClipboard, writeClipboard } from '../diagram/clipboard';
import { alignBoxes, distributeBoxes } from '../diagram/arrange';
import { generateUUID } from '../utils/uuid';
import { COLORS } from '../utils/constants';
import { addFocusHighlight, clearFocusHighlight, clearSearchHighlights, setPresentationDim, setSearchHighlights } from '../diagram/highlight';
import { clampZoom, fitPaperToContent, pasteOffset, scrollToLocalRect, visibleCenterLocal, wheelZoomFactor, zoomAroundPoint } from '../diagram/viewport';
import { findMatches } from '../diagram/search';
import DiagramSearch from './DiagramSearch';
import EditTextModal from './EditTextModal';
import EditLaneModal from './EditLaneModal';

// Custom resize-corner tool for lane elements.
// Tools in JointJS render at paper (0,0) – each tool must use getBBox() for
// paper-absolute coordinates, exactly like joint.elementTools.Boundary does.
class LaneResizeTool extends joint.dia.ToolView {
    render() { this._draw(); return this; }
    update() { this._draw(); return this; }

    _draw() {
        const el = this.el;
        while (el.firstChild) el.removeChild(el.firstChild);

        // getBBox() returns PAPER-absolute coordinates – required for correct placement
        const bbox = this.relatedView.getBBox({ useModelGeometry: true });
        const ox = bbox.x + bbox.width - 14;
        const oy = bbox.y + bbox.height - 14;

        const ns = 'http://www.w3.org/2000/svg';
        const bg = document.createElementNS(ns, 'rect');
        bg.setAttribute('x', ox); bg.setAttribute('y', oy);
        bg.setAttribute('width', 14); bg.setAttribute('height', 14);
        bg.setAttribute('rx', 2); bg.setAttribute('fill', COLORS.vhsBlue);
        bg.setAttribute('stroke', COLORS.white); bg.setAttribute('stroke-width', 1.5);
        bg.setAttribute('cursor', 'nwse-resize');
        el.appendChild(bg);

        // Diagonal indicator lines
        [[3, 11, 11, 3], [6, 11, 11, 6], [9, 11, 11, 9]].forEach(([x1, y1, x2, y2]) => {
            const ln = document.createElementNS(ns, 'line');
            ln.setAttribute('x1', ox + x1); ln.setAttribute('y1', oy + y1);
            ln.setAttribute('x2', ox + x2); ln.setAttribute('y2', oy + y2);
            ln.setAttribute('stroke', COLORS.white); ln.setAttribute('stroke-width', 1.5);
            ln.setAttribute('pointer-events', 'none');
            el.appendChild(ln);
        });

        // Only attach drag listener when not already resizing (prevents re-entrant calls).
        // Pointer Events: works with mouse, pen and touch.
        if (!this._resizing) {
            bg.style.touchAction = 'none';
            bg.addEventListener('pointerdown', (evt) => this._startResize(evt));
            // Block JointJS' own mousedown/touchstart so it doesn't drag the lane at the same time
            const stop = (evt) => evt.stopPropagation();
            bg.addEventListener('mousedown', stop);
            bg.addEventListener('touchstart', stop, { passive: true });
        }
    }

    _startResize(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        if (this._resizing) return;
        this._resizing = true;

        const paper = this.relatedView.paper;
        const { width, height } = this.relatedView.model.size();
        const lp = paper.clientToLocalPoint(evt.clientX, evt.clientY);
        const startX = lp.x, startY = lp.y, startW = width, startH = height;

        const cleanup = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            window.removeEventListener('blur', onBlur);
            this._resizing = false;
            this._draw(); // restore interactive handle at final position
        };

        const onMove = (e) => {
            const p = paper.clientToLocalPoint(e.clientX, e.clientY);
            this.relatedView.model.resize(
                Math.max(200, startW + (p.x - startX)),
                Math.max(60, startH + (p.y - startY))
            );
            // JointJS fires update() -> _draw() automatically via change:size; no manual call needed
        };
        const onUp = () => cleanup();
        // If the browser loses focus mid-drag (e.g. Alt-Tab + mouse release outside),
        // mouseup never fires on window – reset state to prevent a stuck resize.
        const onBlur = () => cleanup();

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        window.addEventListener('blur', onBlur);
    }
}

// Versatz beim Einfügen und Duplizieren, damit Kopien nicht verdeckt sind
const PASTE_OFFSET = 30;

// Schnellauswahl für Ausgänge von Entscheidungen; noch nicht vergebene Antworten zuerst
const DECISION_ANSWERS = ['Ja', 'Nein'];
const decisionLabelSuggestions = (graph, link) => {
    const source = link.getSourceElement();
    if (!source || source.get('type') !== 'vhs.Decision') return [];
    const used = graph.getConnectedLinks(source, { outbound: true })
        .filter((other) => other !== link)
        .map((other) => String(other.labels()[0]?.attrs?.text?.text || '').trim().toLowerCase());
    const isUsed = (answer) => used.includes(answer.toLowerCase());
    return [...DECISION_ANSWERS.filter((a) => !isUsed(a)), ...DECISION_ANSWERS.filter(isUsed)];
};

// Erzeugt ein neues Element, zentriert um den Punkt (x, y)
const createNodeAt = (type, x, y) => {
    switch (type) {
        case 'start': return createStartNode(x - 70, y - 35, 'Start');
        case 'end': return createEndNode(x - 70, y - 35, 'Ende');
        case 'decision': return createDecisionNode(x - 90, y - 55, 'Entscheidung?');
        case 'annotation': return createAnnotationNode(x - 100, y - 40, 'Kommentar');
        case 'lane': return createLaneNode(x - 300, y - 100, 'Swimlane');
        case 'process':
        default: return createProcessNode(x - 80, y - 30, 'Prozess');
    }
};

const DiagramCanvas = forwardRef(({ onGraphChange, onDiagramLoaded, onHistoryChange, onSelectionChange, zoomLevel, onZoomSet }, ref) => {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const historyRef = useRef(null);
  const converterRef = useRef(null);
  const layoutRef = useRef(null);
  const initializedRef = useRef(false);
  const selectionRef = useRef([]);
  const setSelectionRef = useRef(() => {});
  // Letzte Einfügestelle und wie oft dort eingefügt wurde (für versetzte Mehrfachkopien)
  const lastPasteRef = useRef({ key: null, count: 0 });
  // Letzte Mausposition über der Arbeitsfläche (Bildschirmkoordinaten) oder null
  const lastPointerRef = useRef(null);
  // Punkt, um den der nächste Zoom erfolgt (Mausrad); null = Bildmitte
  const zoomAnchorRef = useRef(null);
  const zoomRef = useRef(zoomLevel);
  const fitPaperRef = useRef(() => {});
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

  const highlightTimeoutRef = useRef(null);
  const [editModal, setEditModal] = useState({ isOpen: false, title: '', value: '', onSave: null });
  const [laneEditModal, setLaneEditModal] = useState({ isOpen: false, label: '', headerColor: COLORS.vhsBlue, onSave: null });
  // Suche (Strg+F)
  const [search, setSearch] = useState({ isOpen: false, query: '', matches: [], index: 0, focusToken: 0 });

  useEffect(() => {
    if (initializedRef.current) return;
    if (!canvasRef.current) return;
    initializedRef.current = true;

    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    
    const paper = new joint.dia.Paper({
      el: canvasRef.current,
      model: graph,
      // Startgröße; danach passt fitPaperToContent die Fläche an den Inhalt an
      width: canvasRef.current.parentNode.clientWidth || 1000,
      height: canvasRef.current.parentNode.clientHeight || 800,
      gridSize: 10,
      drawGrid: {
        name: 'dot',
        args: { color: COLORS.vhsBlue20, thickness: 1 }
      },
      background: { color: COLORS.white },
      defaultLink: () => new joint.shapes.standard.Link({
        attrs: {
          line: {
            stroke: COLORS.vhsBlue60,
            strokeWidth: 2,
            targetMarker: {
              type: 'path',
              d: 'M 10 -5 0 0 10 5 z',
              fill: COLORS.vhsBlue60,
              stroke: 'none'
            }
          }
        },
        router: { name: 'manhattan' },
        connector: { name: 'rounded' }
      }),
      interactive: {
          elementMove: true,
          addLinkFromMagnet: true,
          vertexAdd: false, 
          vertexMove: true,
          vertexRemove: true,
          linkMove: false,
          labelMove: false,
          arrowheadMove: true
      },
      snapLinks: { radius: 30 },
      linkPinning: false,
      markAvailable: true,
      defaultConnectionPoint: { name: 'boundary' },
      validateConnection: function(cellViewS, magnetS, cellViewT, magnetT) {
        if (cellViewS === cellViewT) return false;
        if (cellViewT.model.isLink()) return false;
        // Lanes are containers, not connectable endpoints
        if (cellViewS.model.get('type') === 'vhs.Lane') return false;
        if (cellViewT.model.get('type') === 'vhs.Lane') return false;
        return !!magnetT;
      },
      cellViewNamespace: joint.shapes
    });

    const history = new HistoryManager(graph);
    const converter = new JSONConverter(graph);
    const layout = new DiagramLayout(graph);

    graphRef.current = graph;
    paperRef.current = paper;
    historyRef.current = history;
    converterRef.current = converter;
    layoutRef.current = layout;

    history.isTracking = true;

    // --- Größe der Arbeitsfläche folgt dem Inhalt (auch negative Koordinaten) ---
    // Während eines Ziehvorgangs wird nicht angepasst, sonst verschiebt sich die Ansicht unter der Maus.
    const scrollContainer = canvasRef.current.parentNode;
    let fitFrame = null;
    let isPointerDragging = false;
    const fitPaper = () => {
        if (fitFrame !== null) {
            cancelAnimationFrame(fitFrame);
            fitFrame = null;
        }
        fitPaperToContent(paper, scrollContainer);
    };
    const scheduleFit = () => {
        if (isPointerDragging || fitFrame !== null) return;
        fitFrame = requestAnimationFrame(() => {
            fitFrame = null;
            fitPaperToContent(paper, scrollContainer);
        });
    };
    fitPaperRef.current = fitPaper;
    paper.on('cell:pointerdown', () => { isPointerDragging = true; });
    const onPointerUp = () => {
        if (!isPointerDragging) return;
        isPointerDragging = false;
        scheduleFit();
    };
    window.addEventListener('pointerup', onPointerUp);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleFit);
    resizeObserver?.observe(scrollContainer);

    // Letzte Mausposition merken (Einfügen an der Mausposition)
    const onContainerPointerMove = (evt) => { lastPointerRef.current = { x: evt.clientX, y: evt.clientY }; };
    const onContainerPointerLeave = () => { lastPointerRef.current = null; };
    scrollContainer.addEventListener('pointermove', onContainerPointerMove);
    scrollContainer.addEventListener('pointerleave', onContainerPointerLeave);

    // --- Auswahl (ein oder mehrere Elemente/Verbindungen) ---
    const boundaryAttrs = {
      rect: { fill: 'none', stroke: COLORS.vhsBlue, 'stroke-width': 2, 'stroke-dasharray': '5,5' }
    };

    const renderSelection = () => {
      paper.removeTools();
      const selection = selectionRef.current;
      if (selection.length === 1) {
        const cell = selection[0];
        const view = paper.findViewByModel(cell);
        if (view && cell.isElement()) {
          const toolList = [
            new joint.elementTools.Boundary({ padding: 10, useModelGeometry: true, attrs: boundaryAttrs }),
            new joint.elementTools.Remove({ offset: { x: 10, y: 10 } }),
          ];
          if (cell.get('type') === 'vhs.Lane') {
            toolList.push(new LaneResizeTool());
          }
          view.addTools(new joint.dia.ToolsView({ tools: toolList }));
        } else if (view) {
          view.addTools(new joint.dia.ToolsView({
            tools: [
              new joint.linkTools.Boundary({ attrs: boundaryAttrs }),
              new joint.linkTools.Remove({ distance: '10%' }),
              new joint.linkTools.SourceArrowhead(),
              new joint.linkTools.TargetArrowhead()
            ]
          }));
        }
      } else {
        // Mehrfachauswahl: nur Rahmen, keine Einzelwerkzeuge
        selection.forEach((cell) => {
          const view = paper.findViewByModel(cell);
          if (!view) return;
          const tool = cell.isElement()
            ? new joint.elementTools.Boundary({ padding: 10, useModelGeometry: true, attrs: boundaryAttrs })
            : new joint.linkTools.Boundary({ attrs: boundaryAttrs });
          view.addTools(new joint.dia.ToolsView({ tools: [tool] }));
        });
      }
      onSelectionChangeRef.current?.(selection.length);
    };

    const setSelection = (cells) => {
      selectionRef.current = [...new Set(cells)].filter((cell) => cell && graph.getCell(cell.id));
      renderSelection();
    };
    setSelectionRef.current = setSelection;

    graph.on('all', (eventName, cell) => {
      onHistoryChangeRef.current?.(history.canUndo(), history.canRedo());
      if (eventName === 'remove' && selectionRef.current.includes(cell)) {
          setSelection(selectionRef.current.filter((c) => c !== cell));
      }
      if (eventName === 'reset') {
          // Undo/Redo ersetzt alle Zellen – alte Auswahl ist ungültig
          setSelection([]);
      }
      if (eventName === 'add' || eventName === 'remove' || eventName === 'reset' || eventName.includes('change:')) {
          onGraphChangeRef.current?.();
      }
      if (eventName === 'add' || eventName === 'remove' || eventName === 'reset' || eventName === 'change:position' || eventName === 'change:size') {
          scheduleFit();
      }
    });

    // --- Verschieben der Ansicht, Rahmenauswahl (Umschalt + Ziehen) ---
    let isPanning = false;
    let lastMousePos = { x: 0, y: 0 };
    let rubberBand = null;

    const updateRubberBand = (clientX, clientY) => {
        const container = canvasRef.current.parentNode;
        const rect = container.getBoundingClientRect();
        const left = Math.min(rubberBand.startX, clientX) - rect.left + container.scrollLeft;
        const top = Math.min(rubberBand.startY, clientY) - rect.top + container.scrollTop;
        Object.assign(rubberBand.el.style, {
            left: `${left}px`,
            top: `${top}px`,
            width: `${Math.abs(clientX - rubberBand.startX)}px`,
            height: `${Math.abs(clientY - rubberBand.startY)}px`
        });
    };

    paper.on('blank:pointerdown', (evt) => {
        if (evt.shiftKey) {
            const el = document.createElement('div');
            el.className = 'vhs-rubberband';
            canvasRef.current.parentNode.appendChild(el);
            rubberBand = { startX: evt.clientX, startY: evt.clientY, el, additive: evt.ctrlKey || evt.metaKey };
            updateRubberBand(evt.clientX, evt.clientY);
            return;
        }
        isPanning = true;
        lastMousePos = { x: evt.clientX, y: evt.clientY };
    });

    const onMouseMove = (evt) => {
        if (rubberBand) {
            updateRubberBand(evt.clientX, evt.clientY);
            return;
        }
        if (isPanning) {
            const container = canvasRef.current.parentNode;
            container.scrollLeft -= evt.clientX - lastMousePos.x;
            container.scrollTop -= evt.clientY - lastMousePos.y;
            lastMousePos = { x: evt.clientX, y: evt.clientY };
        }
    };

    const finishRubberBand = (evt) => {
        if (!rubberBand) return;
        const a = paper.clientToLocalPoint(rubberBand.startX, rubberBand.startY);
        const b = evt ? paper.clientToLocalPoint(evt.clientX, evt.clientY) : a;
        const area = new joint.g.Rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        if (area.width > 3 || area.height > 3) {
            const found = graph.findModelsInArea(area, { strict: true });
            setSelection(rubberBand.additive ? [...selectionRef.current, ...found] : found);
        }
        rubberBand.el.remove();
        rubberBand = null;
    };

    const onMouseUp = (evt) => {
        finishRubberBand(evt);
        isPanning = false;
    };

    // If the browser loses focus while the mouse button is held (e.g. Alt-Tab + release
    // outside the window), mouseup never fires and isPanning stays true permanently,
    // making the canvas scroll on every subsequent mouse move instead of responding to clicks.
    const onWindowBlur = () => {
        finishRubberBand(null);
        isPanning = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onWindowBlur);

    // --- Auswahl per Klick (Strg/Umschalt + Klick ergänzt), gemeinsames Verschieben ---
    const isAdditive = (evt) => evt.ctrlKey || evt.metaKey || evt.shiftKey;
    let groupDrag = null;

    paper.on('element:pointerdown', (elementView, evt) => {
      const model = elementView.model;
      if (!isAdditive(evt) && !selectionRef.current.includes(model)) {
        setSelection([model]);
      }
      const selection = selectionRef.current;
      groupDrag = selection.includes(model) && selection.length > 1
        ? {
            anchor: model,
            start: model.position(),
            others: selection.filter((c) => c !== model && c.isElement()).map((cell) => ({ cell, start: cell.position() }))
          }
        : null;
    });

    paper.on('element:pointermove', (elementView) => {
      if (!groupDrag || elementView.model !== groupDrag.anchor) return;
      const position = elementView.model.position();
      const dx = position.x - groupDrag.start.x;
      const dy = position.y - groupDrag.start.y;
      groupDrag.others.forEach(({ cell, start }) => cell.position(start.x + dx, start.y + dy));
    });

    paper.on('element:pointerup', () => {
      groupDrag = null;
    });

    const toggleOrSelect = (model, evt) => {
      if (isAdditive(evt)) {
        const selection = selectionRef.current;
        setSelection(selection.includes(model) ? selection.filter((c) => c !== model) : [...selection, model]);
      } else {
        setSelection([model]);
      }
    };

    paper.on('element:pointerclick', (elementView, evt) => toggleOrSelect(elementView.model, evt));
    paper.on('link:pointerclick', (linkView, evt) => toggleOrSelect(linkView.model, evt));

    paper.on('blank:pointerclick', () => {
      setSelection([]);
    });

    // DOUBLE CLICK TO EDIT TEXT (modal-based)
    paper.on('element:pointerdblclick', (elementView) => {
        const node = elementView.model;
        const isLane = node.get('type') === 'vhs.Lane';

        if (isLane) {
            setLaneEditModal({
                isOpen: true,
                label: node.attr('label/text') || '',
                headerColor: node.attr('header/fill') || COLORS.vhsBlue,
                onSave: ({ label, color }) => {
                    node.attr('label/text', label);
                    node.attr('header/fill', color.header);
                    node.attr('body/fill', color.body);
                    node.attr('body/stroke', color.header);
                    onGraphChangeRef.current?.();
                    setLaneEditModal((prev) => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            const currentText = node.attr('label/text');
            setEditModal({
                isOpen: true,
                title: 'Text bearbeiten',
                value: currentText || '',
                onSave: (newText) => {
                    node.attr('label/text', newText);
                    const vhsType = node.get('type').split('.')[1]?.toLowerCase();
                    if (vhsType && vhsType !== 'lane') {
                        autoSizeForText(node, newText, vhsType);
                    }
                    onGraphChangeRef.current?.();
                    setEditModal((prev) => ({ ...prev, isOpen: false }));
                }
            });
        }
    });

    paper.on('link:pointerdblclick', (linkView) => {
        const link = linkView.model;
        const currentLabels = link.labels();
        const currentText = currentLabels[0]?.attrs?.text?.text || '';
        setEditModal({
            isOpen: true,
            title: 'Verbindungstext bearbeiten (z.B. Ja/Nein)',
            value: currentText,
            suggestions: decisionLabelSuggestions(graph, link),
            onSave: (newText) => {
                if (newText.trim() === '') {
                    link.labels([]);
                } else {
                    const newLabel = JSON.parse(JSON.stringify(linkLabelStyle));
                    newLabel.attrs.text.text = newText;
                    link.label(0, newLabel);
                }
                onGraphChangeRef.current?.();
                setEditModal((prev) => ({ ...prev, isOpen: false }));
            }
        });
    });

    // Hover Ports (skip lanes – they have no ports and are not connectable)
    paper.on('element:mouseenter', (elementView) => {
      if (elementView.model.get('type') === 'vhs.Lane') return;
      const ports = elementView.model.getPorts();
      ports.forEach(port => {
        elementView.model.portProp(port.id, 'attrs/circle/style', { visibility: 'visible' });
      });
    });

    paper.on('element:mouseleave', (elementView) => {
      if (elementView.model.get('type') === 'vhs.Lane') return;
      const ports = elementView.model.getPorts();
      ports.forEach(port => {
        elementView.model.portProp(port.id, 'attrs/circle/style', { visibility: 'hidden' });
      });
    });

    // Ctrl + Mouse Wheel Zoom
    // Strg + Mausrad (auch Touchpad-Zoomgeste): Zoom um die Mausposition
    const onWheel = (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const next = clampZoom(zoomRef.current * wheelZoomFactor(e.deltaY));
        if (next === zoomRef.current) return;
        zoomAnchorRef.current = { x: e.clientX, y: e.clientY };
        onZoomSetRef.current?.(next);
    };

    const container = canvasRef.current.parentNode;
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
        if (highlightTimeoutRef.current) {
            window.clearTimeout(highlightTimeoutRef.current);
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('blur', onWindowBlur);
        window.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('wheel', onWheel);
        scrollContainer.removeEventListener('pointermove', onContainerPointerMove);
        scrollContainer.removeEventListener('pointerleave', onContainerPointerLeave);
        resizeObserver?.disconnect();
        if (fitFrame !== null) cancelAnimationFrame(fitFrame);
    };

  }, []);

  // Zoom um die Mausposition (Mausrad) bzw. die Bildmitte (Tasten, Schaltflächen)
  useEffect(() => {
      const paper = paperRef.current;
      if (!paper) return;
      const anchor = zoomAnchorRef.current;
      zoomAnchorRef.current = null;
      zoomAroundPoint(paper, canvasRef.current.parentNode, zoomLevel, anchor, fitPaperRef.current);
  }, [zoomLevel]);

  const scrollContainer = () => canvasRef.current.parentNode;


  const centerContent = () => {
      const paper = paperRef.current;
      if (!paper || !graphRef.current?.getElements().length) return;
      fitPaperRef.current();
      scrollToLocalRect(paper, scrollContainer(), paper.getContentArea({ useModelGeometry: true }), 'top');
  };

  const loadJsonData = (json, shouldLayout = false) => {
      if (!graphRef.current) return;
      graphRef.current.clear();
      if (json) {
          converterRef.current.fromJson(json);
      }
      if (shouldLayout) {
          layoutRef.current.applyLayout();
      }
      historyRef.current?.clear();
      historyRef.current?.saveState();
      // Beim Laden gemeldete „Rückgängig möglich“-Zustände (entprellte Änderungen) zurücksetzen
      notifyHistory();
      closeSearch();
      fitPaperRef.current();
      setTimeout(centerContent, 100);
  };

  const notifyHistory = () => {
      onHistoryChangeRef.current?.(historyRef.current?.canUndo() || false, historyRef.current?.canRedo() || false);
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
      highlightTimeoutRef.current = window.setTimeout(clearHighlight, 1800);
  };

  const setPresentationFocus = (nodeId = null) => {
      setPresentationDim(paperRef.current, graphRef.current, nodeId);
      if (nodeId) {
          focusNode(nodeId);
      } else {
          clearHighlight();
      }
  };

  // --- Suche (Strg+F) ---
  const showSearchResult = (matches, index) => {
      const currentId = matches[index] || null;
      setSearchHighlights(paperRef.current, graphRef.current, matches, currentId);
      const cell = currentId && graphRef.current?.getCell(currentId);
      if (cell) scrollToLocalRect(paperRef.current, scrollContainer(), cell.getBBox(), 'center');
  };

  const updateSearchQuery = (query) => {
      const nodes = converterRef.current?.toJson()?.nodes || [];
      const matches = findMatches(nodes, query);
      setSearch((prev) => ({ ...prev, query, matches, index: 0 }));
      showSearchResult(matches, 0);
  };

  const stepSearch = (direction) => {
      if (!search.matches.length) return;
      const index = (search.index + direction + search.matches.length) % search.matches.length;
      setSearch((prev) => ({ ...prev, index }));
      showSearchResult(search.matches, index);
  };

  const closeSearch = () => {
      clearSearchHighlights(paperRef.current);
      setSearch((prev) => (prev.isOpen ? { ...prev, isOpen: false, matches: [], index: 0 } : prev));
  };

  // Fügt einen Diagrammausschnitt mit neuen IDs ein und wählt ihn aus
  const insertFragment = (fragment, offset) => {
      const { nodes, edges } = instantiateFragment(fragment, { offset, createId: generateUUID });
      converterRef.current.fromJson({ nodes, edges });
      setSelectionRef.current(nodes.map((node) => graphRef.current.getCell(node.id)));
      return nodes.length;
  };

  const selectedBoxes = () => selectionRef.current
      .filter((cell) => cell.isElement())
      .map((cell) => ({ id: cell.id, ...cell.position(), ...cell.size() }));

  const applyPositions = (positions) => {
      const entries = Object.entries(positions);
      if (!entries.length) return false;
      graphRef.current.startBatch('arrange');
      entries.forEach(([id, { x, y }]) => graphRef.current.getCell(id)?.position(x, y));
      graphRef.current.stopBatch('arrange');
      return true;
  };

  useImperativeHandle(ref, () => ({
    loadDiagram: (data) => {
        loadJsonData(data?.diagram || null, false);
        if (onDiagramLoaded) onDiagramLoaded(data);
    },
    
    loadGeneratedData: (json) => {
        loadJsonData(json, true);
    },
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

    undo: () => {
        const ok = historyRef.current?.undo();
        if (ok && onHistoryChange) onHistoryChange(historyRef.current.canUndo(), historyRef.current.canRedo());
        if (ok && onGraphChange) onGraphChange();
    },
    redo: () => {
        const ok = historyRef.current?.redo();
        if (ok && onHistoryChange) onHistoryChange(historyRef.current.canUndo(), historyRef.current.canRedo());
        if (ok && onGraphChange) onGraphChange();
    },
    canUndo: () => historyRef.current?.canUndo() || false,
    canRedo: () => historyRef.current?.canRedo() || false,

    deleteSelected: () => {
        const selection = selectionRef.current;
        if (!selection.length) return 0;
        graphRef.current.startBatch('delete');
        graphRef.current.removeCells(selection);
        graphRef.current.stopBatch('delete');
        setSelectionRef.current([]);
        return selection.length;
    },

    // --- Auswahl und Bearbeitung mehrerer Elemente ---

    selectAll: () => {
        setSelectionRef.current(graphRef.current?.getElements() || []);
    },
    clearSelection: () => {
        setSelectionRef.current([]);
    },
    getSelectionCount: () => selectionRef.current.length,

    // Kopiert die ausgewählten Elemente inkl. Verbindungen untereinander in die Ablage
    copySelection: () => {
        const ids = selectionRef.current.filter((cell) => cell.isElement()).map((cell) => cell.id);
        if (!ids.length) return 0;
        writeClipboard(extractFragment(converterRef.current.toJson(), ids));
        lastPasteRef.current = { key: null, count: 0 };
        return ids.length;
    },

    // Fügt mittig an der Mausposition ein (Maus außerhalb: Bildmitte).
    // Mehrfaches Einfügen an derselben Stelle versetzt die Kopien.
    paste: () => {
        const fragment = readClipboard();
        if (!fragment?.nodes?.length) return 0;
        const paper = paperRef.current;
        const pointer = lastPointerRef.current;
        const target = pointer
            ? paper.clientToLocalPoint(pointer.x, pointer.y)
            : visibleCenterLocal(paper, scrollContainer());
        const key = Math.round(target.x) + ':' + Math.round(target.y);
        const repeat = lastPasteRef.current.key === key ? lastPasteRef.current.count : 0;
        lastPasteRef.current = { key, count: repeat + 1 };
        return insertFragment(fragment, pasteOffset(fragment, target, repeat, PASTE_OFFSET));
    },

    duplicateSelection: () => {
        const ids = selectionRef.current.filter((cell) => cell.isElement()).map((cell) => cell.id);
        if (!ids.length) return 0;
        return insertFragment(extractFragment(converterRef.current.toJson(), ids), { x: PASTE_OFFSET, y: PASTE_OFFSET });
    },

    // Verschiebt die Auswahl (Pfeiltasten)
    moveSelection: (dx, dy) => {
        const elements = selectionRef.current.filter((cell) => cell.isElement());
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
        setSelectionRef.current(selectionRef.current);
        // An den Anfang des Diagramms scrollen, damit Start und Lane-Titel sichtbar sind
        setTimeout(() => {
            fitPaperRef.current();
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
    openSearch: () => {
        setSearch((prev) => ({ ...prev, isOpen: true, focusToken: prev.focusToken + 1 }));
        if (search.query) updateSearchQuery(search.query);
    },
    closeSearch,

    // Zum Element springen, kurz markieren und auswählen (z. B. aus dem Struktur-Check)
    revealNode: (nodeId) => {
        focusNode(nodeId);
        const cell = graphRef.current?.getCell(nodeId);
        if (cell) setSelectionRef.current([cell]);
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
          onQueryChange={updateSearchQuery}
          onNext={() => stepSearch(1)}
          onPrevious={() => stepSearch(-1)}
          onClose={closeSearch}
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
