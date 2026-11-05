// @ts-check
// Zustand des KI-Copilot-Dialogs als Reducer (rein, testbar).
// Schritte: describe → (questions) → review. `busy` zeigt eine laufende KI-Anfrage an.

import { DEFAULT_VARIANT_ID } from '../ai/copilot/variants';
import { removeStep, updateBranchLabel, updateStep } from '../ai/copilot/process-model';
import { shouldUseLanesByDefault } from '../ai/copilot/model-to-diagram';

/** @typedef {import('../ai/copilot/process-model').ProcessModel} ProcessModel */
/** @typedef {'describe' | 'questions' | 'review'} CopilotStep */

/**
 * @typedef {Object} CopilotState
 * @property {CopilotStep} step
 * @property {string} text
 * @property {string} variantId
 * @property {ProcessModel | null} model
 * @property {string[]} warnings
 * @property {Record<string, string>} answers   Frage-ID → Antwort
 * @property {boolean} useLanes
 * @property {boolean} includeNotes
 * @property {string | null} busy               Statustext während einer KI-Anfrage
 * @property {string | null} error
 */

/**
 * @param {string} [text]
 * @returns {CopilotState}
 */
export const createCopilotState = (text = '') => ({
  step: 'describe',
  text,
  variantId: DEFAULT_VARIANT_ID,
  model: null,
  warnings: [],
  answers: {},
  useLanes: false,
  includeNotes: true,
  busy: null,
  error: null
});

export const MIN_DESCRIPTION_LENGTH = 20;

/**
 * @typedef {{ type: 'setText', text: string }
 *   | { type: 'setVariant', variantId: string }
 *   | { type: 'start', label: string }
 *   | { type: 'analyzed', model: ProcessModel, warnings: string[] }
 *   | { type: 'refined', model: ProcessModel, warnings: string[] }
 *   | { type: 'failed', error: string }
 *   | { type: 'cancelled' }
 *   | { type: 'setAnswer', questionId: string, answer: string }
 *   | { type: 'skipQuestions' }
 *   | { type: 'back' }
 *   | { type: 'setUseLanes', value: boolean }
 *   | { type: 'setIncludeNotes', value: boolean }
 *   | ({ type: 'editStep', stepId: string } & import('../ai/copilot/process-model').StepChanges)
 *   | { type: 'editBranch', stepId: string, branchIndex: number, label: string }
 *   | { type: 'removeStep', stepId: string }} CopilotAction
 */

/**
 * @param {CopilotState} state
 * @param {CopilotAction} action
 * @returns {CopilotState}
 */
export function copilotReducer(state, action) {
  switch (action.type) {
    case 'setText':
      return { ...state, text: action.text, error: null };
    case 'setVariant':
      return { ...state, variantId: action.variantId };
    case 'start':
      return { ...state, busy: action.label, error: null };
    case 'analyzed': {
      const hasQuestions = action.model.questions.length > 0;
      return {
        ...state,
        busy: null,
        model: action.model,
        warnings: action.warnings,
        answers: {},
        useLanes: shouldUseLanesByDefault(action.model),
        step: hasQuestions ? 'questions' : 'review'
      };
    }
    case 'refined':
      // Neue Rückfragen nach einer Verfeinerung werden nur als Hinweis gezeigt, um Endlosschleifen zu vermeiden
      return {
        ...state,
        busy: null,
        model: action.model,
        warnings: action.warnings,
        answers: {},
        useLanes: state.useLanes || shouldUseLanesByDefault(action.model),
        step: 'review'
      };
    case 'failed':
      return { ...state, busy: null, error: action.error };
    case 'cancelled':
      return { ...state, busy: null };
    case 'setAnswer':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.answer } };
    case 'skipQuestions':
      return { ...state, step: 'review', error: null };
    case 'back':
      if (state.step === 'review' && state.model?.questions.length) {
        return { ...state, step: 'questions', error: null };
      }
      return { ...state, step: 'describe', error: null };
    case 'setUseLanes':
      return { ...state, useLanes: action.value };
    case 'setIncludeNotes':
      return { ...state, includeNotes: action.value };
    case 'editStep':
      if (!state.model) return state;
      return {
        ...state,
        model: updateStep(state.model, action.stepId, {
          label: action.label,
          role: action.role,
          taskType: action.taskType,
          description: action.description,
          document: action.document,
          system: action.system,
          duration: action.duration
        })
      };
    case 'editBranch':
      if (!state.model) return state;
      return { ...state, model: updateBranchLabel(state.model, action.stepId, action.branchIndex, action.label) };
    case 'removeStep':
      if (!state.model) return state;
      return { ...state, model: removeStep(state.model, action.stepId) };
    default:
      throw new Error(`Unbekannte Copilot-Aktion: ${/** @type {any} */ (action).type}`);
  }
}

/**
 * Antworten in der Reihenfolge der Fragen, für die Verfeinerung.
 * @param {CopilotState} state
 * @returns {{ question: string, answer: string }[]}
 */
export const collectAnswers = (state) => (state.model?.questions || []).map((question) => ({
  question: question.text,
  answer: (state.answers[question.id] || '').trim()
}));

/** @param {CopilotState} state */
export const hasAnyAnswer = (state) => collectAnswers(state).some((a) => a.answer);
