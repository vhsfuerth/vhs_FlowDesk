import { describe, expect, it } from 'vitest';
import { collectAnswers, copilotReducer, createCopilotState, hasAnyAnswer } from './copilotState';
import { normalizeProcessModel } from '../ai/copilot/process-model';
import { GOOD_RESPONSE } from '../test/copilot-fixtures';

const modelWith = (overrides = {}) => normalizeProcessModel({ ...JSON.parse(JSON.stringify(GOOD_RESPONSE)), ...overrides }).model;

describe('copilotReducer', () => {
  it('startet im Schritt „Beschreiben“ mit dem übergebenen Text', () => {
    const state = createCopilotState('Mein Prozess');
    expect(state).toMatchObject({ step: 'describe', text: 'Mein Prozess', variantId: 'kompakt', model: null });
  });

  it('geht nach der Analyse zu den Rückfragen, ohne Fragen direkt zur Prüfung', () => {
    const withQuestions = copilotReducer(createCopilotState(), { type: 'analyzed', model: modelWith(), warnings: [] });
    expect(withQuestions.step).toBe('questions');
    // Zwei Rollen → Swimlanes standardmäßig an
    expect(withQuestions.useLanes).toBe(true);

    const withoutQuestions = copilotReducer(createCopilotState(), { type: 'analyzed', model: modelWith({ questions: [] }), warnings: [] });
    expect(withoutQuestions.step).toBe('review');
  });

  it('zeigt während einer Anfrage einen Status und bei Fehlern die Meldung', () => {
    let state = copilotReducer(createCopilotState(), { type: 'start', label: 'Analysiere …' });
    expect(state.busy).toBe('Analysiere …');
    state = copilotReducer(state, { type: 'failed', error: 'Limit erreicht' });
    expect(state).toMatchObject({ busy: null, error: 'Limit erreicht' });
    state = copilotReducer(state, { type: 'setText', text: 'neu' });
    expect(state.error).toBeNull();
  });

  it('sammelt Antworten und geht nach der Verfeinerung zur Prüfung', () => {
    let state = copilotReducer(createCopilotState(), { type: 'analyzed', model: modelWith(), warnings: [] });
    expect(hasAnyAnswer(state)).toBe(false);
    state = copilotReducer(state, { type: 'setAnswer', questionId: 'q1', answer: ' E-Mail ' });
    expect(collectAnswers(state)).toEqual([{ question: 'Wie wird bestätigt?', answer: 'E-Mail' }]);

    state = copilotReducer(state, { type: 'refined', model: modelWith({ questions: [] }), warnings: ['Hinweis'] });
    expect(state).toMatchObject({ step: 'review', warnings: ['Hinweis'], answers: {} });
  });

  it('führt mit „Zurück“ von der Prüfung zu offenen Fragen bzw. zur Beschreibung', () => {
    let state = copilotReducer(createCopilotState(), { type: 'analyzed', model: modelWith(), warnings: [] });
    state = copilotReducer(state, { type: 'skipQuestions' });
    expect(copilotReducer(state, { type: 'back' }).step).toBe('questions');

    const noQuestions = copilotReducer(createCopilotState(), { type: 'analyzed', model: modelWith({ questions: [] }), warnings: [] });
    expect(copilotReducer(noQuestions, { type: 'back' }).step).toBe('describe');
  });

  it('bearbeitet und entfernt Schritte im Modell', () => {
    let state = copilotReducer(createCopilotState(), { type: 'analyzed', model: modelWith(), warnings: [] });
    state = copilotReducer(state, { type: 'editStep', stepId: 's1', label: 'Anmelden' });
    state = copilotReducer(state, { type: 'editBranch', stepId: 's2', branchIndex: 1, label: 'Voll' });
    state = copilotReducer(state, { type: 'removeStep', stepId: 's3' });
    expect(state.model?.steps.map((s) => s.label)).toEqual(['Anmelden', 'Kurs noch frei?', 'Platz gebucht', 'Auf Warteliste setzen']);
    expect(state.model?.steps[1].branches[1].label).toBe('Voll');
  });

  it('wirft bei unbekannten Aktionen', () => {
    expect(() => copilotReducer(createCopilotState(), /** @type {any} */ ({ type: 'gibtsNicht' }))).toThrow();
  });
});
