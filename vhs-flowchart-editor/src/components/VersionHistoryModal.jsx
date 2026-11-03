import React, { Suspense, lazy, useEffect, useId, useState } from 'react';
import { Clock, GitCompare, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { indexeddb } from '../storage/indexeddb';
import { useConfirm } from '../hooks/useConfirm';
import { useDialogA11y } from '../hooks/useDialogA11y';

const VersionCompareModal = lazy(() => import('./VersionCompareModal'));

const MAX_NOTE_LENGTH = 200;

const formatDate = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

const versionLabel = (version) => `Version vom ${formatDate(version.savedAt)}${version.note ? ` („${version.note}“)` : ''}`;

const nodeCount = (version) => version.snapshot?.diagram?.nodes?.filter((n) => n.type !== 'lane')?.length ?? 0;

// Wird nur gerendert, solange der Dialog offen ist
const VersionHistoryModal = ({ onClose, diagramId, onRestore, currentDiagram }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingNote, setEditingNote] = useState(null); // { id, value }
  const [comparison, setComparison] = useState(null); // { before, after }
  const confirm = useConfirm();
  const dialogRef = useDialogA11y(true, onClose);
  const titleId = useId();

  useEffect(() => {
    indexeddb.getVersionsForDiagram(diagramId)
      .then((v) => setVersions([...v].reverse())) // newest first
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [diagramId]);

  const handleRestore = async (version) => {
    const confirmed = await confirm({
      title: 'Version wiederherstellen',
      message: `Version vom ${formatDate(version.savedAt)} wiederherstellen?\n\nDie Version wird als neue, noch ungespeicherte Kopie geöffnet. Das gespeicherte Diagramm bleibt unverändert.`,
      confirmLabel: 'Wiederherstellen'
    });
    if (confirmed) {
      onClose();
      onRestore(version);
    }
  };

  const handleDelete = async (version) => {
    const confirmed = await confirm({
      title: 'Version löschen',
      message: `${versionLabel(version)} unwiderruflich löschen?`,
      confirmLabel: 'Löschen',
      tone: 'danger'
    });
    if (!confirmed) return;
    await indexeddb.deleteVersion(version.id);
    setVersions((prev) => prev.filter((v) => v.id !== version.id));
    setSelectedIds((prev) => prev.filter((id) => id !== version.id));
  };

  const saveNote = async () => {
    if (!editingNote) return;
    const note = editingNote.value.trim().slice(0, MAX_NOTE_LENGTH);
    const { id } = editingNote;
    setEditingNote(null);
    await indexeddb.updateVersionNote(id, note);
    setVersions((prev) => prev.map((v) => (v.id === id ? { ...v, note } : v)));
  };

  const handleNoteKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveNote();
    } else if (event.key === 'Escape') {
      // Nur die Bearbeitung abbrechen, nicht den Dialog schließen
      event.stopPropagation();
      setEditingNote(null);
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)));
  };

  const compareWithCurrent = (version) => {
    setComparison({
      before: { label: versionLabel(version), diagram: version.snapshot?.diagram },
      after: { label: 'Aktueller Stand im Editor', diagram: currentDiagram }
    });
  };

  const compareSelected = () => {
    const [older, newer] = versions
      .filter((v) => selectedIds.includes(v.id))
      .sort((a, b) => (a.savedAt || '').localeCompare(b.savedAt || ''));
    setComparison({
      before: { label: versionLabel(older), diagram: older.snapshot?.diagram },
      after: { label: versionLabel(newer), diagram: newer.snapshot?.diagram }
    });
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[var(--color-vhs-blau)]" aria-hidden="true" />
            <div>
              <h2 id={titleId} className="font-bold text-[var(--color-vhs-blau)] text-lg">Versionshistorie</h2>
              <p className="text-xs text-gray-500">Automatisch gespeicherte Versionen (max. 10)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8" role="status">Lade Versionen…</div>
          ) : versions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Noch keine Versionen gespeichert.<br />
              Versionen werden automatisch beim Speichern angelegt.
            </div>
          ) : (
            <ul className="space-y-2">
              {versions.map((version, i) => {
                const isSelected = selectedIds.includes(version.id);
                const isEditing = editingNote?.id === version.id;
                return (
                  <li
                    key={version.id}
                    className={`rounded-xl border p-3 bg-white transition-colors ${isSelected ? 'border-[var(--color-vhs-blau)] bg-[var(--color-vhs-blau-10)]' : 'border-[var(--color-vhs-blau-20)] hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(version.id)}
                        className="mt-1 w-4 h-4 accent-[var(--color-vhs-blau)]"
                        aria-label={`${versionLabel(version)} zum Vergleich auswählen`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {i === 0 && (
                            <span className="text-[10px] bg-[var(--color-vhs-blau)] text-white px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                              Neueste
                            </span>
                          )}
                          <span className="text-sm font-bold text-[var(--color-vhs-blau)]">
                            {formatDate(version.savedAt)}
                          </span>
                        </div>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingNote.value}
                            maxLength={MAX_NOTE_LENGTH}
                            onChange={(e) => setEditingNote({ ...editingNote, value: e.target.value })}
                            onKeyDown={handleNoteKeyDown}
                            onBlur={saveNote}
                            placeholder="Was wurde geändert?"
                            aria-label="Notiz zur Version"
                            className="mt-1 w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingNote({ id: version.id, value: version.note || '' })}
                            className="mt-1 flex items-center gap-1 text-xs text-left max-w-full text-gray-600 hover:text-[var(--color-vhs-blau)]"
                            title="Notiz bearbeiten"
                          >
                            <Pencil className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span className={`truncate ${version.note ? '' : 'italic text-gray-500'}`}>
                              {version.note || 'Notiz hinzufügen'}
                            </span>
                          </button>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {nodeCount(version)} Knoten
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => compareWithCurrent(version)}
                          title="Mit aktuellem Stand vergleichen"
                          aria-label={`${versionLabel(version)} mit aktuellem Stand vergleichen`}
                          className="p-2 rounded-lg border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                        </button>
                        {i !== 0 && (
                          <button
                            onClick={() => handleRestore(version)}
                            title="Diese Version wiederherstellen"
                            aria-label={`${versionLabel(version)} wiederherstellen`}
                            className="p-2 rounded-lg border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(version)}
                          title="Version löschen"
                          aria-label={`${versionLabel(version)} löschen`}
                          className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500 flex-1 min-w-[200px]">
            Zwei Versionen ankreuzen, um sie zu vergleichen. Beim Wiederherstellen wird das gespeicherte Diagramm nicht überschrieben.
          </p>
          <button
            onClick={compareSelected}
            disabled={selectedIds.length !== 2}
            className="flex items-center px-4 py-2 text-sm font-bold text-white bg-[var(--color-vhs-blau)] rounded-md hover:bg-[var(--color-vhs-blau-80)] disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <GitCompare className="w-4 h-4 mr-2" aria-hidden="true" />
            Auswahl vergleichen
          </button>
        </div>
      </div>

      {comparison && (
        <Suspense fallback={null}>
          <VersionCompareModal
            before={comparison.before}
            after={comparison.after}
            onClose={() => setComparison(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default VersionHistoryModal;
