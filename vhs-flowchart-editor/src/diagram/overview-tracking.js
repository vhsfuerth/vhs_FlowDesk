// Beobachtet Inhalt und sichtbaren Ausschnitt der Arbeitsfläche für die Übersichtskarte.
// Meldet höchstens einmal pro Frame { items, content, view } (Diagrammkoordinaten).
import { unionRects } from './overview';

/** Kleiner Speicher für { items, content, view } (siehe overview-tracking.js). */
export function createOverviewStore() {
  let state = null;
  const listeners = new Set();
  return {
    get: () => state,
    set: (next) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

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
    // Umrisse der Elemente nur nach Änderungen am Graphen neu bestimmen, nicht bei jedem Scrollen
    let graphChanged = true;
    /** @type {{ items: any[], content: any } | null} */
    let cached = null;

    const update = () => {
        frame = null;
        if (graphChanged || !cached) {
            graphChanged = false;
            const items = graph.getElements().map((cell) => ({
                id: cell.id,
                lane: cell.get('type') === 'vhs.Lane',
                ...cell.getBBox()
            }));
            cached = { items, content: unionRects(items) };
        }
        onChange(cached.content ? { items: cached.items, content: cached.content, view: visibleLocalRect(paper, container) } : null);
    };
    const schedule = () => {
        if (frame !== null) return;
        frame = requestAnimationFrame(update);
    };
    const onGraphChange = () => {
        graphChanged = true;
        schedule();
    };

    graph.on(GRAPH_EVENTS, onGraphChange);
    paper.on('scale translate resize', schedule);
    container.addEventListener('scroll', schedule, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(container);
    schedule();

    return {
        schedule,
        detach: () => {
            if (frame !== null) cancelAnimationFrame(frame);
            graph.off(GRAPH_EVENTS, onGraphChange);
            paper.off('scale translate resize', schedule);
            container.removeEventListener('scroll', schedule);
            resizeObserver?.disconnect();
        }
    };
}
