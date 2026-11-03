import React, { useEffect, useId, useReducer, useRef } from 'react';
import { AlertTriangle, Loader2, Sparkles, X } from 'lucide-react';
import { AI_ABORTED, describeAiError } from '../../ai/gemini-client';
import { analyzeProcess, refineProcess } from '../../ai/copilot/copilot-client';
import { buildDiagramFromModel } from '../../ai/copilot/model-to-diagram';
import { MIN_DESCRIPTION_LENGTH, collectAnswers, copilotReducer, createCopilotState, hasAnyAnswer } from '../../state/copilotState';
import { getApiKey } from '../../storage/settings';
import { useAiConsent } from '../../hooks/useAiConsent';
import { useConfirm } from '../../hooks/useConfirm';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { DescribeStep, QuestionsStep, ReviewStep } from './CopilotSteps';

const STEPS = [
  { id: 'describe', label: 'Beschreiben' },
  { id: 'questions', label: 'Rückfragen' },
  { id: 'review', label: 'Prüfen & übernehmen' }
];

/**
 * Geführter KI-Copilot: Beschreibung analysieren, Rückfragen klären, Ergebnis prüfen
 * und als neues Diagramm übernehmen. Wird nur gerendert, solange er geöffnet ist.
 */
const CopilotDialog = ({ initialText = '', onClose, onApply }) => {
  const [state, dispatch] = useReducer(copilotReducer, initialText, createCopilotState);
  const abortRef = useRef(null);
  const ensureAiConsent = useAiConsent();
  const confirm = useConfirm();
  const titleId = useId();

  // Laufende Anfrage beim Schließen abbrechen
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleClose = async () => {
    if (state.busy) {
      abortRef.current?.abort();
    }
    if (state.model) {
      const discard = await confirm({
        title: 'KI-Copilot schließen?',
        message: 'Das Analyseergebnis wurde noch nicht übernommen und geht beim Schließen verloren.',
        confirmLabel: 'Schließen',
        cancelLabel: 'Weiter bearbeiten',
        tone: 'danger'
      });
      if (!discard) return;
    }
    onClose();
  };

  const dialogRef = useDialogA11y(true, handleClose);

  /** Führt eine KI-Anfrage aus und meldet Ergebnis oder Fehler an den Reducer. */
  const runRequest = async (label, request, successType) => {
    if (!getApiKey()) {
      dispatch({ type: 'failed', error: 'Für den KI-Copilot wird ein Gemini-API-Key benötigt. Bitte in den Einstellungen (Zahnrad oben rechts) hinterlegen.' });
      return;
    }
    if (!(await ensureAiConsent())) return;

    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'start', label });
    // Zwischenschritte (z. B. Selbstkorrektur) als neuen Statustext anzeigen
    const onStatus = (status) => {
      if (!controller.signal.aborted) dispatch({ type: 'start', label: status });
    };
    try {
      const { model, warnings } = await request(controller.signal, onStatus);
      if (controller.signal.aborted) return;
      dispatch({ type: successType, model, warnings });
    } catch (error) {
      if (error?.message === AI_ABORTED || controller.signal.aborted) {
        dispatch({ type: 'cancelled' });
      } else {
        console.error('KI-Copilot:', error);
        dispatch({ type: 'failed', error: describeAiError(error) });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleAnalyze = () => {
    if (state.text.trim().length < MIN_DESCRIPTION_LENGTH) {
      dispatch({ type: 'failed', error: `Bitte beschreiben Sie den Prozess etwas ausführlicher (mindestens ${MIN_DESCRIPTION_LENGTH} Zeichen).` });
      return;
    }
    runRequest(
      'Prozess wird analysiert … das dauert meist 10 bis 30 Sekunden.',
      (signal, onStatus) => analyzeProcess(state.text, { variantId: state.variantId, signal, onStatus }),
      'analyzed'
    );
  };

  const handleRefine = () => {
    if (!hasAnyAnswer(state)) {
      dispatch({ type: 'skipQuestions' });
      return;
    }
    runRequest(
      'Antworten werden eingearbeitet …',
      (signal, onStatus) => refineProcess(state.text, state.model, collectAnswers(state), { variantId: state.variantId, signal, onStatus }),
      'refined'
    );
  };

  const handleApply = () => {
    if (!state.model) return;
    const diagram = buildDiagramFromModel(state.model, { useLanes: state.useLanes, includeNotes: state.includeNotes });
    onApply({ diagram, title: state.model.title });
  };

  const visibleSteps = STEPS.filter((step) => step.id !== 'questions' || state.model?.questions.length || state.step === 'describe');
  const currentIndex = visibleSteps.findIndex((step) => step.id === state.step);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-5 h-5 text-[var(--color-vhs-orange)] shrink-0" aria-hidden="true" />
            <h2 id={titleId} className="font-bold text-[var(--color-vhs-blau)] text-lg">KI-Copilot</h2>
            <ol className="hidden md:flex items-center gap-2 ml-4 text-xs" aria-label="Fortschritt">
              {visibleSteps.map((step, index) => (
                <li
                  key={step.id}
                  aria-current={index === currentIndex ? 'step' : undefined}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                    index === currentIndex
                      ? 'bg-[var(--color-vhs-blau)] text-white font-bold'
                      : index < currentIndex ? 'text-[var(--color-vhs-blau)]' : 'text-gray-500'
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current text-[10px]">{index + 1}</span>
                  {step.label}
                </li>
              ))}
            </ol>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" aria-label="KI-Copilot schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        {state.error && (
          <div role="alert" className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span className="whitespace-pre-line">{state.error}</span>
          </div>
        )}

        <div className="flex-1 min-h-0 relative">
          {state.step === 'describe' && (
            <DescribeStep state={state} dispatch={dispatch} onAnalyze={handleAnalyze} />
          )}
          {state.step === 'questions' && state.model && (
            <QuestionsStep state={state} dispatch={dispatch} onRefine={handleRefine} />
          )}
          {state.step === 'review' && state.model && (
            <ReviewStep state={state} dispatch={dispatch} onApply={handleApply} />
          )}

          {state.busy && (
            <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center gap-4 p-6 text-center" role="status" aria-live="polite">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-vhs-blau)]" aria-hidden="true" />
              <p className="text-sm text-[var(--color-vhs-blau)] font-medium">{state.busy}</p>
              <button
                onClick={() => abortRef.current?.abort()}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-100"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopilotDialog;
