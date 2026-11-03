import { describe, expect, it } from 'vitest';
import { buildComparisonView, diffDiagrams } from './diagram-diff';

const node = (id, type, label, x = 0, y = 0) => ({ id, type, label, position: { x, y }, size: { width: 160, height: 60 } });
const edge = (id, from, to, label = '') => ({ id, from, to, label });

const before = {
  nodes: [node('s', 'start', 'Start'), node('a', 'process', 'Rechnung prüfen', 0, 100), node('b', 'process', 'Ablegen', 0, 200), node('e', 'end', 'Ende', 0, 300)],
  edges: [edge('e1', 's', 'a'), edge('e2', 'a', 'b'), edge('e3', 'b', 'e', 'fertig')]
};

const after = {
  nodes: [
    node('s', 'start', 'Start'),
    node('a', 'process', 'Rechnung sachlich prüfen', 0, 100),
    node('n', 'decision', 'Betrag > 1.000 €?', 0, 200),
    node('e', 'end', 'Ende', 0, 450)
  ],
  edges: [edge('e1', 's', 'a'), edge('e4', 'a', 'n'), edge('e5', 'n', 'e', 'Nein')]
};

describe('diffDiagrams', () => {
  const diff = diffDiagrams(before, after);

  it('erkennt hinzugefügte, geänderte und entfernte Knoten', () => {
    expect(diff.nodes.added.map((n) => n.id)).toEqual(['n']);
    expect(diff.nodes.removed.map((n) => n.id)).toEqual(['b']);
    expect(diff.nodes.changed).toHaveLength(1);
    expect(diff.nodes.changed[0]).toMatchObject({ after: { id: 'a' }, changes: ['label'] });
  });

  it('erkennt Verbindungen und Verschiebungen', () => {
    expect(diff.edges.added.map((e) => e.id)).toEqual(['e4', 'e5']);
    expect(diff.edges.removed.map((e) => e.id)).toEqual(['e2', 'e3']);
    expect(diff.nodes.moved.map((n) => n.id)).toEqual(['e']);
  });

  it('formuliert die Änderungen verständlich', () => {
    const texts = diff.summary.map((s) => s.text);
    expect(texts).toContain('Neu: Entscheidung „Betrag > 1.000 €?“');
    expect(texts).toContain('Schritt „Rechnung prüfen“ umbenannt in „Rechnung sachlich prüfen“');
    expect(texts).toContain('Entfernt: Schritt „Ablegen“');
    expect(texts).toContain('Verbindung entfernt: „Ablegen“ → „Ende“ („fertig“)');
    expect(texts).toContain('1 Element verschoben oder in der Größe geändert');
    expect(diff.isEmpty).toBe(false);
  });

  it('erkennt Typwechsel, umgehängte Verbindungen und geänderte Beschriftungen', () => {
    const changed = diffDiagrams(
      { nodes: [node('a', 'process', 'A'), node('b', 'end', 'B'), node('c', 'end', 'C')], edges: [edge('x', 'a', 'b', 'Ja')] },
      { nodes: [node('a', 'decision', 'A'), node('b', 'end', 'B'), node('c', 'end', 'C')], edges: [edge('x', 'a', 'c', 'Ja')] }
    );
    expect(changed.nodes.changed[0].changes).toEqual(['type']);
    expect(changed.edges.changed[0].changes).toEqual(['to']);
    expect(changed.summary.map((s) => s.text)).toContain('„A“ ist jetzt eine Entscheidung (vorher: Schritt)');

    const relabeled = diffDiagrams(
      { nodes: [node('a', 'decision', 'A'), node('b', 'end', 'B')], edges: [edge('x', 'a', 'b', 'Ja')] },
      { nodes: [node('a', 'decision', 'A'), node('b', 'end', 'B')], edges: [edge('x', 'a', 'b', 'Nein')] }
    );
    expect(relabeled.summary[0].text).toBe('Beschriftung geändert: „A“ → „B“ („Ja“) → „Nein“');
  });

  it('meldet keine Änderungen bei identischen Fassungen', () => {
    const same = diffDiagrams(before, structuredClone(before));
    expect(same.isEmpty).toBe(true);
    expect(same.summary).toEqual([]);
  });

  it('verträgt leere Fassungen', () => {
    expect(diffDiagrams(null, before).nodes.added).toHaveLength(4);
    expect(diffDiagrams(before, null).nodes.removed).toHaveLength(4);
  });

  it('verändert die Eingaben nicht', () => {
    const snapshot = JSON.stringify({ before, after });
    diffDiagrams(before, after);
    buildComparisonView(before, after, diffDiagrams(before, after));
    expect(JSON.stringify({ before, after })).toBe(snapshot);
  });
});

describe('buildComparisonView', () => {
  it('zeigt die neue Fassung plus entfernte Elemente mit Markierungen', () => {
    const diff = diffDiagrams(before, after);
    const view = buildComparisonView(before, after, diff);

    expect(view.diagram.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'e', 'n', 's']);
    expect(view.marks).toEqual({ n: 'added', a: 'changed', b: 'removed' });
    // Entfernte Verbindungen nur, wenn beide Enden sichtbar sind
    expect(view.diagram.edges.map((e) => e.id).sort()).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
    expect(view.edgeMarks).toEqual({ e4: 'added', e5: 'added', e2: 'removed', e3: 'removed' });
  });
});
