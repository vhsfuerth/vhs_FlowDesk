import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as joint from 'jointjs';
import { createGraph, createPaper } from '../diagram/graph';
import { HistoryManager } from '../diagram/history';
import { JSONConverter } from '../diagram/converter';
import { DiagramLayout } from '../diagram/layout';
import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createAnnotationNode } from '../diagram/shapes';
import { exportToPNG, exportToSVG, exportToPDF, exportToJSON } from '../export/file-export';

const DiagramCanvas = forwardRef(({ onGraphChange, onDiagramLoaded }, ref) => {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const historyRef = useRef(null);
  const converterRef = useRef(null);
  const layoutRef = useRef(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    // Make sure we only initialize once
    if (graphRef.current) return;

    const graph = createGraph();
    const paper = createPaper(graph, canvasRef.current);
    const history = new HistoryManager(graph);
    const converter = new JSONConverter(graph);
    const layout = new DiagramLayout(graph);

    graphRef.current = graph;
    paperRef.current = paper;
    historyRef.current = history;
    converterRef.current = converter;
    layoutRef.current = layout;

    // Track state changes for undo/redo UI updates
    graph.on('all', () => {
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());
      if (onGraphChange) onGraphChange();
    });

    // Clean up
    return () => {
      history.destroy();
      paper.remove();
      graph.clear();
    };
  }, [onGraphChange]);

  useImperativeHandle(ref, () => ({
    get graph() { return graphRef.current; },
    get paper() { return paperRef.current; },
    undo: () => historyRef.current?.undo(),
    redo: () => historyRef.current?.redo(),
    canUndo: () => canUndo,
    canRedo: () => canRedo,
    
    // Core Actions
    loadDiagram: (data) => {
        if (!graphRef.current) return;
        graphRef.current.clear();
        
        if (data && data.diagram) {
            // Restore from saved format
            converterRef.current.fromJson(data.diagram);
        }
        
        historyRef.current?.clear();
        if (onDiagramLoaded) onDiagramLoaded(data);
    },
    
    loadGeneratedData: (json) => {
        if (!graphRef.current) return;
        graphRef.current.clear();
        converterRef.current.fromJson(json);
        layoutRef.current.applyLayout();
        historyRef.current?.saveState();
    },

    getCurrentData: () => {
        return converterRef.current?.toJson();
    },

    clear: () => {
        graphRef.current?.clear();
        historyRef.current?.clear();
    },

    exportAsPNG: (filename) => exportToPNG(paperRef.current, filename),
    exportAsSVG: (filename) => exportToSVG(paperRef.current, filename),
    exportAsPDF: (filename) => exportToPDF(paperRef.current, filename),
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
      
      // Calculate drop position relative to canvas
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let newNode;
      switch (nodeData.type) {
        case 'start':
          newNode = createStartNode(x, y, nodeData.label);
          break;
        case 'end':
          newNode = createEndNode(x, y, nodeData.label);
          break;
        case 'decision':
          newNode = createDecisionNode(x - 90, y - 50, nodeData.label);
          break;
        case 'annotation':
          newNode = createAnnotationNode(x, y, nodeData.label);
          break;
        case 'process':
        default:
          newNode = createProcessNode(x - 80, y - 30, nodeData.label);
          break;
      }

      if (newNode && graphRef.current) {
         graphRef.current.addCell(newNode);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div className="flex-grow h-full relative overflow-hidden bg-[var(--color-vhs-blau-10)] rounded-tl-lg border-l border-t border-[var(--color-vhs-blau-20)]">
      <div 
        ref={canvasRef} 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="w-full h-full cursor-crosshair diagram-container"
        id="vhs-jointjs-paper"
      />
      
      {/* Zoom / History Controls absolute positioned over canvas */}
      <div className="absolute right-4 bottom-4 flex items-center space-x-2 bg-white rounded-md shadow p-1 border border-gray-200">
         <button 
           disabled={!canUndo} 
           onClick={() => historyRef.current?.undo()}
           className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
           title="Rückgängig"
         >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
         </button>
         <div className="w-px h-6 bg-gray-300 mx-1"></div>
         <button 
           disabled={!canRedo} 
           onClick={() => historyRef.current?.redo()}
           className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
           title="Wiederholen"
         >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg>
         </button>
      </div>
    </div>
  );
});

export default DiagramCanvas;
