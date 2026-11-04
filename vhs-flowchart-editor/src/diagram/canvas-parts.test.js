import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as joint from 'jointjs';
import { createDecisionNode, createLaneNode, createLink, createNodeAt, createProcessNode } from './shapes';
import { handlePosition, LaneResizeTool, laneSizeForDrag, LANE_MIN_HEIGHT, LANE_MIN_WIDTH } from './lane-resize-tool';
import { attachPortHover, validateConnection } from './paper';
import { applyGroupDrag, createSelectionController, isAdditiveEvent, startGroupDrag, toggleSelection } from './selection';
import { attachPanAndRubberBand, rectBetween } from './pan-select';
import { attachWheelZoom, createAutoFit, trackPointer } from './viewport';
import { decisionLabelSuggestions, getLinkLabelText, setLaneLabelAndColor, setLinkLabelText, setNodeText } from './text-editing';

// Paper-Attrappe: nur Ereignisse und Koordinaten (1:1), ohne SVG-Darstellung
const fakePaper = () => {
  const handlers = {};
  return {
    on: (name, fn) => { (handlers[name] ||= []).push(fn); },
    off: (name, fn) => { handlers[name] = (handlers[name] || []).filter((h) => h !== fn); },
    trigger: (name, ...args) => (handlers[name] || []).forEach((fn) => fn(...args)),
    count: (name) => (handlers[name] || []).length,
    clientToLocalPoint: (x, y) => ({ x, y }),
    translate: () => ({ tx: 0, ty: 0 }),
    fitToContent: vi.fn()
  };
};

const view = (model) => ({ model });

describe('Paper-Einstellungen', () => {
  const a = view(createProcessNode(0, 0, 'A'));
  const b = view(createProcessNode(0, 200, 'B'));
  const lane = view(createLaneNode(0, 0, 'Lane'));
  const link = view(createLink('a', 'b'));
  const magnet = {};

  it('erlaubt Verbindungen nur zwischen zwei Schritten mit Anschlusspunkt', () => {
    expect(validateConnection(a, magnet, b, magnet)).toBe(true);
    expect(validateConnection(a, magnet, b, null)).toBe(false);
    expect(validateConnection(a, magnet, a, magnet)).toBe(false);
    expect(validateConnection(a, magnet, link, magnet)).toBe(false);
    expect(validateConnection(a, magnet, lane, magnet)).toBe(false);
    expect(validateConnection(lane, magnet, b, magnet)).toBe(false);
  });

  it('zeigt Anschlusspunkte nur beim Überfahren und nicht bei Lanes', () => {
    const paper = fakePaper();
    const detach = attachPortHover(paper);
    const node = createProcessNode(0, 0, 'A');
    const portId = node.getPorts()[0].id;
    paper.trigger('element:mouseenter', view(node));
    expect(node.portProp(portId, 'attrs/circle/style')).toEqual({ visibility: 'visible' });
    paper.trigger('element:mouseleave', view(node));
    expect(node.portProp(portId, 'attrs/circle/style')).toEqual({ visibility: 'hidden' });
    expect(() => paper.trigger('element:mouseenter', lane)).not.toThrow();
    detach();
    expect(paper.count('element:mouseenter')).toBe(0);
  });
});

describe('Lane-Größe ändern', () => {
  it('setzt den Griff in Diagrammkoordinaten an die untere rechte Ecke', () => {
    expect(handlePosition({ x: 100, y: 50, width: 700, height: 160 })).toEqual({ x: 786, y: 196 });
  });

  it('nutzt die Modellgeometrie, nicht die verschobenen Paper-Koordinaten', () => {
    const lane = createLaneNode(100, 50, 'Lane');
    // Paper ist verschoben (fitPaperToContent): view.getBBox() läge daneben.
    // Ohne echtes Paper wird nur _draw() mit einer Werkzeug-Attrappe aufgerufen.
    const tool = {
      el: document.createElementNS('http://www.w3.org/2000/svg', 'g'),
      relatedView: { model: lane, getBBox: () => ({ x: 9999, y: 9999, width: 1, height: 1 }) },
      _startResize: () => {}
    };
    LaneResizeTool.prototype._draw.call(tool);
    const handle = tool.el.querySelector('rect');
    const { x, y } = handlePosition(lane.getBBox());
    expect(Number(handle.getAttribute('x'))).toBe(x);
    expect(Number(handle.getAttribute('y'))).toBe(y);
  });

  it('folgt der Maus und hält die Mindestgröße ein', () => {
    expect(laneSizeForDrag({ width: 700, height: 160 }, { x: 50, y: -20 })).toEqual({ width: 750, height: 140 });
    expect(laneSizeForDrag({ width: 700, height: 160 }, { x: -1000, y: -1000 })).toEqual({ width: LANE_MIN_WIDTH, height: LANE_MIN_HEIGHT });
  });
});

describe('Neue Elemente', () => {
  it('werden um den Ablagepunkt zentriert', () => {
    const node = createNodeAt('process', 500, 300);
    const { x, y, width, height } = node.getBBox();
    expect(x + width / 2).toBeCloseTo(500, -1);
    expect(y + height / 2).toBeCloseTo(300, -1);
    expect(createNodeAt('unbekannt', 0, 0).get('type')).toBe('vhs.Process');
    expect(createNodeAt('lane', 0, 0).get('type')).toBe('vhs.Lane');
  });
});

describe('Auswahl', () => {
  let graph;
  let paper;
  let a;
  let b;
  let c;
  let render;
  let onChange;
  let selection;

  beforeEach(() => {
    graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    a = createProcessNode(0, 0, 'A');
    b = createProcessNode(200, 0, 'B');
    c = createProcessNode(400, 0, 'C');
    graph.addCells([a, b, c]);
    paper = fakePaper();
    render = vi.fn();
    onChange = vi.fn();
    selection = createSelectionController({ graph, paper, onChange, render });
  });

  it('erkennt ergänzende Klicks', () => {
    expect(isAdditiveEvent({ ctrlKey: true })).toBe(true);
    expect(isAdditiveEvent({ metaKey: true })).toBe(true);
    expect(isAdditiveEvent({ shiftKey: true })).toBe(true);
    expect(isAdditiveEvent({})).toBe(false);
  });

  it('ersetzt oder ergänzt die Auswahl', () => {
    expect(toggleSelection([a], b, false)).toEqual([b]);
    expect(toggleSelection([a], b, true)).toEqual([a, b]);
    expect(toggleSelection([a, b], a, true)).toEqual([b]);
  });

  it('wählt per Klick, Strg+Klick und Klick ins Leere', () => {
    paper.trigger('element:pointerclick', view(a), {});
    expect(selection.get()).toEqual([a]);
    paper.trigger('element:pointerclick', view(b), { ctrlKey: true });
    expect(selection.get()).toEqual([a, b]);
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(render).toHaveBeenLastCalledWith(paper, [a, b]);
    paper.trigger('blank:pointerclick');
    expect(selection.get()).toEqual([]);
  });

  it('ignoriert doppelte und nicht (mehr) vorhandene Zellen', () => {
    const fremd = createProcessNode(0, 0, 'X');
    selection.set([a, a, fremd, null]);
    expect(selection.get()).toEqual([a]);
  });

  it('wählt gelöschte Zellen ab und leert die Auswahl bei Rückgängig (reset)', () => {
    selection.set([a, b]);
    b.remove();
    expect(selection.get()).toEqual([a]);
    graph.resetCells([c]);
    expect(selection.get()).toEqual([]);
  });

  it('verschiebt eine Mehrfachauswahl gemeinsam', () => {
    selection.set([a, b]);
    paper.trigger('element:pointerdown', view(a), {});
    a.position(50, 30);
    paper.trigger('element:pointermove', view(a));
    expect(b.position()).toEqual({ x: 250, y: 30 });
    expect(c.position()).toEqual({ x: 400, y: 0 });
    paper.trigger('element:pointerup');
    a.position(100, 100);
    paper.trigger('element:pointermove', view(a));
    expect(b.position()).toEqual({ x: 250, y: 30 });
  });

  it('wählt beim Ziehen eines nicht ausgewählten Elements nur dieses', () => {
    selection.set([a, b]);
    paper.trigger('element:pointerdown', view(c), {});
    expect(selection.get()).toEqual([c]);
  });

  it('startet gemeinsames Verschieben nur bei Mehrfachauswahl', () => {
    expect(startGroupDrag([a], a)).toBeNull();
    expect(startGroupDrag([b, c], a)).toBeNull();
    const drag = startGroupDrag([a, b], a);
    a.position(10, 10);
    applyGroupDrag(drag);
    expect(b.position()).toEqual({ x: 210, y: 10 });
  });

  it('meldet sich vollständig ab', () => {
    selection.detach();
    paper.trigger('element:pointerclick', view(a), {});
    expect(selection.get()).toEqual([]);
    expect(paper.count('element:pointerdown')).toBe(0);
  });
});

describe('Ansicht verschieben und Rahmenauswahl', () => {
  let graph;
  let paper;
  let container;
  let selected;
  let detach;
  let a;
  let b;

  beforeEach(() => {
    graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    a = createProcessNode(0, 0, 'A');
    b = createProcessNode(500, 500, 'B');
    graph.addCells([a, b]);
    paper = fakePaper();
    container = document.createElement('div');
    document.body.appendChild(container);
    selected = [];
    detach = attachPanAndRubberBand({
      paper,
      graph,
      container,
      getSelection: () => selected,
      setSelection: (cells) => { selected = cells; }
    });
  });

  afterEach(() => {
    detach();
    container.remove();
  });

  const mouse = (type, x, y) => window.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }));

  it('berechnet das Rechteck unabhängig von der Zugrichtung', () => {
    expect(rectBetween({ x: 10, y: 50 }, { x: 0, y: 20 })).toEqual({ x: 0, y: 20, width: 10, height: 30 });
  });

  it('verschiebt die Ansicht beim Ziehen auf freier Fläche', () => {
    container.scrollLeft = 0;
    const scroll = { left: 100, top: 100 };
    Object.defineProperty(container, 'scrollLeft', { get: () => scroll.left, set: (v) => { scroll.left = v; } });
    Object.defineProperty(container, 'scrollTop', { get: () => scroll.top, set: (v) => { scroll.top = v; } });
    paper.trigger('blank:pointerdown', { clientX: 50, clientY: 50 });
    mouse('mousemove', 40, 30);
    expect(scroll).toEqual({ left: 110, top: 120 });
    mouse('mouseup', 40, 30);
    mouse('mousemove', 0, 0);
    expect(scroll).toEqual({ left: 110, top: 120 });
  });

  it('wählt mit Umschalt + Ziehen alle Elemente vollständig im Rahmen', () => {
    paper.trigger('blank:pointerdown', { clientX: -10, clientY: -10, shiftKey: true });
    expect(container.querySelector('.vhs-rubberband')).not.toBeNull();
    mouse('mouseup', 300, 300);
    expect(selected).toEqual([a]);
    expect(container.querySelector('.vhs-rubberband')).toBeNull();
  });

  it('ergänzt die Auswahl mit Strg und ignoriert bloße Klicks', () => {
    selected = [b];
    paper.trigger('blank:pointerdown', { clientX: -10, clientY: -10, shiftKey: true, ctrlKey: true });
    mouse('mouseup', 300, 300);
    expect(selected).toEqual([b, a]);
    paper.trigger('blank:pointerdown', { clientX: 5, clientY: 5, shiftKey: true });
    mouse('mouseup', 6, 6);
    expect(selected).toEqual([b, a]);
  });

  it('bricht beim Verlassen des Fensters ab', () => {
    paper.trigger('blank:pointerdown', { clientX: 0, clientY: 0, shiftKey: true });
    window.dispatchEvent(new Event('blur'));
    expect(container.querySelector('.vhs-rubberband')).toBeNull();
  });
});

describe('Ansicht: Anpassen, Mausrad, Mausposition', () => {
  let frames;

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (fn) => frames.push(fn));
    vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passt die Fläche gebündelt nach Änderungen an, aber nicht während des Ziehens', () => {
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    const paper = fakePaper();
    const container = document.createElement('div');
    const autoFit = createAutoFit({ paper, graph, container });

    graph.addCell(createProcessNode(0, 0, 'A'));
    graph.addCell(createProcessNode(0, 100, 'B'));
    expect(frames).toHaveLength(1);
    frames.shift()();
    expect(paper.fitToContent).toHaveBeenCalledTimes(1);

    paper.trigger('cell:pointerdown');
    graph.getElements()[0].position(300, 300);
    expect(frames).toHaveLength(0);
    window.dispatchEvent(new Event('pointerup'));
    expect(frames).toHaveLength(1);

    autoFit.fit();
    expect(frames).toHaveLength(0);
    expect(paper.fitToContent).toHaveBeenCalledTimes(2);

    autoFit.detach();
    graph.addCell(createProcessNode(0, 200, 'C'));
    expect(frames).toHaveLength(0);
  });

  it('zoomt mit Strg + Mausrad um die Mausposition', () => {
    const container = document.createElement('div');
    const setZoom = vi.fn();
    const detach = attachWheelZoom(container, { getZoom: () => 1, setZoom });
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 30, clientY: 40 }));
    expect(setZoom).not.toHaveBeenCalled();
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 30, clientY: 40, cancelable: true }));
    expect(setZoom).toHaveBeenCalledWith(expect.any(Number), { x: 30, y: 40 });
    expect(setZoom.mock.calls[0][0]).toBeGreaterThan(1);
    detach();
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true }));
    expect(setZoom).toHaveBeenCalledTimes(1);
  });

  it('zoomt nicht über die Grenzen hinaus', () => {
    const container = document.createElement('div');
    const setZoom = vi.fn();
    attachWheelZoom(container, { getZoom: () => 2, setZoom });
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, cancelable: true }));
    expect(setZoom).not.toHaveBeenCalled();
  });

  it('merkt sich die Mausposition über der Fläche', () => {
    const container = document.createElement('div');
    const pointer = trackPointer(container);
    expect(pointer.get()).toBeNull();
    container.dispatchEvent(new MouseEvent('pointermove', { clientX: 5, clientY: 7 }));
    expect(pointer.get()).toEqual({ x: 5, y: 7 });
    container.dispatchEvent(new MouseEvent('pointerleave'));
    expect(pointer.get()).toBeNull();
    pointer.detach();
  });
});

describe('Texte bearbeiten', () => {
  let graph;
  let decision;
  let yes;
  let other;

  beforeEach(() => {
    graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    decision = createDecisionNode(0, 0, 'Vollständig?');
    const p1 = createProcessNode(0, 200, 'A');
    const p2 = createProcessNode(300, 200, 'B');
    graph.addCells([decision, p1, p2]);
    yes = createLink(decision.id, p1.id, 'Ja');
    other = createLink(decision.id, p2.id);
    graph.addCells([yes, other]);
  });

  it('schlägt Ja/Nein vor, die freie Antwort zuerst', () => {
    expect(decisionLabelSuggestions(graph, other)).toEqual(['Nein', 'Ja']);
    expect(decisionLabelSuggestions(graph, yes)).toEqual(['Ja', 'Nein']);
  });

  it('schlägt bei Verbindungen, die nicht von einer Entscheidung kommen, nichts vor', () => {
    const p = graph.getElements()[1];
    const link = createLink(p.id, decision.id);
    graph.addCell(link);
    expect(decisionLabelSuggestions(graph, link)).toEqual([]);
  });

  it('setzt und entfernt Verbindungsbeschriftungen', () => {
    setLinkLabelText(other, 'Nein');
    expect(getLinkLabelText(other)).toBe('Nein');
    setLinkLabelText(other, '   ');
    expect(other.labels()).toEqual([]);
    expect(getLinkLabelText(other)).toBe('');
  });

  it('passt die Elementgröße an längere Texte an, Lanes nicht', () => {
    const node = createProcessNode(0, 0, 'Kurz');
    const before = node.size();
    setNodeText(node, 'Ein deutlich längerer Text, der mehr Platz für die Beschriftung braucht');
    expect(node.attr('label/text')).toMatch(/^Ein deutlich/);
    expect(node.size().width * node.size().height).toBeGreaterThan(before.width * before.height);

    const lane = createLaneNode(0, 0, 'Lane');
    const laneSize = lane.size();
    setNodeText(lane, 'Ein sehr langer Lane-Titel, der die Größe nicht ändern darf');
    expect(lane.size()).toEqual(laneSize);
  });

  it('setzt Titel und Farben einer Lane', () => {
    const lane = createLaneNode(0, 0, 'Lane');
    setLaneLabelAndColor(lane, { label: 'Verwaltung', color: { header: '#111111', body: '#eeeeee' } });
    expect(lane.attr('label/text')).toBe('Verwaltung');
    expect(lane.attr('header/fill')).toBe('#111111');
    expect(lane.attr('body/fill')).toBe('#eeeeee');
    expect(lane.attr('body/stroke')).toBe('#111111');
  });
});
