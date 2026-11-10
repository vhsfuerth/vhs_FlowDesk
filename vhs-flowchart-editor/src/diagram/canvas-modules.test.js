// Tests der aus DiagramCanvas ausgelagerten Module (canvas-events.js, canvas-editing.js)
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as joint from 'jointjs';
import { createDecisionNode, createLaneNode, createLink, createProcessNode } from './shapes';
import { JSONConverter } from './converter';
import { attachCanvasEvents, commitOpenInlineEditor } from './canvas-events';
import {
  addNextStep, applyPartialLayout, applyPositions, bridgeInfo, deleteCells, fragmentOf, insertFragment, moveElements
} from './canvas-editing';
import { getLinkLabelText } from './text-editing';

const newGraph = () => new joint.dia.Graph({}, { cellNamespace: joint.shapes });

// Paper-Attrappe: nur Ereignisse
const fakePaper = () => {
  const handlers = {};
  return {
    on: (name, fn) => { (handlers[name] ||= []).push(fn); },
    off: (name, fn) => { handlers[name] = (handlers[name] || []).filter((h) => h !== fn); },
    trigger: (name, ...args) => (handlers[name] || []).forEach((fn) => fn(...args)),
    count: (name) => (handlers[name] || []).length
  };
};

describe('attachCanvasEvents', () => {
  let detach;
  afterEach(() => {
    detach?.();
    detach = null;
  });

  const setup = () => {
    const paper = fakePaper();
    const container = document.createElement('div');
    const focusTarget = document.createElement('div');
    focusTarget.tabIndex = -1;
    document.body.append(container, focusTarget);
    const handlers = {
      editCell: vi.fn(), requestDelete: vi.fn(), togglePropertiesFor: vi.fn(),
      addNextStep: vi.fn(), openAddNextMenu: vi.fn(), openSubprocess: vi.fn()
    };
    detach = attachCanvasEvents({ paper, container, focusTarget: () => focusTarget, getHandlers: () => handlers });
    return { paper, container, focusTarget, handlers };
  };

  it('leitet die Ereignisse der Fläche an die aktuellen Funktionen weiter', () => {
    const { paper, handlers } = setup();
    const model = { id: 'a' };
    const evt = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    paper.trigger('element:pointerdblclick', { model });
    paper.trigger('link:pointerdblclick', { model });
    expect(handlers.editCell).toHaveBeenCalledTimes(2);
    paper.trigger('element:contextmenu', { model }, evt);
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(handlers.togglePropertiesFor).toHaveBeenCalledWith(model);
    paper.trigger('element:remove-request', { model });
    expect(handlers.requestDelete).toHaveBeenCalledWith(model);
    paper.trigger('element:add-next', { model }, 'bottom');
    expect(handlers.addNextStep).toHaveBeenCalledWith(model, 'bottom');
    paper.trigger('element:add-next-menu', { model }, 'right', { clientX: 5, clientY: 6 });
    expect(handlers.openAddNextMenu).toHaveBeenCalledWith(model, 'right', { clientX: 5, clientY: 6 });
    paper.trigger('element:subprocess:open', { model }, evt);
    expect(evt.stopPropagation).toHaveBeenCalled();
    expect(handlers.openSubprocess).toHaveBeenCalledWith(model);
  });

  it('holt beim Klick auf die Fläche den Fokus dorthin', () => {
    const { container, focusTarget } = setup();
    container.dispatchEvent(new Event('pointerdown'));
    expect(document.activeElement).toBe(focusTarget);
  });

  it('übernimmt ein offenes Textfeld beim Scrollen', () => {
    const { container } = setup();
    const textarea = document.createElement('textarea');
    textarea.dataset.inlineEditor = 'true';
    document.body.append(textarea);
    textarea.focus();
    container.dispatchEvent(new Event('scroll'));
    expect(document.activeElement).not.toBe(textarea);
    textarea.remove();
  });

  it('meldet sich vollständig ab', () => {
    const { paper } = setup();
    detach();
    detach = null;
    ['element:pointerdblclick', 'link:contextmenu', 'element:add-next', 'element:subprocess:open']
      .forEach((name) => expect(paper.count(name)).toBe(0));
  });

  it('lässt andere fokussierte Elemente beim Übernehmen in Ruhe', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    commitOpenInlineEditor();
    expect(document.activeElement).toBe(input);
    input.remove();
  });
});

describe('canvas-editing', () => {
  it('hängt einen Folgeschritt in derselben Lane an und beschriftet Entscheidungen', () => {
    const graph = newGraph();
    const lane = createLaneNode(0, 0, 'Verwaltung');
    const decision = createDecisionNode(100, 60, 'Gültig?');
    graph.addCells([lane, decision]);
    lane.embed(decision);
    const first = addNextStep(graph, decision, 'bottom');
    const second = addNextStep(graph, decision, 'right');
    expect(first.getParentCell()).toBe(lane);
    const labels = graph.getConnectedLinks(decision, { outbound: true }).map(getLinkLabelText);
    expect(labels.sort()).toEqual(['Ja', 'Nein']);
    expect(second.getBBox().x).toBeGreaterThan(decision.getBBox().x);
    expect(graph.hasActiveBatch()).toBe(false);
  });

  it('löscht einen Zwischenschritt und verbindet auf Wunsch Vorgänger und Nachfolger', () => {
    const graph = newGraph();
    const converter = new JSONConverter(graph);
    const a = createProcessNode(0, 0, 'A');
    const b = createProcessNode(0, 150, 'B');
    const c = createProcessNode(0, 300, 'C');
    graph.addCells([a, b, c, createLink(a.id, b.id, ''), createLink(b.id, c.id, '')]);
    expect(bridgeInfo(converter, [b])).toEqual({ label: 'B', count: 1 });
    expect(deleteCells(graph, converter, [b], { bridge: true })).toBe(1);
    const links = graph.getLinks();
    expect(links).toHaveLength(1);
    expect([links[0].source().id, links[0].target().id]).toEqual([a.id, c.id]);
    expect(deleteCells(graph, converter, [])).toBe(0);
  });

  it('verschiebt Elemente, setzt Positionen und wendet ein Teil-Layout an', () => {
    const graph = newGraph();
    const a = createProcessNode(0, 0, 'A');
    const b = createProcessNode(200, 0, 'B');
    graph.addCells([a, b, createLink(a.id, b.id, '')]);
    expect(moveElements(graph, [a], 10, 20)).toBe(true);
    expect(a.position()).toEqual({ x: 10, y: 20 });
    expect(moveElements(graph, [], 10, 0)).toBe(false);
    expect(applyPositions(graph, { [b.id]: { x: 300, y: 50 } })).toBe(true);
    expect(b.position()).toEqual({ x: 300, y: 50 });
    const linkId = graph.getLinks()[0].id;
    const count = applyPartialLayout(graph, {
      positions: { [a.id]: { x: 0, y: 0 }, [b.id]: { x: 0, y: 140 } },
      ports: { [linkId]: { sourcePort: 'port-bottom', targetPort: 'port-top' } }
    });
    expect(count).toBe(2);
    expect(graph.getCell(linkId).source().port).toBe('port-bottom');
    expect(applyPartialLayout(graph, { positions: {}, ports: {} })).toBe(0);
  });

  it('kopiert eine Lane samt Inhalt und fügt sie mit neuen IDs ein', () => {
    const graph = newGraph();
    const converter = new JSONConverter(graph);
    const lane = createLaneNode(0, 0, 'Verwaltung');
    const step = createProcessNode(40, 60, 'Prüfen');
    graph.addCells([lane, step]);
    lane.embed(step);
    const fragment = fragmentOf(converter, [lane]);
    expect(fragment.nodes).toHaveLength(2);
    let n = 0;
    const cells = insertFragment(graph, converter, fragment, { x: 0, y: 400 }, () => `neu${++n}`);
    expect(cells.map((c) => c.id).sort()).toEqual(['neu1', 'neu2']);
    expect(graph.getElements()).toHaveLength(4);
    expect(fragmentOf(converter, [])).toBeNull();
  });
});
