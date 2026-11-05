import { describe, expect, it } from 'vitest';
import { layoutSelection } from './partial-layout';

const node = (id, type, x, y, extra = {}) => ({ id, type, label: id, position: { x, y }, size: { width: 160, height: 60 }, ...extra });
const edge = (id, from, to, label = '') => ({ id, from, to, label });

const overlaps = (a, b) => a.x < b.x + 160 && b.x < a.x + 160 && a.y < b.y + 60 && b.y < a.y + 60;

describe('layoutSelection', () => {
  const diagram = {
    nodes: [
      node('s', 'start', 0, 0), node('a', 'process', 500, 40), node('b', 'process', 300, 30), node('c', 'process', 310, 35),
      node('x', 'process', 900, 900)
    ],
    edges: [edge('e1', 's', 'a'), edge('e2', 'a', 'b'), edge('e3', 'b', 'c'), edge('e4', 'c', 'x')]
  };

  it('verschiebt nur die ausgewählten Elemente', () => {
    const { positions } = layoutSelection(diagram, ['a', 'b', 'c'], { direction: 'TB' });
    expect(Object.keys(positions).sort()).toEqual(['a', 'b', 'c']);
  });

  it('ordnet die Auswahl in Flussrichtung an und beginnt an ihrer bisherigen Ecke', () => {
    const { positions } = layoutSelection(diagram, ['a', 'b', 'c'], { direction: 'TB' });
    expect(positions.a.y).toBeLessThan(positions.b.y);
    expect(positions.b.y).toBeLessThan(positions.c.y);
    expect(Math.min(...Object.values(positions).map((p) => p.x))).toBe(300);
    expect(Math.min(...Object.values(positions).map((p) => p.y))).toBe(30);
    expect(overlaps(positions.b, positions.c)).toBe(false);
  });

  it('setzt die Anschlüsse aller berührten Verbindungen neu', () => {
    const { ports } = layoutSelection(diagram, ['a', 'b', 'c'], { direction: 'TB' });
    expect(Object.keys(ports).sort()).toEqual(['e1', 'e2', 'e3', 'e4']);
    expect(ports.e2).toEqual({ sourcePort: 'port-bottom', targetPort: 'port-top' });
  });

  it('tut bei weniger als zwei Elementen nichts', () => {
    expect(layoutSelection(diagram, ['a']).positions).toEqual({});
  });

  it('hält Elemente in Swimlane-Diagrammen in ihrer Höhe (Lane) und ordnet von links nach rechts', () => {
    const lanes = {
      nodes: [
        node('l1', 'lane', 0, 0, { size: { width: 700, height: 160 } }),
        node('l2', 'lane', 0, 170, { size: { width: 700, height: 160 } }),
        node('p', 'process', 400, 60, { laneId: 'l1' }), node('q', 'process', 60, 230, { laneId: 'l2' }), node('r', 'process', 80, 60, { laneId: 'l1' })
      ],
      edges: [edge('e1', 'p', 'q'), edge('e2', 'q', 'r')]
    };
    const { positions, direction } = layoutSelection(lanes, ['l1', 'q'], { direction: 'TB' });
    expect(direction).toBe('LR');
    expect(Object.keys(positions).sort()).toEqual(['p', 'q', 'r']);
    expect(positions.p.y).toBe(60);
    expect(positions.q.y).toBe(230);
    expect(positions.p.x).toBeLessThan(positions.q.x);
    expect(positions.q.x).toBeLessThan(positions.r.x);
  });
});
