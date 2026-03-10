import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import AiInputPanel from './components/AiInputPanel';
import Toolbar from './components/Toolbar';
import DiagramCanvas from './components/DiagramCanvas';
import ExportBar from './components/ExportBar';
import SettingsModal from './components/SettingsModal';
import DiagramListModal from './components/DiagramListModal';
import Notification from './components/Notification';
import { indexeddb } from './storage/indexeddb';
import { getLastDiagramId, setLastDiagramId } from './storage/settings';
import { generateUUID } from './utils/uuid';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'info' });
  const [currentDiagram, setCurrentDiagram] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const diagramCanvasRef = useRef(null);

  useEffect(() => {
    const loadInitialDiagram = async () => {
       const lastId = getLastDiagramId();
       let diagram = null;
       
       if (lastId) {
           diagram = await indexeddb.getDiagram(lastId);
       }
       
       if (diagram) {
           setCurrentDiagram(diagram);
           setTimeout(() => {
                if (diagramCanvasRef.current) {
                    diagramCanvasRef.current.loadDiagram(diagram);
                    setZoomLevel(diagramCanvasRef.current.getZoom());
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

  const getCleanFilename = () => {
      const name = currentDiagram?.name || 'diagram';
      return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const saveCurrentDiagram = async (nameOrEvent = null) => {
      if (!diagramCanvasRef.current) return;
      
      const pwaData = diagramCanvasRef.current.getCurrentData();
      
      let customName = null;
      if (typeof nameOrEvent === 'string') {
          customName = nameOrEvent;
      }
      
      const newDiagram = {
          ...(currentDiagram || {}),
          id: currentDiagram?.id || generateUUID(),
          name: customName || currentDiagram?.name || 'Unbenanntes Diagramm',
          updatedAt: new Date().toISOString(),
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
      setLastDiagramId(diagram.id);
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.loadDiagram(diagram);
          setZoomLevel(diagramCanvasRef.current.getZoom());
      }
      showNotification(`Diagramm "${diagram.name}" geladen`, 'info');
  };

  const handleNewDiagram = () => {
      const newId = generateUUID();
      const newD = {
          id: newId,
          name: 'Neues Diagramm',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          diagram: null
      };
      setCurrentDiagram(newD);
      setLastDiagramId(newId);
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.clear();
          setZoomLevel(1);
      }
  };

  const handleRenameDiagram = async (newName) => {
      if (!currentDiagram) return;
      const updated = { ...currentDiagram, name: newName };
      setCurrentDiagram(updated);
      
      const exists = await indexeddb.getDiagram(currentDiagram.id);
      if (exists) {
          await indexeddb.saveDiagram(updated);
      }
      showNotification('Diagramm umbenannt', 'info');
  };

  const handleClearDiagram = () => {
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.clear();
      }
      showNotification('Arbeitsfläche geleert (Rückgängig möglich).', 'info');
  };

  const handleAIGenerated = (diagramData) => {
      if (!diagramCanvasRef.current) return;
      diagramCanvasRef.current.loadGeneratedData(diagramData);
      showNotification('KI-Diagramm generiert', 'success');
      setTimeout(() => saveCurrentDiagram('KI Generiertes Diagramm'), 500); 
  };

  // Zoom handlers
  const handleZoomIn = () => {
    diagramCanvasRef.current?.zoomIn();
    setZoomLevel(diagramCanvasRef.current?.getZoom() || 1);
  };

  const handleZoomOut = () => {
    diagramCanvasRef.current?.zoomOut();
    setZoomLevel(diagramCanvasRef.current?.getZoom() || 1);
  };

  const handleCenter = () => {
    diagramCanvasRef.current?.center();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-vhs-blau-10)]">
      <Header 
        onSettingsClick={() => setIsSettingsOpen(true)} 
        currentDiagram={currentDiagram}
        onNewDiagram={handleNewDiagram}
        onDiagramSelect={handleDiagramSelect}
        onRename={handleRenameDiagram}
      />
      
      <AiInputPanel 
        onDiagramGenerated={handleAIGenerated}
        onError={(msg) => showNotification(msg, 'error')}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar />
        <DiagramCanvas 
           ref={diagramCanvasRef}
           onGraphChange={() => {}}
        />
      </div>

      <ExportBar 
         onExportSVG={() => diagramCanvasRef.current?.exportAsSVG(`${getCleanFilename()}.svg`, currentDiagram?.name)}
         onExportPNG={() => diagramCanvasRef.current?.exportAsPNG(`${getCleanFilename()}.png`, currentDiagram?.name)}
         onExportPDF={() => diagramCanvasRef.current?.exportAsPDF(`${getCleanFilename()}.pdf`, currentDiagram?.name)}
         onExportJSON={() => diagramCanvasRef.current?.exportAsJSON(`${getCleanFilename()}.json`)}
         onSave={saveCurrentDiagram}
         onClear={handleClearDiagram}
         onLoadClick={() => setIsLoadModalOpen(true)}
         zoomLevel={zoomLevel}
         onZoomIn={handleZoomIn}
         onZoomOut={handleZoomOut}
         onCenterContent={handleCenter}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <DiagramListModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onSelect={handleDiagramSelect}
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
