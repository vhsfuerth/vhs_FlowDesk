import React, { useEffect, useState } from 'react';
import { Clock, RotateCcw, Trash2, X } from 'lucide-react';
import { indexeddb } from '../storage/indexeddb';

const VersionHistoryModal = ({ isOpen, onClose, diagramId, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !diagramId) return;
    setLoading(true);
    indexeddb.getVersionsForDiagram(diagramId)
      .then((v) => setVersions([...v].reverse())) // newest first
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, diagramId]);

  const handleRestore = (version) => {
    if (window.confirm(`Version vom ${formatDate(version.savedAt)} wiederherstellen?\n\nAktuelle Änderungen bleiben als neue Version erhalten.`)) {
      onRestore(version);
      onClose();
    }
  };

  const handleDelete = async (versionId) => {
    await indexeddb.deleteVersion(versionId);
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  };

  const formatDate = (iso) => {
    if (!iso) return '–';
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const nodeCount = (version) => {
    try {
      return version.snapshot?.diagram?.nodes?.filter((n) => n.type !== 'lane')?.length ?? 0;
    } catch { return 0; }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[var(--color-vhs-blau)]" />
            <div>
              <h2 className="font-bold text-[var(--color-vhs-blau)] text-lg">Versionshistorie</h2>
              <p className="text-xs text-gray-500">Automatisch gespeicherte Versionen (max. 10)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Lade Versionen…</div>
          ) : versions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Noch keine Versionen gespeichert.<br />
              Versionen werden automatisch beim Speichern angelegt.
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, i) => (
                <div
                  key={version.id}
                  className="rounded-xl border border-[var(--color-vhs-blau-20)] p-3 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="text-[10px] bg-[var(--color-vhs-blau)] text-white px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                            Aktuell
                          </span>
                        )}
                        <span className="text-sm font-bold text-[var(--color-vhs-blau)]">
                          {formatDate(version.savedAt)}
                        </span>
                      </div>
                      {version.note && (
                        <p className="text-xs text-gray-600 mt-1 truncate">{version.note}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {nodeCount(version)} Knoten
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {i !== 0 && (
                        <button
                          onClick={() => handleRestore(version)}
                          title="Diese Version wiederherstellen"
                          className="p-2 rounded-lg border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(version.id)}
                        title="Version löschen"
                        className="p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-500 bg-gray-50 rounded-b-2xl">
          Versionen werden lokal gespeichert. Beim Wiederherstellen wird die aktuelle Version nicht überschrieben.
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
