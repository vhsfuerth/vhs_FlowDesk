// Beobachtet Inhalt und sichtbaren Ausschnitt der Arbeitsfläche für die Übersichtskarte.
// Meldet höchstens einmal pro Frame { items, content, view } (Diagrammkoordinaten).
import { unionRects } from './overview';

const GRAPH_EVENTS = 'add remove reset change:position change:size';

/** Sichtbarer Ausschnitt des scrollenden Containers in Diagrammkoordinaten. */
export function visibleLocalRect(paper, container) {
    const rect = container.getBoundingClientRect();
    const topLeft = paper.clientToLocalPoint(rect.left, rect.top);
    const bottomRight = paper.clientToLocalPoint(rect.left + container.clientWidth, rect.top + container.clientHeight);
    return { x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
}

/**
 * @param {{ paper: any, graph: any, container: HTMLElement, onChange: (state: object | null) => void }} options
 * @returns {{ schedule: () => void, detach: () => void }}
 */
export function attachOverviewTracking({ paper, graph, container, onChange }) {
    let frame = null;

    const update = () => {
        frame = null;
        const items = graph.getElements().map((cell) => ({
            id: cell.id,
            lane: cell.get('type') === 'vhs.Lane',
            ...cell.getBBox()
        }));
        const content = unionRects(items);
        onChange(content ? { items, content, view: visibleLocalRect(paper, container) } : null);
    };
    const schedule = () => {
        if (frame !== null) return;
        frame = requestAnimationFrame(update);
    };

    graph.on(GRAPH_EVENTS, schedule);
    paper.on('scale translate resize', schedule);
    container.addEventListener('scroll', schedule, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(container);
    schedule();

    return {
        schedule,
        detach: () => {
            if (frame !== null) cancelAnimationFrame(frame);
            graph.off(GRAPH_EVENTS, schedule);
            paper.off('scale translate resize', schedule);
            container.removeEventListener('scroll', schedule);
            resizeObserver?.disconnect();
        }
    };
}
