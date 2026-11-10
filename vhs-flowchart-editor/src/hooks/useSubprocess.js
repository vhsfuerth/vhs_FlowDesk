import { useState } from 'react';
import { indexeddb } from '../storage/indexeddb';

// Teilprozesse öffnen: nachfragen, schreibgeschützt hier anzeigen oder zum Diagramm wechseln.

/**
 * @param {{ openDialog: () => void, closeDialog: () => void,
 *   selectDiagram: (record: any) => Promise<void>, notify: (message: string, type?: string) => void }} options
 */
export function useSubprocess({ openDialog, closeDialog, selectDiagram, notify }) {
  // { record, mode: 'ask' | 'preview' }
  const [subprocessView, setSubprocessView] = useState(null);

  // mode: 'ask' = nachfragen (Symbol im Element), 'preview' = hier anzeigen,
  // 'switch' = zum Teilprozess wechseln (fragt bei ungespeicherten Änderungen nach)
  const openSubprocess = async (diagramId, mode = 'ask') => {
    const record = await indexeddb.getDiagram(diagramId).catch(() => null);
    if (!record) {
      notify('Das verknüpfte Diagramm wurde nicht gefunden. Bitte die Verknüpfung prüfen.', 'error');
      return;
    }
    if (mode === 'switch') {
      await selectDiagram(record);
      return;
    }
    setSubprocessView({ record, mode });
    openDialog();
  };

  const closeSubprocess = () => {
    closeDialog();
    setSubprocessView(null);
  };

  const switchToSubprocess = async () => {
    const record = subprocessView?.record;
    closeSubprocess();
    if (record) await selectDiagram(record);
  };

  return { subprocessView, openSubprocess, closeSubprocess, switchToSubprocess };
}
