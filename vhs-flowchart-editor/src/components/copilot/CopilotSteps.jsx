import React, { Suspense, lazy, useId, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, HelpCircle, Info, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { COPILOT_VARIANTS, getVariant } from '../../ai/copilot/variants';
import { END } from '../../ai/copilot/process-model';
import { buildDiagramFromModel } from '../../ai/copilot/model-to-diagram';
import { MIN_DESCRIPTION_LENGTH } from '../../state/copilotState';

const DiagramPreview = lazy(() => import('../DiagramPreview'));

const PRIMARY_BUTTON = 'flex items-center justify-center px-5 py-2 text-sm font-bold text-white bg-[var(--color-vhs-blau)] rounded-md hover:bg-[var(--color-vhs-blau-80)] disabled:bg-gray-300 disabled:cursor-not-allowed';
const SECONDARY_BUTTON = 'flex items-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50';

const Footer = ({ children }) => (
  <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
    {children}
  </div>
);

const BackButton = ({ onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`${SECONDARY_BUTTON} mr-auto`}>
    <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
    Zurück
  </button>
);

// --- Schritt 1: Beschreiben -------------------------------------------------

export const DescribeStep = ({ state, dispatch, onAnalyze }) => {
  const textId = useId();
  const hintId = useId();
  const length = state.text.trim().length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-3xl mx-auto space-y-5">
          <div>
            <label htmlFor={textId} className="block text-sm font-bold text-[var(--color-vhs-blau)] mb-1">
              Wie läuft der Prozess ab?
            </label>
            <p id={hintId} className="text-xs text-gray-600 mb-2">
              Beschreiben Sie in eigenen Worten, wer was in welcher Reihenfolge erledigt und was passiert, wenn etwas nicht klappt.
              Stichpunkte genügen. Bitte keine Namen oder Kontaktdaten von Personen eingeben.
            </p>
            <textarea
              id={textId}
              data-autofocus
              aria-describedby={hintId}
              value={state.text}
              onChange={(e) => dispatch({ type: 'setText', text: e.target.value })}
              rows={9}
              placeholder={'z. B. „Eine Anmeldung geht online ein. Die Verwaltung prüft, ob noch Plätze frei sind. Wenn ja, wird eine Bestätigung verschickt, sonst kommt die Person auf die Warteliste …“'}
              className="w-full text-sm py-2 px-3 border border-[var(--color-vhs-blau-20)] rounded-md focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent resize-y"
              disabled={Boolean(state.busy)}
            />
            <p className="text-[11px] text-gray-500 mt-1" aria-live="polite">
              {length < MIN_DESCRIPTION_LENGTH ? `Noch ${MIN_DESCRIPTION_LENGTH - length} Zeichen bis zur Analyse` : `${length} Zeichen`}
            </p>
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-[var(--color-vhs-blau)] mb-2">Wie sollen die Schritte formuliert werden?</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COPILOT_VARIANTS.map((variant) => {
                const checked = state.variantId === variant.id;
                return (
                  <label
                    key={variant.id}
                    className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked ? 'border-[var(--color-vhs-blau)] bg-[var(--color-vhs-blau-10)]' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="copilot-variant"
                      value={variant.id}
                      checked={checked}
                      onChange={() => dispatch({ type: 'setVariant', variantId: variant.id })}
                      className="mt-1 accent-[var(--color-vhs-blau)]"
                    />
                    <span>
                      <span className="block text-sm font-bold text-[var(--color-vhs-blau)]">{variant.name}</span>
                      <span className="block text-xs text-gray-600">{variant.description}</span>
                      <span className="block text-xs text-gray-500 italic mt-0.5">Beispiel: „{variant.example}“</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>
      <Footer>
        <button type="button" onClick={onAnalyze} disabled={Boolean(state.busy) || length < MIN_DESCRIPTION_LENGTH} className={PRIMARY_BUTTON}>
          <Sparkles className="w-4 h-4 mr-2 text-[var(--color-vhs-gelb)]" aria-hidden="true" />
          Prozess analysieren
        </button>
      </Footer>
    </div>
  );
};

// --- Schritt 2: Rückfragen --------------------------------------------------

const QuestionField = ({ question, stepLabel, answer, onAnswer }) => {
  const isOption = question.options.includes(answer);
  const freeTextId = useId();
  return (
    <fieldset className="rounded-lg border border-[var(--color-vhs-blau-20)] p-4">
      <legend className="px-1 text-sm font-bold text-[var(--color-vhs-blau)]">{question.text}</legend>
      {stepLabel && <p className="text-xs text-gray-500 mb-2">Betrifft: „{stepLabel}“</p>}
      {question.options.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {question.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={answer === option}
                onChange={() => onAnswer(option)}
                className="accent-[var(--color-vhs-blau)]"
              />
              {option}
            </label>
          ))}
        </div>
      )}
      {question.allowFreeText && (
        <div>
          <label htmlFor={freeTextId} className="block text-xs text-gray-600 mb-1">
            {question.options.length > 0 ? 'Oder eigene Antwort' : 'Ihre Antwort'}
          </label>
          <input
            id={freeTextId}
            type="text"
            value={isOption ? '' : answer}
            onChange={(e) => onAnswer(e.target.value)}
            maxLength={300}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent"
          />
        </div>
      )}
      {answer && (
        <button type="button" onClick={() => onAnswer('')} className="mt-2 text-xs text-gray-500 underline hover:text-gray-700">
          Antwort zurücknehmen
        </button>
      )}
    </fieldset>
  );
};

export const QuestionsStep = ({ state, dispatch, onRefine }) => {
  const { model } = state;
  const stepLabel = (stepId) => model.steps.find((s) => s.id === stepId)?.label || '';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-[var(--color-vhs-blau-10)] px-3 py-2 text-sm text-[var(--color-vhs-blau)]">
            <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Einige Punkte sind in der Beschreibung noch offen. Ihre Antworten machen das Diagramm genauer.
              Fragen, die Sie nicht beantworten können, lassen Sie einfach leer – dann trifft die KI eine Annahme, die Sie im nächsten Schritt sehen.
            </p>
          </div>
          {model.summary && (
            <p className="text-sm text-gray-700"><span className="font-bold">So habe ich den Prozess bisher verstanden:</span> {model.summary}</p>
          )}
          {model.questions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              stepLabel={stepLabel(question.stepId)}
              answer={state.answers[question.id] || ''}
              onAnswer={(answer) => dispatch({ type: 'setAnswer', questionId: question.id, answer })}
            />
          ))}
        </div>
      </div>
      <Footer>
        <BackButton onClick={() => dispatch({ type: 'back' })} disabled={Boolean(state.busy)} />
        <button type="button" onClick={() => dispatch({ type: 'skipQuestions' })} disabled={Boolean(state.busy)} className={SECONDARY_BUTTON}>
          Ohne Antworten weiter
        </button>
        <button type="button" onClick={onRefine} disabled={Boolean(state.busy)} className={PRIMARY_BUTTON}>
          Antworten übernehmen
        </button>
      </Footer>
    </div>
  );
};

// --- Schritt 3: Prüfen und übernehmen ---------------------------------------

const KIND_BADGES = {
  task: { label: 'Schritt', className: 'bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-blau)]' },
  document: { label: 'Dokument', className: 'bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-hellblau-b)]' },
  system: { label: 'IT-System', className: 'bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-violett)]' },
  wait: { label: 'Warten/Frist', className: 'bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-orange-hell-b)]' },
  decision: { label: 'Entscheidung', className: 'bg-amber-100 text-amber-900' },
  end: { label: 'Ende', className: 'bg-gray-100 text-gray-700' }
};

// Art einer Tätigkeit (bestimmt die Form im Diagramm)
const TASK_TYPES = [
  ['process', 'Prozessschritt'],
  ['document', 'Dokument/Formular'],
  ['system', 'IT-System'],
  ['wait', 'Warten/Frist']
];

/** Badge eines Schritts: Tätigkeiten nach ihrer Art */
const badgeOf = (step) => KIND_BADGES[step.kind === 'task' && step.taskType && step.taskType !== 'process' ? step.taskType : step.kind];

const editorInput = 'w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent';

const StepEditor = ({ step, roles, onSave, onCancel }) => {
  const [label, setLabel] = useState(step.label);
  const [role, setRole] = useState(step.role);
  const [taskType, setTaskType] = useState(step.taskType || 'process');
  const [details, setDetails] = useState({
    description: step.description || '',
    document: step.document || '',
    system: step.system || '',
    duration: step.duration || ''
  });
  const [branchLabels, setBranchLabels] = useState(step.branches.map((b) => b.label));
  const labelId = useId();
  const roleId = useId();
  const roleListId = useId();
  const typeId = useId();
  const setDetail = (field) => (event) => setDetails((prev) => ({ ...prev, [field]: event.target.value }));

  const save = (event) => {
    event.preventDefault();
    onSave({ label, role, branchLabels, ...(step.kind === 'task' ? { taskType } : {}), ...details });
  };

  return (
    <form onSubmit={save} className="mt-2 space-y-2" onKeyDown={(e) => {
      if (e.key === 'Escape') {
        // Nur die Bearbeitung beenden, nicht den Dialog schließen
        e.stopPropagation();
        onCancel();
      }
    }}>
      <div>
        <label htmlFor={labelId} className="block text-xs text-gray-600">Beschriftung</label>
        <input id={labelId} autoFocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120}
          className={editorInput} />
      </div>
      {step.kind === 'task' && (
        <div>
          <label htmlFor={typeId} className="block text-xs text-gray-600">Art</label>
          <select id={typeId} value={taskType} onChange={(e) => setTaskType(e.target.value)} className={editorInput}>
            {TASK_TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </div>
      )}
      <label className="block text-xs text-gray-600">
        Erläuterung (optional)
        <textarea rows={2} value={details.description} onChange={setDetail('description')} maxLength={300} className={editorInput} />
      </label>
      {step.kind === 'task' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="block text-xs text-gray-600">
            Dokument/Formular
            <input value={details.document} onChange={setDetail('document')} maxLength={80} className={editorInput} />
          </label>
          <label className="block text-xs text-gray-600">
            IT-System
            <input value={details.system} onChange={setDetail('system')} maxLength={80} className={editorInput} />
          </label>
          <label className="block text-xs text-gray-600">
            Dauer/Frist
            <input value={details.duration} onChange={setDetail('duration')} maxLength={60} className={editorInput} />
          </label>
        </div>
      )}
      {step.kind !== 'end' && (
        <div>
          <label htmlFor={roleId} className="block text-xs text-gray-600">Zuständig (leer = keine Angabe)</label>
          <input id={roleId} list={roleListId} value={role} onChange={(e) => setRole(e.target.value)} maxLength={60}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent" />
          <datalist id={roleListId}>
            {roles.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>
      )}
      {step.branches.map((branch, i) => (
        <div key={i}>
          <label className="block text-xs text-gray-600">
            Beschriftung des {i + 1}. Ausgangs
            <input value={branchLabels[i]} maxLength={40}
              onChange={(e) => setBranchLabels((prev) => prev.map((value, j) => (j === i ? e.target.value : value)))}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent" />
          </label>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="submit" className="flex items-center px-3 py-1 text-xs font-bold text-white bg-[var(--color-vhs-blau)] rounded hover:bg-[var(--color-vhs-blau-80)]">
          <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Fertig
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-100">
          Abbrechen
        </button>
      </div>
    </form>
  );
};

const StepList = ({ model, dispatch }) => {
  const [editingId, setEditingId] = useState(null);
  const numberOf = new Map(model.steps.map((step, index) => [step.id, index + 1]));
  const targetText = (target) => (target === END ? 'Ende' : `${numberOf.get(target)}. ${model.steps.find((s) => s.id === target)?.label || ''}`);

  const saveStep = (step, { branchLabels, ...changes }) => {
    dispatch({ type: 'editStep', stepId: step.id, ...changes });
    branchLabels.forEach((value, i) => {
      if (value !== step.branches[i].label) dispatch({ type: 'editBranch', stepId: step.id, branchIndex: i, label: value });
    });
    setEditingId(null);
  };

  return (
    <ol className="space-y-2">
      {model.trigger && (
        <li className="text-xs text-gray-600 px-1">Auslöser: <span className="font-medium text-gray-800">{model.trigger}</span></li>
      )}
      {model.steps.map((step, index) => {
        const badge = badgeOf(step);
        const facts = [
          step.document && `Dokument: ${step.document}`,
          step.system && `IT-System: ${step.system}`,
          step.duration && `Dauer/Frist: ${step.duration}`
        ].filter(Boolean);
        const isEditing = editingId === step.id;
        return (
          <li key={step.id} className={`rounded-lg border p-3 ${step.confidence === 'low' ? 'border-amber-300 bg-amber-50' : 'border-[var(--color-vhs-blau-20)] bg-white'}`}>
            <div className="flex items-start gap-2">
              <span className="text-sm font-bold text-[var(--color-vhs-blau)] w-6 shrink-0 text-right">{index + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${badge.className}`}>{badge.label}</span>
                  {step.confidence === 'low' && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">Bitte prüfen</span>
                  )}
                  {step.role && <span className="text-xs text-gray-500">{step.role}</span>}
                </div>
                <p className="text-sm text-gray-900 mt-0.5 break-words">{step.label}</p>
                {step.description && <p className="text-xs text-gray-700 mt-0.5">{step.description}</p>}
                {facts.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{facts.join(' · ')}</p>}
                {step.kind === 'decision' && (
                  <ul className="mt-1 space-y-0.5">
                    {step.branches.map((branch, i) => (
                      <li key={i} className="text-xs text-gray-600">
                        <span className="font-bold">{branch.label}</span> → {targetText(branch.next)}
                      </li>
                    ))}
                  </ul>
                )}
                {step.kind === 'task' && step.next !== (model.steps[index + 1]?.id ?? END) && (
                  <p className="text-xs text-gray-600 mt-1">weiter mit: {targetText(step.next)}</p>
                )}
                {step.note && <p className="text-xs text-gray-600 italic mt-1">Hinweis: {step.note}</p>}
                {isEditing && (
                  <StepEditor step={step} roles={model.roles} onSave={(changes) => saveStep(step, changes)} onCancel={() => setEditingId(null)} />
                )}
              </div>
              {!isEditing && (
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => setEditingId(step.id)} aria-label={`Schritt ${index + 1} bearbeiten`} title="Bearbeiten"
                    className="p-1.5 rounded border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {model.steps.length > 1 && (
                    <button type="button" onClick={() => dispatch({ type: 'removeStep', stepId: step.id })} aria-label={`Schritt ${index + 1} entfernen`} title="Entfernen"
                      className="p-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export const ReviewStep = ({ state, dispatch, onApply }) => {
  const { model } = state;
  const diagram = useMemo(
    () => buildDiagramFromModel(model, { useLanes: state.useLanes, includeNotes: state.includeNotes }),
    [model, state.useLanes, state.includeNotes]
  );
  const hasNotes = model.steps.some((s) => s.note);
  const recommended = model.recommendedVariant && model.recommendedVariant !== state.variantId ? getVariant(model.recommendedVariant) : null;
  const openQuestions = model.questions;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
        <section className="overflow-y-auto px-5 py-4 space-y-4 lg:border-r border-gray-100" aria-label="Erkannter Ablauf">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-vhs-blau)]">{model.title}</h3>
            {model.summary && <p className="text-sm text-gray-700 mt-1"><span className="font-bold">So habe ich den Prozess verstanden:</span> {model.summary}</p>}
          </div>

          {state.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="flex items-center gap-1.5 font-bold mb-1"><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Automatisch korrigiert – bitte prüfen</p>
              <ul className="list-disc pl-5 space-y-0.5">{state.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}

          {model.assumptions.length > 0 && (
            <div className="rounded-lg bg-[var(--color-vhs-blau-10)] px-3 py-2 text-xs text-[var(--color-vhs-blau)]">
              <p className="flex items-center gap-1.5 font-bold mb-1"><Info className="w-3.5 h-3.5" aria-hidden="true" /> Annahmen der KI</p>
              <ul className="list-disc pl-5 space-y-0.5">{model.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          )}

          {openQuestions.length > 0 && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
              <p className="font-bold mb-1">Noch offene Fragen (zum Beantworten auf „Zurück“)</p>
              <ul className="list-disc pl-5 space-y-0.5">{openQuestions.map((q) => <li key={q.id}>{q.text}</li>)}</ul>
            </div>
          )}

          {recommended && (
            <p className="text-xs text-gray-600">
              Tipp: Für diesen Prozess empfiehlt die KI die Variante „{recommended.name}“. Zum Wechseln gehen Sie zurück und analysieren erneut.
            </p>
          )}

          <StepList model={model} dispatch={dispatch} />
        </section>

        <section className="flex flex-col min-h-[280px] border-t lg:border-t-0 border-gray-100" aria-label="Vorschau">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2 border-b border-gray-100 text-sm">
            <label className={`flex items-center gap-2 ${model.roles.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
              <input type="checkbox" checked={state.useLanes} disabled={model.roles.length === 0}
                onChange={(e) => dispatch({ type: 'setUseLanes', value: e.target.checked })} className="accent-[var(--color-vhs-blau)]" />
              Zuständigkeiten als Swimlanes{model.roles.length > 0 ? ` (${model.roles.length})` : ''}
            </label>
            {hasNotes && (
              <label className="flex items-center gap-2 text-gray-700">
                <input type="checkbox" checked={state.includeNotes}
                  onChange={(e) => dispatch({ type: 'setIncludeNotes', value: e.target.checked })} className="accent-[var(--color-vhs-blau)]" />
                Hinweise als Kommentare
              </label>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <Suspense fallback={<div className="p-4 text-sm text-gray-500">Vorschau wird geladen …</div>}>
              <DiagramPreview diagram={diagram} label={`Vorschau des Diagramms „${model.title}“`} />
            </Suspense>
          </div>
        </section>
      </div>
      <Footer>
        <BackButton onClick={() => dispatch({ type: 'back' })} disabled={Boolean(state.busy)} />
        <p className="text-xs text-gray-500 hidden sm:block">Das Diagramm wird als neues, noch ungespeichertes Diagramm geöffnet.</p>
        <button type="button" onClick={onApply} disabled={Boolean(state.busy)} className={PRIMARY_BUTTON}>
          Diagramm übernehmen
        </button>
      </Footer>
    </div>
  );
};
