// Werkzeug zum Ändern der Größe einer Swimlane (Griff unten rechts).
// Die Werkzeugebene liegt in der transformierten Ebene des Papers (Verschiebung und Zoom
// wirken schon). Deshalb wie joint.elementTools.Boundary die Modellgeometrie in
// Diagrammkoordinaten nutzen (model.getBBox()), nicht view.getBBox(): Das liefert
// Paper-Koordinaten, und der Griff säße dann neben der Lane, sobald das Paper
// verschoben (fitPaperToContent) oder gezoomt ist.
import * as joint from 'jointjs';
import { COLORS } from '../utils/constants';
import { contentRect, minLaneSize } from './lane-embedding';

export const LANE_MIN_WIDTH = 200;
export const LANE_MIN_HEIGHT = 60;
const HANDLE_SIZE = 14;

/**
 * Position des Griffs (linke obere Ecke) in Diagrammkoordinaten.
 * @param {{ x: number, y: number, width: number, height: number }} bbox  Umriss der Lane
 */
export const handlePosition = (bbox) => ({
    x: bbox.x + bbox.width - HANDLE_SIZE,
    y: bbox.y + bbox.height - HANDLE_SIZE
});

/**
 * Neue Lane-Größe beim Ziehen des Griffs, begrenzt auf die Mindestgröße.
 * @param {{ width: number, height: number }} start  Größe zu Beginn
 * @param {{ x: number, y: number }} delta  Mausweg in Diagrammkoordinaten
 * @param {{ width: number, height: number }} [min]  Platzbedarf des Inhalts
 */
export const laneSizeForDrag = (start, delta, min = { width: 0, height: 0 }) => ({
    width: Math.max(LANE_MIN_WIDTH, min.width, start.width + delta.x),
    height: Math.max(LANE_MIN_HEIGHT, min.height, start.height + delta.y)
});

export class LaneResizeTool extends joint.dia.ToolView {
    render() { this._draw(); return this; }
    update() { this._draw(); return this; }

    _draw() {
        const el = this.el;
        while (el.firstChild) el.removeChild(el.firstChild);

        const { x: ox, y: oy } = handlePosition(this.relatedView.model.getBBox());

        const ns = 'http://www.w3.org/2000/svg';
        const bg = document.createElementNS(ns, 'rect');
        bg.setAttribute('x', ox); bg.setAttribute('y', oy);
        bg.setAttribute('width', HANDLE_SIZE); bg.setAttribute('height', HANDLE_SIZE);
        bg.setAttribute('rx', 2); bg.setAttribute('fill', COLORS.vhsBlue);
        bg.setAttribute('stroke', COLORS.white); bg.setAttribute('stroke-width', 1.5);
        bg.setAttribute('cursor', 'nwse-resize');
        el.appendChild(bg);

        // Diagonale Linien als Griff-Symbol
        [[3, 11, 11, 3], [6, 11, 11, 6], [9, 11, 11, 9]].forEach(([x1, y1, x2, y2]) => {
            const ln = document.createElementNS(ns, 'line');
            ln.setAttribute('x1', ox + x1); ln.setAttribute('y1', oy + y1);
            ln.setAttribute('x2', ox + x2); ln.setAttribute('y2', oy + y2);
            ln.setAttribute('stroke', COLORS.white); ln.setAttribute('stroke-width', 1.5);
            ln.setAttribute('pointer-events', 'none');
            el.appendChild(ln);
        });

        // Nur außerhalb eines laufenden Ziehvorgangs anmelden (verhindert doppelte Aufrufe).
        // Pointer Events: funktioniert mit Maus, Stift und Touch.
        if (!this._resizing) {
            bg.style.touchAction = 'none';
            bg.addEventListener('pointerdown', (evt) => this._startResize(evt));
            // JointJS' eigenes mousedown/touchstart blockieren, sonst wird die Lane gleichzeitig verschoben
            const stop = (evt) => evt.stopPropagation();
            bg.addEventListener('mousedown', stop);
            bg.addEventListener('touchstart', stop, { passive: true });
        }
    }

    _startResize(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        if (this._resizing) return;
        this._resizing = true;

        const paper = this.relatedView.paper;
        const lane = this.relatedView.model;
        const startSize = lane.size();
        const start = paper.clientToLocalPoint(evt.clientX, evt.clientY);
        // Nicht kleiner als der Inhalt, sonst ragen Elemente heraus
        const min = minLaneSize(lane.getBBox(), contentRect(lane));

        const cleanup = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', cleanup);
            window.removeEventListener('pointercancel', cleanup);
            // Verliert das Fenster mitten im Ziehen den Fokus, kommt kein pointerup
            window.removeEventListener('blur', cleanup);
            this._resizing = false;
            this._draw(); // Griff an der Endposition wieder bedienbar machen
        };

        const onMove = (e) => {
            const p = paper.clientToLocalPoint(e.clientX, e.clientY);
            const { width, height } = laneSizeForDrag(startSize, { x: p.x - start.x, y: p.y - start.y }, min);
            // update() -> _draw() folgt automatisch über change:size
            this.relatedView.model.resize(width, height);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', cleanup);
        window.addEventListener('pointercancel', cleanup);
        window.addEventListener('blur', cleanup);
    }
}
