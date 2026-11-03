import React, { useId, useMemo } from 'react';
import { GitCompare, X } from 'lucide-react';
import { buildComparisonView, diffDiagrams } from '../analysis/diagram-diff';
import { COMPARE_MARKS } from '../utils/constants';
import { useDialogA11y } from '../hooks/useDialogA11y';
import DiagramPreview from './DiagramPreview';

/**
 * Rein lesender Vergleich zweier Fassungen.
 * before/after: { label, diagram } – after ist die neuere Fassung.
 */
const VersionCompareModal = ({ before, after, onClose }) => {
  const dialogRef = useDialogA11y(true, onClose);
  const titleId = useId();

  const diff = useMemo(() => diffDiagrams(before.diagram, after.diagram), [before.diagram, after.diagram]);
  const view = useMemo(() => buildComparisonView(before.diagram, after.diagram, diff), [before.diagram, after.diagram, diff]);
  const counts = {
    added: diff.summary.filter((s) => s.kind === 'added').length,
    changed: diff.summary.filter((s) => s.kind === 'changed').length,
    removed: diff.summary.filter((s) => s.kind === 'removed').length
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <GitCompare className="w-5 h-5 text-[var(--color-vhs-blau)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id={titleId} className="font-bold text-[var(--color-vhs-blau)] text-lg">Versionen vergleichen</h2>
              <p className="text-xs text-gray-500 truncate">
                {before.label} <span aria-hidden="true">→</span><span className="sr-only">verglichen mit</span> {after.label}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Vergleich schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <div className="flex-1 min-h-[300px] border-b md:border-b-0 md:border-r border-gray-100 relative">
            <DiagramPreview
              diagram={view.diagram}
              marks={view.marks}
              edgeMarks={view.edgeMarks}
              label={`Diagramm „${after.label}“ mit markierten Änderungen gegenüber „${before.label}“`}
            />
            <div className="absolute left-3 bottom-3 flex flex-wrap gap-3 bg-white/90 rounded-md px-3 py-1.5 text-xs text-gray-700 shadow-sm" aria-hidden="true">
              {['added', 'changed', 'removed'].map((kind) => (
                <span key={kind} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-4 h-3 rounded-sm border-2"
                    style={{ borderColor: COMPARE_MARKS[kind].color, borderStyle: kind === 'removed' ? 'dashed' : 'solid' }}
                  />
                  {COMPARE_MARKS[kind].label}
                </span>
              ))}
            </div>
          </div>

          <aside className="w-full md:w-80 shrink-0 flex flex-col min-h-0" aria-label="Liste der Änderungen">
            <div className="p-4 border-b border-gray-100 text-sm text-gray-700">
              {diff.isEmpty ? (
                <span>Keine Unterschiede.</span>
              ) : (
                <span>
                  <strong>{counts.added}</strong> neu · <strong>{counts.changed}</strong> geändert · <strong>{counts.removed}</strong> entfernt
                </span>
              )}
            </div>
            <ul className="flex-1 overflow-y-auto p-4 space-y-2">
              {diff.isEmpty && (
                <li className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 text-center">
                  Die beiden Fassungen sind inhaltlich identisch.
                </li>
              )}
              {diff.summary.map((entry, index) => (
                <li
                  key={`${entry.kind}-${index}`}
                  className="text-sm text-gray-700 rounded-lg border border-gray-100 p-2 pl-3 border-l-4"
                  style={{ borderLeftColor: COMPARE_MARKS[entry.kind].color }}
                >
                  {entry.text}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-500 bg-gray-50 rounded-b-2xl">
          Der Vergleich ist rein lesend – es werden keine Daten verändert. Entfernte Elemente sind gestrichelt an ihrer früheren Position eingeblendet.
        </div>
      </div>
    </div>
  );
};

export default VersionCompareModal;
