import React, { useCallback, useEffect, useId, useState } from 'react';
import { X, FolderOpen, Trash2, Calendar, Upload, Download, Info } from 'lucide-react';
import { indexeddb } from '../storage/indexeddb';
import { pickJsonFile } from '../storage/file-import';
import { createBackup, parseImportFile } from '../storage/schema';
import { exportToJSON } from '../export/file-export';
import { generateUUID } from '../utils/uuid';
import { useConfirm } from '../hooks/useConfirm';
import { useDialogA11y } from '../hooks/useDialogA11y';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString('de-DE') : '–');
const pluralize = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

// Wird nur gerendert, solange der Dialog offen ist
const DiagramListModal = ({ onClose, onSelect, onNotify }) => {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const confirm = useConfirm();
  const dialogRef = useDialogA11y(true, onClose);
  const titleId = useId();

  const loadDiagrams = useCallback(async () => {
    try {
      const all = await indexeddb.getAllDiagrams();
      setDiagrams(all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    } catch (err) {
      console.error('Diagramme konnten nicht geladen werden:', err);
      onNotify?.('Die gespeicherten Diagramme konnten nicht geladen werden.', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadDiagrams();
  }, [loadDiagrams]);

  const handleSelect = (diagram) => {
    onSelect(diagram);
    onClose();
  };

  const handleDelete = async (diagram) => {
    const confirmed = await confirm({
      title: 'Diagramm löschen',
      message: `„${diagram.name}“ unwiderruflich löschen?\n\nAlle Versionen und automatisch gesicherten Entwürfe dieses Diagramms werden ebenfalls gelöscht.`,
      confirmLabel: 'Löschen',
      tone: 'danger'
    });
    if (!confirmed) return;
    await indexeddb.deleteDiagram(diagram.id);
    await loadDiagrams();
  };

  const handleImport = async () => {
    let picked;
    try {
      picked = await pickJsonFile();
    } catch (error) {
      onNotify?.(error.message, 'error');
      return;
    }
    if (!picked) return;

    setIsBusy(true);
    try {
      const result = parseImportFile(picked.json, picked.file.name.replace(/\.json$/i, ''));

      if (result.kind === 'backup') {
        const existingIds = new Set(diagrams.map((d) => d.id));
        const overwriteCount = result.diagrams.filter((d) => existingIds.has(d.id)).length;
        const confirmed = await confirm({
          title: 'Backup einspielen',
          message: `Die Sicherung${result.exportedAt ? ` vom ${formatDate(result.exportedAt)}` : ''} enthält `
            + `${pluralize(result.diagrams.length, 'Diagramm', 'Diagramme')} und ${pluralize(result.versions.length, 'Version', 'Versionen')}.`
            + (overwriteCount
              ? `\n\n${pluralize(overwriteCount, 'Diagramm ist', 'Diagramme sind')} bereits vorhanden und ${overwriteCount === 1 ? 'wird' : 'werden'} mit dem Stand aus der Sicherung überschrieben.`
              : ''),
          confirmLabel: 'Einspielen',
          tone: overwriteCount ? 'danger' : 'default'
        });
        if (!confirmed) return;
        await indexeddb.importBackup(result);
        await loadDiagrams();
        onNotify?.(`${pluralize(result.diagrams.length, 'Diagramm', 'Diagramme')} aus der Sicherung wiederhergestellt`, 'success');
        return;
      }

      // Einzelnes Diagramm: immer als neuer Datensatz, damit nichts überschrieben wird
      const now = new Date().toISOString();
      const saved = await indexeddb.saveDiagram({
        ...result.record,
        id: generateUUID(),
        createdAt: result.record.createdAt || now
      });
      onNotify?.(`„${saved.name}“ importiert`, 'success');
      handleSelect(saved);
    } catch (error) {
      console.error('Import fehlgeschlagen:', error);
      onNotify?.(error.message || 'Die Datei konnte nicht importiert werden.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleBackup = async () => {
    setIsBusy(true);
    try {
      const [all, versions] = await Promise.all([indexeddb.getAllDiagrams(), indexeddb.getAllVersions()]);
      if (all.length === 0) {
        onNotify?.('Es sind keine gespeicherten Diagramme vorhanden.', 'info');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      exportToJSON(createBackup(all, versions, __APP_VERSION__), `vhs-flowcharts-backup_${date}.json`);
      onNotify?.(`Backup mit ${pluralize(all.length, 'Diagramm', 'Diagrammen')} erstellt`, 'success');
    } catch (error) {
      console.error('Backup fehlgeschlagen:', error);
      onNotify?.('Das Backup konnte nicht erstellt werden.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 id={titleId} className="text-xl font-bold flex items-center text-[var(--color-vhs-blau)]">
            <FolderOpen className="w-5 h-5 mr-2" aria-hidden="true" />
            Gespeicherte Diagramme
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-colors" aria-label="Dialog schließen">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center p-8 text-gray-500" role="status">Lädt...</div>
          ) : diagrams.length === 0 ? (
            <div className="text-center p-12">
              <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" aria-hidden="true" />
              <p className="text-gray-500 font-medium">Noch keine Diagramme gespeichert.</p>
              <p className="text-sm text-gray-500 mt-1">Klicken Sie auf "Speichern" in der Editor-Leiste oder importieren Sie eine Datei.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {diagrams.map((d) => (
                <li
                  key={d.id}
                  className="group relative flex items-center border border-gray-200 rounded-lg hover:border-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)] transition-all shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(d)}
                    className="flex-1 text-left p-4 pr-14 rounded-lg"
                  >
                    <span className="block font-bold text-[var(--color-vhs-blau)]">{d.name}</span>
                    <span className="flex items-center mt-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
                      Bearbeitet: {formatDate(d.updatedAt)}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all absolute right-2"
                    title="Löschen"
                    aria-label={`„${d.name}“ löschen`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 pt-3 border-t bg-gray-50 text-xs text-gray-600 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Diagramme werden nur in diesem Browser gespeichert. Erstellen Sie regelmäßig ein Backup –
            beim Löschen der Browserdaten gehen sonst alle Diagramme verloren.
          </span>
        </div>
        <div className="p-4 bg-gray-50 rounded-b-lg flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleImport}
              disabled={isBusy}
              className="flex items-center px-4 py-2 bg-white border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] rounded-md font-medium hover:bg-[var(--color-vhs-blau-10)] disabled:opacity-50 transition-colors"
              title="Projektdatei (.json) oder Backup importieren"
            >
              <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
              Importieren
            </button>
            <button
              onClick={handleBackup}
              disabled={isBusy}
              className="flex items-center px-4 py-2 bg-white border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] rounded-md font-medium hover:bg-[var(--color-vhs-blau-10)] disabled:opacity-50 transition-colors"
              title="Alle Diagramme inkl. Versionen als Datei sichern"
            >
              <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              Backup erstellen
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagramListModal;
