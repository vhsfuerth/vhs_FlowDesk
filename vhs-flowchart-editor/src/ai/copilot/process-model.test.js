import { describe, expect, it } from 'vitest';
import { GOOD_RESPONSE } from '../../test/copilot-fixtures';
import { END, MAX_QUESTIONS, MAX_STEPS, ProcessModelError, normalizeProcessModel, removeStep, toRawModel, updateBranchLabel, updateStep } from './process-model';

const clone = (value) => JSON.parse(JSON.stringify(value));

describe('normalizeProcessModel', () => {
  it('übernimmt eine gute Antwort unverändert und ohne Hinweise', () => {
    const { model, warnings } = normalizeProcessModel(clone(GOOD_RESPONSE));
    expect(warnings).toEqual([]);
    expect(model.title).toBe('Kursanmeldung');
    expect(model.trigger).toBe('Anmeldung geht ein');
    expect(model.roles).toEqual(['Teilnehmende', 'Verwaltung']);
    expect(model.steps.map((s) => s.kind)).toEqual(['task', 'decision', 'task', 'end', 'task']);
    expect(model.steps[4].next).toBe(END);
    expect(model.steps[2]).toMatchObject({ confidence: 'low', note: 'Versandweg unklar.' });
    expect(model.questions[0]).toMatchObject({ id: 'q1', stepId: 's3', options: ['E-Mail', 'Brief'] });
    expect(model.recommendedVariant).toBe('buergernah');
  });

  it('wirft verständliche Fehler, wenn kein Prozess erkennbar ist', () => {
    expect(() => normalizeProcessModel(null)).toThrow(ProcessModelError);
    expect(() => normalizeProcessModel('Text')).toThrow('keine Prozessbeschreibung');
    expect(() => normalizeProcessModel({ steps: [] })).toThrow('keine Prozessschritte');
    expect(() => normalizeProcessModel({ steps: [{ kind: 'start', label: 'Los' }] })).toThrow('keine Prozessschritte');
  });

  it('macht fehlende Verweise explizit: nächster Schritt, am Ende END', () => {
    const { model } = normalizeProcessModel({ steps: [{ label: 'A' }, { label: 'B' }] });
    expect(model.steps.map((s) => s.next)).toEqual([model.steps[1].id, END]);
    expect(model.title).toBe('KI-Prozess');
  });

  it('vergibt fehlende und doppelte IDs neu, Verweise zeigen auf den ersten Schritt', () => {
    const { model } = normalizeProcessModel({
      steps: [
        { id: 'a', label: 'Eins', next: 'b' },
        { id: 'b', label: 'Zwei', next: 'a' },
        { id: 'b', label: 'Drei (doppelte ID)' },
        { label: 'Vier (ohne ID)' }
      ]
    });
    const ids = model.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(4);
    expect(model.steps[0].next).toBe('b');
    expect(model.steps[1].next).toBe('a');
  });

  it('ersetzt unbekannte Verweise und Selbstverweise durch den folgenden Schritt und meldet es', () => {
    const { model, warnings } = normalizeProcessModel({
      steps: [{ id: 'a', label: 'A', next: 'gibt-es-nicht' }, { id: 'b', label: 'B', next: 'b' }, { id: 'c', label: 'C' }]
    });
    expect(model.steps[0].next).toBe('b');
    expect(model.steps[1].next).toBe('c');
    expect(warnings).toHaveLength(2);
  });

  it('nutzt einen Startschritt der KI als Auslöser', () => {
    const { model } = normalizeProcessModel({ steps: [{ kind: 'start', label: 'Antrag geht ein' }, { label: 'Prüfen' }] });
    expect(model.trigger).toBe('Antrag geht ein');
    expect(model.steps).toHaveLength(1);
  });

  it('versteht deutsche und englische Typbezeichnungen', () => {
    const { model } = normalizeProcessModel({
      steps: [
        { type: 'Aufgabe', label: 'A' },
        { type: 'Entscheidung', label: 'B?', branches: [{ label: 'Ja', next: 'END' }, { label: 'Nein', next: 'END' }] },
        { type: 'stop', label: 'Fertig' },
        { kind: 'quatsch', label: 'D' }
      ]
    });
    expect(model.steps.map((s) => s.kind)).toEqual(['task', 'decision', 'end', 'task']);
  });

  it('liest das Format mit Übergängen („transitions“)', () => {
    const { model, issues } = normalizeProcessModel({
      steps: [
        { id: 'a', label: 'Prüfen', kind: 'task', transitions: [{ label: '', to: 'b' }] },
        { id: 'b', label: 'Korrekt?', kind: 'decision', transitions: [{ label: 'Ja', to: 'END' }, { label: 'Nein', to: 'a' }] }
      ]
    });
    expect(model.steps[0].next).toBe('b');
    expect(model.steps[1].branches).toEqual([{ label: 'Ja', next: END }, { label: 'Nein', next: 'a' }]);
    expect(issues).toEqual([]);
  });

  it('behandelt Schritte mit mehreren Übergängen oder Fragezeichen als Entscheidung', () => {
    const { model } = normalizeProcessModel({
      steps: [
        { id: 'a', label: 'Unterlagen sichten', kind: 'task', transitions: [{ label: 'vollständig', to: 'END' }, { label: 'unvollständig', to: 'b' }] },
        { id: 'b', label: 'Ist die Frist abgelaufen?', kind: 'task', transitions: [{ label: '', to: 'END' }] }
      ]
    });
    expect(model.steps.map((s) => s.kind)).toEqual(['decision', 'decision']);
  });

  it('ergänzt fehlende Zweige mit dem sonst unverbundenen Schritt (BEM-Fall)', () => {
    // So kam die Antwort im Praxistest: Fragen als einfache Schritte, Nein-Wege lose
    const { model, warnings, issues } = normalizeProcessModel({
      trigger: 'Mitarbeiter ist länger als 6 Wochen pro Jahr krank',
      steps: [
        { id: 's1', kind: 'task', label: 'BEM-Angebotsschreiben versenden', next: 's2' },
        { id: 's2', kind: 'task', label: 'Betriebsrat informieren', next: 's3' },
        { id: 's3', kind: 'task', label: 'Schriftliche Zustimmung zum BEM?', next: 's4' },
        { id: 's4', kind: 'task', label: 'BEM-Gespräch durchführen', next: 's4c' },
        { id: 's4c', kind: 'task', label: 'Maßnahmen vereinbart?', next: 's4d' },
        { id: 's4d', kind: 'end', label: 'BEM-Maßnahmen vereinbart' },
        { id: 's4e', kind: 'end', label: 'Keine BEM-Maßnahmen vereinbart' },
        { id: 's5', kind: 'task', label: 'Mündlich nachfragen', next: 's6' },
        { id: 's6', kind: 'task', label: 'Zustimmung nach Nachfrage?', next: 's7' },
        { id: 's7', kind: 'end', label: 'BEM nicht zustande gekommen' }
      ]
    });
    const step = (id) => model.steps.find((s) => s.id === id);

    expect(step('s3')).toMatchObject({ kind: 'decision', confidence: 'low' });
    expect(step('s3')?.branches).toEqual([{ label: 'Ja', next: 's4' }, { label: 'Nein', next: 's5' }]);
    expect(step('s4c')?.branches).toEqual([{ label: 'Ja', next: 's4d' }, { label: 'Nein', next: 's4e' }]);
    expect(step('s6')?.kind).toBe('decision');
    expect(step('s6')?.branches).toHaveLength(2);
    // Nichts bleibt unverbunden
    expect(warnings.some((w) => w.includes('nicht erreichbar'))).toBe(false);
    // Die Reparatur ist geraten → Selbstkorrektur durch die KI anstoßen
    expect(issues).toHaveLength(3);
    expect(issues[0]).toContain('weniger als zwei Übergänge');
  });

  it('ergänzt einen Zweig zum Ende, wenn kein unverbundener Schritt passt', () => {
    const { model, warnings } = normalizeProcessModel({
      steps: [
        { id: 'd', kind: 'decision', label: 'Ohne Ausgänge?' },
        { id: 'x', kind: 'task', label: 'Weiter' }
      ]
    });
    expect(model.steps[0].branches).toEqual([{ label: 'Ja', next: 'x' }, { label: 'Nein', next: END }]);
    expect(warnings[0]).toContain('zum Ende');
  });

  it('übernimmt „Nein“ als vorhandenen Zweig und ergänzt „Ja“', () => {
    const { model } = normalizeProcessModel({
      steps: [{ id: 'd', kind: 'decision', label: 'Frei?', transitions: [{ label: 'Nein', to: 'END' }] }, { id: 'x', label: 'Buchen' }]
    });
    expect(model.steps[0].branches.map((b) => b.label)).toEqual(['Nein', 'Ja']);
  });

  it('meldet unerreichbare Schritte und unbekannte Verweise als Probleme für die Selbstkorrektur', () => {
    const { issues } = normalizeProcessModel({
      steps: [{ id: 'a', label: 'A', next: 'END' }, { id: 'b', label: 'B', next: 'gibt-es-nicht' }]
    });
    expect(issues.some((i) => i.includes('„B“ (id b) ist von keinem anderen Schritt aus erreichbar'))).toBe(true);
    expect(issues.some((i) => i.includes('unbekannte id „gibt-es-nicht“'))).toBe(true);
  });

  it('wandelt Modelle verlustfrei ins KI-Format zurück', () => {
    const { model } = normalizeProcessModel(clone(GOOD_RESPONSE));
    const again = normalizeProcessModel(toRawModel(model));
    expect(again.model.steps).toEqual(model.steps);
    expect(again.issues).toEqual([]);
  });

  it('beschriftet unbeschriftete Zweige', () => {
    const { model } = normalizeProcessModel({
      steps: [{ kind: 'decision', label: 'Frei?', branches: [{ next: 'END' }, { next: 'END' }] }]
    });
    expect(model.steps[0].branches.map((b) => b.label)).toEqual(['Ja', 'Nein']);
  });

  it('meldet unerreichbare Schritte', () => {
    const { warnings } = normalizeProcessModel({
      steps: [{ id: 'a', label: 'A', next: 'END' }, { id: 'b', label: 'Verwaist' }]
    });
    expect(warnings.join(' ')).toContain('„Verwaist“');
  });

  it('begrenzt Schritte, Rückfragen und Textlängen', () => {
    const { model, warnings } = normalizeProcessModel({
      steps: Array.from({ length: MAX_STEPS + 5 }, (_, i) => ({ label: `Schritt ${i} ${'x'.repeat(200)}` })),
      questions: Array.from({ length: 9 }, (_, i) => ({ text: `Frage ${i}` }))
    });
    expect(model.steps).toHaveLength(MAX_STEPS);
    expect(model.steps[0].label.length).toBeLessThanOrEqual(120);
    expect(model.questions).toHaveLength(MAX_QUESTIONS);
    expect(warnings[0]).toContain('Teilprozesse');
  });

  it('ignoriert Rollen ohne Schritt und ungültige Varianten', () => {
    const { model } = normalizeProcessModel({
      roles: ['Geschäftsführung', 'Verwaltung'],
      steps: [{ label: 'A', role: 'Verwaltung' }, { label: 'B', role: 'Kasse' }],
      recommendedVariant: 'unbekannt'
    });
    expect(model.roles).toEqual(['Verwaltung', 'Kasse']);
    expect(model.recommendedVariant).toBeNull();
  });

  it('verwirft Rückfragen ohne Text und unbekannte Schrittbezüge', () => {
    const { model } = normalizeProcessModel({
      steps: [{ id: 'a', label: 'A' }],
      questions: [{ text: '' }, { text: 'Wer?', stepId: 'zzz' }, { id: 'q', text: 'Wann?' }, { id: 'q', text: 'Wie?' }]
    });
    expect(model.questions.map((q) => q.text)).toEqual(['Wer?', 'Wann?', 'Wie?']);
    expect(model.questions[0].stepId).toBe('');
    expect(new Set(model.questions.map((q) => q.id)).size).toBe(3);
  });
});

describe('Bearbeitung', () => {
  const base = () => normalizeProcessModel(clone(GOOD_RESPONSE)).model;

  it('ändert Beschriftung und Rolle und aktualisiert die Rollenliste', () => {
    const model = updateStep(base(), 's1', { label: 'Online anmelden', role: 'Verwaltung' });
    expect(model.steps[0]).toMatchObject({ label: 'Online anmelden', role: 'Verwaltung' });
    expect(model.roles).toEqual(['Verwaltung']);
  });

  it('behält die alte Beschriftung, wenn die neue leer ist', () => {
    expect(updateStep(base(), 's1', { label: '   ' }).steps[0].label).toBe('Anmeldung online absenden');
  });

  it('ändert Zweigbeschriftungen', () => {
    expect(updateBranchLabel(base(), 's2', 1, 'Ausgebucht').steps[1].branches[1].label).toBe('Ausgebucht');
  });

  it('leitet Verweise beim Entfernen auf den Nachfolger um', () => {
    const model = removeStep(base(), 's3');
    expect(model.steps.map((s) => s.id)).toEqual(['s1', 's2', 's4', 's5']);
    expect(model.steps[1].branches[0].next).toBe('s4');
    expect(model.questions[0].stepId).toBe('');
  });

  it('leitet beim Entfernen einer Entscheidung auf den ersten Zweig um', () => {
    const model = removeStep(base(), 's2');
    expect(model.steps[0].next).toBe('s3');
  });

  it('lässt Verweise auf einen entfernten Endpunkt im Ende münden', () => {
    const model = removeStep(base(), 's4');
    expect(model.steps.find((s) => s.id === 's3')?.next).toBe(END);
  });

  it('entfernt nicht den letzten Schritt', () => {
    const { model } = normalizeProcessModel({ steps: [{ id: 'a', label: 'A' }] });
    expect(removeStep(model, 'a')).toBe(model);
  });
});
