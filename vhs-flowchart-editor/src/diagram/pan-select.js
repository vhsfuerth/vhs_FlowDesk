// Ziehen auf freier Fläche: verschiebt die Ansicht.
// Umschalt + Ziehen: Rahmenauswahl (zusätzlich Strg/Cmd: zur Auswahl hinzufügen).
import * as joint from 'jointjs';

/** Ab dieser Größe (Diagrammkoordinaten) zählt ein Rahmen als Auswahl statt als Klick */
const MIN_RUBBERBAND_SIZE = 3;

/**
 * Rechteck zwischen zwei Punkten, unabhängig von der Zugrichtung.
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
export const rectBetween = (a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y)
});

/**
 * @param {{ paper: any, graph: any, container: HTMLElement, getSelection: () => any[], setSelection: (cells: any[]) => void }} options
 * @returns {() => void} Abmelden
 */
export function attachPanAndRubberBand({ paper, graph, container, getSelection, setSelection }) {
    let isPanning = false;
    let lastMousePos = { x: 0, y: 0 };
    let rubberBand = null;

    // Rahmen in Koordinaten des scrollenden Containers (er wandert beim Scrollen mit)
    const updateRubberBand = (clientX, clientY) => {
        const bounds = container.getBoundingClientRect();
        const r = rectBetween({ x: rubberBand.startX, y: rubberBand.startY }, { x: clientX, y: clientY });
        Object.assign(rubberBand.el.style, {
            left: `${r.x - bounds.left + container.scrollLeft}px`,
            top: `${r.y - bounds.top + container.scrollTop}px`,
            width: `${r.width}px`,
            height: `${r.height}px`
        });
    };

    const onBlankPointerDown = (evt) => {
        if (evt.shiftKey) {
            const el = document.createElement('div');
            el.className = 'vhs-rubberband';
            container.appendChild(el);
            rubberBand = { startX: evt.clientX, startY: evt.clientY, el, additive: evt.ctrlKey || evt.metaKey };
            updateRubberBand(evt.clientX, evt.clientY);
            return;
        }
        isPanning = true;
        lastMousePos = { x: evt.clientX, y: evt.clientY };
    };

    const onMouseMove = (evt) => {
        if (rubberBand) {
            updateRubberBand(evt.clientX, evt.clientY);
            return;
        }
        if (!isPanning) return;
        container.scrollLeft -= evt.clientX - lastMousePos.x;
        container.scrollTop -= evt.clientY - lastMousePos.y;
        lastMousePos = { x: evt.clientX, y: evt.clientY };
    };

    const finishRubberBand = (evt) => {
        if (!rubberBand) return;
        const a = paper.clientToLocalPoint(rubberBand.startX, rubberBand.startY);
        const b = evt ? paper.clientToLocalPoint(evt.clientX, evt.clientY) : a;
        const r = rectBetween(a, b);
        if (r.width > MIN_RUBBERBAND_SIZE || r.height > MIN_RUBBERBAND_SIZE) {
            const found = graph.findModelsInArea(new joint.g.Rect(r.x, r.y, r.width, r.height), { strict: true });
            setSelection(rubberBand.additive ? [...getSelection(), ...found] : found);
        }
        rubberBand.el.remove();
        rubberBand = null;
    };

    const onMouseUp = (evt) => {
        finishRubberBand(evt);
        isPanning = false;
    };

    // Verliert das Fenster bei gedrückter Taste den Fokus (z. B. Alt+Tab), kommt kein mouseup.
    // Ohne Zurücksetzen würde die Ansicht danach bei jeder Mausbewegung mitscrollen.
    const onWindowBlur = () => {
        finishRubberBand(null);
        isPanning = false;
    };

    paper.on('blank:pointerdown', onBlankPointerDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
        paper.off('blank:pointerdown', onBlankPointerDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('blur', onWindowBlur);
        rubberBand?.el.remove();
        rubberBand = null;
    };
}
