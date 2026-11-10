import { describe, expect, it, vi } from 'vitest';
import * as joint from 'jointjs';
import './shapes';
import { JSONConverter } from './converter';
import { computeSnap } from './snaplines';
import { createOverviewStore } from './overview-tracking';
import { HistoryManager } from './history';
import { validateDiagram } from '../analysis/diagram-validation';
import { buildProcessDescription } from '../export/process-description';
import { generateLargeDiagram } from '../test/large-diagram';

const newGraph = () => new joint.dia.Graph({}, { cellNamespace: joint.shapes });

/** Mittlere Laufzeit in ms */
const timeOf = (fn, runs = 20) => {
  fn();
  const start = performance.now();
  for (let i = 0; i < runs; i++) fn();
  return (performance.now() - start) / runs;
};

describe('Übersichtskarte: Speicher', () => {
  it('benachrichtigt Abonnenten und lässt sich abbestellen', () => {
    const store = createOverviewStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set({ items: [] });
    expect(store.get()).toEqual({ items: [] });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.set(null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('Verlauf', () => {
  it('meldet sich bei destroy wirklich ab', () => {
    const graph = newGraph();
    const history = new HistoryManager(graph);
    history.isTracking = true;
    graph.addCell(new joint.shapes.standard.Rectangle());
    expect(history.canUndo()).toBe(true);
    history.destroy();
    expect(history.canUndo()).toBe(false);
    graph.addCell(new joint.shapes.standard.Rectangle());
    expect(history.saveTimeout).toBeNull();
  });
});

describe('Verlauf meldet seinen Zustand', () => {
  it('auch wenn ein Element hin und zurück bewegt wurde (nichts zu sichern)', () => {
    vi.useFakeTimers();
    try {
      const graph = newGraph();
      const history = new HistoryManager(graph);
      history.isTracking = true;
      const cell = new joint.shapes.standard.Rectangle({ position: { x: 0, y: 0 } });
      graph.addCell(cell);
      vi.advanceTimersByTime(300);
      history.clear();
      const onStateChange = vi.fn();
      history.onStateChange = onStateChange;
      cell.position(50, 50);
      cell.position(0, 0);
      expect(history.canUndo()).toBe(true);
      vi.advanceTimersByTime(300);
      expect(history.canUndo()).toBe(false);
      expect(onStateChange).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('auch nach dem entprellten Sichern (danach ist Wiederholen nicht mehr möglich)', () => {
    vi.useFakeTimers();
    try {
      const graph = newGraph();
      const history = new HistoryManager(graph);
      history.isTracking = true;
      const onStateChange = vi.fn();
      history.onStateChange = onStateChange;
      graph.addCell(new joint.shapes.standard.Rectangle());
      vi.advanceTimersByTime(300);
      history.undo();
      expect(history.canRedo()).toBe(true);
      onStateChange.mockClear();
      graph.addCell(new joint.shapes.standard.Rectangle());
      vi.advanceTimersByTime(300);
      expect(history.canRedo()).toBe(false);
      expect(onStateChange).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('große Diagramme', () => {
  const diagram = generateLargeDiagram({ nodes: 300, lanes: 4 });

  it('übersteht Laden und Auslesen ohne Verlust', () => {
    const graph = newGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson(diagram);
    const json = converter.toJson();
    expect(json.nodes).toHaveLength(diagram.nodes.length);
    expect(json.edges).toHaveLength(diagram.edges.length);
    expect(json.nodes.filter((n) => n.laneId)).toHaveLength(300);
  });

  it('schließt den Import-Batch auch bei fehlerhaften Daten', () => {
    const graph = newGraph();
    expect(() => new JSONConverter(graph).fromJson({ nodes: [{ id: 'a', label: 'ohne Typ' }], edges: [] })).toThrow();
    expect(graph.hasActiveBatch('import')).toBe(false);
  });

  it('lädt auch Knoten ohne ID vollständig', () => {
    const graph = newGraph();
    new JSONConverter(graph).fromJson({
      nodes: [{ type: 'process', label: 'A' }, { type: 'process', label: 'B' }, { id: 'c', type: 'end', label: 'C' }],
      edges: []
    });
    expect(graph.getElements()).toHaveLength(3);
  });

  // Sehr großzügige Grenzen (gemessen: unter 1 ms): Sie fangen nur grobe Rückschritte wie
  // quadratische Laufzeiten ab und sollen auf langsamen CI-Rechnern nicht zufällig scheitern.
  // Genaue Messung: npm run bench
  it('rechnet die häufigen Schritte auch bei 300 Elementen schnell', () => {
    const graph = newGraph();
    const converter = new JSONConverter(graph);
    converter.fromJson(diagram);
    const rects = graph.getElements().map((cell) => cell.getBBox());
    expect(timeOf(() => converter.toJson())).toBeLessThan(100);
    expect(timeOf(() => validateDiagram(diagram, []))).toBeLessThan(100);
    expect(timeOf(() => buildProcessDescription(diagram))).toBeLessThan(100);
    expect(timeOf(() => computeSnap(rects[5], rects))).toBeLessThan(25);
  });
});
