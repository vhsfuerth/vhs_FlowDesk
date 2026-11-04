// Vorübergehende Hervorhebungen auf der Arbeitsfläche (Struktur-Check, Simulation).
// Sie wirken nur auf die Darstellung (JointJS-Highlighter an der View) und verändern
// das Modell nicht – sonst entstünden Rückgängig-Schritte und ein „ungespeicherter“ Stand.

import * as joint from 'jointjs';
import { COLORS } from '../utils/constants';

export const FOCUS_HIGHLIGHT_ID = 'vhs-focus';
export const DIM_HIGHLIGHT_ID = 'vhs-dim';

// CSS-Klassen, siehe index.css
export const DIMMED_ELEMENT_CLASS = 'vhs-dimmed';
export const DIMMED_LINK_CLASS = 'vhs-dimmed-link';

/** Entfernt die rote Markierung eines Knotens. */
export function clearFocusHighlight(paper) {
    if (paper) joint.dia.HighlighterView.removeAll(paper, FOCUS_HIGHLIGHT_ID);
}

/** Umrandet einen Knoten rot (vorherige Markierung wird entfernt). */
export function addFocusHighlight(paper, cell) {
    clearFocusHighlight(paper);
    const view = paper?.findViewByModel(cell);
    if (!view) return;
    joint.highlighters.mask.add(view, { selector: 'body' }, FOCUS_HIGHLIGHT_ID, {
        padding: 4,
        layer: 'front',
        attrs: { stroke: COLORS.vhsRed, 'stroke-width': 4, 'stroke-linejoin': 'round' }
    });
}

export const SEARCH_HIGHLIGHT_ID = 'vhs-search';
export const SEARCH_CURRENT_HIGHLIGHT_ID = 'vhs-search-current';

/** Entfernt alle Markierungen der Suche. */
export function clearSearchHighlights(paper) {
    if (!paper) return;
    joint.dia.HighlighterView.removeAll(paper, SEARCH_HIGHLIGHT_ID);
    joint.dia.HighlighterView.removeAll(paper, SEARCH_CURRENT_HIGHLIGHT_ID);
}

/**
 * Markiert alle Suchtreffer gelb und den aktuellen Treffer zusätzlich orange.
 * @param {string[]} ids
 * @param {string | null} currentId
 */
export function setSearchHighlights(paper, graph, ids, currentId = null) {
    if (!paper || !graph) return;
    clearSearchHighlights(paper);
    ids.forEach((id) => {
        const cell = graph.getCell(id);
        const view = cell && paper.findViewByModel(cell);
        if (!view) return;
        const isCurrent = id === currentId;
        joint.highlighters.mask.add(view, { selector: 'body' }, isCurrent ? SEARCH_CURRENT_HIGHLIGHT_ID : SEARCH_HIGHLIGHT_ID, {
            padding: isCurrent ? 6 : 4,
            layer: 'front',
            attrs: {
                stroke: isCurrent ? COLORS.vhsOrange : COLORS.vhsYellow,
                'stroke-width': isCurrent ? 5 : 3,
                'stroke-linejoin': 'round'
            }
        });
    });
}

/**
 * Blendet alles außer dem Knoten `nodeId` und seinen Verbindungen ab.
 * Ohne `nodeId` wird wieder alles normal dargestellt.
 */
export function setPresentationDim(paper, graph, nodeId = null) {
    if (!paper) return;
    joint.dia.HighlighterView.removeAll(paper, DIM_HIGHLIGHT_ID);
    if (!nodeId || !graph) return;

    graph.getCells().forEach((cell) => {
        const focused = cell.isElement()
            ? cell.id === nodeId
            : cell.get('source')?.id === nodeId || cell.get('target')?.id === nodeId;
        if (focused) return;
        const view = paper.findViewByModel(cell);
        if (!view) return;
        joint.highlighters.addClass.add(view, 'root', DIM_HIGHLIGHT_ID, {
            className: cell.isElement() ? DIMMED_ELEMENT_CLASS : DIMMED_LINK_CLASS
        });
    });
}
