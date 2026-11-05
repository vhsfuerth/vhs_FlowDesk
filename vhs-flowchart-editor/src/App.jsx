import React, { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Header from './components/Header';
import AiInputPanel from './components/AiInputPanel';
import Toolbar from './components/Toolbar';
import DiagramCanvas from './components/DiagramCanvas';
import ExportBar from './components/ExportBar';
import Notification from './components/Notification';
import QualityPanel from './components/QualityPanel';
import DiagramTextAlternative from './components/DiagramTextAlternative';
import { indexeddb } from './storage/indexeddb';
import { getLastDiagramId, setLastDiagramId } from './storage/settings';
import { CURRENT_SCHEMA_VERSION } from './storage/schema';
import { isDraftNewer } from './storage/autosave';
import { generateUUID } from './utils/uuid';
import { getDefaultMetadata, normalizeMetadata, validateDiagram } from './analysis/diagram-validation';
import { exportMeasuresToCSV, exportToJSON } from './export/file-export';
import { useConfirm } from './hooks/useConfirm';
import { useAutosave } from './hooks/useAutosave';
import { MODALS, initialUiState, uiReducer } from './state/uiState';

// Dialoge werden erst beim ersten Öffnen nachgeladen
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const DiagramListModal = lazy(() => import('./components/DiagramListModal'));
const TemplateModal = lazy(() => import('./components/TemplateModal'));
const GuideModal = lazy(() => import('./components/GuideModal'));
const VersionHistoryModal = lazy(() => import('./components/VersionHistoryModal'));
const CopilotDialog = lazy(() => import('./components/copilot/CopilotDialog'));
const SubprocessDialog = lazy(() => import('./components/SubprocessDialog'));

const EMPTY_DIAGRAM = { nodes: [], edges: [] };

const countLabel = (count) => `${count} ${count === 1 ? 'Element' : 'Elemente'}`;

const formatDateTime = (iso) => new Date(iso).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

function App() {
  const [ui, dispatch] = useReducer(uiReducer, initialUiState);
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'info' });
  const [currentDiagram, setCurrentDiagram] = useState(null);
  const [diagramMetadata, setDiagramMetadata] = useState(getDefaultMetadata);
  const [liveDiagramData, setLiveDiagramData] = useState(EMPTY_DIAGRAM);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [selectionCount, setSelectionCount] = useState(0);
  const [copilotText, setCopilotText] = useState('');
  // Teilprozess-Abfrage bzw. -Ansicht: { record, mode: 'ask' | 'preview' }
  const [subprocessView, setSubprocessView] = useState(null);

  const diagramCanvasRef = useRef(null);
  const resizeStateRef = useRef({ isActive: false, startX: 0, startWidth: initialUiState.qualityPanelWidth });
  const notificationTimerRef = useRef(null);
  const saveDiagramRef = useRef(null);
  const graphChangeFrameRef = useRef(null);

  const confirm = useConfirm();
  const { status: saveStatus, isDirty, markClean, markUnsaved, cancelPendingDraft } = useAutosave({
    record: currentDiagram,
    diagram: liveDiagramData,
    metadata: diagramMetadata
  });

  const showNotification = useCallback((message, type = 'info') => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setNotification({ isVisible: true, message, type });
    const duration = Math.max(4000, Math.min(10000, message.length * 60));
    notificationTimerRef.current = setTimeout(() => {
      setNotification((prev) => ({ ...prev, isVisible: false }));
    }, duration);
  }, []);

  const closeModal = useCallback(() => dispatch({ type: 'closeModal' }), []);
  const openModal = (modal) => dispatch({ type: 'openModal', modal });

  // Lädt einen Datensatz in Editor und App-Zustand. `unsaved`: Inhalt ist noch nicht gespeichert.
  const openRecord = useCallback((record, { unsaved = false } = {}) => {
    const canvas = diagramCanvasRef.current;
    const metadata = normalizeMetadata(record.metadata);
    let data = record.diagram || EMPTY_DIAGRAM;
    if (canvas) {
      canvas.loadDiagram(record);
      data = canvas.getCurrentData() || EMPTY_DIAGRAM;
      setZoomLevel(canvas.getZoom());
    }
    setCurrentDiagram(record);
    setDiagramMetadata(metadata);
    setLiveDiagramData(data);
    setLastDiagramId(record.id);
    if (unsaved) {
      markUnsaved();
    } else {
      markClean({ name: record.name, diagram: data, metadata });
    }
  }, [markClean, markUnsaved]);

  const startNewDiagram = useCallback(() => {
    const now = new Date().toISOString();
    openRecord({
      id: generateUUID(),
      name: 'Neues Diagramm',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      diagram: null,
      metadata: getDefaultMetadata()
    });
    setZoomLevel(1);
  }, [openRecord]);

  // Bietet einen Autosave-Entwurf zur Wiederherstellung an, falls er neuer als der gespeicherte Stand ist.
  // Liefert den wiederherzustellenden Datensatz oder null.
  const offerDraftRecovery = useCallback(async (diagramId, savedRecord) => {
    const draft = await indexeddb.getDraft(diagramId).catch(() => null);
    if (!draft) return null;
    if (!isDraftNewer(draft, savedRecord)) {
      await indexeddb.deleteDraft(diagramId).catch(() => {});
      return null;
    }
    const restore = await confirm({
      title: 'Ungespeicherte Änderungen gefunden',
      message: `Für „${draft.record.name}“ gibt es einen automatisch gesicherten Entwurf vom ${formatDateTime(draft.savedAt)}`
        + (savedRecord ? ', der neuer ist als die zuletzt gespeicherte Version.' : '. Das Diagramm wurde noch nie gespeichert.')
        + '\n\nMöchten Sie den Entwurf wiederherstellen?',
      confirmLabel: 'Entwurf wiederherstellen',
      cancelLabel: 'Entwurf verwerfen'
    });
    if (!restore) {
      await indexeddb.deleteDraft(diagramId).catch(() => {});
      return null;
    }
    return draft.record;
  }, [confirm]);

  // Fragt nach, bevor ungespeicherte Änderungen durch ein anderes Diagramm ersetzt werden.
  const confirmLeave = useCallback(async () => {
    if (!isDirty) return true;
    const discard = await confirm({
      title: 'Ungespeicherte Änderungen',
      message: `„${currentDiagram?.name || 'Unbenanntes Diagramm'}“ enthält ungespeicherte Änderungen. Wenn Sie fortfahren, gehen diese verloren.`,
      confirmLabel: 'Änderungen verwerfen',
      cancelLabel: 'Abbrechen',
      tone: 'danger'
    });
    if (discard && currentDiagram?.id) {
      cancelPendingDraft();
      await indexeddb.deleteDraft(currentDiagram.id).catch(() => {});
    }
    return discard;
  }, [isDirty, confirm, currentDiagram, cancelPendingDraft]);

  useEffect(() => {
    let cancelled = false;
    const loadInitialDiagram = async () => {
      const lastId = getLastDiagramId();
      const saved = lastId ? await indexeddb.getDiagram(lastId).catch(() => null) : null;
      const draftRecord = lastId ? await offerDraftRecovery(lastId, saved) : null;
      if (cancelled) return;

      if (draftRecord) {
        openRecord(draftRecord, { unsaved: true });
        showNotification('Entwurf wiederhergestellt – bitte speichern, um ihn zu übernehmen.', 'info');
      } else if (saved) {
        openRecord(saved);
      } else {
        startNewDiagram();
      }
    };

    loadInitialDiagram();
    return () => { cancelled = true; };
  }, [offerDraftRecovery, openRecord, showNotification, startNewDiagram]);

  // Warnung beim Schließen des Tabs mit ungespeicherten Änderungen
  useEffect(() => {
    if (!isDirty) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!resizeStateRef.current.isActive) return;
      const delta = resizeStateRef.current.startX - event.clientX;
      dispatch({ type: 'setQualityPanelWidth', width: resizeStateRef.current.startWidth + delta });
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

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10));
  }, []);

  // Feinere Stufen (Mausrad/Touchpad), begrenzt in DiagramCanvas
  const handleZoomSet = useCallback((level) => setZoomLevel(level), []);

  // Entf bzw. X am Element: Liegt ein einzelner Schritt im Ablauf, wird angeboten,
  // Vorgänger und Nachfolger direkt zu verbinden. Beides lässt sich mit Strg+Z zurücknehmen.
  const handleDeleteSelection = useCallback(async () => {
    const canvas = diagramCanvasRef.current;
    if (!canvas) return;
    const bridge = canvas.getBridgeInfo();
    if (!bridge) {
      canvas.deleteSelected();
      return;
    }
    const keepFlow = await confirm({
      title: 'Schritt entfernen',
      message: `„${bridge.label || 'Unbenannter Schritt'}“ liegt zwischen anderen Schritten. Sollen Vorgänger und Nachfolger danach direkt verbunden werden, damit der Ablauf erhalten bleibt?`,
      confirmLabel: 'Entfernen und Ablauf verbinden',
      cancelLabel: 'Nur entfernen'
    });
    canvas.deleteSelected({ bridge: keepFlow });
  }, [confirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isModifier = e.ctrlKey || e.metaKey;

      // Save: Ctrl+S (auch in Eingabefeldern, damit der Browser-Dialog nicht erscheint)
      if (isModifier && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDiagramRef.current?.();
        return;
      }

      // Suche: Strg+F (auch aus dem Suchfeld heraus, nicht bei offenen Dialogen)
      if (isModifier && e.key.toLowerCase() === 'f' && !e.shiftKey && !e.altKey) {
        if (document.querySelector('[aria-modal="true"]')) return;
        e.preventDefault();
        diagramCanvasRef.current?.openSearch();
        return;
      }

      // Ignore if user is typing in an input or textarea
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput) return;

      // Kein Bearbeiten im Hintergrund, solange ein Dialog offen ist
      const modalVisible = document.querySelector('[aria-modal="true"]');
      if (modalVisible) return;

      // Undo: Ctrl+Z
      if (isModifier && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        diagramCanvasRef.current?.undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((isModifier && e.key.toLowerCase() === 'y') ||
          (isModifier && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        diagramCanvasRef.current?.redo();
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.key === 'Backspace') {
          e.preventDefault();
        }
        handleDeleteSelection();
        return;
      }

      const canvas = diagramCanvasRef.current;
      const key = e.key.toLowerCase();

      // Text auf der Fläche bearbeiten – nur, wenn kein Bedienelement den Fokus hat
      const active = document.activeElement;
      const focusOnCanvas = !active || active === document.body || Boolean(active.closest?.('#vhs-canvas-scroll'));
      if (canvas && focusOnCanvas && !isModifier && !e.altKey) {
        if (e.key === 'F2' || e.key === 'Enter') {
          if (canvas.editSelection()) e.preventDefault();
          return;
        }
        // Lostippen ersetzt den Text des ausgewählten Elements
        if (e.key.length === 1 && e.key !== ' ' && canvas.editSelection(e.key)) {
          e.preventDefault();
          return;
        }
      }

      // Kopieren / Einfügen / Duplizieren / Alles auswählen
      if (isModifier && !e.shiftKey && canvas) {
        if (key === 'c') {
          const count = canvas.copySelection();
          if (count) {
            e.preventDefault();
            showNotification(`${countLabel(count)} kopiert`, 'info');
          }
          return;
        }
        if (key === 'v') {
          const count = canvas.paste();
          if (count) {
            e.preventDefault();
            showNotification(`${countLabel(count)} eingefügt`, 'info');
          }
          return;
        }
        if (key === 'd') {
          e.preventDefault();
          canvas.duplicateSelection();
          return;
        }
        if (key === 'a') {
          e.preventDefault();
          canvas.selectAll();
          return;
        }
      }

      if (e.key === 'Escape') {
        canvas?.clearSelection();
      }

      // Auswahl mit Pfeiltasten verschieben (Umschalt = in 1-Pixel-Schritten)
      const arrowDirections = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (arrowDirections[e.key] && !isModifier) {
        const step = e.shiftKey ? 1 : 10;
        const [dx, dy] = arrowDirections[e.key];
        if (canvas?.moveSelection(dx * step, dy * step)) e.preventDefault();
      }

      // Zoom: Ctrl + / Ctrl - / Ctrl 0
      if (isModifier) {
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
  }, [handleZoomIn, handleZoomOut, showNotification, handleDeleteSelection]);

  const getCleanFilename = () => {
      const name = currentDiagram?.name || 'diagram';
      return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const saveCurrentDiagram = async (nameOrEvent = null) => {
      const canvas = diagramCanvasRef.current;
      if (!canvas) return;

      const pwaData = canvas.getCurrentData();
      const customName = typeof nameOrEvent === 'string'
          ? nameOrEvent
          : (currentDiagram?.name || 'Unbenanntes Diagramm');

      const previousId = currentDiagram?.id;
      let targetId = previousId;
      let isNewRecord = false;

      // Prüfen, ob wir einen neuen Speicherstand anlegen müssen (Namensänderung)
      if (targetId) {
          const existingInDb = await indexeddb.getDiagram(targetId).catch(() => null);
          if (existingInDb && existingInDb.name !== customName) {
              targetId = generateUUID();
              isNewRecord = true;
          }
      }

      const metadata = normalizeMetadata(diagramMetadata);
      const newDiagram = {
          ...(currentDiagram || {}),
          id: targetId || generateUUID(),
          name: customName,
          diagram: pwaData,
          metadata
      };

      try {
          cancelPendingDraft();
          const saved = await indexeddb.saveDiagram(newDiagram);
          setCurrentDiagram(saved);
          setLastDiagramId(saved.id);
          markClean({ name: saved.name, diagram: pwaData, metadata });

          // Entwürfe sind mit dem Speichern übernommen
          await Promise.all(
            [...new Set([previousId, saved.id].filter(Boolean))].map((id) => indexeddb.deleteDraft(id))
          ).catch(() => {});

          // Automatisch eine Version anlegen
          const version = {
              id: generateUUID(),
              diagramId: saved.id,
              savedAt: saved.updatedAt,
              note: '',
              snapshot: saved
          };
          await indexeddb.saveVersion(version).catch(() => {/* Versionierung ist optional */});

          showNotification(isNewRecord ? `Neuer Speicherstand "${customName}" erstellt` : 'Diagramm erfolgreich gespeichert', 'success');
      } catch (error) {
          console.error('Speichern fehlgeschlagen:', error);
          showNotification(error?.message?.startsWith('Speicherplatz') ? error.message : 'Fehler beim Speichern', 'error');
      }
  };

  useEffect(() => {
    saveDiagramRef.current = saveCurrentDiagram;
  });

  const handleDiagramSelect = async (record) => {
      if (!(await confirmLeave())) return;
      const draftRecord = await offerDraftRecovery(record.id, record);
      openRecord(draftRecord || record, { unsaved: Boolean(draftRecord) });
      showNotification(
        draftRecord ? `Entwurf von "${record.name}" wiederhergestellt` : `Diagramm "${record.name}" geladen`,
        'info'
      );
  };

  // Teilprozess öffnen. mode: 'ask' = nachfragen (Symbol im Element), 'preview' = hier anzeigen,
  // 'switch' = zum Teilprozess wechseln (fragt bei ungespeicherten Änderungen nach)
  const handleOpenSubprocess = async (diagramId, mode = 'ask') => {
      const record = await indexeddb.getDiagram(diagramId).catch(() => null);
      if (!record) {
          showNotification('Das verknüpfte Diagramm wurde nicht gefunden. Bitte die Verknüpfung prüfen.', 'error');
          return;
      }
      if (mode === 'switch') {
          await handleDiagramSelect(record);
          return;
      }
      setSubprocessView({ record, mode });
      openModal(MODALS.SUBPROCESS);
  };

  const handleSubprocessSwitch = async () => {
      const record = subprocessView?.record;
      closeModal();
      setSubprocessView(null);
      if (record) await handleDiagramSelect(record);
  };

  const handleNewDiagram = async () => {
      if (!(await confirmLeave())) return;
      startNewDiagram();
  };

  const handleRenameDiagram = (newName) => {
      if (!currentDiagram) return;
      setCurrentDiagram({ ...currentDiagram, name: newName });
      showNotification('Name geändert (Speichern zum Sichern)', 'info');
  };

  const handleClearDiagram = () => {
      if (diagramCanvasRef.current) {
          diagramCanvasRef.current.setPresentationFocus(null);
          diagramCanvasRef.current.clear();
      }
      setLiveDiagramData(EMPTY_DIAGRAM);

      setDiagramMetadata((prev) => ({ ...prev, improvementItems: [] }));
      showNotification('Arbeitsfläche geleert (Rückgängig möglich).', 'info');
  };

  const handleAIGenerated = (diagramData) => {
      const canvas = diagramCanvasRef.current;
      if (!canvas) return;
      canvas.loadGeneratedData(diagramData);
      setLiveDiagramData(canvas.getCurrentData() || diagramData);

      showNotification('KI-Diagramm generiert', 'success');
      setTimeout(() => saveDiagramRef.current?.('KI Generiertes Diagramm'), 500);
  };

  // Viele Einzeländerungen (z. B. beim Ziehen mehrerer Elemente) zu einer
  // Aktualisierung pro Bildschirmbild zusammenfassen
  const handleGraphChange = () => {
    if (graphChangeFrameRef.current) return;
    graphChangeFrameRef.current = requestAnimationFrame(() => {
      graphChangeFrameRef.current = null;
      const latestData = diagramCanvasRef.current?.getCurrentData();
      if (latestData) {
        setLiveDiagramData(latestData);
      }
    });
  };

  const handleTemplateApply = async (template) => {
    if (!(await confirmLeave())) return;
    const now = new Date().toISOString();
    openRecord({
      id: generateUUID(),
      name: template.name,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      diagram: template.diagram,
      metadata: {
        ...getDefaultMetadata(),
        templateId: template.id
      }
    }, { unsaved: true });
    closeModal();
    showNotification(`Vorlage "${template.name}" geladen`, 'success');
  };

  const handleOpenCopilot = (text = '') => {
    setCopilotText(text);
    openModal(MODALS.COPILOT);
  };

  // Ergebnis des KI-Copilots als neues, ungespeichertes Diagramm öffnen
  const handleCopilotApply = async ({ diagram, title }) => {
    if (!(await confirmLeave())) return;
    const now = new Date().toISOString();
    openRecord({
      id: generateUUID(),
      name: title || 'KI-Prozess',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      diagram,
      metadata: getDefaultMetadata()
    }, { unsaved: true });
    closeModal();
    showNotification(`„${title}“ erstellt – bitte prüfen und speichern.`, 'success');
  };

  // Struktur-Check und Qualitätspanel: zum Element springen und es auswählen
  const handleFocusNode = (nodeId) => {
    diagramCanvasRef.current?.revealNode(nodeId);
  };

  const handleExportProjectJSON = () => {
    if (!currentDiagram) return;
    const project = {
      ...currentDiagram,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      diagram: diagramCanvasRef.current?.getCurrentData() || currentDiagram.diagram || EMPTY_DIAGRAM,
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

  const handleVersionRestore = async (version) => {
      if (!(await confirmLeave())) return;
      const now = new Date().toISOString();
      openRecord({
          ...(version.snapshot || {}),
          id: generateUUID(),
          name: `${version.snapshot?.name || 'Diagramm'} (wiederhergestellt)`,
          updatedAt: now,
          createdAt: now
      }, { unsaved: true });
      showNotification('Version wiederhergestellt (ungespeichert)', 'success');
  };

  const handleSimulationFocus = (nodeId) => {
      diagramCanvasRef.current?.setPresentationFocus(nodeId || null);
  };

  const handleQualityPanelResizeStart = (event) => {
    resizeStateRef.current = {
      isActive: true,
      startX: event.clientX,
      startWidth: ui.qualityPanelWidth
    };
  };

  const handleAutoLayout = (direction) => {
    const usedDirection = diagramCanvasRef.current?.autoLayout(direction);
    if (!usedDirection) {
      showNotification('Das Diagramm ist noch leer.', 'info');
    } else if (usedDirection !== direction) {
      showNotification('Swimlane-Diagramme werden von links nach rechts angeordnet; jeder Schritt bleibt in seiner Lane. Rückgängig mit Strg+Z.', 'info');
    } else {
      showNotification('Diagramm angeordnet. Rückgängig mit Strg+Z.', 'success');
    }
  };

  const handleExportDescription = async (format) => {
    const canvas = diagramCanvasRef.current;
    const data = canvas?.getCurrentData();
    if (!data?.nodes?.some((node) => node.type !== 'lane' && node.type !== 'annotation')) {
      showNotification('Das Diagramm enthält noch keine Schritte.', 'info');
      return;
    }
    const title = currentDiagram?.name || 'Prozessbeschreibung';
    const baseName = `${getCleanFilename() || 'diagram'}_beschreibung`;
    try {
      const { exportProcessDescriptionDocx, exportProcessDescriptionMarkdown } = await import('./export/process-export');
      if (format === 'md') {
        exportProcessDescriptionMarkdown(data, title, `${baseName}.md`);
      } else {
        const image = await canvas.captureDiagramImage().catch(() => null);
        await exportProcessDescriptionDocx(data, title, image, `${baseName}.docx`);
      }
      showNotification('Prozessbeschreibung exportiert', 'success');
    } catch (error) {
      console.error('Export der Prozessbeschreibung fehlgeschlagen:', error);
      showNotification('Die Prozessbeschreibung konnte nicht erstellt werden.', 'error');
    }
  };

  const handleCenter = () => {
    diagramCanvasRef.current?.center();
  };

  // IDs der gespeicherten Diagramme, damit der Struktur-Check Teilprozess-Verknüpfungen prüfen kann
  const [savedDiagramIds, setSavedDiagramIds] = useState(null);
  useEffect(() => {
    let cancelled = false;
    indexeddb.getAllDiagrams()
      .then((all) => { if (!cancelled) setSavedDiagramIds(all.map((d) => d.id)); })
      .catch(() => { if (!cancelled) setSavedDiagramIds(null); });
    return () => { cancelled = true; };
  }, [currentDiagram?.id, currentDiagram?.updatedAt, ui.openModal]);

  const validation = useMemo(
    () => validateDiagram(liveDiagramData, diagramMetadata.improvementItems, {
      diagramIds: savedDiagramIds,
      currentDiagramId: currentDiagram?.id || null
    }),
    [liveDiagramData, diagramMetadata.improvementItems, savedDiagramIds, currentDiagram?.id]
  );

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
        onNewDiagram={handleNewDiagram}
        onDiagramSelect={handleDiagramSelect}
        onRename={handleRenameDiagram}
        onTemplateOpen={() => openModal(MODALS.TEMPLATES)}
        onGuideOpen={() => openModal(MODALS.GUIDE)}
      />

      <AiInputPanel
        onOpenCopilot={handleOpenCopilot}
        onBeforeGenerate={confirmLeave}
        onDiagramGenerated={handleAIGenerated}
        onError={(msg) => showNotification(msg, 'error')}
      />

      <main className="flex flex-1 overflow-hidden relative">
        <Toolbar
          isCollapsed={ui.isToolbarCollapsed}
          onToggleCollapsed={() => dispatch({ type: 'toggleToolbar' })}
          validation={validation}
          onFocusNode={handleFocusNode}
          onAddNode={(type) => diagramCanvasRef.current?.addNodeAtCenter(type)}
        />
        <DiagramCanvas
           ref={diagramCanvasRef}
           onGraphChange={handleGraphChange}
           onHistoryChange={(canUndo, canRedo) => setHistoryState({ canUndo, canRedo })}
           onSelectionChange={setSelectionCount}
           zoomLevel={zoomLevel}
           onZoomSet={handleZoomSet}
           currentDiagramId={currentDiagram?.id}
           onOpenSubprocess={handleOpenSubprocess}
           onNotify={showNotification}
           onDeleteRequest={handleDeleteSelection}
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
          isCollapsed={ui.isQualityPanelCollapsed}
          width={ui.qualityPanelWidth}
          onToggleCollapsed={() => dispatch({ type: 'toggleQualityPanel' })}
          onResizeStart={handleQualityPanelResizeStart}
          validation={validation}
        />
      </main>

      <DiagramTextAlternative diagram={liveDiagramData} onFocusNode={handleFocusNode} />

      <ExportBar
         onExportSVG={() => diagramCanvasRef.current?.exportAsSVG(`${getCleanFilename()}.svg`, currentDiagram?.name)?.catch((err) => showNotification(err.message, 'error'))}
         onExportPNG={() => diagramCanvasRef.current?.exportAsPNG(`${getCleanFilename()}.png`, currentDiagram?.name)?.catch((err) => showNotification(err.message, 'error'))}
         onExportPDF={() => diagramCanvasRef.current?.exportAsPDF(`${getCleanFilename()}.pdf`, currentDiagram?.name)?.catch((err) => showNotification(err.message, 'error'))}
         onExportJSON={handleExportProjectJSON}
         onSave={saveCurrentDiagram}
         saveStatus={saveStatus}
         onClear={handleClearDiagram}
         onLoadClick={() => openModal(MODALS.DIAGRAM_LIST)}
         onVersionsClick={currentDiagram?.id ? () => openModal(MODALS.VERSIONS) : undefined}
         zoomLevel={zoomLevel}
         onZoomIn={handleZoomIn}
         onZoomOut={handleZoomOut}
         onCenterContent={handleCenter}
         onSearch={() => diagramCanvasRef.current?.openSearch()}
         onUndo={() => diagramCanvasRef.current?.undo()}
         onRedo={() => diagramCanvasRef.current?.redo()}
         canUndo={historyState.canUndo}
         canRedo={historyState.canRedo}
         onAutoLayout={handleAutoLayout}
         onAlign={(mode) => diagramCanvasRef.current?.alignSelection(mode)}
         onDistribute={(axis) => diagramCanvasRef.current?.distributeSelection(axis)}
         selectionCount={selectionCount}
         onExportDescription={handleExportDescription}
      />

      <Suspense fallback={null}>
        {ui.openModal === MODALS.SETTINGS && (
          <SettingsModal onClose={closeModal} />
        )}
        {ui.openModal === MODALS.DIAGRAM_LIST && (
          <DiagramListModal
            onClose={closeModal}
            onSelect={handleDiagramSelect}
            onNotify={showNotification}
          />
        )}
        {ui.openModal === MODALS.TEMPLATES && (
          <TemplateModal onClose={closeModal} onApply={handleTemplateApply} />
        )}
        {ui.openModal === MODALS.GUIDE && (
          <GuideModal onClose={closeModal} />
        )}
        {ui.openModal === MODALS.VERSIONS && currentDiagram?.id && (
          <VersionHistoryModal
            onClose={closeModal}
            diagramId={currentDiagram.id}
            onRestore={handleVersionRestore}
            currentDiagram={liveDiagramData}
          />
        )}
        {ui.openModal === MODALS.SUBPROCESS && subprocessView && (
          <SubprocessDialog
            record={subprocessView.record}
            initialMode={subprocessView.mode}
            onSwitch={handleSubprocessSwitch}
            onClose={() => { closeModal(); setSubprocessView(null); }}
          />
        )}
        {ui.openModal === MODALS.COPILOT && (
          <CopilotDialog
            initialText={copilotText}
            onClose={closeModal}
            onApply={handleCopilotApply}
          />
        )}
      </Suspense>

      <Notification
        isVisible={notification.isVisible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}

export default App;
