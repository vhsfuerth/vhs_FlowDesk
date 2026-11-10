// Knickpunkte setzen: Ziehen auf einer Verbindung fügt einen Knickpunkt ein und verschiebt ihn.
// Ersetzt JointJS' „vertexAdd“, das schon beim bloßen Anklicken einer Linie einen Knickpunkt
// anlegen würde. Erst ab DRAG_THRESHOLD Pixeln Mausweg entsteht ein Knickpunkt.
// Vorhandene Knickpunkte verschiebt bzw. entfernt (Doppelklick) linkTools.Vertices (selection.js).

import { GRID_SIZE } from './grid-anchor';

const DRAG_THRESHOLD = 5;

const snap = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

// Teile der Linie (standard.Link), auf denen Ziehen einen Knickpunkt setzt
const CONNECTION_SELECTORS = ['wrapper', 'line'];

/**
 * Nur Ziehen direkt auf der Linie einer fertigen Verbindung zählt. JointJS meldet auch beim
 * Aufziehen einer neuen Verbindung vom Anschlusspunkt ein `link:pointerdown` – dann ist das
 * Ziel des Ereignisses der Anschlusspunkt und die Verbindung hat noch kein Ziel.
 */
export const startsVertexDrag = (linkView, evt) => {
    const target = evt?.target;
    if (!target?.getAttribute || evt.button > 0) return false;
    if (!CONNECTION_SELECTORS.includes(target.getAttribute('joint-selector'))) return false;
    if (linkView.el && !linkView.el.contains(target)) return false;
    return Boolean(linkView.model.source()?.id && linkView.model.target()?.id);
};

/**
 * @param {{ paper: any }} options
 * @returns {() => void} Abmelden
 */
export function attachVertexDrag({ paper }) {
    let drag = null;

    const onLinkPointerDown = (linkView, evt) => {
        if (!startsVertexDrag(linkView, evt)) return;
        drag = { linkView, startX: evt.clientX, startY: evt.clientY, index: null };
    };

    const onPointerMove = (evt) => {
        if (!drag) return;
        const { linkView } = drag;
        if (drag.index === null) {
            if (Math.hypot(evt.clientX - drag.startX, evt.clientY - drag.startY) < DRAG_THRESHOLD) return;
            const start = paper.clientToLocalPoint(drag.startX, drag.startY);
            drag.index = linkView.getVertexIndex(start.x, start.y);
            linkView.model.startBatch('vertex-add');
            linkView.model.insertVertex(drag.index, { x: snap(start.x), y: snap(start.y) });
        }
        const point = paper.clientToLocalPoint(evt.clientX, evt.clientY);
        linkView.model.vertex(drag.index, { x: snap(point.x), y: snap(point.y) });
    };

    const finish = () => {
        if (drag && drag.index !== null) drag.linkView.model.stopBatch('vertex-add');
        drag = null;
    };

    paper.on('link:pointerdown', onLinkPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finish);
    // Touch/Stift: Übernimmt der Browser die Geste (z. B. Scrollen), kommt pointercancel statt pointerup
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', finish);
    return () => {
        finish();
        paper.off('link:pointerdown', onLinkPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
        window.removeEventListener('blur', finish);
    };
}
