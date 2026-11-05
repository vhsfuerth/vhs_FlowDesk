// Hilfslinien beim Ziehen eines Elements: Fluchtet es mit Kante oder Mitte eines anderen
// Elements, rastet es ein und eine orange Linie zeigt die Flucht. Alt gedrückt halten
// schaltet das Einrasten ab. Bei Mehrfachauswahl und Swimlanes gibt es keine Hilfslinien.
import { COLORS } from '../utils/constants';
import { computeSnap } from './snaplines';
import { isLane } from './lane-embedding';

const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {{ paper: any, graph: any, getSelection: () => any[] }} options
 * @returns {() => void} Abmelden
 */
export function attachSnaplines({ paper, graph, getSelection }) {
    let layer = null;

    const clear = () => {
        layer?.remove();
        layer = null;
    };

    const draw = (guides) => {
        clear();
        if (!guides.length) return;
        layer = document.createElementNS(NS, 'g');
        layer.setAttribute('class', 'vhs-snaplines');
        layer.setAttribute('pointer-events', 'none');
        guides.forEach((guide) => {
            const line = document.createElementNS(NS, 'line');
            const extend = 20;
            const coords = guide.orientation === 'vertical'
                ? { x1: guide.x, x2: guide.x, y1: guide.from - extend, y2: guide.to + extend }
                : { x1: guide.from - extend, x2: guide.to + extend, y1: guide.y, y2: guide.y };
            Object.entries(coords).forEach(([key, value]) => line.setAttribute(key, value));
            line.setAttribute('stroke', COLORS.vhsOrange);
            line.setAttribute('stroke-width', 1);
            line.setAttribute('stroke-dasharray', '4,3');
            layer.appendChild(line);
        });
        (paper.getLayerNode?.('front') || paper.svg).appendChild(layer);
    };

    const onPointerMove = (elementView, evt) => {
        const model = elementView.model;
        const selection = getSelection();
        if (evt?.altKey || isLane(model) || (selection.length > 1 && selection.includes(model))) {
            clear();
            return;
        }
        const others = graph.getElements()
            .filter((cell) => cell !== model && !isLane(cell) && !cell.isEmbeddedIn(model))
            .map((cell) => cell.getBBox());
        const rect = model.getBBox();
        const { dx, dy, guides } = computeSnap(rect, others);
        if (dx || dy) model.position(rect.x + dx, rect.y + dy, { deep: true });
        draw(guides);
    };

    paper.on('element:pointermove', onPointerMove);
    paper.on('element:pointerup', clear);
    window.addEventListener('blur', clear);
    return () => {
        clear();
        paper.off('element:pointermove', onPointerMove);
        paper.off('element:pointerup', clear);
        window.removeEventListener('blur', clear);
    };
}
