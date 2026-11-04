import { describe, expect, it } from 'vitest';
import { getReviewScoreSummary, normalizeMetadata, validateDiagram } from './diagram-validation';

const node = (id, type, label = id) => ({ id, type, label });
const edge = (from, to, label = '') => ({ from, to, label });

const codes = (result) => result.findings.map((f) => f.code);

describe('validateDiagram', () => {
  it('meldet keine Fehler bei einem einfachen korrekten Ablauf', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('p', 'process'), node('e', 'end')],
      edges: [edge('s', 'p'), edge('p', 'e')]
    });
    expect(result.isValid).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('meldet fehlenden Start und fehlendes Ende', () => {
    const result = validateDiagram({ nodes: [node('p', 'process')], edges: [] });
    expect(codes(result)).toEqual(expect.arrayContaining(['missing_start', 'missing_end']));
    expect(result.isValid).toBe(false);
  });

  it('meldet mehrere Startknoten', () => {
    const result = validateDiagram({
      nodes: [node('s1', 'start'), node('s2', 'start'), node('e', 'end')],
      edges: [edge('s1', 'e'), edge('s2', 'e')]
    });
    expect(codes(result)).toContain('multiple_starts');
  });

  it('prüft Entscheidungen auf zwei beschriftete Ausgänge', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('d', 'decision'), node('e', 'end')],
      edges: [edge('s', 'd'), edge('d', 'e')]
    });
    expect(codes(result)).toEqual(expect.arrayContaining(['decision_branch_count', 'decision_label_missing']));
    expect(result.findings.find((f) => f.code === 'decision_branch_count').nodeId).toBe('d');
  });

  it('meldet Sackgassen, isolierte Knoten und leere Beschriftungen', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('p', 'process'), node('x', 'process', ''), node('e', 'end')],
      edges: [edge('s', 'p'), edge('s', 'e')]
    });
    expect(codes(result)).toEqual(expect.arrayContaining(['dead_end', 'isolated_node', 'empty_label']));
    // Deutsche Typbezeichnung statt internem Namen
    const emptyLabel = result.findings.find((f) => f.code === 'empty_label');
    expect(emptyLabel.message).toContain('„Prozessschritt“');
    expect(emptyLabel.message).not.toContain('process');
  });

  it('ignoriert Swimlanes bei der Strukturprüfung', () => {
    const result = validateDiagram({
      nodes: [node('lane', 'lane', ''), node('s', 'start'), node('e', 'end')],
      edges: [edge('s', 'e')]
    });
    expect(result.findings).toEqual([]);
  });

  it('meldet Knoten, die vom Start aus nicht erreichbar sind', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('a', 'process'), node('b', 'process', 'Waise'), node('e', 'end')],
      edges: [edge('s', 'a'), edge('a', 'e'), edge('b', 'e')]
    });
    const finding = result.findings.find((f) => f.code === 'unreachable_node');
    expect(finding).toMatchObject({ nodeId: 'b', severity: 'warning' });
    expect(finding.message).toContain('„Waise“');
  });

  it('meldet Schleifen ohne Weg zu einem Ende', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('d', 'decision'), node('a', 'process'), node('b', 'process'), node('e', 'end')],
      edges: [edge('s', 'd'), edge('d', 'e', 'Ja'), edge('d', 'a', 'Nein'), edge('a', 'b'), edge('b', 'a')]
    });
    const finding = result.findings.find((f) => f.code === 'endless_loop');
    expect(finding.nodeId).toBe('a');
    expect(finding.message).toMatch(/„a“, „b“ führen in eine Schleife/);
  });

  it('akzeptiert Rücksprünge, die wieder zum Ende führen', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('p', 'process'), node('d', 'decision'), node('e', 'end')],
      edges: [edge('s', 'p'), edge('p', 'd'), edge('d', 'p', 'Nein'), edge('d', 'e', 'Ja')]
    });
    expect(result.findings).toEqual([]);
  });

  it('meldet Verbindungen aus einem Ende und doppelte Ausgänge', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('d', 'decision'), node('e', 'end'), node('f', 'end')],
      edges: [edge('s', 'd'), edge('d', 'e', 'Ja'), edge('d', 'f', ' ja '), edge('e', 'f')]
    });
    expect(codes(result)).toEqual(expect.arrayContaining(['end_has_outgoing', 'decision_label_duplicate']));
    expect(result.findings.find((f) => f.code === 'end_has_outgoing').nodeId).toBe('e');
  });

  it('zählt Kommentare und ihre Verbindungen nicht zum Ablauf', () => {
    const result = validateDiagram({
      nodes: [node('s', 'start'), node('e', 'end'), node('c', 'annotation')],
      edges: [edge('s', 'e'), edge('e', 'c')]
    });
    expect(codes(result)).not.toContain('end_has_outgoing');
    expect(codes(result)).not.toContain('unreachable_node');
  });

  it('meldet Schritte außerhalb aller Swimlanes', () => {
    const placed = (id, type, x, y) => ({ ...node(id, type), position: { x, y }, size: { width: 100, height: 50 } });
    const lane = { id: 'l', type: 'lane', label: 'Team', position: { x: 0, y: 0 }, size: { width: 600, height: 200 } };
    const result = validateDiagram({
      nodes: [lane, placed('s', 'start', 10, 50), placed('e', 'end', 10, 400)],
      edges: [edge('s', 'e')]
    });
    expect(result.findings.filter((f) => f.code === 'outside_lane').map((f) => f.nodeId)).toEqual(['e']);
  });

  it('erkennt lange lineare Ketten', () => {
    const ids = ['s', 'p1', 'p2', 'p3', 'p4', 'p5', 'e'];
    const nodes = ids.map((id) => node(id, id === 's' ? 'start' : id === 'e' ? 'end' : 'process'));
    const edges = ids.slice(1).map((id, i) => edge(ids[i], id));
    expect(codes(validateDiagram({ nodes, edges }))).toContain('long_linear_chain');
  });

  it('zählt Befunde je Schweregrad', () => {
    const result = validateDiagram({ nodes: [], edges: [] });
    expect(result.counts).toEqual({ error: 2, warning: 0, info: 0 });
  });

  it('verträgt fehlende Daten', () => {
    expect(validateDiagram(null).counts.error).toBe(2);
  });
});

describe('getReviewScoreSummary', () => {
  it('berechnet Durchschnitt und Hotspots', () => {
    const summary = getReviewScoreSummary({ clarity: 0, mediaBreaks: 1, risk: 3, participantFocus: 3, ownership: 3 });
    expect(summary.average).toBe(2);
    expect(summary.hotspots).toEqual(['clarity', 'mediaBreaks']);
  });
});

describe('normalizeMetadata', () => {
  it('füllt fehlende Felder auf', () => {
    const metadata = normalizeMetadata({ improvementItems: 'kaputt' });
    expect(metadata.improvementItems).toEqual([]);
    expect(Object.keys(metadata.reviewScores)).toHaveLength(5);
    expect(Object.keys(metadata.reviewNotes)).toHaveLength(5);
  });
});
