import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as joint from 'jointjs';
import { HistoryManager } from '../diagram/history';
import { JSONConverter } from '../diagram/converter';
import { DiagramLayout } from '../diagram/layout';
import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createAnnotationNode, autoSizeForText, linkLabelStyle } from '../diagram/shapes';
import { exportToPNG, exportToSVG, exportToPDF, exportToJSON, getDiagramPngDataUrl } from '../export/file-export';
import EditTextModal from './EditTextModal';

const DiagramCanvas = forwardRef(({ onGraphChange, onDiagramLoaded, onHistoryChange, zoomLevel, onZoomIn, onZoomOut }, ref) => {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const historyRef = useRef(null);
  const converterRef = useRef(null);
  const layoutRef = useRef(null);
  const initializedRef = useRef(false);
  const selectedCellRef = useRef(null);
  const onZoomInRef = useRef(onZoomIn);
  const onZoomOutRef = useRef(onZoomOut);

  useEffect(() => {
    onZoomInRef.current = onZoomIn;
    onZoomOutRef.current = onZoomOut;
  }, [onZoomIn, onZoomOut]);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const highlightTimeoutRef = useRef(null);
  const [editModal, setEditModal] = useState({ isOpen: false, title: '', value: '', onSave: null });

  useEffect(() => {
    if (initializedRef.current) return;
    if (!canvasRef.current) return;
    initializedRef.current = true;

    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    
    const paper = new joint.dia.Paper({
      el: canvasRef.current,
      model: graph,
      width: 5000, 
      height: 5000,
      gridSize: 10,
      drawGrid: {
        name: 'dot',
        args: { color: '#CDD7DC', thickness: 1 }
      },
      background: { color: '#ffffff' },
      defaultLink: () => new joint.shapes.standard.Link({
        attrs: {
          line: {
            stroke: '#69829B',
            strokeWidth: 2,
            targetMarker: {
              type: 'path',
              d: 'M 10 -5 0 0 10 5 z',
              fill: '#69829B',
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
      validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
        if (cellViewS === cellViewT) return false;
        if (cellViewT.model.isLink()) return false;
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

    graph.on('all', (eventName) => {
      const nextCanUndo = history.canUndo();
      const nextCanRedo = history.canRedo();
      setCanUndo(nextCanUndo);
      setCanRedo(nextCanRedo);
      if (onHistoryChange) onHistoryChange(nextCanUndo, nextCanRedo);
      if (eventName === 'remove') {
          if (selectedCellRef.current && selectedCellRef.current.id === arguments[1]?.id) {
              selectedCellRef.current = null;
          }
      }
      if (onGraphChange && (eventName === 'add' || eventName === 'remove' || eventName.includes('change:'))) {
          onGraphChange();
      }
    });

    // UNIFIED Panning Logic
    let isPanning = false;
    let lastMousePos = { x: 0, y: 0 };

    paper.on('blank:pointerdown', (evt) => {
        isPanning = true;
        lastMousePos = { x: evt.clientX, y: evt.clientY };
    });

    const onMouseMove = (evt) => {
        if (isPanning) {
            const container = canvasRef.current.parentNode;
            container.scrollLeft -= evt.clientX - lastMousePos.x;
            container.scrollTop -= evt.clientY - lastMousePos.y;
            lastMousePos = { x: evt.clientX, y: evt.clientY };
        }
    };

    const onMouseUp = () => {
        isPanning = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Contextual Tools (Simple & Clean)
    paper.on('element:pointerclick', (elementView) => {
      paper.removeTools();
      selectedCellRef.current = elementView.model;
      const tools = new joint.dia.ToolsView({
        tools: [
          new joint.elementTools.Boundary({
            padding: 10,
            useModelGeometry: true,
            attrs: {
              rect: {
                fill: 'none',
                stroke: '#00285a',
                'stroke-width': 2,
                'stroke-dasharray': '5,5'
              }
            }
          }),
          new joint.elementTools.Remove({ offset: { x: 10, y: 10 } })
        ]
      });
      elementView.addTools(tools);
    });

    paper.on('link:pointerclick', (linkView) => {
      paper.removeTools();
      selectedCellRef.current = linkView.model;
      const tools = new joint.dia.ToolsView({
        tools: [
          new joint.linkTools.Boundary({
            attrs: {
              rect: {
                fill: 'none',
                stroke: '#00285a',
                'stroke-width': 2,
                'stroke-dasharray': '5,5'
              }
            }
          }),
          new joint.linkTools.Remove({ distance: '10%' }),
          new joint.linkTools.SourceArrowhead(),
          new joint.linkTools.TargetArrowhead()
        ]
      });
      linkView.addTools(tools);
    });

    paper.on('blank:pointerclick', () => {
      paper.removeTools();
      selectedCellRef.current = null;
    });

    // DOUBLE CLICK TO EDIT TEXT (modal-based)
    paper.on('element:pointerdblclick', (elementView) => {
        const node = elementView.model;
        const currentText = node.attr('label/text');
        setEditModal({
            isOpen: true,
            title: 'Text bearbeiten',
            value: currentText || '',
            onSave: (newText) => {
                node.attr('label/text', newText);
                const vhsType = node.get('type').split('.')[1]?.toLowerCase();
                if (vhsType) {
                    autoSizeForText(node, newText, vhsType);
                }
                if (onGraphChange) onGraphChange();
                setEditModal((prev) => ({ ...prev, isOpen: false }));
            }
        });
    });

    paper.on('link:pointerdblclick', (linkView) => {
        const link = linkView.model;
        const currentLabels = link.labels();
        const currentText = currentLabels[0]?.attrs?.text?.text || '';
        setEditModal({
            isOpen: true,
            title: 'Verbindungstext bearbeiten (z.B. Ja/Nein)',
            value: currentText,
            onSave: (newText) => {
                if (newText.trim() === '') {
                    link.labels([]);
                } else {
                    const newLabel = JSON.parse(JSON.stringify(linkLabelStyle));
                    newLabel.attrs.text.text = newText;
                    link.label(0, newLabel);
                }
                if (onGraphChange) onGraphChange();
                setEditModal((prev) => ({ ...prev, isOpen: false }));
            }
        });
    });

    // Hover Ports
    paper.on('element:mouseenter', (elementView) => {
      const ports = elementView.model.getPorts();
      ports.forEach(port => {
        elementView.model.portProp(port.id, 'attrs/circle/style', { visibility: 'visible' });
      });
    });

    paper.on('element:mouseleave', (elementView) => {
      const ports = elementView.model.getPorts();
      ports.forEach(port => {
        elementView.model.portProp(port.id, 'attrs/circle/style', { visibility: 'hidden' });
      });
    });

    // Ctrl + Mouse Wheel Zoom
    const onWheel = (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                if (onZoomInRef.current) onZoomInRef.current();
            } else {
                if (onZoomOutRef.current) onZoomOutRef.current();
            }
        }
    };

    const container = canvasRef.current.parentNode;
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
        if (highlightTimeoutRef.current) {
            window.clearTimeout(highlightTimeoutRef.current);
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        container.removeEventListener('wheel', onWheel);
    };

  }, []);

  useEffect(() => {
      if (paperRef.current) {
          paperRef.current.scale(zoomLevel, zoomLevel);
      }
  }, [zoomLevel]);


  const centerContent = () => {
      const bbox = paperRef.current.getContentBBox();
      const container = canvasRef.current.parentNode;
      container.scrollLeft = (bbox.x * zoomLevel) - (container.clientWidth / 2) + (bbox.width * zoomLevel / 2);
      container.scrollTop = (bbox.y * zoomLevel) - 20;
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
      setTimeout(centerContent, 100);
  };

  const focusNode = (nodeId) => {
      const node = graphRef.current?.getCell(nodeId);
      if (!node || !node.isElement()) return;

      const position = node.position();
      const size = node.size();
      const container = canvasRef.current.parentNode;

      container.scrollLeft = (position.x * zoomLevel) - (container.clientWidth / 2) + (size.width * zoomLevel / 2);
      container.scrollTop = (position.y * zoomLevel) - (container.clientHeight / 2) + (size.height * zoomLevel / 2);

      const currentStroke = node.attr('body/stroke');
      const currentWidth = node.attr('body/strokeWidth');
      node.attr('body/stroke', '#E1000F');
      node.attr('body/strokeWidth', 4);

      if (highlightTimeoutRef.current) {
          window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
          node.attr('body/stroke', currentStroke);
          node.attr('body/strokeWidth', currentWidth);
      }, 1800);
  };

  const setPresentationFocus = (nodeId = null) => {
      const cells = graphRef.current?.getCells() || [];
      cells.forEach((cell) => {
          const isFocus = !nodeId || cell.id === nodeId;
          const baseOpacity = !nodeId ? 1 : (isFocus ? 1 : 0.18);
          if (cell.isElement()) {
              cell.attr('root/opacity', baseOpacity);
          } else if (cell.isLink()) {
              const sourceId = cell.get('source')?.id;
              const targetId = cell.get('target')?.id;
              const linkFocused = !nodeId || sourceId === nodeId || targetId === nodeId;
              cell.attr('line/opacity', linkFocused ? 1 : 0.12);
          }
      });
      if (nodeId) {
          focusNode(nodeId);
      }
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
        if (onHistoryChange) onHistoryChange(historyRef.current?.canUndo() || false, historyRef.current?.canRedo() || false);
    },
    resetHistory: () => {
        historyRef.current?.clear();
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
        if (selectedCellRef.current) {
            selectedCellRef.current.remove();
            selectedCellRef.current = null;
            if (onGraphChange) onGraphChange();
        }
    },

    center: () => centerContent(),
    getZoom: () => zoomLevel,
    focusNode,
    setPresentationFocus,

    exportAsPNG: (filename, title) => exportToPNG(paperRef.current, filename, title),
    exportAsSVG: (filename, title) => exportToSVG(paperRef.current, filename, title),
    exportAsPDF: (filename, title) => exportToPDF(paperRef.current, filename, title),
    exportAsJSON: (filename) => exportToJSON(converterRef.current.toJson(), filename),
    captureDiagramImage: (title) => getDiagramPngDataUrl(paperRef.current, title)
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
      const point = paperRef.current.clientToLocalPoint(e.clientX, e.clientY);
      const { x, y } = point;

      let newNode;
      switch (nodeData.type) {
        case 'start': newNode = createStartNode(x - 70, y - 35, 'Start'); break;
        case 'end': newNode = createEndNode(x - 70, y - 35, 'Ende'); break;
        case 'decision': newNode = createDecisionNode(x - 90, y - 55, 'Entscheidung?'); break;
        case 'annotation': newNode = createAnnotationNode(x - 100, y - 40, 'Kommentar'); break;
        case 'process':
        default: newNode = createProcessNode(x - 80, y - 30, 'Prozess'); break;
      }

      if (newNode && graphRef.current) {
         graphRef.current.addCell(newNode);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div className="flex-grow h-full relative overflow-auto bg-[var(--color-vhs-blau-10)] rounded-tl-lg border-l border-t border-[var(--color-vhs-blau-20)]" style={{ scrollBehavior: 'auto' }}>
      <div
        ref={canvasRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="cursor-grab active:cursor-grabbing"
        id="vhs-jointjs-paper"
      />
      <EditTextModal
        isOpen={editModal.isOpen}
        title={editModal.title}
        initialValue={editModal.value}
        onSave={editModal.onSave || (() => {})}
        onCancel={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
});

export default DiagramCanvas;
