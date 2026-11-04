import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as joint from 'jointjs';
import { JSONConverter } from './converter';
import { HistoryManager } from './history';
import {
  DIMMED_ELEMENT_CLASS,
  DIMMED_LINK_CLASS,
  DIM_HIGHLIGHT_ID,
  FOCUS_HIGHLIGHT_ID,
  addFocusHighlight,
  clearFocusHighlight,
  setPresentationDim
} from './highlight';

const diagram = {
  nodes: [
    { id: 's', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
    { id: 'p', type: 'process', label: 'Prüfen', position: { x: 0, y: 100 } },
    { id: 'e', type: 'end', label: 'Ende', position: { x: 0, y: 200 } }
  ],
  edges: [
    { id: 'l1', from: 's', to: 'p' },
    { id: 'l2', from: 'p', to: 'e' }
  ]
};

describe('Hervorhebungen', () => {
  let graph;
  let paper;
  let maskAdd;
  let classAdd;
  let removeAll;

  beforeEach(() => {
    graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    new JSONConverter(graph).fromJson(diagram);
    // Ohne Rendering: Die View ist hier nur ein Stellvertreter für das Modell
    paper = { findViewByModel: (cell) => ({ model: cell }) };
    maskAdd = vi.spyOn(joint.highlighters.mask, 'add').mockImplementation(() => {});
    classAdd = vi.spyOn(joint.highlighters.addClass, 'add').mockImplementation(() => {});
    removeAll = vi.spyOn(joint.dia.HighlighterView, 'removeAll').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('verändert das Modell nicht und erzeugt keine Rückgängig-Schritte', () => {
    vi.useFakeTimers();
    const history = new HistoryManager(graph);
    history.isTracking = true;
    const before = JSON.stringify(graph.toJSON());
    const changes = vi.fn();
    graph.on('change', changes);

    addFocusHighlight(paper, graph.getCell('p'));
    setPresentationDim(paper, graph, 'p');
    setPresentationDim(paper, graph, null);
    clearFocusHighlight(paper);
    vi.runAllTimers();

    expect(changes).not.toHaveBeenCalled();
    expect(JSON.stringify(graph.toJSON())).toBe(before);
    expect(history.canUndo()).toBe(false);
    vi.useRealTimers();
  });

  it('umrandet den fokussierten Knoten und entfernt die vorherige Markierung', () => {
    addFocusHighlight(paper, graph.getCell('p'));
    expect(removeAll).toHaveBeenCalledWith(paper, FOCUS_HIGHLIGHT_ID);
    expect(maskAdd).toHaveBeenCalledTimes(1);
    expect(maskAdd.mock.calls[0][0].model.id).toBe('p');
    expect(maskAdd.mock.calls[0][2]).toBe(FOCUS_HIGHLIGHT_ID);
  });

  it('blendet alles außer dem Knoten und seinen Verbindungen ab', () => {
    setPresentationDim(paper, graph, 's');
    const dimmed = Object.fromEntries(classAdd.mock.calls.map(([view, , id, options]) => {
      expect(id).toBe(DIM_HIGHLIGHT_ID);
      return [view.model.id, options.className];
    }));
    expect(dimmed).toEqual({ p: DIMMED_ELEMENT_CLASS, e: DIMMED_ELEMENT_CLASS, l2: DIMMED_LINK_CLASS });
  });

  it('hebt das Abblenden ohne Knoten wieder auf', () => {
    setPresentationDim(paper, graph, null);
    expect(removeAll).toHaveBeenCalledWith(paper, DIM_HIGHLIGHT_ID);
    expect(classAdd).not.toHaveBeenCalled();
  });
});
