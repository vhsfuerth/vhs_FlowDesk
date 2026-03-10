import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import AiInputPanel from './components/AiInputPanel';
import Toolbar from './components/Toolbar';
import DiagramCanvas from './components/DiagramCanvas';
import ExportBar from './components/ExportBar';
import SettingsModal from './components/SettingsModal';
import Notification from './components/Notification';
import { indexeddb } from './storage/indexeddb';
import { getLastDiagramId, setLastDiagramId } from './storage/settings';
import { generateUUID } from './utils/uuid';
import { importJSON } from './storage/file-import';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'info' });
  const [currentDiagram, setCurrentDiagram] = useState(null);
  
  const diagramCanvasRef = useRef(null);

  useEffect(() => {
    // Initial Load - restore last opened diagram or create new
    const loadInitialDiagram = async () => {
       const lastId = getLastDiagramId();
       let diagram = null;
       
       if (lastId) {
           diagram = await indexeddb.getDiagram(lastId);
       }
       
       if (diagram) {
           setCurrentDiagram(diagram);
           // Wait next tick for component mount
           setTimeout(() => {
                if (diagramCanvasRef.current) {
                    diagramCanvasRef.current.loadDiagram(diagram);
                }
           }, 100);
       } else {
           handleNewDiagram();
       }
    };
    
    loadInitialDiagram();
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ isVisible: true, message, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, isVisible: false }));
    }, 4000);
  };

  const handleDiagramChange = () => {
      // Auto-save logic could go here, but for now we debounce saving to manual 'save' or significant events to avoid overhead
      // The diagram object itself is not updated constantly, only when saving.
  };

  const saveCurrentDiagram = async (customName = null) => {
      if (!diagramCanvasRef.current) return;
      
      const pwaData = diagramCanvasRef.current.getCurrentData();
      
      const newDiagram = {
          ...(currentDiagram || {}),
          id: currentDiagram?.id || generateUUID(),
          name: customName || currentDiagram?.name || 'Unbenanntes Diagramm',
          createdAt: currentDiagram?.createdAt || new Date().toISOString(),
          diagram: pwaData
      };
      
      try {
          const saved = await indexeddb.saveDiagram(newDiagram);
          setCurrentDiagram(saved);
          setLastDiagramId(saved.id);
          showNotification('Diagramm erfolgreich gespeichert', 'success');
      } catch(e) {
          showNotification('Fehler beim Speichern', 'error');
      }
  };

  const handleDiagramSelect = (diagram) => {
      setCurrentDiagram(diagram);
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.loadDiagram(diagram);
      }
      showNotification(`Diagramm "${diagram.name}" geladen`, 'info');
  };

  const handleNewDiagram = () => {
      setCurrentDiagram({
          id: generateUUID(),
          name: 'Neues Diagramm',
          createdAt: new Date().toISOString()
      });
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.clear();
      }
  };

  const handleAIGenerated = (diagramData) => {
      if (!diagramCanvasRef.current) return;
      diagramCanvasRef.current.loadGeneratedData(diagramData);
      showNotification('Diagramm erfolgreich per KI generiert', 'success');
      // Autosave right after AI generation
      setTimeout(() => saveCurrentDiagram('KI Generiertes Diagramm'), 500); 
  };

  // Export handlers
  const handleExportPNG = () => {
    diagramCanvasRef.current?.exportAsPNG('vhs-flowchart.png');
  };

  const handleExportSVG = () => {
    diagramCanvasRef.current?.exportAsSVG('vhs-flowchart.svg');
  };

  const handleExportPDF = () => {
    diagramCanvasRef.current?.exportAsPDF('vhs-flowchart.pdf');
  };

  const handleExportJSON = () => {
     diagramCanvasRef.current?.exportAsJSON('vhs-flowchart.json');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-vhs-blau-10)]">
      <Header 
        onSettingsClick={() => setIsSettingsOpen(true)} 
        currentDiagramName={currentDiagram?.name}
        onNewDiagram={handleNewDiagram}
        onDiagramSelect={handleDiagramSelect}
      />
      
      <AiInputPanel 
        onDiagramGenerated={handleAIGenerated}
        onError={(msg) => showNotification(msg, 'error')}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar />
        <DiagramCanvas 
           ref={diagramCanvasRef}
           onGraphChange={handleDiagramChange}
        />
      </div>

      <ExportBar 
         onExportSVG={handleExportSVG}
         onExportPNG={handleExportPNG}
         onExportPDF={handleExportPDF}
         onExportJSON={handleExportJSON}
         onSave={saveCurrentDiagram}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      
      <Notification 
        isVisible={notification.isVisible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />
    </div>
  );
}

export default App;
