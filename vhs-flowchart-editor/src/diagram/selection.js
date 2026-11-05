// Auswahl von Elementen und Verbindungen: Klick, Strg/Umschalt + Klick,
// gemeinsames Verschieben und die Auswahlrahmen auf der Arbeitsfläche.
import * as joint from 'jointjs';
import { COLORS } from '../utils/constants';
import { LaneResizeTool } from './lane-resize-tool';
import { AddNextTool } from './add-next-tool';
import { CAN_HAVE_NEXT } from './add-next';

/** Strg, Cmd oder Umschalt: Auswahl ergänzen statt ersetzen */
export const isAdditiveEvent = (evt) => !!(evt?.ctrlKey || evt?.metaKey || evt?.shiftKey);

/**
 * Auswahl nach einem Klick auf `cell`.
 * Ergänzend: Element hinzufügen bzw. wieder abwählen; sonst nur dieses Element.
 */
export function toggleSelection(selection, cell, additive) {
    if (!additive) return [cell];
    return selection.includes(cell) ? selection.filter((c) => c !== cell) : [...selection, cell];
}

/**
 * Startzustand für gemeinsames Verschieben, wenn ein Element einer Mehrfachauswahl gezogen wird.
 * @returns {null | { anchor: any, start: { x: number, y: number }, others: Array<{ cell: any, start: { x: number, y: number } }> }}
 */
export function startGroupDrag(selection, anchor) {
    if (!selection.includes(anchor) || selection.length < 2) return null;
    // Liegt das gezogene Element in einer mit ausgewählten Lane, bewegt sich die Lane nicht mit
    if (hasSelectedAncestor(anchor, selection)) return null;
    return {
        anchor,
        start: anchor.position(),
        // Elemente in einer mit ausgewählten Lane wandern mit ihr (JointJS) und nicht doppelt
        others: selection
            .filter((c) => c !== anchor && c.isElement() && !hasSelectedAncestor(c, [...selection, anchor]))
            .map((cell) => ({ cell, start: cell.position() }))
    };
}

/** Liegt die Zelle in einer Lane (bzw. einem Elternelement), die ebenfalls in `cells` ist? */
export const hasSelectedAncestor = (cell, cells) => (cell.getAncestors?.() || []).some((ancestor) => cells.includes(ancestor));

/** Verschiebt die übrigen Elemente um denselben Weg wie das gezogene. */
export function applyGroupDrag(groupDrag) {
    const position = groupDrag.anchor.position();
    const dx = position.x - groupDrag.start.x;
    const dy = position.y - groupDrag.start.y;
    // deep: mitgezogene Lanes nehmen ihren Inhalt mit
    groupDrag.others.forEach(({ cell, start }) => cell.position(start.x + dx, start.y + dy, { deep: true }));
}

/** Typ ohne Präfix, z. B. 'process' */
const nodeType = (cell) => String(cell.get('type')).replace('vhs.', '').toLowerCase();

const boundaryAttrs = {
    rect: { fill: 'none', stroke: COLORS.vhsBlue, 'stroke-width': 2, 'stroke-dasharray': '5,5' }
};

/**
 * Zeichnet die Auswahl: Bei einem Element Rahmen, Löschen und ggf. Lane-Griff,
 * bei einer Verbindung zusätzlich die Pfeilspitzen; bei mehreren nur Rahmen.
 */
export function renderSelectionTools(paper, selection) {
    paper.removeTools();
    if (selection.length === 1) {
        const cell = selection[0];
        const view = paper.findViewByModel(cell);
        if (!view) return;
        const tools = cell.isElement()
            ? [
                new joint.elementTools.Boundary({ padding: 10, useModelGeometry: true, attrs: boundaryAttrs }),
                // Löschen über die App (Angebot „Ablauf erhalten“), nicht direkt
                new joint.elementTools.Remove({ offset: { x: 10, y: 10 }, action: (evt, view) => view.paper.trigger('element:remove-request', view) }),
                ...(cell.get('type') === 'vhs.Lane' ? [new LaneResizeTool()] : []),
                ...(CAN_HAVE_NEXT.includes(nodeType(cell)) ? [new AddNextTool()] : [])
            ]
            : [
                new joint.linkTools.Boundary({ attrs: boundaryAttrs }),
                // Vorhandene Knickpunkte verschieben, Doppelklick entfernt sie (neue: vertex-drag.js)
                new joint.linkTools.Vertices({ vertexAdding: false, redundancyRemoval: true }),
                new joint.linkTools.Remove({ distance: '10%' }),
                new joint.linkTools.SourceArrowhead(),
                new joint.linkTools.TargetArrowhead()
            ];
        view.addTools(new joint.dia.ToolsView({ tools }));
        return;
    }
    selection.forEach((cell) => {
        const view = paper.findViewByModel(cell);
        if (!view) return;
        const tool = cell.isElement()
            ? new joint.elementTools.Boundary({ padding: 10, useModelGeometry: true, attrs: boundaryAttrs })
            : new joint.linkTools.Boundary({ attrs: boundaryAttrs });
        view.addTools(new joint.dia.ToolsView({ tools: [tool] }));
    });
}

/**
 * Verwaltet die Auswahl auf einem Paper.
 * @param {{ graph: any, paper: any, onChange?: (count: number) => void, render?: (paper: any, selection: any[]) => void }} options
 * @returns {{ get: () => any[], set: (cells: any[]) => void, detach: () => void }}
 */
export function createSelectionController({ graph, paper, onChange, render = renderSelectionTools }) {
    let selection = [];
    let groupDrag = null;

    const set = (cells) => {
        selection = [...new Set(cells)].filter((cell) => cell && graph.getCell(cell.id));
        render(paper, selection);
        onChange?.(selection.length);
    };

    // Gelöschte Zellen abwählen; Undo/Redo ersetzt alle Zellen, die alte Auswahl ist dann ungültig
    const onRemove = (cell) => {
        if (selection.includes(cell)) set(selection.filter((c) => c !== cell));
    };
    const onReset = () => set([]);

    const onElementPointerDown = (elementView, evt) => {
        const model = elementView.model;
        if (!isAdditiveEvent(evt) && !selection.includes(model)) set([model]);
        groupDrag = startGroupDrag(selection, model);
    };
    const onElementPointerMove = (elementView) => {
        if (groupDrag && elementView.model === groupDrag.anchor) applyGroupDrag(groupDrag);
    };
    const onElementPointerUp = () => { groupDrag = null; };
    const onCellClick = (cellView, evt) => set(toggleSelection(selection, cellView.model, isAdditiveEvent(evt)));
    const onBlankClick = () => set([]);

    graph.on('remove', onRemove);
    graph.on('reset', onReset);
    const paperHandlers = {
        'element:pointerdown': onElementPointerDown,
        'element:pointermove': onElementPointerMove,
        'element:pointerup': onElementPointerUp,
        'element:pointerclick': onCellClick,
        'link:pointerclick': onCellClick,
        'blank:pointerclick': onBlankClick
    };
    Object.entries(paperHandlers).forEach(([name, handler]) => paper.on(name, handler));

    return {
        get: () => selection,
        set,
        detach: () => {
            graph.off('remove', onRemove);
            graph.off('reset', onReset);
            Object.entries(paperHandlers).forEach(([name, handler]) => paper.off(name, handler));
        }
    };
}
