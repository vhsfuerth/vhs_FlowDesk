import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import TemplateModal from './components/TemplateModal';
import GuideModal from './components/GuideModal';
import QualityPanel from './components/QualityPanel';
import VersionHistoryModal from './components/VersionHistoryModal';
import { STARTER_TEMPLATES } from './data/templates';
import { getDefaultMetadata, normalizeMetadata, validateDiagram } from './analysis/diagram-validation';
import { exportMeasuresToCSV, exportToJSON } from './export/file-export';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'info' });
  const [currentDiagram, setCurrentDiagram] = useState(null);
  const [diagramMetadata, setDiagramMetadata] = useState(getDefaultMetadata());
  const [liveDiagramData, setLiveDiagramData] = useState({ nodes: [], edges: [] });
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isQualityPanelCollapsed, setIsQualityPanelCollapsed] = useState(false);
  const [qualityPanelWidth, setQualityPanelWidth] = useState(460);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const diagramCanvasRef = useRef(null);
  const resizeStateRef = useRef({ isActive: false, startX: 0, startWidth: 460 });

  const [pendingDiagram, setPendingDiagram] = useState(null);

  useEffect(() => {
    const loadInitialDiagram = async () => {
       const lastId = getLastDiagramId();
       let diagram = null;

       if (lastId) {
           diagram = await indexeddb.getDiagram(lastId);
       }

       if (diagram) {
           setCurrentDiagram(diagram);
           setDiagramMetadata(normalizeMetadata(diagram.metadata));
           setPendingDiagram(diagram);
       } else {
           handleNewDiagram();
       }
    };

    loadInitialDiagram();
  }, []);

  useEffect(() => {
    if (pendingDiagram && diagramCanvasRef.current) {
      diagramCanvasRef.current.loadDiagram(pendingDiagram);
      setLiveDiagramData(pendingDiagram.diagram || { nodes: [], edges: [] });
      setZoomLevel(diagramCanvasRef.current.getZoom());
      setPendingDiagram(null);
    }
  }, [pendingDiagram]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!resizeStateRef.current.isActive) return;
      const delta = resizeStateRef.current.startX - event.clientX;
      const nextWidth = Math.max(380, Math.min(760, resizeStateRef.current.startWidth + delta));
      setQualityPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      resizeStateRef.current.isActive = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        diagramCanvasRef.current?.undo();
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        diagramCanvasRef.current?.redo();
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if no modal is open
        const modalVisible = document.querySelector('[role="dialog"]') || 
                           document.querySelector('.fixed.inset-0.z-50');
        
        if (!modalVisible) {
           if (e.key === 'Backspace') {
             e.preventDefault();
           }
           diagramCanvasRef.current?.deleteSelected();
        }
      }

      // Zoom: Ctrl + / Ctrl - / Ctrl 0
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          setZoomLevel(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const notificationTimerRef = useRef(null);

  const showNotification = useCallback((message, type = 'info') => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setNotification({ isVisible: true, message, type });
    const duration = Math.max(4000, Math.min(10000, message.length * 60));
    notificationTimerRef.current = setTimeout(() => {
      setNotification((prev) => ({ ...prev, isVisible: false }));
    }, duration);
  }, []);

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
      } else {
          customName = currentDiagram?.name || 'Unbenanntes Diagramm';
      }
      
      let targetId = currentDiagram?.id;
      
      // Prüfen, ob wir einen neuen Speicherstand anlegen müssen (Namensänderung)
      if (targetId) {
          const existingInDb = await indexeddb.getDiagram(targetId);
          if (existingInDb && existingInDb.name !== customName) {
              // Name hat sich geändert -> Neuer Speicherstand (ID neu generieren)
              targetId = generateUUID();
              showNotification(`Neuer Speicherstand "${customName}" erstellt`, 'success');
          }
      }
      
      const newDiagram = {
          ...(currentDiagram || {}),
          id: targetId || generateUUID(),
          name: customName,
          updatedAt: new Date().toISOString(),
          diagram: pwaData,
          metadata: normalizeMetadata(diagramMetadata)
      };
      
      try {
          const saved = await indexeddb.saveDiagram(newDiagram);
          setCurrentDiagram(saved);
          setLastDiagramId(saved.id);

          // Automatisch eine Version anlegen
          const version = {
              id: generateUUID(),
              diagramId: saved.id,
              savedAt: saved.updatedAt,
              note: '',
              snapshot: saved
          };
          await indexeddb.saveVersion(version).catch(() => {/* Versionierung ist optional */});

          // Falls wir nicht gerade wegen Namensänderung schon benachrichtigt haben
          if (targetId === currentDiagram?.id) {
            showNotification('Diagramm erfolgreich gespeichert', 'success');
          }
      } catch(e) {
          showNotification('Fehler beim Speichern', 'error');
      }
  };

  const handleDiagramSelect = (diagram) => {
      setCurrentDiagram(diagram);
      setDiagramMetadata(normalizeMetadata(diagram.metadata));
      setLiveDiagramData(diagram.diagram || { nodes: [], edges: [] });

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
          diagram: null,
          metadata: getDefaultMetadata()
      };
      setCurrentDiagram(newD);
      setDiagramMetadata(getDefaultMetadata());
      setLiveDiagramData({ nodes: [], edges: [] });

      setLastDiagramId(newId);
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.clear();
          diagramCanvasRef.current.resetHistory();
          setZoomLevel(1);
      }
  };

  const handleRenameDiagram = (newName) => {
      if (!currentDiagram) return;
      const updated = { ...currentDiagram, name: newName };
      setCurrentDiagram(updated);
      showNotification('Name geändert (Speichern zum Sichern)', 'info');
  };

  const handleClearDiagram = () => {
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.setPresentationFocus(null);
          diagramCanvasRef.current.clear();
      }
      setLiveDiagramData({ nodes: [], edges: [] });

      setDiagramMetadata((prev) => ({ ...prev, improvementItems: [] }));
      showNotification('Arbeitsfläche geleert (Rückgängig möglich).', 'info');
  };

  const handleAIGenerated = (diagramData) => {
      if (!diagramCanvasRef.current) return;
      diagramCanvasRef.current.loadGeneratedData(diagramData);
      setLiveDiagramData(diagramData);

      showNotification('KI-Diagramm generiert', 'success');
      setTimeout(() => saveCurrentDiagram('KI Generiertes Diagramm'), 500); 
  };

  const handleGraphChange = () => {
    const latestData = diagramCanvasRef.current?.getCurrentData();
    if (latestData) {
      setLiveDiagramData(latestData);
    }
  };

  const handleTemplateApply = (template) => {
    const newId = generateUUID();
    const nextDiagram = {
      id: newId,
      name: template.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diagram: template.diagram,
      metadata: {
        ...getDefaultMetadata(),
        templateId: template.id
      }
    };

    setCurrentDiagram(nextDiagram);
    setDiagramMetadata(normalizeMetadata(nextDiagram.metadata));
    setLiveDiagramData(template.diagram);
    setLastDiagramId(newId);
    setIsTemplateModalOpen(false);

    setTimeout(() => {
      diagramCanvasRef.current?.loadJson(template.diagram);
      setZoomLevel(diagramCanvasRef.current?.getZoom() || 1);
    }, 50);

    showNotification(`Vorlage "${template.name}" geladen`, 'success');
  };

  const handleFocusNode = (nodeId) => {
    diagramCanvasRef.current?.focusNode(nodeId);
  };

  const handleExportProjectJSON = () => {
    if (!currentDiagram) return;
    const project = {
      ...currentDiagram,
      diagram: diagramCanvasRef.current?.getCurrentData() || currentDiagram.diagram || { nodes: [], edges: [] },
      metadata: normalizeMetadata(diagramMetadata)
    };
    exportToJSON(project, `${getCleanFilename() || 'diagram'}_projekt.json`);
  };

  const handleExportMeasures = () => {
    const diagram = diagramCanvasRef.current?.getCurrentData() || liveDiagramData;
    const nodeLookup = (nodeId) => diagram?.nodes?.find((node) => node.id === nodeId)?.label || '';
    exportMeasuresToCSV(
      diagramMetadata.improvementItems,
      nodeLookup,
      `${getCleanFilename() || 'diagram'}_massnahmen.csv`
    );
    showNotification('Maßnahmenliste exportiert', 'success');
  };

  const handleVersionRestore = (version) => {
      const restoredDiagram = {
          ...(version.snapshot || {}),
          id: generateUUID(),
          name: `${version.snapshot?.name || 'Diagramm'} (wiederhergestellt)`,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
      };
      setCurrentDiagram(restoredDiagram);
      setDiagramMetadata(normalizeMetadata(restoredDiagram.metadata));
      setLiveDiagramData(restoredDiagram.diagram || { nodes: [], edges: [] });

      setLastDiagramId(restoredDiagram.id);
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.loadDiagram(restoredDiagram);
          setZoomLevel(diagramCanvasRef.current.getZoom());
      }
      showNotification('Version wiederhergestellt (ungespeichert)', 'success');
  };

  const handleSimulationFocus = (nodeId) => {
      diagramCanvasRef.current?.setPresentationFocus(nodeId || null);
  };

  const handleQualityPanelResizeStart = (event) => {
    resizeStateRef.current = {
      isActive: true,
      startX: event.clientX,
      startWidth: qualityPanelWidth
    };
  };

  const handleQualityPanelToggle = () => {
    setIsQualityPanelCollapsed((prev) => !prev);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10));
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
        onTemplateOpen={() => setIsTemplateModalOpen(true)}
        onGuideOpen={() => setIsGuideModalOpen(true)}
      />
      
      <AiInputPanel 
        onDiagramGenerated={handleAIGenerated}
        onError={(msg) => showNotification(msg, 'error')}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar
          isCollapsed={isToolbarCollapsed}
          onToggleCollapsed={() => setIsToolbarCollapsed((prev) => !prev)}
          validation={useMemo(() => validateDiagram(liveDiagramData, diagramMetadata.improvementItems), [liveDiagramData, diagramMetadata.improvementItems])}
          onFocusNode={handleFocusNode}
        />
        <DiagramCanvas
           ref={diagramCanvasRef}
           onGraphChange={handleGraphChange}
           onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
           zoomLevel={zoomLevel}
           onZoomIn={handleZoomIn}
           onZoomOut={handleZoomOut}
        />
        <QualityPanel
          diagramData={liveDiagramData}
          metadata={diagramMetadata}
          title={currentDiagram?.name}
          onMetadataChange={setDiagramMetadata}
          onFocusNode={handleFocusNode}
          onExportMeasures={handleExportMeasures}
          onGetDiagramImage={() => diagramCanvasRef.current?.captureDiagramImage('')}
          onSimulationFocus={handleSimulationFocus}
          isCollapsed={isQualityPanelCollapsed}
          width={qualityPanelWidth}
          onToggleCollapsed={handleQualityPanelToggle}
          onResizeStart={handleQualityPanelResizeStart}
        />
      </div>

      <ExportBar
         onExportSVG={() => diagramCanvasRef.current?.exportAsSVG(`${getCleanFilename()}.svg`, currentDiagram?.name)}
         onExportPNG={() => diagramCanvasRef.current?.exportAsPNG(`${getCleanFilename()}.png`, currentDiagram?.name)?.catch((err) => showNotification(err.message, 'error'))}
         onExportPDF={() => diagramCanvasRef.current?.exportAsPDF(`${getCleanFilename()}.pdf`, currentDiagram?.name)?.catch((err) => showNotification(err.message, 'error'))}
         onExportJSON={handleExportProjectJSON}
         onSave={saveCurrentDiagram}
         onClear={handleClearDiagram}
         onLoadClick={() => setIsLoadModalOpen(true)}
         onVersionsClick={currentDiagram?.id ? () => setIsVersionHistoryOpen(true) : undefined}
         zoomLevel={zoomLevel}
         onZoomIn={handleZoomIn}
         onZoomOut={handleZoomOut}
         onCenterContent={handleCenter}
         onUndo={() => diagramCanvasRef.current?.undo()}
         onRedo={() => diagramCanvasRef.current?.redo()}
         canUndo={canUndo}
         canRedo={canRedo}
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

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={STARTER_TEMPLATES}
        onApply={handleTemplateApply}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        diagramId={currentDiagram?.id}
        onRestore={handleVersionRestore}
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
