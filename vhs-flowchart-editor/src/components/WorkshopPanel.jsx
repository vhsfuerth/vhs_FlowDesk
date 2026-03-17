import React from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Presentation, SquarePen, FileDown } from 'lucide-react';

const emptyWorkshopNote = (nodeId, title = '') => ({
  id: `workshop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  nodeId,
  title,
  note: '',
  status: 'open'
});

const WorkshopPanel = ({
  isActive,
  steps,
  currentStepIndex,
  metadata,
  onToggle,
  onPrev,
  onNext,
  onFocusStep,
  onMetadataChange,
  onExportSummary,
  onExportPDF
}) => {
  const notes = metadata.workshopNotes || [];
  const currentStep = steps[currentStepIndex] || null;

  const addNote = () => {
    if (!currentStep) return;
    onMetadataChange({
      ...metadata,
      workshopNotes: [
        ...notes,
        emptyWorkshopNote(currentStep.id, currentStep.label)
      ]
    });
  };

  const updateNote = (noteId, patch) => {
    onMetadataChange({
      ...metadata,
      workshopNotes: notes.map((item) => (
        item.id === noteId ? { ...item, ...patch } : item
      ))
    });
  };

  const removeNote = (noteId) => {
    onMetadataChange({
      ...metadata,
      workshopNotes: notes.filter((item) => item.id !== noteId)
    });
  };

  const stepLabel = (nodeId) => steps.find((step) => step.id === nodeId)?.label || 'Nicht zugeordnet';

  return (
    <section className="rounded-xl border border-[var(--color-vhs-blau-20)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-black text-gray-400">Moderation</div>
          <div className="mt-1 text-lg font-bold text-[var(--color-vhs-blau)]">Workshop-Modus</div>
        </div>
        <button
          onClick={onToggle}
          className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-bold transition-colors ${isActive ? 'bg-[var(--color-vhs-orange)] text-white' : 'border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]'}`}
        >
          <Presentation className="w-4 h-4 mr-1" />
          {isActive ? 'Beenden' : 'Starten'}
        </button>
      </div>

      <div className="mt-3 text-sm text-gray-500">
        Führt Schritt für Schritt durch das Diagramm und sammelt Diskussionspunkte direkt am Prozess.
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 p-3 border border-gray-200">
        <div className="flex items-center justify-between">
          <button onClick={onPrev} disabled={!isActive || currentStepIndex <= 0} className="p-2 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center px-3">
            <div className="text-xs uppercase tracking-widest font-black text-gray-400">
              Schritt {steps.length === 0 ? 0 : currentStepIndex + 1} / {steps.length}
            </div>
            <button
              onClick={() => currentStep && onFocusStep(currentStep.id)}
              disabled={!currentStep}
              className="mt-1 text-sm font-bold text-[var(--color-vhs-blau)] disabled:text-gray-400"
            >
              {currentStep?.label || 'Kein Prozessschritt vorhanden'}
            </button>
          </div>
          <button onClick={onNext} disabled={!isActive || currentStepIndex >= steps.length - 1} className="p-2 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={addNote}
          disabled={!isActive || !currentStep}
          className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-sm font-bold hover:bg-[var(--color-vhs-blau-80)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <MessageSquarePlus className="w-4 h-4 mr-1" />
          Diskussionspunkt
        </button>
        <button
          onClick={onExportSummary}
          disabled={notes.length === 0}
          className="inline-flex items-center px-3 py-2 rounded-md border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] text-sm font-bold hover:bg-[var(--color-vhs-blau-10)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SquarePen className="w-4 h-4 mr-1" />
          TXT
        </button>
        {onExportPDF && (
          <button
            onClick={onExportPDF}
            disabled={steps.length === 0}
            className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-sm font-bold hover:bg-[var(--color-vhs-blau-80)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4 mr-1" />
            PDF-Bericht
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            Noch keine Diskussionspunkte. Im Workshop-Modus kann je Schritt ein Punkt angelegt werden.
          </div>
        ) : (
          notes.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--color-vhs-blau-20)] p-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => item.nodeId && onFocusStep(item.nodeId)} className="text-left">
                  <div className="text-xs uppercase tracking-widest font-black text-gray-400">{stepLabel(item.nodeId)}</div>
                </button>
                <button onClick={() => removeNote(item.id)} className="text-xs text-red-500 font-bold">Entfernen</button>
              </div>
              <input
                value={item.title}
                onChange={(event) => updateNote(item.id, { title: event.target.value })}
                placeholder="Kurztitel"
                className="mt-2 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              />
              <textarea
                value={item.note}
                onChange={(event) => updateNote(item.id, { note: event.target.value })}
                placeholder="Beobachtung, Entscheidung oder offene Frage"
                className="mt-2 w-full border border-gray-200 rounded-md px-3 py-2 text-sm min-h-[82px] resize-y"
              />
              <select
                value={item.status}
                onChange={(event) => updateNote(item.id, { status: event.target.value })}
                className="mt-2 w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="open">offen</option>
                <option value="decided">entschieden</option>
                <option value="follow-up">nachverfolgen</option>
              </select>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default WorkshopPanel;
