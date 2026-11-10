import React, { Suspense, lazy, useCallback, useReducer, useRef, useState } from 'react';
import Header from './components/Header';
import AiInputPanel from './components/AiInputPanel';
import Toolbar from './components/Toolbar';
import DiagramCanvas from './components/DiagramCanvas';
import ExportBar from './components/ExportBar';
import Notification from './components/Notification';
import QualityPanel from './components/QualityPanel';
import DiagramTextAlternative from './components/DiagramTextAlternative';
import { getDefaultMetadata } from './analysis/diagram-validation';
import { useConfirm } from './hooks/useConfirm';
import { useNotification } from './hooks/useNotification';
import { useDiagramDocument } from './hooks/useDiagramDocument';
import { useDiagramExport } from './hooks/useDiagramExport';
import { useDiagramValidation } from './hooks/useDiagramValidation';
import { useCanvasCommands } from './hooks/useCanvasCommands';
import { useSubprocess } from './hooks/useSubprocess';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePanelResize } from './hooks/usePanelResize';
import { MODALS, initialUiState, uiReducer } from './state/uiState';

// App verdrahtet nur: Zustand und Abläufe stecken in den Hooks unter src/hooks/,
// die Arbeitsfläche in DiagramCanvas (Zugriff über diagramCanvasRef).

// Dialoge werden erst beim ersten Öffnen nachgeladen
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const DiagramListModal = lazy(() => import('./components/DiagramListModal'));
const TemplateModal = lazy(() => import('./components/TemplateModal'));
const GuideModal = lazy(() => import('./components/GuideModal'));
const VersionHistoryModal = lazy(() => import('./components/VersionHistoryModal'));
const CopilotDialog = lazy(() => import('./components/copilot/CopilotDialog'));
const SubprocessDialog = lazy(() => import('./components/SubprocessDialog'));

const ZOOM_STEP = 0.1;
const roundZoom = (value) => Math.round(value * 10) / 10;

function App() {
  const [ui, dispatch] = useReducer(uiReducer, initialUiState);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [selectionCount, setSelectionCount] = useState(0);
  const [copilotText, setCopilotText] = useState('');
  const diagramCanvasRef = useRef(null);
  const canvas = () => diagramCanvasRef.current;

  const confirm = useConfirm();
  const { notification, showNotification, hideNotification } = useNotification();
  const closeModal = useCallback(() => dispatch({ type: 'closeModal' }), []);
  const openModal = (modal) => dispatch({ type: 'openModal', modal });

  const doc = useDiagramDocument({ canvasRef: diagramCanvasRef, notify: showNotification, confirm, setZoomLevel });
  const { currentDiagram, diagramMetadata, liveDiagramData } = doc;
  const exports = useDiagramExport({ canvasRef: diagramCanvasRef, currentDiagram, diagramMetadata, liveDiagramData, notify: showNotification });
  const commands = useCanvasCommands({ canvasRef: diagramCanvasRef, notify: showNotification, confirm });
  const subprocess = useSubprocess({
    openDialog: () => openModal(MODALS.SUBPROCESS),
    closeDialog: closeModal,
    selectDiagram: doc.selectDiagram,
    notify: showNotification
  });
  const validation = useDiagramValidation({
    diagram: liveDiagramData,
    improvementItems: diagramMetadata.improvementItems,
    currentDiagram,
    refreshKey: ui.openModal
  });
  const startPanelResize = usePanelResize({
    width: ui.qualityPanelWidth,
    onWidthChange: (width) => dispatch({ type: 'setQualityPanelWidth', width })
  });

  const zoomIn = useCallback(() => setZoomLevel((prev) => Math.min(2, roundZoom(prev + ZOOM_STEP))), []);
  const zoomOut = useCallback(() => setZoomLevel((prev) => Math.max(0.1, roundZoom(prev - ZOOM_STEP))), []);

  useKeyboardShortcuts({
    canvasRef: diagramCanvasRef,
    onSave: doc.saveDiagram,
    onDelete: commands.deleteSelection,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomReset: () => setZoomLevel(1),
    notify: showNotification
  });

  const handleTemplateApply = async (template) => {
    const opened = await doc.openAsNewDiagram({
      name: template.name,
      diagram: template.diagram,
      metadata: { ...getDefaultMetadata(), templateId: template.id }
    });
    if (!opened) return;
    closeModal();
    showNotification(`Vorlage "${template.name}" geladen`, 'success');
  };

  // Ergebnis des KI-Copilots als neues, ungespeichertes Diagramm öffnen
  const handleCopilotApply = async ({ diagram, title }) => {
    if (!(await doc.openAsNewDiagram({ name: title || 'KI-Prozess', diagram }))) return;
    closeModal();
    showNotification(`„${title}“ erstellt – bitte prüfen und speichern.`, 'success');
  };

  const handleOpenCopilot = (text = '') => {
    setCopilotText(text);
    openModal(MODALS.COPILOT);
  };

  // Struktur-Check, Qualitätspanel und Textfassung: zum Element springen und es auswählen
  const focusNode = (nodeId) => canvas()?.revealNode(nodeId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-vhs-blau-10)]">
      <a href="#vhs-jointjs-paper" className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:top-2 focus:left-2 focus:bg-white focus:text-[var(--color-vhs-blau)] focus:px-3 focus:py-2 focus:rounded focus:shadow">
        Zur Arbeitsfläche springen
      </a>
      <a href="#vhs-text-alternative" className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:top-2 focus:left-56 focus:bg-white focus:text-[var(--color-vhs-blau)] focus:px-3 focus:py-2 focus:rounded focus:shadow">
        Zum Ablauf als Text springen
      </a>
      <Header
        onSettingsClick={() => openModal(MODALS.SETTINGS)}
        currentDiagram={currentDiagram}
        onNewDiagram={doc.newDiagram}
        onDiagramSelect={doc.selectDiagram}
        onRename={doc.renameDiagram}
        onTemplateOpen={() => openModal(MODALS.TEMPLATES)}
        onGuideOpen={() => openModal(MODALS.GUIDE)}
      />

      <AiInputPanel
        onOpenCopilot={handleOpenCopilot}
        onBeforeGenerate={doc.confirmLeave}
        onDiagramGenerated={doc.applyGeneratedDiagram}
        onError={(msg) => showNotification(msg, 'error')}
      />

      <main className="flex flex-1 overflow-hidden relative">
        <Toolbar
          isCollapsed={ui.isToolbarCollapsed}
          onToggleCollapsed={() => dispatch({ type: 'toggleToolbar' })}
          validation={validation}
          onFocusNode={focusNode}
          onAddNode={(type) => canvas()?.addNodeAtCenter(type)}
        />
        <DiagramCanvas
          ref={diagramCanvasRef}
          onGraphChange={doc.handleGraphChange}
          onHistoryChange={(canUndo, canRedo) => setHistoryState((prev) => (
            prev.canUndo === canUndo && prev.canRedo === canRedo ? prev : { canUndo, canRedo }
          ))}
          onSelectionChange={setSelectionCount}
          zoomLevel={zoomLevel}
          onZoomSet={setZoomLevel}
          currentDiagramId={currentDiagram?.id}
          onOpenSubprocess={subprocess.openSubprocess}
          onNotify={showNotification}
          onDeleteRequest={commands.deleteSelection}
        />
        <QualityPanel
          diagramData={liveDiagramData}
          metadata={diagramMetadata}
          title={currentDiagram?.name}
          onMetadataChange={doc.setDiagramMetadata}
          onFocusNode={focusNode}
          onExportMeasures={exports.exportMeasures}
          onGetDiagramImage={() => canvas()?.captureDiagramImage('')}
          onSimulationFocus={(nodeId) => canvas()?.setPresentationFocus(nodeId || null)}
          isCollapsed={ui.isQualityPanelCollapsed}
          width={ui.qualityPanelWidth}
          onToggleCollapsed={() => dispatch({ type: 'toggleQualityPanel' })}
          onResizeStart={startPanelResize}
          validation={validation}
        />
      </main>

      <DiagramTextAlternative diagram={liveDiagramData} onFocusNode={focusNode} />

      <ExportBar
        onExportSVG={() => exports.exportImage('svg')}
        onExportPNG={() => exports.exportImage('png')}
        onExportPDF={() => exports.exportImage('pdf')}
        onExportJSON={exports.exportProjectJSON}
        onSave={doc.saveDiagram}
        saveStatus={doc.saveStatus}
        onClear={doc.clearDiagram}
        onLoadClick={() => openModal(MODALS.DIAGRAM_LIST)}
        onVersionsClick={currentDiagram?.id ? () => openModal(MODALS.VERSIONS) : undefined}
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onCenterContent={() => canvas()?.center()}
        onFitToView={commands.fitToView}
        onSearch={() => canvas()?.openSearch()}
        onUndo={() => canvas()?.undo()}
        onRedo={() => canvas()?.redo()}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        onAutoLayout={commands.autoLayout}
        onAutoLayoutSelection={commands.autoLayoutSelection}
        onAlign={(mode) => canvas()?.alignSelection(mode)}
        onDistribute={(axis) => canvas()?.distributeSelection(axis)}
        selectionCount={selectionCount}
        onExportDescription={exports.exportDescription}
      />

      <Suspense fallback={null}>
        {ui.openModal === MODALS.SETTINGS && <SettingsModal onClose={closeModal} />}
        {ui.openModal === MODALS.DIAGRAM_LIST && (
          <DiagramListModal onClose={closeModal} onSelect={doc.selectDiagram} onNotify={showNotification} />
        )}
        {ui.openModal === MODALS.TEMPLATES && <TemplateModal onClose={closeModal} onApply={handleTemplateApply} />}
        {ui.openModal === MODALS.GUIDE && <GuideModal onClose={closeModal} />}
        {ui.openModal === MODALS.VERSIONS && currentDiagram?.id && (
          <VersionHistoryModal
            onClose={closeModal}
            diagramId={currentDiagram.id}
            onRestore={doc.restoreVersion}
            currentDiagram={liveDiagramData}
          />
        )}
        {ui.openModal === MODALS.SUBPROCESS && subprocess.subprocessView && (
          <SubprocessDialog
            record={subprocess.subprocessView.record}
            initialMode={subprocess.subprocessView.mode}
            onSwitch={subprocess.switchToSubprocess}
            onClose={subprocess.closeSubprocess}
          />
        )}
        {ui.openModal === MODALS.COPILOT && (
          <CopilotDialog initialText={copilotText} onClose={closeModal} onApply={handleCopilotApply} />
        )}
      </Suspense>

      <Notification
        isVisible={notification.isVisible}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
      />
    </div>
  );
}

export default App;
