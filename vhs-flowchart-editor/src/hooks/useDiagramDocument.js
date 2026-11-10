import { useCallback, useEffect, useRef, useState } from 'react';
import { indexeddb } from '../storage/indexeddb';
import { getLastDiagramId, setLastDiagramId } from '../storage/settings';
import { CURRENT_SCHEMA_VERSION } from '../storage/schema';
import { isDraftNewer } from '../storage/autosave';
import { generateUUID } from '../utils/uuid';
import { getDefaultMetadata, normalizeMetadata } from '../analysis/diagram-validation';
import { useAutosave } from './useAutosave';

// Das geöffnete Diagramm: Datensatz, Metadaten, aktueller Inhalt, Laden, Speichern,
// Entwürfe (Autosave) und Nachfragen bei ungespeicherten Änderungen.

export const EMPTY_DIAGRAM = { nodes: [], edges: [] };

const formatDateTime = (iso) => new Date(iso).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

/** Neuer Datensatz mit frischer ID und Zeitstempeln. */
const newRecord = ({ name, diagram = null, metadata = getDefaultMetadata() }) => {
  const now = new Date().toISOString();
  return { id: generateUUID(), name, schemaVersion: CURRENT_SCHEMA_VERSION, createdAt: now, updatedAt: now, diagram, metadata };
};

/**
 * @param {{ canvasRef: { current: any }, notify: (message: string, type?: string) => void,
 *   confirm: (options: object) => Promise<boolean>, setZoomLevel: (zoom: number) => void }} options
 */
export function useDiagramDocument({ canvasRef, notify, confirm, setZoomLevel }) {
  const [currentDiagram, setCurrentDiagram] = useState(null);
  const [diagramMetadata, setDiagramMetadata] = useState(getDefaultMetadata);
  const [liveDiagramData, setLiveDiagramData] = useState(EMPTY_DIAGRAM);
  const graphChangeFrameRef = useRef(null);
  // Verzögertes Speichern nach „Direkt erzeugen“ (abbrechen, sobald ein anderes Diagramm geöffnet wird)
  const generatedSaveTimerRef = useRef(null);
  // Läuft gerade ein Speichervorgang? (z. B. Strg+S mit Tastenwiederholung)
  const savingRef = useRef(false);

  useEffect(() => () => {
    cancelAnimationFrame(graphChangeFrameRef.current);
    clearTimeout(generatedSaveTimerRef.current);
  }, []);

  const { status: saveStatus, isDirty, markClean, markUnsaved, cancelPendingDraft } = useAutosave({
    record: currentDiagram,
    diagram: liveDiagramData,
    metadata: diagramMetadata
  });

  // Lädt einen Datensatz in Editor und App-Zustand. `unsaved`: Inhalt ist noch nicht gespeichert.
  const openRecord = useCallback((record, { unsaved = false } = {}) => {
    clearTimeout(generatedSaveTimerRef.current);
    generatedSaveTimerRef.current = null;
    const canvas = canvasRef.current;
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
  }, [canvasRef, markClean, markUnsaved, setZoomLevel]);

  const startNewDiagram = useCallback(() => {
    openRecord(newRecord({ name: 'Neues Diagramm' }));
    setZoomLevel(1);
  }, [openRecord, setZoomLevel]);

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

  // Beim Start: zuletzt bearbeitetes Diagramm (oder dessen Entwurf) öffnen, sonst ein neues
  useEffect(() => {
    let cancelled = false;
    const loadInitialDiagram = async () => {
      const lastId = getLastDiagramId();
      const saved = lastId ? await indexeddb.getDiagram(lastId).catch(() => null) : null;
      const draftRecord = lastId ? await offerDraftRecovery(lastId, saved) : null;
      if (cancelled) return;

      if (draftRecord) {
        openRecord(draftRecord, { unsaved: true });
        notify('Entwurf wiederhergestellt – bitte speichern, um ihn zu übernehmen.', 'info');
      } else if (saved) {
        openRecord(saved);
      } else {
        startNewDiagram();
      }
    };

    loadInitialDiagram();
    return () => { cancelled = true; };
  }, [offerDraftRecovery, openRecord, notify, startNewDiagram]);

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

  // Speichert unter dem aktuellen Namen bzw. `nameOrEvent`. Ein geänderter Name legt einen
  // neuen Speicherstand an. Jedes Speichern erzeugt außerdem eine Version.
  const saveDiagram = async (nameOrEvent = null) => {
    const canvas = canvasRef.current;
    if (!canvas || savingRef.current) return;
    savingRef.current = true;
    try {
      await saveCurrent(canvas, nameOrEvent);
    } finally {
      savingRef.current = false;
    }
  };

  const saveCurrent = async (canvas, nameOrEvent) => {
    const data = canvas.getCurrentData();
    const name = typeof nameOrEvent === 'string' ? nameOrEvent : (currentDiagram?.name || 'Unbenanntes Diagramm');
    const previousId = currentDiagram?.id;
    let targetId = previousId;
    let isNewRecord = false;

    if (targetId) {
      const existingInDb = await indexeddb.getDiagram(targetId).catch(() => null);
      if (existingInDb && existingInDb.name !== name) {
        targetId = generateUUID();
        isNewRecord = true;
      }
    }

    const metadata = normalizeMetadata(diagramMetadata);
    const record = { ...(currentDiagram || {}), id: targetId || generateUUID(), name, diagram: data, metadata };

    try {
      cancelPendingDraft();
      const saved = await indexeddb.saveDiagram(record);
      setCurrentDiagram(saved);
      setLastDiagramId(saved.id);
      markClean({ name: saved.name, diagram: data, metadata });

      // Entwürfe sind mit dem Speichern übernommen
      await Promise.all(
        [...new Set([previousId, saved.id].filter(Boolean))].map((id) => indexeddb.deleteDraft(id))
      ).catch(() => {});

      await indexeddb.saveVersion({
        id: generateUUID(),
        diagramId: saved.id,
        savedAt: saved.updatedAt,
        note: '',
        snapshot: saved
      }).catch(() => {/* Versionierung ist optional */});

      notify(isNewRecord ? `Neuer Speicherstand "${name}" erstellt` : 'Diagramm erfolgreich gespeichert', 'success');
    } catch (error) {
      console.error('Speichern fehlgeschlagen:', error);
      notify(error?.message?.startsWith('Speicherplatz') ? error.message : 'Fehler beim Speichern', 'error');
    }
  };

  // Für das verzögerte Speichern nach „Direkt erzeugen“ immer die aktuelle Fassung
  const saveDiagramRef = useRef(saveDiagram);
  useEffect(() => {
    saveDiagramRef.current = saveDiagram;
  });

  const selectDiagram = async (record) => {
    if (!(await confirmLeave())) return;
    const draftRecord = await offerDraftRecovery(record.id, record);
    openRecord(draftRecord || record, { unsaved: Boolean(draftRecord) });
    notify(draftRecord ? `Entwurf von "${record.name}" wiederhergestellt` : `Diagramm "${record.name}" geladen`, 'info');
  };

  const newDiagram = async () => {
    if (!(await confirmLeave())) return;
    startNewDiagram();
  };

  // Öffnet neuen Inhalt (Vorlage, Copilot) als ungespeichertes Diagramm. Liefert false bei Abbruch.
  const openAsNewDiagram = async ({ name, diagram, metadata }) => {
    if (!(await confirmLeave())) return false;
    openRecord(newRecord({ name, diagram, metadata }), { unsaved: true });
    return true;
  };

  const restoreVersion = async (version) => {
    if (!(await confirmLeave())) return;
    const now = new Date().toISOString();
    openRecord({
      ...(version.snapshot || {}),
      id: generateUUID(),
      name: `${version.snapshot?.name || 'Diagramm'} (wiederhergestellt)`,
      updatedAt: now,
      createdAt: now
    }, { unsaved: true });
    notify('Version wiederhergestellt (ungespeichert)', 'success');
  };

  const renameDiagram = (name) => {
    if (!currentDiagram) return;
    setCurrentDiagram({ ...currentDiagram, name });
    notify('Name geändert (Speichern zum Sichern)', 'info');
  };

  const clearDiagram = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPresentationFocus(null);
      canvas.clear();
    }
    setLiveDiagramData(EMPTY_DIAGRAM);
    setDiagramMetadata((prev) => ({ ...prev, improvementItems: [] }));
    notify('Arbeitsfläche geleert (Rückgängig möglich).', 'info');
  };

  // „Direkt erzeugen“: Ergebnis laden und kurz darauf speichern
  const applyGeneratedDiagram = (diagramData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.loadGeneratedData(diagramData);
    setLiveDiagramData(canvas.getCurrentData() || diagramData);
    notify('KI-Diagramm generiert', 'success');
    clearTimeout(generatedSaveTimerRef.current);
    generatedSaveTimerRef.current = setTimeout(() => {
      generatedSaveTimerRef.current = null;
      saveDiagramRef.current?.('KI Generiertes Diagramm');
    }, 500);
  };

  // Viele Einzeländerungen zu einer Aktualisierung pro Bildschirmbild zusammenfassen
  const handleGraphChange = () => {
    if (graphChangeFrameRef.current) return;
    graphChangeFrameRef.current = requestAnimationFrame(() => {
      graphChangeFrameRef.current = null;
      const latestData = canvasRef.current?.getCurrentData();
      if (latestData) setLiveDiagramData(latestData);
    });
  };

  return {
    currentDiagram,
    diagramMetadata,
    setDiagramMetadata,
    liveDiagramData,
    saveStatus,
    confirmLeave,
    saveDiagram,
    selectDiagram,
    newDiagram,
    openAsNewDiagram,
    restoreVersion,
    renameDiagram,
    clearDiagram,
    applyGeneratedDiagram,
    handleGraphChange
  };
}
