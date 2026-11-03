import { describe, expect, it } from 'vitest';
import { createSnapshot, isDraftNewer, isEmptyDiagram } from './autosave';
import { getDefaultMetadata } from '../analysis/diagram-validation';

const diagram = { nodes: [{ id: 'a', type: 'start', label: 'Start' }], edges: [] };

describe('createSnapshot', () => {
  it('ist für gleichen Inhalt identisch', () => {
    const a = createSnapshot({ name: 'X', diagram, metadata: getDefaultMetadata() });
    const b = createSnapshot({ name: 'X', diagram: JSON.parse(JSON.stringify(diagram)), metadata: {} });
    expect(a).toBe(b);
  });

  it('erkennt Änderungen an Name, Diagramm und Metadaten', () => {
    const base = createSnapshot({ name: 'X', diagram, metadata: {} });
    expect(createSnapshot({ name: 'Y', diagram, metadata: {} })).not.toBe(base);
    expect(createSnapshot({ name: 'X', diagram: { nodes: [], edges: [] }, metadata: {} })).not.toBe(base);
    expect(createSnapshot({ name: 'X', diagram, metadata: { reviewScores: { clarity: 0 } } })).not.toBe(base);
  });

  it('behandelt fehlendes Diagramm wie ein leeres', () => {
    expect(createSnapshot({ name: 'X', diagram: null })).toBe(createSnapshot({ name: 'X', diagram: { nodes: [], edges: [] } }));
  });
});

describe('isEmptyDiagram', () => {
  it('erkennt leere Diagramme', () => {
    expect(isEmptyDiagram(null)).toBe(true);
    expect(isEmptyDiagram({ nodes: [], edges: [] })).toBe(true);
    expect(isEmptyDiagram(diagram)).toBe(false);
  });
});

describe('isDraftNewer', () => {
  const draft = { diagramId: '1', savedAt: '2026-03-02T10:00:00.000Z', record: {} };

  it('bietet Entwürfe ohne gespeicherten Stand an', () => {
    expect(isDraftNewer(draft, null)).toBe(true);
  });

  it('vergleicht mit dem Zeitpunkt der letzten Speicherung', () => {
    expect(isDraftNewer(draft, { updatedAt: '2026-03-02T09:59:00.000Z' })).toBe(true);
    expect(isDraftNewer(draft, { updatedAt: '2026-03-02T10:00:00.000Z' })).toBe(false);
    expect(isDraftNewer(draft, { updatedAt: '2026-03-02T11:00:00.000Z' })).toBe(false);
  });

  it('ignoriert fehlende Entwürfe', () => {
    expect(isDraftNewer(null, null)).toBe(false);
  });
});
