import { describe, expect, it, vi } from 'vitest';
import * as joint from 'jointjs';
import './shapes';
import { JSONConverter } from './converter';
import { DiagramLayout } from './layout';
import { HistoryManager } from './history';
import { STARTER_TEMPLATES } from '../data/templates';

const createGraph = () => new joint.dia.Graph({}, { cellNamespace: joint.shapes });

const sampleDiagram = () => ({
  nodes: [
    { id: 's', type: 'start', label: 'Antrag geht ein', position: { x: 100, y: 40 }, size: { width: 160, height: 70 } },
    { id: 'd', type: 'decision', label: 'Vollständig?', position: { x: 90, y: 160 }, size: { width: 180, height: 110 } },
    { id: 'p', type: 'process', label: 'Nachfordern', position: { x: 340, y: 180 }, size: { width: 160, height: 60 } },
    { id: 'e', type: 'end', label: 'Genehmigt', position: { x: 100, y: 320 }, size: { width: 140, height: 70 } },
    { id: 'a', type: 'annotation', label: 'Frist 14 Tage', position: { x: 540, y: 180 }, size: { width: 200, height: 80 } },
    {
      id: 'l', type: 'lane', label: 'Verwaltung', position: { x: 0, y: 0 }, size: { width: 800, height: 420 },
      laneColor: { header: '#4ba02d', body: '#f0f7eb' }
    }
  ],
  edges: [
    { id: 'e1', from: 's', to: 'd', label: '', sourcePort: 'port-bottom', targetPort: 'port-top' },
    { id: 'e2', from: 'd', to: 'e', label: 'Ja' },
    { id: 'e3', from: 'd', to: 'p', label: 'Nein' },
    { id: 'e4', from: 'p', to: 'd', label: '' }
  ]
});

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));

describe('JSONConverter', () => {
  it('überführt JSON verlustfrei in JointJS und zurück', () => {
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    const input = sampleDiagram();

    converter.fromJson(input);
    const output = converter.toJson();

    const nodes = byId(output.nodes);
    input.nodes.forEach((node) => {
      expect(nodes[node.id]).toMatchObject({
        id: node.id,
        type: node.type,
        label: node.label,
        position: node.position,
        size: node.size
      });
    });
    expect(nodes.l.laneColor).toEqual({ header: '#4ba02d', body: '#f0f7eb' });

    const edges = byId(output.edges);
    expect(edges.e1).toMatchObject({ from: 's', to: 'd', sourcePort: 'port-bottom', targetPort: 'port-top' });
    expect(edges.e2.label).toBe('Ja');
    expect(edges.e3.label).toBe('Nein');
    expect(output.edges).toHaveLength(4);
  });

  it('überspringt Verbindungen zu unbekannten Knoten', () => {
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    converter.fromJson({
      nodes: [{ id: 's', type: 'start', label: 'Start' }],
      edges: [{ from: 's', to: 'fehlt' }]
    });

    expect(converter.toJson().edges).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('lehnt Daten ohne nodes ab', () => {
    expect(() => new JSONConverter(createGraph()).fromJson({ edges: [] })).toThrow();
  });

  it('lädt alle Vorlagen ohne Verlust von Knoten und Verbindungen', () => {
    STARTER_TEMPLATES.forEach((template) => {
      const converter = new JSONConverter(createGraph());
      converter.fromJson(template.diagram);
      const output = converter.toJson();
      expect(output.nodes, template.id).toHaveLength(template.diagram.nodes.length);
      expect(output.edges, template.id).toHaveLength(template.diagram.edges.length);
    });
  });
});

describe('DiagramLayout', () => {
  const withoutLanes = () => {
    const input = sampleDiagram();
    input.nodes = input.nodes.filter((node) => node.type !== 'lane');
    // Alle Knoten übereinander, damit das Layout sichtbar etwas ändern muss
    input.nodes.forEach((node) => { node.position = { x: 0, y: 0 }; });
    return input;
  };

  it('ordnet Knoten ohne Swimlanes von oben nach unten an', () => {
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson(withoutLanes());

    new DiagramLayout(graph).applyLayout();
    const nodes = byId(converter.toJson().nodes);

    expect(nodes.s.position.y).toBeLessThan(nodes.d.position.y);
    expect(nodes.d.position.y).toBeLessThan(nodes.e.position.y);
  });

  it('hält Knoten in ihrer Swimlane und passt die Lane an', () => {
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson(sampleDiagram());

    new DiagramLayout(graph).applyLayout();
    const { nodes } = converter.toJson();
    const lane = nodes.find((n) => n.type === 'lane');

    expect(lane.position).toEqual({ x: 0, y: 0 });
    nodes.filter((n) => n.type !== 'lane').forEach((n) => {
      expect(n.position.y, n.id).toBeGreaterThanOrEqual(lane.position.y + 40);
      expect(n.position.y + n.size.height, n.id).toBeLessThanOrEqual(lane.position.y + lane.size.height);
      expect(n.position.x + n.size.width, n.id).toBeLessThanOrEqual(lane.position.x + lane.size.width);
    });
  });

  it('legt Ja-Ausgänge nach unten und Nein-Ausgänge zur Seite', () => {
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson(withoutLanes());

    new DiagramLayout(graph).applyLayout();
    const edges = byId(converter.toJson().edges);

    expect(edges.e2.sourcePort).toBe('port-bottom');
    expect(['port-left', 'port-right']).toContain(edges.e3.sourcePort);
  });
});

describe('HistoryManager', () => {
  it('macht Änderungen rückgängig und wiederholt sie', () => {
    vi.useFakeTimers();
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    const history = new HistoryManager(graph);
    history.isTracking = true;

    converter.fromJson({ nodes: [{ id: 's', type: 'start', label: 'Start' }], edges: [] });
    vi.advanceTimersByTime(400);
    expect(history.canUndo()).toBe(true);

    graph.getCell('s').position(300, 300);
    vi.advanceTimersByTime(400);

    expect(history.undo()).toBe(true);
    expect(graph.getCell('s').position()).not.toEqual({ x: 300, y: 300 });
    expect(history.canRedo()).toBe(true);

    expect(history.redo()).toBe(true);
    expect(graph.getCell('s').position()).toEqual({ x: 300, y: 300 });

    history.undo();
    history.undo();
    expect(graph.getCells()).toHaveLength(0);
    expect(history.canUndo()).toBe(false);
    vi.useRealTimers();
  });

  it('macht eine Änderung auch unmittelbar danach rückgängig', () => {
    vi.useFakeTimers();
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    const history = new HistoryManager(graph);
    history.isTracking = true;

    converter.fromJson({ nodes: [{ id: 's', type: 'start', label: 'Start', position: { x: 10, y: 10 } }], edges: [] });
    vi.advanceTimersByTime(400);

    graph.getCell('s').position(300, 300);
    // Kein Warten: die entprellte Sicherung steht noch aus
    expect(history.canUndo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(graph.getCell('s').position()).toEqual({ x: 10, y: 10 });

    expect(history.redo()).toBe(true);
    expect(graph.getCell('s').position()).toEqual({ x: 300, y: 300 });
    vi.useRealTimers();
  });

  it('verwirft den Wiederholen-Stapel bei neuer Änderung', () => {
    vi.useFakeTimers();
    const graph = createGraph();
    const converter = new JSONConverter(graph);
    const history = new HistoryManager(graph);
    history.isTracking = true;

    converter.fromJson({ nodes: [{ id: 's', type: 'start', label: 'Start' }], edges: [] });
    vi.advanceTimersByTime(400);
    history.undo();
    expect(history.canRedo()).toBe(true);

    converter.fromJson({ nodes: [{ id: 'p', type: 'process', label: 'Neu' }], edges: [] });
    vi.advanceTimersByTime(400);
    expect(history.canRedo()).toBe(false);
    vi.useRealTimers();
  });
});
