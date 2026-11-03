import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { indexeddb } from '../storage/indexeddb';
import { SAVE_STATUS, createSnapshot, isEmptyDiagram } from '../storage/autosave';
import { normalizeMetadata } from '../analysis/diagram-validation';

const AUTOSAVE_DELAY_MS = 1500;

/**
 * Verfolgt ungespeicherte Änderungen und sichert sie automatisch als Entwurf
 * (IndexedDB-Store `drafts`), ohne das gespeicherte Diagramm zu überschreiben.
 *
 * - `markClean(state)`: Stand gilt als gespeichert (nach Laden oder Speichern)
 * - `markUnsaved()`: aktueller Stand ist neu und noch nie gespeichert (Vorlage, Wiederherstellung)
 * - `cancelPendingDraft()`: ausstehenden Entwurf verwerfen, bevor gespeichert wird
 */
export function useAutosave({ record, diagram, metadata }) {
  const [baseline, setBaseline] = useState(null);
  const [draftState, setDraftState] = useState({ snapshot: null, error: false });
  const pendingWriteRef = useRef(null);

  const recordId = record?.id;
  const snapshot = useMemo(
    () => createSnapshot({ name: record?.name, diagram, metadata }),
    [record?.name, diagram, metadata]
  );
  const isDirty = baseline !== null && snapshot !== baseline;

  // Beim Wechsel des Diagramms einen noch ausstehenden Entwurf sofort schreiben
  useEffect(() => () => {
    const write = pendingWriteRef.current;
    pendingWriteRef.current = null;
    write?.();
  }, [recordId]);

  useEffect(() => {
    if (!isDirty || !recordId || isEmptyDiagram(diagram)) return undefined;

    const draftRecord = {
      ...record,
      diagram: { nodes: diagram?.nodes || [], edges: diagram?.edges || [] },
      metadata: normalizeMetadata(metadata),
      updatedAt: new Date().toISOString()
    };
    const write = () => indexeddb.saveDraft(draftRecord)
      .then(() => setDraftState({ snapshot, error: false }))
      .catch((error) => {
        console.error('Autosave fehlgeschlagen:', error);
        setDraftState({ snapshot, error: true });
      });

    pendingWriteRef.current = write;
    const timer = setTimeout(() => {
      pendingWriteRef.current = null;
      write();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      clearTimeout(timer);
      if (pendingWriteRef.current === write) pendingWriteRef.current = null;
    };
  }, [isDirty, snapshot, recordId, record, diagram, metadata]);

  const markClean = useCallback((state) => {
    setBaseline(createSnapshot(state));
  }, []);

  // Verwirft einen noch nicht geschriebenen Entwurf (z. B. direkt vor dem Speichern)
  const cancelPendingDraft = useCallback(() => {
    pendingWriteRef.current = null;
  }, []);

  const markUnsaved = useCallback(() => {
    // Leerer Vergleichsstand: jeder Inhalt gilt als ungespeichert
    setBaseline('');
  }, []);

  let status = SAVE_STATUS.SAVED;
  if (isDirty) {
    if (draftState.snapshot === snapshot) {
      status = draftState.error ? SAVE_STATUS.ERROR : SAVE_STATUS.DRAFT;
    } else {
      status = SAVE_STATUS.DIRTY;
    }
  }

  return { status, isDirty, markClean, markUnsaved, cancelPendingDraft };
}
