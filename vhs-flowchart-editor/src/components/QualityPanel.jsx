import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileDown, Plus, Search, Target, Sparkles } from 'lucide-react';
import { REVIEW_SCORE_GUIDES, REVIEW_SCORE_LABELS, getReviewScoreSummary, validateDiagram } from '../analysis/diagram-validation';
import { exportQualityReport, exportQualityReportPDF } from '../export/file-export';
import WorkshopPanel from './WorkshopPanel';
import SimulationPanel from './SimulationPanel';
import { generateImprovements } from '../ai/gemini-client';

const SCORE_OPTIONS = [
  { value: 0, label: '0', sublabel: 'kritisch' },
  { value: 1, label: '1', sublabel: 'schwach' },
  { value: 2, label: '2', sublabel: 'solide' },
  { value: 3, label: '3', sublabel: 'stark' }
];

const WIZARD_FIELDS = ['clarity', 'mediaBreaks', 'risk', 'participantFocus', 'ownership'];

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
  onGetDiagramImage,
  workshopProps,
  onSimulationFocus,
  isCollapsed,
  width,
  onToggleCollapsed,
  onResizeStart,
  title
}) => {
  const [activeTab, setActiveTab] = useState('check');
  const [isEvaluationCollapsed, setIsEvaluationCollapsed] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCompact, setWizardCompact] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState('');

  const validation = useMemo(() => validateDiagram(diagramData, metadata.improvementItems), [diagramData, metadata.improvementItems]);
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

  const updateReviewNote = (field, value) => {
    onMetadataChange({
      ...metadata,
      reviewNotes: {
        ...metadata.reviewNotes,
        [field]: value
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

  const handleExportQualityReport = () => {
    exportQualityReport(
      title,
      validation.findings,
      validation.counts,
      metadata.reviewScores,
      reviewSummary,
      metadata.improvementItems,
      nodeLabel,
      metadata.reviewNotes
    );
  };

  const handleAiAnalysis = async () => {
    setAiAnalysisLoading(true);
    setAiAnalysisError('');
    try {
      const improvements = await generateImprovements(diagramData, metadata.reviewScores);
      const newItems = improvements.map((imp) => ({
        id: `measure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nodeId: imp.nodeId || '',
        title: imp.title || '',
        owner: imp.owner || '',
        priority: imp.priority || 'mittel',
        status: 'offen',
        dueDate: ''
      }));
      onMetadataChange({ ...metadata, improvementItems: [...metadata.improvementItems, ...newItems] });
      setActiveTab('measures');
    } catch (e) {
      setAiAnalysisError(
        e.message === 'API_KEY_MISSING'
          ? 'Kein API-Key hinterlegt. Bitte in den Einstellungen eingeben.'
          : e.message
      );
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const [pdfExporting, setPdfExporting] = useState(false);

  const handleExportQualityReportPDF = async () => {
    setPdfExporting(true);
    try {
      const diagramImage = onGetDiagramImage ? await onGetDiagramImage() : null;
      const cleanName = (title || 'qualitaetsbericht').toLowerCase().replace(/[^a-z0-9]/g, '_');
      await exportQualityReportPDF(
        title,
        validation.findings,
        validation.counts,
        metadata.reviewScores,
        reviewSummary,
        metadata.improvementItems,
        nodeLabel,
        metadata.reviewNotes,
        diagramImage,
        `${cleanName}_qualitaetsbericht.pdf`
      );
    } finally {
      setPdfExporting(false);
    }
  };

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
          aria-label="Qualitätspanel einblenden"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="mt-6 [writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          Qualität
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
              Qualität & Maßnahmen
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Schlanke EFQM-nahe Reflexion direkt am Diagramm.
            </p>
          </div>
          <button
            onClick={onToggleCollapsed}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)] shrink-0"
            title="Seitenleiste ausblenden"
            aria-label="Qualitätspanel ausblenden"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 p-2 gap-1.5 border-b border-[var(--color-vhs-blau-10)] bg-gray-50">
        <button
          onClick={() => setActiveTab('check')}
          className={`px-2 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'check' ? 'bg-white text-[var(--color-vhs-blau)] shadow-sm' : 'text-gray-500 hover:bg-white'}`}
        >
          Prüfung
        </button>
        <button
          onClick={() => setActiveTab('measures')}
          className={`px-2 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'measures' ? 'bg-white text-[var(--color-vhs-blau)] shadow-sm' : 'text-gray-500 hover:bg-white'}`}
        >
          Maßnahmen
        </button>
        <button
          onClick={() => setActiveTab('workshop')}
          className={`px-2 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'workshop' ? 'bg-white text-[var(--color-vhs-blau)] shadow-sm' : 'text-gray-500 hover:bg-white'}`}
        >
          Workshop
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-2 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'simulation' ? 'bg-white text-[var(--color-vhs-blau)] shadow-sm' : 'text-gray-500 hover:bg-white'}`}
        >
          Simulation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pl-5 space-y-5">
        {activeTab === 'check' ? (
          <>


            <section className="rounded-xl border border-[var(--color-vhs-blau-20)] overflow-hidden">
              <button
                onClick={() => setIsEvaluationCollapsed(!isEvaluationCollapsed)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs uppercase tracking-widest font-black text-gray-400">Selbstbewertung</div>
                  <div className="mt-1 text-lg font-bold text-[var(--color-vhs-blau)]">Kurzer Prozess-Check</div>
                </div>
                {isEvaluationCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-vhs-blau)]" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-[var(--color-vhs-blau)]" />
                )}
              </button>

              {!isEvaluationCollapsed && (
                <div className="px-4 pb-4 border-t border-[var(--color-vhs-blau-10)] pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-400">0 bis 3 Punkte je Kriterium.</span>
                    <button
                      onClick={() => setWizardCompact(!wizardCompact)}
                      className="text-xs text-[var(--color-vhs-blau)] underline underline-offset-2"
                    >
                      {wizardCompact ? 'Geführt bewerten' : 'Alle auf einmal'}
                    </button>
                  </div>

                  {wizardCompact ? (
                    /* Kompaktansicht: alle 5 Kriterien auf einmal */
                    <>
                      <div className="space-y-3">
                        {WIZARD_FIELDS.map((field) => (
                          <label key={field} className="block">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{REVIEW_SCORE_LABELS[field]}</span>
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
                                <option key={option.value} value={option.value}>{option.label} – {option.sublabel}</option>
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
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button
                          onClick={handleExportQualityReport}
                          className="inline-flex items-center px-3 py-2 rounded-md border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] text-xs font-bold hover:bg-[var(--color-vhs-blau-10)]"
                        >
                          <FileDown className="w-3.5 h-3.5 mr-1" />
                          TXT
                        </button>
                        <button
                          onClick={handleExportQualityReportPDF}
                          disabled={pdfExporting}
                          className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-xs font-bold hover:bg-[var(--color-vhs-blau-80)] disabled:opacity-50"
                        >
                          <FileDown className="w-3.5 h-3.5 mr-1" />
                          {pdfExporting ? 'Erstelle…' : 'PDF-Bericht'}
                        </button>
                      </div>
                    </>
                  ) : wizardStep <= 5 ? (
                    /* Wizard-Ansicht: Schritt 1–5 */
                    (() => {
                      const field = WIZARD_FIELDS[wizardStep - 1];
                      const currentScore = metadata.reviewScores[field];
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Schritt {wizardStep} von 5: {REVIEW_SCORE_LABELS[field]}
                            </span>
                          </div>
                          <div className="flex gap-1 mb-4">
                            {WIZARD_FIELDS.map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full ${i < wizardStep ? 'bg-[var(--color-vhs-blau)]' : 'bg-gray-200'}`}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                            {REVIEW_SCORE_GUIDES[field]}
                          </p>
                          <div className="grid grid-cols-4 gap-1.5 mb-4">
                            {SCORE_OPTIONS.map((option) => {
                              const selected = currentScore === option.value;
                              let btnClass = 'flex flex-col items-center py-2 px-1 rounded-lg border-2 text-xs font-bold transition-colors cursor-pointer ';
                              if (selected) {
                                if (option.value === 0) btnClass += 'bg-red-600 text-white border-red-600';
                                else if (option.value === 1) btnClass += 'bg-amber-500 text-white border-amber-500';
                                else if (option.value === 2) btnClass += 'bg-amber-400 text-white border-amber-400';
                                else btnClass += 'bg-green-600 text-white border-green-600';
                              } else {
                                btnClass += 'bg-white text-gray-600 border-gray-200 hover:border-gray-400';
                              }
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => updateScores(field, option.value)}
                                  className={btnClass}
                                >
                                  <span className="text-base leading-none">{option.label}</span>
                                  <span className="mt-1 font-normal text-[10px] leading-none">{option.sublabel}</span>
                                </button>
                              );
                            })}
                          </div>
                          <label className="block mb-4">
                            <div className="text-xs font-bold text-gray-500 mb-1">Notiz (optional)</div>
                            <textarea
                              value={metadata.reviewNotes?.[field] || ''}
                              onChange={(e) => updateReviewNote(field, e.target.value)}
                              rows={2}
                              placeholder="Beobachtungen oder Verbesserungsideen …"
                              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none"
                            />
                          </label>
                          <div className="flex justify-between">
                            <button
                              onClick={() => setWizardStep(wizardStep - 1)}
                              disabled={wizardStep === 1}
                              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              Zurück
                            </button>
                            <button
                              onClick={() => setWizardStep(wizardStep + 1)}
                              className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-sm font-bold hover:bg-[var(--color-vhs-blau-80)]"
                            >
                              {wizardStep === 5 ? 'Zusammenfassung' : 'Weiter'}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* Wizard-Ansicht: Schritt 6 – Zusammenfassung */
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zusammenfassung</span>
                        <span className={`text-sm font-black ${scoreToTone(reviewSummary.average)}`}>
                          Ø {reviewSummary.average.toFixed(1)}/3
                        </span>
                      </div>
                      <div className="flex gap-1 mb-4">
                        {WIZARD_FIELDS.map((_, i) => (
                          <div key={i} className="h-1.5 flex-1 rounded-full bg-[var(--color-vhs-blau)]" />
                        ))}
                      </div>
                      <div className="space-y-2 mb-4">
                        {WIZARD_FIELDS.map((field) => {
                          const score = metadata.reviewScores[field];
                          const isHotspot = score <= 1;
                          const scoreLabelText = score === 0 ? 'kritisch' : score === 1 ? 'schwach' : score === 2 ? 'solide' : 'stark';
                          return (
                            <button
                              key={field}
                              onClick={() => setWizardStep(WIZARD_FIELDS.indexOf(field) + 1)}
                              className="w-full text-left rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{REVIEW_SCORE_LABELS[field]}</span>
                                <div className="flex items-center gap-1.5">
                                  {isHotspot && <span title="Verbesserungsbedarf">⚠</span>}
                                  <span className={`text-xs font-black ${scoreToTone(score)}`}>
                                    {score}/3
                                  </span>
                                  <span className={`text-xs ${isHotspot ? 'text-red-600' : 'text-gray-400'}`}>
                                    {scoreLabelText}
                                  </span>
                                </div>
                              </div>
                              {metadata.reviewNotes?.[field] && (
                                <p className="text-xs text-gray-500 mt-1 truncate">{metadata.reviewNotes[field]}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {/* KI-Analyse */}
                      <div className="mt-4 rounded-lg border border-[var(--color-vhs-blau-20)] p-3 bg-[var(--color-vhs-blau-10)]">
                        <div className="text-xs font-bold text-[var(--color-vhs-blau)] mb-1 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          KI-Analyse
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          KI analysiert Diagramm und Scores und schlägt konkrete Maßnahmen vor.
                        </p>
                        {aiAnalysisError && (
                          <p className="text-xs text-red-600 mb-2">{aiAnalysisError}</p>
                        )}
                        <button
                          onClick={handleAiAnalysis}
                          disabled={aiAnalysisLoading}
                          className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-xs font-bold hover:bg-[var(--color-vhs-blau-80)] disabled:opacity-50 w-full justify-center"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          {aiAnalysisLoading ? 'Analysiere…' : 'KI-Analyse anfordern'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <button
                          onClick={() => setWizardStep(5)}
                          className="inline-flex items-center px-3 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Zurück
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={handleExportQualityReport}
                            className="inline-flex items-center px-3 py-2 rounded-md border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] text-xs font-bold hover:bg-[var(--color-vhs-blau-10)]"
                          >
                            <FileDown className="w-3.5 h-3.5 mr-1" />
                            TXT
                          </button>
                          <button
                            onClick={handleExportQualityReportPDF}
                            disabled={pdfExporting}
                            className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-xs font-bold hover:bg-[var(--color-vhs-blau-80)] disabled:opacity-50"
                          >
                            <FileDown className="w-3.5 h-3.5 mr-1" />
                            {pdfExporting ? 'Erstelle…' : 'PDF-Bericht'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                    {metadata.improvementItems.length} Maßnahmen hinterlegt
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
                  Noch keine Maßnahmen erfasst. Typischer Einsatz: Medienbrüche, unklare Zuständigkeiten oder Schleifen direkt aus dem Diagramm ableiten.
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
                        placeholder="Maßnahme, z. B. Medienbruch reduzieren"
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
                          <div className="text-xs font-bold text-gray-500 mb-1">Priorität</div>
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
        ) : activeTab === 'workshop' ? (
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
            onExportPDF={workshopProps.onExportPDF}
          />
        ) : (
          <SimulationPanel
            diagramData={diagramData}
            onFocusNode={onFocusNode}
            onSetSimulationFocus={onSimulationFocus}
          />
        )}
      </div>

      <div className="border-t border-[var(--color-vhs-blau-10)] p-4 pl-5 bg-gray-50 text-xs text-gray-500">
        Maßnahmen und Workshop-Notizen sind lokal gespeichert und werden mit dem Diagramm gesichert.
      </div>
    </aside>
  );
};

export default QualityPanel;
