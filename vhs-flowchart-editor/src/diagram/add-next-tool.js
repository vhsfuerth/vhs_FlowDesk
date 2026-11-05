// „+“-Griffe am ausgewählten Element: Klick hängt einen Prozessschritt an,
// der kleine Pfeil daneben öffnet ein Menü mit weiteren Typen.
// Das Werkzeug löst nur Paper-Ereignisse aus; das Anlegen übernimmt DiagramCanvas:
//   paper 'element:add-next'      (elementView, direction)
//   paper 'element:add-next-menu' (elementView, direction, { clientX, clientY })
// Lage aus model.getBBox() (Diagrammkoordinaten), siehe Regel in CLAUDE.md.
import * as joint from 'jointjs';
import { COLORS } from '../utils/constants';

const NS = 'http://www.w3.org/2000/svg';
const RADIUS = 10;
const OFFSET = 22;

const svg = (tag, attrs) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
};

/** Mittelpunkte der Griffe in Diagrammkoordinaten */
export const addNextHandlePositions = (bbox) => ({
    right: { x: bbox.x + bbox.width + OFFSET, y: bbox.y + bbox.height / 2 },
    bottom: { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height + OFFSET }
});

export class AddNextTool extends joint.dia.ToolView {
    render() { this._draw(); return this; }
    update() { this._draw(); return this; }

    _draw() {
        const el = this.el;
        while (el.firstChild) el.removeChild(el.firstChild);
        const positions = addNextHandlePositions(this.relatedView.model.getBBox());
        Object.entries(positions).forEach(([direction, center]) => el.appendChild(this._handle(direction, center)));
    }

    _handle(direction, { x, y }) {
        const group = svg('g', { class: 'vhs-add-next', 'data-direction': direction });
        const title = svg('title', {});
        title.textContent = direction === 'right' ? 'Folgeschritt rechts anhängen' : 'Folgeschritt unten anhängen';
        group.appendChild(title);
        const plus = svg('circle', { cx: x, cy: y, r: RADIUS, fill: COLORS.white, stroke: COLORS.vhsBlue, 'stroke-width': 1.5, cursor: 'pointer' });
        group.appendChild(plus);
        group.appendChild(svg('path', {
            d: `M ${x - 5} ${y} H ${x + 5} M ${x} ${y - 5} V ${y + 5}`,
            stroke: COLORS.vhsBlue, 'stroke-width': 2, 'pointer-events': 'none'
        }));

        // Kleiner Pfeil neben dem „+“: Menü mit weiteren Elementtypen
        const menuCenter = direction === 'right' ? { x, y: y + RADIUS + 9 } : { x: x + RADIUS + 9, y };
        const menu = svg('g', { cursor: 'pointer' });
        const menuTitle = svg('title', {});
        menuTitle.textContent = 'Anderen Elementtyp anhängen';
        menu.appendChild(menuTitle);
        menu.appendChild(svg('circle', { cx: menuCenter.x, cy: menuCenter.y, r: 7, fill: COLORS.vhsBlue10, stroke: COLORS.vhsBlue60, 'stroke-width': 1 }));
        menu.appendChild(svg('path', {
            d: `M ${menuCenter.x - 3} ${menuCenter.y - 1} L ${menuCenter.x} ${menuCenter.y + 2} L ${menuCenter.x + 3} ${menuCenter.y - 1}`,
            fill: 'none', stroke: COLORS.vhsBlue, 'stroke-width': 1.5, 'pointer-events': 'none'
        }));
        group.appendChild(menu);

        // JointJS darf das Klicken nicht als Ziehen der Fläche oder des Elements deuten
        const stop = (evt) => evt.stopPropagation();
        group.addEventListener('mousedown', stop);
        group.addEventListener('pointerdown', stop);
        group.addEventListener('touchstart', stop, { passive: true });
        const paper = this.relatedView.paper;
        plus.addEventListener('click', (evt) => {
            evt.stopPropagation();
            paper.trigger('element:add-next', this.relatedView, direction);
        });
        menu.addEventListener('click', (evt) => {
            evt.stopPropagation();
            paper.trigger('element:add-next-menu', this.relatedView, direction, { clientX: evt.clientX, clientY: evt.clientY });
        });
        return group;
    }
}
