import { describe, expect, it, vi } from 'vitest';
import * as joint from 'jointjs';
import { JSONConverter, setElementLane } from './converter';
import { createLaneNode, createNode, createNodeAt, createProcessNode, NODE_DEFAULTS } from './shapes';
import { laneAtCenter, laneOf, withLaneIds } from './lanes';
import {
  adoptFreeElements, assignLane, attachLaneEmbedding, growLaneToFit, grownLaneRect, minLaneSize, moveLane, LANE_HEADER, LANE_PADDING
} from './lane-embedding';
import { nextDecisionLabel, nextEdgePorts, placeNextNode } from './add-next';
import { instantiateFragment } from './clipboard';
import { startGroupDrag } from './selection';
import { resetLinkLabelPosition, setLinkLabelText } from './text-editing';
import { NODE_TYPES } from './types';

const newGraph = () => new joint.dia.Graph({}, { cellNamespace: joint.shapes });

const laneNode = (id, y, label = id) => ({ id, type: 'lane', label, position: { x: 0, y }, size: { width: 800, height: 200 } });
const step = (id, x, y, extra = {}) => ({ id, type: 'process', label: id, position: { x, y }, size: { width: 160, height: 60 }, ...extra });

describe('Zuordnung zu Swimlanes (ohne JointJS)', () => {
  const lanes = [laneNode('l1', 0), laneNode('l2', 200)];

  it('nutzt eine gültige laneId, sonst die Lage', () => {
    expect(laneOf(step('a', 10, 250, { laneId: 'l1' }), lanes)?.id).toBe('l1');
    expect(laneOf(step('a', 10, 250, { laneId: 'weg' }), lanes)?.id).toBe('l2');
    expect(laneOf(step('a', 10, 900), lanes)).toBeNull();
  });

  it('wählt bei verschachtelten Lanes die kleinste', () => {
    const big = { lane: { id: 'big' }, rect: { x: 0, y: 0, width: 1000, height: 1000 } };
    const small = { lane: { id: 'small' }, rect: { x: 0, y: 0, width: 300, height: 300 } };
    expect(laneAtCenter({ x: 10, y: 10, width: 100, height: 50 }, [big, small])?.id).toBe('small');
  });

  it('ergänzt fehlende laneId und entfernt ungültige', () => {
    const result = withLaneIds([...lanes, step('a', 10, 20), step('b', 10, 900, { laneId: 'weg' })]);
    expect(result.find((n) => n.id === 'a')?.laneId).toBe('l1');
    expect(result.find((n) => n.id === 'b')).not.toHaveProperty('laneId');
  });
});

describe('Konverter Format 2', () => {
  const diagram = {
    nodes: [
      laneNode('l1', 0, 'Verwaltung'),
      step('a', 40, 60, { laneId: 'l1', description: 'Antrag lesen', document: 'Antrag', system: 'Kufer', duration: '2 Tage', role: '' }),
      step('b', 300, 60),
      { id: 's', type: 'subprocess', label: 'Abrechnung', position: { x: 40, y: 400 }, size: { width: 180, height: 70 }, subprocessId: 'diagramm-2' },
      { id: 'w', type: 'wait', label: '14 Tage warten', position: { x: 300, y: 400 }, size: { width: 170, height: 60 } }
    ],
    edges: [
      { id: 'e1', from: 'a', to: 'b', label: 'Ja', vertices: [{ x: 250, y: 40 }], labelPosition: { distance: 0.3, offset: -10 }, routing: 'straight' },
      { id: 'e2', from: 'b', to: 's', label: '' }
    ]
  };

  it('übernimmt Zusatzangaben, Knickpunkte, Beschriftungslage und Linienführung verlustfrei', () => {
    const graph = newGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson(diagram);
    const json = converter.toJson();

    const a = json.nodes.find((n) => n.id === 'a');
    expect(a).toMatchObject({ laneId: 'l1', description: 'Antrag lesen', document: 'Antrag', system: 'Kufer', duration: '2 Tage' });
    expect(a).not.toHaveProperty('role');
    expect(json.nodes.find((n) => n.id === 's')).toMatchObject({ type: 'subprocess', subprocessId: 'diagramm-2' });
    expect(json.nodes.find((n) => n.id === 'w')?.type).toBe('wait');

    const e1 = json.edges.find((e) => e.id === 'e1');
    expect(e1).toMatchObject({ vertices: [{ x: 250, y: 40 }], labelPosition: { distance: 0.3, offset: -10 }, routing: 'straight', label: 'Ja' });
    const e2 = json.edges.find((e) => e.id === 'e2');
    expect(e2).not.toHaveProperty('vertices');
    expect(e2).not.toHaveProperty('routing');
    expect(e2).not.toHaveProperty('labelPosition');
  });

  it('bettet Elemente in ihre Lane ein, auch ohne laneId nach Lage', () => {
    const graph = newGraph();
    new JSONConverter(graph).fromJson({ nodes: [laneNode('l1', 0), step('a', 40, 60)], edges: [] });
    expect(graph.getCell('a').getParentCell()?.id).toBe('l1');
  });

  it('erzeugt alle Elementtypen', () => {
    NODE_TYPES.forEach((type) => {
      expect(createNode(type, 0, 0).get('type').toLowerCase()).toBe(`vhs.${type}`);
      expect(NODE_DEFAULTS[type]).toBeDefined();
    });
    const node = createNodeAt('system', 400, 300);
    const box = node.getBBox();
    expect(box.x + box.width / 2).toBeCloseTo(400, -1);
  });
});

describe('Swimlanes halten ihre Elemente', () => {
  const setup = () => {
    const graph = newGraph();
    const lane = createLaneNode(0, 0, 'Lane');
    const node = createProcessNode(50, 60, 'Schritt');
    graph.addCells([lane, node]);
    setElementLane(node, lane);
    return { graph, lane, node };
  };

  it('verschiebt eingebettete Elemente mit der Lane (wie beim Ziehen)', () => {
    const { lane, node } = setup();
    lane.position(0, 100, { deep: true });
    expect(node.position()).toEqual({ x: 50, y: 160 });
    lane.translate(10, 0);
    expect(node.position()).toEqual({ x: 60, y: 160 });
  });

  it('behält beim Löschen einer Lane ihre Elemente', () => {
    const { graph, lane, node } = setup();
    lane.remove();
    expect(graph.getCell(node.id)).toBeDefined();
    expect(node.getParentCell()).toBeNull();
  });

  it('wächst mit dem Inhalt, ohne ihn zu verschieben, und schrumpft nie', () => {
    const { lane, node } = setup();
    node.position(900, 300);
    growLaneToFit(lane);
    expect(node.position()).toEqual({ x: 900, y: 300 });
    const box = lane.getBBox();
    expect(box.x + box.width).toBe(900 + node.size().width + LANE_PADDING);
    expect(box.y + box.height).toBe(300 + node.size().height + LANE_PADDING);

    expect(grownLaneRect({ x: 0, y: 0, width: 500, height: 500 }, { x: 100, y: 100, width: 50, height: 50 }))
      .toEqual({ x: 0, y: 0, width: 500, height: 500 });
    expect(grownLaneRect({ x: 0, y: 0, width: 500, height: 500 }, { x: 100, y: 10, width: 50, height: 50 }).y)
      .toBe(10 - LANE_HEADER - LANE_PADDING);
  });

  it('lässt sich nicht kleiner ziehen als ihr Inhalt', () => {
    expect(minLaneSize({ x: 0, y: 0, width: 700, height: 160 }, { x: 50, y: 60, width: 160, height: 60 }))
      .toEqual({ width: 50 + 160 + LANE_PADDING, height: 60 + 60 + LANE_PADDING });
    expect(minLaneSize({ x: 0, y: 0, width: 700, height: 160 }, null)).toEqual({ width: 0, height: 0 });
  });

  it('ordnet Elemente nach dem Ablegen neu zu und löst sie außerhalb', () => {
    const { graph, lane, node } = setup();
    const other = createLaneNode(0, 300, 'Andere');
    graph.addCell(other);
    node.position(50, 360);
    assignLane(graph, node);
    expect(node.getParentCell()).toBe(other);
    node.position(2000, 2000);
    assignLane(graph, node);
    expect(node.getParentCell()).toBeNull();
    expect(lane.getEmbeddedCells()).toEqual([]);
  });

  it('nimmt freie Elemente in eine neue Lane auf', () => {
    const graph = newGraph();
    const node = createProcessNode(50, 60, 'Frei');
    graph.addCell(node);
    const lane = createLaneNode(0, 0, 'Neu');
    graph.addCell(lane);
    adoptFreeElements(graph, lane);
    expect(node.getParentCell()).toBe(lane);
  });

  it('tauscht Lanes samt Inhalt und behält den Abstand', () => {
    const { graph, lane, node } = setup();
    const lower = createLaneNode(0, 170, 'Unten');
    graph.addCell(lower);
    expect(moveLane(graph, lane, 'down')).toBe(true);
    expect(lower.position().y).toBe(0);
    expect(lane.position().y).toBe(160 + 10);
    expect(node.position().y).toBe(60 + 170);
    expect(moveLane(graph, lane, 'down')).toBe(false);
  });

  it('reagiert auf Ablegen und neue Elemente, nicht aber beim Laden', () => {
    const graph = newGraph();
    const handlers = {};
    const paper = { on: (name, fn) => { handlers[name] = fn; }, off: vi.fn() };
    const lane = createLaneNode(0, 0, 'Lane');
    graph.addCell(lane);
    const detach = attachLaneEmbedding({ graph, paper, getSelection: () => [] });

    const added = createProcessNode(50, 60, 'Neu');
    graph.addCell(added);
    expect(added.getParentCell()).toBe(lane);

    added.position(2000, 2000);
    handlers['element:pointerup']({ model: added });
    expect(added.getParentCell()).toBeNull();

    graph.startBatch('import');
    const imported = createProcessNode(50, 60, 'Geladen');
    graph.addCell(imported);
    graph.stopBatch('import');
    expect(imported.getParentCell()).toBeNull();
    detach();
  });

  it('verschiebt bei gemeinsamer Auswahl Elemente einer Lane nicht doppelt', () => {
    const { graph, lane, node } = setup();
    const free = createProcessNode(900, 0, 'Frei');
    graph.addCell(free);
    const drag = startGroupDrag([lane, node, free], lane);
    expect(drag?.others.map((o) => o.cell)).toEqual([free]);
    expect(startGroupDrag([lane, node], node)).toBeNull();
  });
});

describe('Folgeschritt anhängen', () => {
  const source = { x: 0, y: 0, width: 160, height: 60 };
  const size = { width: 160, height: 60 };

  it('setzt den Schritt rechts bzw. unten in festem Abstand', () => {
    expect(placeNextNode(source, size, 'right', [])).toEqual({ x: 240, y: 0 });
    expect(placeNextNode(source, size, 'bottom', [])).toEqual({ x: 0, y: 130 });
  });

  it('weicht belegten Plätzen aus', () => {
    const occupied = [{ x: 240, y: 0, width: 160, height: 60 }];
    expect(placeNextNode(source, size, 'right', occupied)).toEqual({ x: 240, y: 90 });
  });

  it('wählt passende Anschlüsse und beschriftet Ausgänge mit Ja, dann Nein', () => {
    expect(nextEdgePorts('right')).toEqual({ sourcePort: 'port-right', targetPort: 'port-left' });
    expect(nextEdgePorts('bottom')).toEqual({ sourcePort: 'port-bottom', targetPort: 'port-top' });
    expect(nextDecisionLabel([])).toBe('Ja');
    expect(nextDecisionLabel(['ja '])).toBe('Nein');
    expect(nextDecisionLabel(['Ja', 'Nein'])).toBe('');
  });
});

describe('Kopieren und Beschriftungen', () => {
  it('ordnet mitkopierte Lanes neu zu und verschiebt Knickpunkte', () => {
    let n = 0;
    const result = instantiateFragment({
      nodes: [laneNode('l1', 0), step('a', 10, 50, { laneId: 'l1' }), step('b', 300, 50, { laneId: 'fremd' })],
      edges: [{ id: 'e', from: 'a', to: 'b', vertices: [{ x: 100, y: 100 }] }]
    }, { offset: { x: 30, y: 30 }, createId: () => `neu-${(n += 1)}` });
    const [lane, a, b] = result.nodes;
    expect(a.laneId).toBe(lane.id);
    expect(b).not.toHaveProperty('laneId');
    expect(result.edges[0].vertices).toEqual([{ x: 130, y: 130 }]);
  });

  it('behält eine verschobene Beschriftung beim Umbenennen und setzt sie auf Wunsch zurück', () => {
    const graph = newGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson({ nodes: [step('a', 0, 0), step('b', 0, 200)], edges: [{ id: 'e', from: 'a', to: 'b', label: 'Ja', labelPosition: { distance: 0.2 } }] });
    const link = graph.getCell('e');
    setLinkLabelText(link, 'Nein');
    expect(link.labels()[0].position).toEqual({ distance: 0.2 });
    resetLinkLabelPosition(link);
    expect(link.labels()[0].position).toBeUndefined();
    expect(converter.toJson().edges[0]).not.toHaveProperty('labelPosition');
  });
});

describe('Knickpunkte durch Ziehen', () => {
  it('legt erst nach einem Ziehweg einen Knickpunkt an und verschiebt ihn', async () => {
    const { attachVertexDrag } = await import('./vertex-drag');
    const graph = newGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson({ nodes: [step('a', 0, 0), step('b', 0, 300)], edges: [{ id: 'e', from: 'a', to: 'b' }] });
    const link = graph.getCell('e');
    const handlers = {};
    const paper = { on: (name, fn) => { handlers[name] = fn; }, off: vi.fn(), clientToLocalPoint: (x, y) => ({ x, y }) };
    const detach = attachVertexDrag({ paper });
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('joint-selector', 'line');
    el.appendChild(line);
    const magnet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const view = { model: link, el, getVertexIndex: () => 0 };
    const move = (x, y) => window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));
    const down = (target) => handlers['link:pointerdown'](view, { clientX: 80, clientY: 150, button: 0, target });

    // Bloßer Klick: kein Knickpunkt
    down(line);
    move(82, 151);
    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(link.vertices()).toEqual([]);

    // Neue Verbindung vom Anschlusspunkt aufziehen: kein Knickpunkt
    down(magnet);
    move(300, 300);
    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(link.vertices()).toEqual([]);

    // Ziehen auf der Linie: Knickpunkt folgt der Maus (auf 10 px gerundet)
    down(line);
    move(200, 150);
    move(243, 158);
    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(link.vertices()).toEqual([{ x: 240, y: 160 }]);
    detach();
  });
});

describe('Anschlusspunkte', () => {
  it('setzt beim Dokument den unteren Anschluss auf die Wellenkante', () => {
    const doc = createNode('document', 0, 0);
    expect(doc.getPortGroupNames?.() ?? Object.keys(doc.get('ports').groups)).toContain('bottom');
    expect(doc.get('ports').groups.bottom.position).toEqual({ name: 'bottom', args: { dy: -11 } });
    expect(createNode('process', 0, 0).get('ports').groups.bottom.position).toBe('bottom');
  });
});
