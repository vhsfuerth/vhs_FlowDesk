import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as joint from 'jointjs';
import { HistoryManager } from '../diagram/history';
import { JSONConverter } from '../diagram/converter';
import { DiagramLayout } from '../diagram/layout';
import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createAnnotationNode, autoSizeForText, linkLabelStyle } from '../diagram/shapes';
import { exportToPNG, exportToSVG, exportToPDF, exportToJSON } from '../export/file-export';

const DiagramCanvas = forwardRef(({ onGraphChange, onDiagramLoaded }, ref) => {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const historyRef = useRef(null);
  const converterRef = useRef(null);
  const layoutRef = useRef(null);
  const initializedRef = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

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
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());
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
      const tools = new joint.dia.ToolsView({
        tools: [
          new joint.elementTools.Remove({ offset: { x: 10, y: 10 } })
        ]
      });
      elementView.addTools(tools);
    });

    paper.on('link:pointerclick', (linkView) => {
      paper.removeTools();
      const tools = new joint.dia.ToolsView({
        tools: [
          new joint.linkTools.Remove({ distance: '10%' }),
          new joint.linkTools.SourceArrowhead(),
          new joint.linkTools.TargetArrowhead()
        ]
      });
      linkView.addTools(tools);
    });

    paper.on('blank:pointerclick', () => {
      paper.removeTools();
    });

    // DOUBLE CLICK TO EDIT TEXT
    paper.on('element:pointerdblclick', (elementView) => {
        const node = elementView.model;
        const currentText = node.attr('label/text');
        const newText = window.prompt('Text bearbeiten:', currentText);
        
        if (newText !== null) {
            node.attr('label/text', newText);
            
            // Re-calculate size based on type
            const vhsType = node.get('type').split('.')[1]?.toLowerCase();
            if (vhsType) {
                autoSizeForText(node, newText, vhsType);
            }
            if (onGraphChange) onGraphChange();
        }
    });

    paper.on('link:pointerdblclick', (linkView) => {
        const link = linkView.model;
        const currentLabels = link.labels();
        const currentText = currentLabels[0]?.attrs?.text?.text || '';
        const newText = window.prompt('Verbindungstext bearbeiten (z.B. Ja/Nein):', currentText);

        if (newText !== null) {
            if (newText.trim() === '') {
                link.labels([]); 
            } else {
                // Apply our standard style but with the new text
                const newLabel = JSON.parse(JSON.stringify(linkLabelStyle));
                newLabel.attrs.text.text = newText;
                link.label(0, newLabel);
            }
            if (onGraphChange) onGraphChange();
        }
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

    return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };

  }, []);

  const handleZoom = (delta) => {
      const newZoom = Math.max(0.1, Math.min(2, zoomLevel + delta));
      paperRef.current.scale(newZoom, newZoom);
      setZoomLevel(newZoom);
  };

  const centerContent = () => {
      const bbox = paperRef.current.getContentBBox();
      const container = canvasRef.current.parentNode;
      container.scrollLeft = (bbox.x * zoomLevel) - (container.clientWidth / 2) + (bbox.width * zoomLevel / 2);
      container.scrollTop = (bbox.y * zoomLevel) - 20;
  };

  useImperativeHandle(ref, () => ({
    loadDiagram: (data) => {
        if (!graphRef.current) return;
        graphRef.current.clear();
        if (data && data.diagram) {
            converterRef.current.fromJson(data.diagram);
        }
        historyRef.current?.clear();
        setTimeout(centerContent, 100);
        if (onDiagramLoaded) onDiagramLoaded(data);
    },
    
    loadGeneratedData: (json) => {
        if (!graphRef.current) return;
        graphRef.current.clear();
        converterRef.current.fromJson(json);
        layoutRef.current.applyLayout();
        historyRef.current?.saveState();
        setTimeout(centerContent, 100);
    },

    getCurrentData: () => converterRef.current?.toJson(),
    clear: () => {
        graphRef.current?.clear();
        historyRef.current?.clear();
    },

    zoomIn: () => handleZoom(0.1),
    zoomOut: () => handleZoom(-0.1),
    center: () => centerContent(),
    getZoom: () => zoomLevel,

    exportAsPNG: (filename, title) => exportToPNG(paperRef.current, filename, title),
    exportAsSVG: (filename, title) => exportToSVG(paperRef.current, filename, title),
    exportAsPDF: (filename, title) => exportToPDF(paperRef.current, filename, title),
    exportAsJSON: (filename) => exportToJSON(converterRef.current.toJson(), filename)
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
      const rect = canvasRef.current.getBoundingClientRect();
      const container = canvasRef.current.parentNode;
      
      const x = (e.clientX - rect.left + container.scrollLeft) / zoomLevel;
      const y = (e.clientY - rect.top + container.scrollTop) / zoomLevel;

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
    </div>
  );
});

export default DiagramCanvas;
