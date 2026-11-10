import { useEffect, useMemo, useState } from 'react';
import { indexeddb } from '../storage/indexeddb';
import { validateDiagram } from '../analysis/diagram-validation';

/**
 * Struktur-Check des aktuellen Inhalts. Die IDs der gespeicherten Diagramme werden nachgeladen,
 * damit Teilprozess-Verknüpfungen geprüft werden können (neu bei Wechsel, Speichern oder Dialogen).
 * @param {{ diagram: any, improvementItems: any[], currentDiagram: any, refreshKey?: any }} options
 */
export function useDiagramValidation({ diagram, improvementItems, currentDiagram, refreshKey }) {
  const [savedDiagramIds, setSavedDiagramIds] = useState(null);
  const currentId = currentDiagram?.id || null;
  const updatedAt = currentDiagram?.updatedAt;

  useEffect(() => {
    let cancelled = false;
    indexeddb.getAllDiagramIds()
      .then((ids) => { if (!cancelled) setSavedDiagramIds(ids); })
      .catch(() => { if (!cancelled) setSavedDiagramIds(null); });
    return () => { cancelled = true; };
  }, [currentId, updatedAt, refreshKey]);

  return useMemo(
    () => validateDiagram(diagram, improvementItems, { diagramIds: savedDiagramIds, currentDiagramId: currentId }),
    [diagram, improvementItems, savedDiagramIds, currentId]
  );
}
