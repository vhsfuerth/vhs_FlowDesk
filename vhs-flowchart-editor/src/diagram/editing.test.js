import { beforeEach, describe, expect, it } from 'vitest';
import { choosePorts, computeAutoLayout } from './auto-layout';
import { extractFragment, instantiateFragment, readClipboard, writeClipboard } from './clipboard';
import { alignBoxes, distributeBoxes } from './arrange';
import { STARTER_TEMPLATES } from '../data/templates';

const node = (id, type, x, y, width = 160, height = 60) => ({ id, type, label: id, position: { x, y }, size: { width, height } });
const edge = (id, from, to, label = '') => ({ id, from, to, label });

const center = (n, pos) => ({ x: pos.x + n.size.width / 2, y: pos.y + n.size.height / 2 });

describe('computeAutoLayout ohne Swimlanes', () => {
  const diagram = {
    nodes: [node('s', 'start', 0, 0), node('d', 'decision', 0, 0, 180, 110), node('a', 'process', 0, 0), node('b', 'process', 0, 0), node('e', 'end', 0, 0)],
    edges: [edge('e1', 's', 'd'), edge('e2', 'd', 'a', 'Ja'), edge('e3', 'd', 'b', 'Nein'), edge('e4', 'a', 'e'), edge('e5', 'b', 'e')]
  };

  it('ordnet von oben nach unten an', () => {
    const { positions, direction } = computeAutoLayout(diagram, { direction: 'TB' });
    expect(direction).toBe('TB');
    expect(positions.s.y).toBeLessThan(positions.d.y);
    expect(positions.d.y).toBeLessThan(positions.a.y);
    expect(positions.a.y).toBeLessThan(positions.e.y);
  });

  it('ordnet auf Wunsch von links nach rechts an', () => {
    const { positions } = computeAutoLayout(diagram, { direction: 'LR' });
    expect(positions.s.x).toBeLessThan(positions.d.x);
    expect(positions.d.x).toBeLessThan(positions.e.x);
  });

  it('legt Ja in Flussrichtung und Nein zur Seite', () => {
    const { ports } = computeAutoLayout(diagram, { direction: 'TB' });
    expect(ports.e1).toEqual({ sourcePort: 'port-bottom', targetPort: 'port-top' });
    expect(ports.e2.sourcePort).toBe('port-bottom');
    expect(['port-left', 'port-right']).toContain(ports.e3.sourcePort);
  });

  it('erzeugt keine Überlappungen', () => {
    const { positions } = computeAutoLayout(diagram, { direction: 'TB' });
    const boxes = diagram.nodes.map((n) => ({ ...positions[n.id], w: n.size.width, h: n.size.height }));
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap).toBe(false);
    }));
  });
});

describe('computeAutoLayout mit Swimlanes', () => {
  STARTER_TEMPLATES.filter((t) => t.diagram.nodes.some((n) => n.type === 'lane')).forEach((template) => {
    it(`hält alle Knoten in ihrer Lane (${template.id})`, () => {
      const nodes = template.diagram.nodes;
      const lanes = nodes.filter((n) => n.type === 'lane');
      const laneOf = (n) => lanes.find((l) => {
        const c = center(n, n.position);
        return c.y >= l.position.y && c.y <= l.position.y + l.size.height;
      });
      const before = Object.fromEntries(nodes.filter((n) => n.type !== 'lane').map((n) => [n.id, laneOf(n).id]));

      const result = computeAutoLayout(template.diagram, { direction: 'TB' });
      expect(result.direction).toBe('LR');

      nodes.filter((n) => n.type !== 'lane').forEach((n) => {
        const pos = result.positions[n.id];
        const lane = result.lanes[before[n.id]];
        expect(pos.y, n.id).toBeGreaterThanOrEqual(lane.y + 40);
        expect(pos.y + n.size.height, n.id).toBeLessThanOrEqual(lane.y + lane.height);
        expect(pos.x, n.id).toBeGreaterThanOrEqual(lane.x);
        expect(pos.x + n.size.width, n.id).toBeLessThanOrEqual(lane.x + lane.width);
      });
    });
  });

  it('stapelt Lanes ohne Überlappung und in gleicher Breite', () => {
    const template = STARTER_TEMPLATES.find((t) => t.id === 'swimlane-kursentwicklung');
    const lanes = Object.values(computeAutoLayout(template.diagram).lanes).sort((a, b) => a.y - b.y);
    lanes.slice(1).forEach((lane, i) => expect(lane.y).toBeGreaterThanOrEqual(lanes[i].y + lanes[i].height));
    expect(new Set(lanes.map((l) => l.width)).size).toBe(1);
  });

  it('weist Knoten außerhalb aller Lanes der nächstgelegenen Lane zu', () => {
    const diagram = {
      nodes: [
        { ...node('l1', 'lane', 0, 0, 800, 150) },
        { ...node('l2', 'lane', 0, 160, 800, 150) },
        node('s', 'start', 50, 60),
        node('x', 'process', 900, 400)
      ],
      edges: [edge('e1', 's', 'x')]
    };
    const result = computeAutoLayout(diagram);
    expect(result.positions.x.y).toBeGreaterThanOrEqual(result.lanes.l2.y);
  });
});

describe('choosePorts', () => {
  it('führt Rücksprünge über die Seite', () => {
    const ports = choosePorts({ x: 0, y: 300, width: 100, height: 50 }, { x: 0, y: 0, width: 100, height: 50 }, { direction: 'TB' });
    expect(ports).toEqual({ sourcePort: 'port-left', targetPort: 'port-left' });
  });
});

describe('Zwischenablage', () => {
  const diagram = {
    nodes: [node('a', 'process', 10, 20), node('b', 'process', 200, 20), node('c', 'end', 400, 20)],
    edges: [edge('e1', 'a', 'b', 'weiter'), edge('e2', 'b', 'c')]
  };

  beforeEach(() => localStorage.clear());

  it('kopiert nur Verbindungen innerhalb der Auswahl', () => {
    const fragment = extractFragment(diagram, ['a', 'b']);
    expect(fragment.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(fragment.edges.map((e) => e.id)).toEqual(['e1']);
  });

  it('vergibt beim Einfügen neue IDs und verschiebt die Position', () => {
    let counter = 0;
    const fragment = extractFragment(diagram, ['a', 'b']);
    const pasted = instantiateFragment(fragment, { offset: { x: 30, y: 40 }, createId: () => `neu-${++counter}` });

    expect(pasted.nodes.map((n) => n.id)).toEqual(['neu-1', 'neu-2']);
    expect(pasted.nodes[0].position).toEqual({ x: 40, y: 60 });
    expect(pasted.edges[0]).toMatchObject({ id: 'neu-3', from: 'neu-1', to: 'neu-2', label: 'weiter' });
    // Original bleibt unverändert
    expect(fragment.nodes[0].position).toEqual({ x: 10, y: 20 });
  });

  it('legt Ausschnitte über die Ablage ab (auch für andere Diagramme)', () => {
    writeClipboard(extractFragment(diagram, ['c']));
    expect(readClipboard().nodes[0].id).toBe('c');
  });
});

describe('Ausrichten und Verteilen', () => {
  const boxes = [
    { id: 'a', x: 0, y: 0, width: 100, height: 50 },
    { id: 'b', x: 300, y: 40, width: 50, height: 30 },
    { id: 'c', x: 120, y: 100, width: 80, height: 60 }
  ];

  it('richtet links, mittig und unten aus', () => {
    expect(alignBoxes(boxes, 'left')).toMatchObject({ a: { x: 0 }, b: { x: 0 }, c: { x: 0 } });
    expect(alignBoxes(boxes, 'center').b.x).toBe(150);
    expect(alignBoxes(boxes, 'bottom')).toMatchObject({ a: { y: 110 }, b: { y: 130 }, c: { y: 100 } });
  });

  it('verteilt gleichmäßig zwischen den äußeren Elementen', () => {
    const result = distributeBoxes(boxes, 'horizontal');
    expect(result.a.x).toBe(0);
    expect(result.b.x).toBe(300);
    // Lücken: (350 - 0 - 230) / 2 = 60 → c beginnt bei 100 + 60
    expect(result.c.x).toBe(160);
  });

  it('braucht mindestens zwei bzw. drei Elemente', () => {
    expect(alignBoxes(boxes.slice(0, 1), 'left')).toEqual({});
    expect(distributeBoxes(boxes.slice(0, 2), 'vertical')).toEqual({});
  });
});

describe('computeAutoLayout mit laneId', () => {
  it('folgt der festen Zuordnung statt der Lage', () => {
    const lanes = [
      { id: 'l1', type: 'lane', label: 'A', position: { x: 0, y: 0 }, size: { width: 600, height: 200 } },
      { id: 'l2', type: 'lane', label: 'B', position: { x: 0, y: 210 }, size: { width: 600, height: 200 } }
    ];
    const diagram = { nodes: [...lanes, { ...node('x', 'process', 50, 60), laneId: 'l2' }], edges: [] };
    const result = computeAutoLayout(diagram, { direction: 'TB' });
    const lane2 = result.lanes.l2;
    expect(result.positions.x.y).toBeGreaterThanOrEqual(lane2.y);
    expect(result.positions.x.y).toBeLessThan(lane2.y + lane2.height);
  });
});
