import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FileDown, Plus, Search, Target } from 'lucide-react';
import { REVIEW_SCORE_LABELS, getReviewScoreSummary, validateDiagram } from '../analysis/diagram-validation';
import WorkshopPanel from './WorkshopPanel';

const SCORE_OPTIONS = [
  { value: 0, label: '0 - kritisch' },
  { value: 1, label: '1 - schwach' },
  { value: 2, label: '2 - solide' },
  { value: 3, label: '3 - stark' }
];

const emptyMeasure = (nodeId = '') => ({
  id: `measure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  nodeId,
  title: '',
  owner: '',
  priority: 'mittel',
  status: 'offen',
  dueDate: ''
});

const severityClasses = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200'
};

const scoreToTone = (score) => {
  if (score <= 1) return 'text-red-600';
  if (score === 2) return 'text-amber-600';
  return 'text-green-600';
};

const QualityPanel = ({
  diagramData,
  metadata,
  onMetadataChange,
  onFocusNode,
  onExportMeasures,
  workshopProps,
  isCollapsed,
  width,
  onToggleCollapsed,
  onResizeStart
}) => {
  const [activeTab, setActiveTab] = useState('check');

  const validation = useMemo(() => validateDiagram(diagramData), [diagramData]);
  const reviewSummary = useMemo(() => getReviewScoreSummary(metadata.reviewScores), [metadata.reviewScores]);
  const nodes = useMemo(
    () => (Array.isArray(diagramData?.nodes) ? diagramData.nodes.filter((node) => node.type !== 'annotation') : []),
    [diagramData]
  );

  const updateScores = (field, value) => {
    onMetadataChange({
      ...metadata,
      reviewScores: {
        ...metadata.reviewScores,
        [field]: Number(value)
      }
    });
  };

  const updateMeasure = (measureId, patch) => {
    const nextItems = metadata.improvementItems.map((item) => (
      item.id === measureId ? { ...item, ...patch } : item
    ));
    onMetadataChange({ ...metadata, improvementItems: nextItems });
  };

  const addMeasure = (nodeId = '') => {
    onMetadataChange({
      ...metadata,
      improvementItems: [...metadata.improvementItems, emptyMeasure(nodeId)]
    });
    setActiveTab('measures');
  };

  const removeMeasure = (measureId) => {
    onMetadataChange({
      ...metadata,
      improvementItems: metadata.improvementItems.filter((item) => item.id !== measureId)
    });
  };

  const nodeLabel = (nodeId) => nodes.find((node) => node.id === nodeId)?.label || 'Nicht zugeordnet';

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-l border-[var(--color-vhs-blau-20)] flex flex-col items-center shadow-sm relative shrink-0">
        <button
          onMouseDown={onResizeStart}
          className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-[var(--color-vhs-blau-20)]"
          title="Breite anpassen"
        />
        <button
          onClick={onToggleCollapsed}
          className="mt-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
          title="Seitenleiste einblenden"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="mt-6 [writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          Qualitaet
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="bg-white border-l border-[var(--color-vhs-blau-20)] flex flex-col shadow-sm relative shrink-0"
      style={{ width: `${width}px` }}
    >
      <button
        onMouseDown={onResizeStart}
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-[var(--color-vhs-blau-20)]"
        title="Breite anpassen"
      />

      <div className="border-b border-[var(--color-vhs-blau-10)] p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-[var(--color-vhs-blau)] text-sm uppercase tracking-wider">
              Qualitaet & Massnahmen
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Schlanke EFQM-nahe Reflexion direkt am Diagramm.
            </p>
          </div>
          <button
            onClick={onToggleCollapsed}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)] shrink-0"
            title="Seitenleiste ausblenden"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 p-2 gap-2 border-b border-[var(--color-vhs-blau-10)] bg-gray-50">
        <button
          onClick={() => setActiveTab('check')}
          className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'check' ? 'bg-white text-[var(--color-vhs-blau)] shadow-sm' : 'text-gray-500 hover:bg-white'}`}
        >
          Prozess-Check
        </button>
        <button
          onClick={() => setActiveTab('measures')}
          className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'measures' ? 'bg-white text-[var(--color-vhs-blau)] shadow-sm' : 'text-gray-500 hover:bg-white'}`}
        >
          Massnahmen
        </button>
        <button
          onClick={() => setActiveTab('workshop')}
          className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'workshop' ? 'bg-white text-[var(--color-vhs-blau)] shadow-sm' : 'text-gray-500 hover:bg-white'}`}
        >
          Workshop
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pl-5 space-y-5">
        {activeTab === 'check' ? (
          <>
            <section className="rounded-xl border border-[var(--color-vhs-blau-20)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest font-black text-gray-400">Automatische Pruefung</div>
                  <div className="text-lg font-bold text-[var(--color-vhs-blau)] mt-1">
                    {validation.isValid ? 'Struktur grundsaetzlich stimmig' : 'Pruefbedarf vorhanden'}
                  </div>
                </div>
                {validation.isValid ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-[var(--color-vhs-orange)] shrink-0" />
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <div className="rounded-lg bg-red-50 text-red-700 p-2">{validation.counts.error} Fehler</div>
                <div className="rounded-lg bg-amber-50 text-amber-700 p-2">{validation.counts.warning} Warnungen</div>
                <div className="rounded-lg bg-blue-50 text-blue-700 p-2">{validation.counts.info} Hinweise</div>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-vhs-blau-20)] p-4">
              <div className="text-xs uppercase tracking-widest font-black text-gray-400">Selbstbewertung</div>
              <div className="mt-1 text-lg font-bold text-[var(--color-vhs-blau)]">Kurzer Prozess-Check</div>
              <div className="mt-2 text-sm text-gray-500">
                0 bis 3 Punkte je Feld. Niedrige Werte markieren Verbesserungsbedarf.
              </div>
              <div className="mt-4 space-y-3">
                {Object.entries(REVIEW_SCORE_LABELS).map(([field, label]) => (
                  <label key={field} className="block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className={`text-xs font-black ${scoreToTone(metadata.reviewScores[field])}`}>
                        {metadata.reviewScores[field]}/3
                      </span>
                    </div>
                    <select
                      value={metadata.reviewScores[field]}
                      onChange={(event) => updateScores(field, event.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {SCORE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <div className="text-xs uppercase tracking-widest font-black text-gray-400">Kurzfazit</div>
                <div className="mt-1 text-sm text-gray-700">
                  Durchschnitt: <span className="font-bold text-[var(--color-vhs-blau)]">{reviewSummary.average.toFixed(1)} / 3</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Hotspots: {reviewSummary.hotspots.length > 0
                    ? reviewSummary.hotspots.map((field) => REVIEW_SCORE_LABELS[field]).join(', ')
                    : 'keine akuten Schwachstellen markiert'}
                </div>
              </div>
            </section>

            <section className="space-y-2">
              {validation.findings.length === 0 ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  Keine Auffaelligkeiten im aktuellen Diagramm gefunden.
                </div>
              ) : (
                validation.findings.map((finding, index) => (
                  <button
                    key={`${finding.code}-${index}`}
                    onClick={() => finding.nodeId && onFocusNode(finding.nodeId)}
                    disabled={!finding.nodeId}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${severityClasses[finding.severity]} ${finding.nodeId ? 'hover:shadow-sm' : 'cursor-default'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold text-sm">{finding.message}</div>
                      {finding.nodeId ? <Search className="w-4 h-4 shrink-0" /> : null}
                    </div>
                  </button>
                ))
              )}
            </section>
          </>
        ) : activeTab === 'measures' ? (
          <>
            <section className="rounded-xl border border-[var(--color-vhs-blau-20)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest font-black text-gray-400">Verbesserungen</div>
                  <div className="text-lg font-bold text-[var(--color-vhs-blau)] mt-1">
                    {metadata.improvementItems.length} Massnahmen hinterlegt
                  </div>
                </div>
                <button
                  onClick={() => addMeasure(nodes[0]?.id || '')}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-sm font-bold hover:bg-[var(--color-vhs-blau-80)] shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Neu
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onExportMeasures}
                  disabled={metadata.improvementItems.length === 0}
                  className="inline-flex items-center px-3 py-2 rounded-md border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] text-sm font-bold hover:bg-[var(--color-vhs-blau-10)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileDown className="w-4 h-4 mr-1" />
                  CSV exportieren
                </button>
              </div>
            </section>

            <section className="space-y-3">
              {metadata.improvementItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                  Noch keine Massnahmen erfasst. Typischer Einsatz: Medienbrueche, unklare Zustaendigkeiten oder Schleifen direkt aus dem Diagramm ableiten.
                </div>
              ) : (
                metadata.improvementItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--color-vhs-blau-20)] p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => item.nodeId && onFocusNode(item.nodeId)}
                        className="text-left"
                      >
                        <div className="flex items-center text-xs uppercase tracking-widest font-black text-gray-400">
                          <Target className="w-3 h-3 mr-1" />
                          {nodeLabel(item.nodeId)}
                        </div>
                      </button>
                      <button onClick={() => removeMeasure(item.id)} className="text-xs text-red-500 font-bold">
                        Entfernen
                      </button>
                    </div>
                    <div className="mt-3 space-y-3">
                      <input
                        value={item.title}
                        onChange={(event) => updateMeasure(item.id, { title: event.target.value })}
                        placeholder="Massnahme, z. B. Medienbruch reduzieren"
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                      />
                      <label className="block">
                        <div className="text-xs font-bold text-gray-500 mb-1">Bezugsknoten</div>
                        <select
                          value={item.nodeId}
                          onChange={(event) => updateMeasure(item.id, { nodeId: event.target.value })}
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        >
                          <option value="">Nicht zugeordnet</option>
                          {nodes.map((node) => (
                            <option key={node.id} value={node.id}>{node.label}</option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={item.owner}
                          onChange={(event) => updateMeasure(item.id, { owner: event.target.value })}
                          placeholder="Verantwortlich"
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                        />
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(event) => updateMeasure(item.id, { dueDate: event.target.value })}
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <div className="text-xs font-bold text-gray-500 mb-1">Prioritaet</div>
                          <select
                            value={item.priority}
                            onChange={(event) => updateMeasure(item.id, { priority: event.target.value })}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                          >
                            <option value="hoch">hoch</option>
                            <option value="mittel">mittel</option>
                            <option value="niedrig">niedrig</option>
                          </select>
                        </label>
                        <label className="block">
                          <div className="text-xs font-bold text-gray-500 mb-1">Status</div>
                          <select
                            value={item.status}
                            onChange={(event) => updateMeasure(item.id, { status: event.target.value })}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                          >
                            <option value="offen">offen</option>
                            <option value="in Arbeit">in Arbeit</option>
                            <option value="erledigt">erledigt</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        ) : (
          <WorkshopPanel
            isActive={workshopProps.isActive}
            steps={workshopProps.steps}
            currentStepIndex={workshopProps.currentStepIndex}
            metadata={metadata}
            onToggle={workshopProps.onToggle}
            onPrev={workshopProps.onPrev}
            onNext={workshopProps.onNext}
            onFocusStep={workshopProps.onFocusStep}
            onMetadataChange={onMetadataChange}
            onExportSummary={workshopProps.onExportSummary}
          />
        )}
      </div>

      <div className="border-t border-[var(--color-vhs-blau-10)] p-4 pl-5 bg-gray-50 text-xs text-gray-500">
        Massnahmen und Workshop-Notizen sind lokal gespeichert und werden mit dem Diagramm gesichert.
      </div>
    </aside>
  );
};

export default QualityPanel;
