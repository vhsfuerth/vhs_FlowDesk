// Einrichtung des JointJS-Papers für den Editor: Raster, Standardverbindung,
// erlaubte Verbindungen und Anschlusspunkte beim Überfahren.
import * as joint from 'jointjs';
import { COLORS } from '../utils/constants';

const isLane = (cell) => cell.get('type') === 'vhs.Lane';

/**
 * Darf eine Verbindung von `cellViewS` nach `cellViewT` gezogen werden?
 * Nicht erlaubt: auf sich selbst, auf Verbindungen, von oder zu Swimlanes
 * (Lanes sind Behälter, keine Prozessschritte), ohne Anschlusspunkt.
 */
export function validateConnection(cellViewS, magnetS, cellViewT, magnetT) {
    if (cellViewS === cellViewT) return false;
    if (cellViewT.model.isLink()) return false;
    if (isLane(cellViewS.model) || isLane(cellViewT.model)) return false;
    return !!magnetT;
}

export const createDefaultLink = () => new joint.shapes.standard.Link({
    attrs: {
        line: {
            stroke: COLORS.vhsBlue60,
            strokeWidth: 2,
            targetMarker: {
                type: 'path',
                d: 'M 10 -5 0 0 10 5 z',
                fill: COLORS.vhsBlue60,
                stroke: 'none'
            }
        }
    },
    router: { name: 'manhattan' },
    connector: { name: 'rounded' }
});

/**
 * Erzeugt das Paper. Die Startgröße ist die des sichtbaren Bereichs;
 * danach passt `fitPaperToContent` (viewport.js) die Fläche an den Inhalt an.
 * @param {HTMLElement} el
 * @param {joint.dia.Graph} graph
 * @param {{ width: number, height: number }} size
 */
export function createPaper(el, graph, size) {
    return new joint.dia.Paper({
        el,
        model: graph,
        width: size.width,
        height: size.height,
        gridSize: 10,
        drawGrid: { name: 'dot', args: { color: COLORS.vhsBlue20, thickness: 1 } },
        background: { color: COLORS.white },
        defaultLink: createDefaultLink,
        interactive: {
            elementMove: true,
            addLinkFromMagnet: true,
            // Knickpunkte entstehen erst beim Ziehen (vertex-drag.js), nicht schon beim Anklicken
            vertexAdd: false,
            vertexMove: true,
            vertexRemove: true,
            linkMove: false,
            labelMove: true,
            arrowheadMove: true
        },
        snapLinks: { radius: 30 },
        linkPinning: false,
        markAvailable: true,
        defaultConnectionPoint: { name: 'boundary' },
        validateConnection,
        cellViewNamespace: joint.shapes
    });
}

/**
 * Blendet die Anschlusspunkte eines Elements ein, solange die Maus darüber ist
 * (nicht bei Lanes, sie haben keine). Liefert eine Funktion zum Abmelden.
 */
export function attachPortHover(paper) {
    const setPortsVisible = (visibility) => (elementView) => {
        const model = elementView.model;
        if (isLane(model)) return;
        model.getPorts().forEach((port) => {
            model.portProp(port.id, 'attrs/circle/style', { visibility });
        });
    };
    const show = setPortsVisible('visible');
    const hide = setPortsVisible('hidden');
    paper.on('element:mouseenter', show);
    paper.on('element:mouseleave', hide);
    return () => {
        paper.off('element:mouseenter', show);
        paper.off('element:mouseleave', hide);
    };
}
