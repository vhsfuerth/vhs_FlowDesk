// Swimlanes halten ihre Elemente: Einbetten beim Ablegen, Mitwachsen mit dem Inhalt,
// Umsortieren. Lanes sind JointJS-Elternelemente: Beim Ziehen auf der Fläche wandern
// ihre Elemente mit (JointJS ruft position() mit { deep: true } auf). Im Code gilt:
// position(x, y) bewegt nur die Lane, position(x, y, { deep: true }) auch ihren Inhalt.
import { setElementLane } from './converter';
import { laneAtCenter } from './lanes';

/** Höhe der Kopfzeile einer Lane (siehe shapes.js) */
export const LANE_HEADER = 40;
/** Abstand zwischen Inhalt und Rand der Lane */
export const LANE_PADDING = 20;

export const isLane = (cell) => Boolean(cell) && cell.get('type') === 'vhs.Lane';

/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */

/**
 * Umriss mehrerer Rechtecke oder null.
 * @param {Rect[]} rects
 * @returns {Rect | null}
 */
export function unionRect(rects) {
    if (!rects.length) return null;
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    const right = Math.max(...rects.map((r) => r.x + r.width));
    const bottom = Math.max(...rects.map((r) => r.y + r.height));
    return { x, y, width: right - x, height: bottom - y };
}

/**
 * Lage der Lane, nachdem sie so weit gewachsen ist, dass der Inhalt hineinpasst (schrumpft nie).
 * @param {Rect} lane
 * @param {Rect | null} content
 * @returns {Rect}
 */
export function grownLaneRect(lane, content) {
    if (!content) return { ...lane };
    const x = Math.min(lane.x, content.x - LANE_PADDING);
    const y = Math.min(lane.y, content.y - LANE_HEADER - LANE_PADDING);
    const right = Math.max(lane.x + lane.width, content.x + content.width + LANE_PADDING);
    const bottom = Math.max(lane.y + lane.height, content.y + content.height + LANE_PADDING);
    return { x, y, width: right - x, height: bottom - y };
}

/**
 * Mindestgröße einer Lane, damit beim Verkleinern (Griff unten rechts) kein Element herausragt.
 * @param {Rect} lane
 * @param {Rect | null} content
 */
export function minLaneSize(lane, content) {
    if (!content) return { width: 0, height: 0 };
    return {
        width: content.x + content.width + LANE_PADDING - lane.x,
        height: content.y + content.height + LANE_PADDING - lane.y
    };
}

/** Umriss der eingebetteten Elemente einer Lane. */
export const contentRect = (lane) => unionRect(lane.getEmbeddedCells()
    .filter((cell) => cell.isElement())
    .map((cell) => cell.getBBox()));

/** Vergrößert die Lane bei Bedarf so, dass ihr Inhalt hineinpasst. Ihre Elemente bleiben liegen. */
export function growLaneToFit(lane) {
    const current = lane.getBBox();
    const next = grownLaneRect(current, contentRect(lane));
    if (next.x === current.x && next.y === current.y && next.width === current.width && next.height === current.height) return;
    // Ohne { deep: true } bleiben die eingebetteten Elemente liegen
    lane.position(next.x, next.y);
    lane.resize(next.width, next.height);
}

/** Lane unter dem Mittelpunkt des Elements (die kleinste, falls mehrere übereinander liegen). */
export function laneUnder(graph, element) {
    const lanes = graph.getElements()
        .filter((cell) => isLane(cell) && cell !== element)
        .map((lane) => ({ lane, rect: lane.getBBox() }));
    return laneAtCenter(element.getBBox(), lanes);
}

/**
 * Ordnet ein Element der Lane unter ihm zu (bzw. löst es) und lässt die Lane mitwachsen.
 * Lanes selbst werden nicht eingebettet.
 */
export function assignLane(graph, element) {
    if (!element?.isElement() || isLane(element)) return;
    const lane = laneUnder(graph, element);
    setElementLane(element, lane);
    if (lane) growLaneToFit(lane);
}

/** Nimmt alle freien Elemente, die in einer neuen Lane liegen, in diese auf. */
export function adoptFreeElements(graph, lane) {
    graph.getElements()
        .filter((cell) => !isLane(cell) && !cell.getParentCell() && laneUnder(graph, cell) === lane)
        .forEach((cell) => lane.embed(cell));
    growLaneToFit(lane);
}

/** Hat die Zelle einen Vorfahren in `cells`? (z. B. ein Element, dessen Lane mit ausgewählt ist) */
export const hasAncestorIn = (cell, cells) => cell.getAncestors().some((ancestor) => cells.includes(ancestor));

/**
 * Nachbar-Lane über bzw. unter `lane` (überlappt waagerecht, nächste in der Richtung).
 * @param {'up' | 'down'} direction
 */
export function neighborLane(graph, lane, direction) {
    const own = lane.getBBox();
    const candidates = graph.getElements()
        .filter((cell) => isLane(cell) && cell !== lane)
        .map((cell) => ({ cell, rect: cell.getBBox() }))
        .filter(({ rect }) => rect.x < own.x + own.width && own.x < rect.x + rect.width)
        .filter(({ rect }) => (direction === 'up' ? rect.y < own.y : rect.y > own.y))
        .sort((a, b) => (direction === 'up' ? b.rect.y - a.rect.y : a.rect.y - b.rect.y));
    return candidates[0]?.cell || null;
}

/**
 * Tauscht eine Lane mit ihrer Nachbarin oben bzw. unten; die Elemente wandern mit.
 * Der Abstand zwischen beiden Lanes bleibt erhalten.
 * @returns {boolean} ob getauscht wurde
 */
export function moveLane(graph, lane, direction) {
    const other = neighborLane(graph, lane, direction);
    if (!other) return false;
    const [upper, lower] = direction === 'up' ? [other, lane] : [lane, other];
    const u = upper.getBBox();
    const l = lower.getBBox();
    const gap = l.y - (u.y + u.height);
    graph.startBatch('move-lane');
    // deep: die eingebetteten Elemente wandern mit (wie beim Ziehen auf der Fläche)
    lower.position(l.x, u.y, { deep: true });
    upper.position(u.x, u.y + l.height + gap, { deep: true });
    graph.stopBatch('move-lane');
    return true;
}

/**
 * Hält die Zuordnung zu Lanes während der Bearbeitung aktuell.
 * - Nach dem Ziehen (pointerup) werden das Element und ggf. die mitgezogene Auswahl neu zugeordnet.
 * - Neue Elemente landen in der Lane unter ihnen; eine neue Lane nimmt freie Elemente auf.
 * - Wächst ein Element (längerer Text), wächst seine Lane mit.
 * Beim Laden (Batch `import`) und beim automatischen Anordnen passiert nichts.
 * @param {{ graph: any, paper: any, getSelection: () => any[] }} options
 * @returns {() => void} Abmelden
 */
export function attachLaneEmbedding({ graph, paper, getSelection }) {
    const isBulkChange = () => graph.hasActiveBatch(['import', 'layout', 'move-lane']);

    const onElementPointerUp = (elementView) => {
        const model = elementView.model;
        const selection = getSelection();
        const moved = selection.includes(model) ? selection.filter((cell) => cell.isElement()) : [model];
        moved.forEach((cell) => assignLane(graph, cell));
    };

    const onAdd = (cell) => {
        if (!cell.isElement() || isBulkChange()) return;
        if (isLane(cell)) adoptFreeElements(graph, cell);
        else assignLane(graph, cell);
    };

    const onChangeSize = (cell) => {
        if (isBulkChange() || isLane(cell)) return;
        const parent = cell.getParentCell();
        if (isLane(parent)) growLaneToFit(parent);
    };

    paper.on('element:pointerup', onElementPointerUp);
    graph.on('add', onAdd);
    graph.on('change:size', onChangeSize);
    return () => {
        paper.off('element:pointerup', onElementPointerUp);
        graph.off('add', onAdd);
        graph.off('change:size', onChangeSize);
    };
}
