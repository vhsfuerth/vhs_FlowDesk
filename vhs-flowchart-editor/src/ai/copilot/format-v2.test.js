import { describe, expect, it } from 'vitest';
import '../../diagram/shapes';
import { normalizeProcessModel, toRawModel, updateStep } from './process-model';
import { buildDiagramFromModel, nodeIdForStep } from './model-to-diagram';
import { buildAnalysisPrompt, buildRefinePrompt, buildRepairPrompt, PROCESS_MODEL_SCHEMA, STEP_KINDS } from './prompts';
import { validateDiagramData } from '../../storage/schema';
import { validateDiagram } from '../../analysis/diagram-validation';

// Antwort mit den neuen Schrittarten und Angaben (Format 2)
const RESPONSE = {
  title: 'Rechnungsprüfung',
  summary: 'Rechnungen werden erfasst, geprüft und bezahlt.',
  trigger: 'Rechnung geht ein',
  roles: ['Buchhaltung', 'Leitung'],
  steps: [
    { id: 's1', label: 'Rechnung erfassen', kind: 'system', role: 'Buchhaltung', system: 'Finanzsoftware', transitions: [{ label: '', to: 's2' }] },
    { id: 's2', label: 'Rechnung korrekt?', kind: 'decision', role: 'Buchhaltung', description: 'Betrag und Leistung abgleichen.', transitions: [{ label: 'Ja', to: 's3' }, { label: 'Nein', to: 's4' }] },
    { id: 's3', label: 'Zahlung freigeben', kind: 'task', role: 'Leitung', duration: '14 Tage', transitions: [{ label: '', to: 'END' }] },
    { id: 's4', label: 'Korrektur anfordern', kind: 'Formular', role: 'Buchhaltung', document: 'Rückfrageschreiben', transitions: [{ label: '', to: 's5' }] },
    { id: 's5', label: 'Neue Rechnung abwarten', kind: 'wait', role: 'Buchhaltung', duration: '2 Wochen', transitions: [{ label: '', to: 's1' }] }
  ],
  questions: [],
  assumptions: []
};

const modelOf = () => normalizeProcessModel(JSON.parse(JSON.stringify(RESPONSE))).model;

describe('Copilot: Schrittarten und Angaben', () => {
  it('erkennt Dokument, IT-System und Warten als Tätigkeiten mit eigener Art', () => {
    const { model, warnings } = normalizeProcessModel(JSON.parse(JSON.stringify(RESPONSE)));
    expect(warnings).toEqual([]);
    const byId = Object.fromEntries(model.steps.map((s) => [s.id, s]));
    expect(byId.s1).toMatchObject({ kind: 'task', taskType: 'system', system: 'Finanzsoftware', next: 's2' });
    expect(byId.s4).toMatchObject({ kind: 'task', taskType: 'document', document: 'Rückfrageschreiben' });
    expect(byId.s5).toMatchObject({ kind: 'task', taskType: 'wait', duration: '2 Wochen' });
    expect(byId.s2).toMatchObject({ kind: 'decision', taskType: 'process', description: 'Betrag und Leistung abgleichen.' });
  });

  it('gibt Arten und Angaben bei der Verfeinerung an die KI zurück', () => {
    const raw = toRawModel(modelOf());
    expect(raw.steps[0]).toMatchObject({ kind: 'system', system: 'Finanzsoftware' });
    expect(raw.steps[3].kind).toBe('document');
    expect(raw.steps[2]).toMatchObject({ kind: 'task', duration: '14 Tage' });
    expect(raw.steps[2]).not.toHaveProperty('document');
    expect(normalizeProcessModel(raw).model.steps.map((s) => s.taskType)).toEqual(['system', 'process', 'process', 'document', 'wait']);
  });

  it('lässt Art und Angaben in der Prüfansicht ändern', () => {
    const updated = updateStep(modelOf(), 's3', { taskType: 'document', description: '  Vier-Augen-Prinzip  ', duration: '' });
    const step = updated.steps.find((s) => s.id === 's3');
    expect(step).toMatchObject({ taskType: 'document', description: 'Vier-Augen-Prinzip', duration: '' });
    // Entscheidungen bleiben Entscheidungen
    expect(updateStep(updated, 's2', { taskType: 'wait' }).steps.find((s) => s.id === 's2').taskType).toBe('process');
  });

  it('erzeugt passende Elemente mit Angaben und fester Lane-Zuordnung', () => {
    const diagram = buildDiagramFromModel(modelOf(), { useLanes: true });
    expect(validateDiagramData(diagram)).toEqual([]);
    const node = (stepId) => diagram.nodes.find((n) => n.id === nodeIdForStep(stepId));
    expect(node('s1')).toMatchObject({ type: 'system', system: 'Finanzsoftware' });
    expect(node('s4')).toMatchObject({ type: 'document', document: 'Rückfrageschreiben' });
    expect(node('s5')).toMatchObject({ type: 'wait', duration: '2 Wochen' });
    expect(node('s2').description).toBe('Betrag und Leistung abgleichen.');
    const lanes = diagram.nodes.filter((n) => n.type === 'lane');
    expect(lanes.find((l) => l.id === node('s3').laneId)?.label).toBe('Leitung');
    expect(node('s1')).not.toHaveProperty('role');
    expect(validateDiagram(diagram).findings.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('schreibt die Rolle ohne Swimlanes als Zuständigkeit an den Schritt', () => {
    const diagram = buildDiagramFromModel(modelOf(), { useLanes: false });
    expect(diagram.nodes.find((n) => n.id === nodeIdForStep('s3'))).toMatchObject({ role: 'Leitung' });
    expect(diagram.nodes.some((n) => n.laneId)).toBe(false);
  });
});

describe('Copilot-Prompts', () => {
  it('beschreiben die neuen Schrittarten und Angaben und enden mit dem Ausgabeformat', () => {
    [buildAnalysisPrompt(), buildRefinePrompt(), buildRepairPrompt()].forEach((prompt) => {
      STEP_KINDS.forEach((kind) => expect(prompt).toContain(`"${kind}"`));
      ['"description"', '"document"', '"system"', '"duration"'].forEach((field) => expect(prompt).toContain(field));
      expect(prompt.trim().endsWith('ohne Markdown-Codeblock.')).toBe(true);
    });
    expect(PROCESS_MODEL_SCHEMA.properties.steps.items.properties.kind.enum).toEqual(STEP_KINDS);
  });

  it('bettet Hinweise der Einrichtung abgegrenzt ein', () => {
    const prompt = buildAnalysisPrompt({ hints: 'Wir sagen „Teilnehmende“, nicht „Kunden“.' });
    expect(prompt).toContain('<hinweise>\nWir sagen „Teilnehmende“, nicht „Kunden“.\n</hinweise>');
  });
});
