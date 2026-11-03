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
  });

  it('ignoriert Swimlanes bei der Strukturprüfung', () => {
    const result = validateDiagram({
      nodes: [node('lane', 'lane', ''), node('s', 'start'), node('e', 'end')],
      edges: [edge('s', 'e')]
    });
    expect(result.findings).toEqual([]);
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
