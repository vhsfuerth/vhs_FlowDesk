// Ansicht der Arbeitsfläche: Größe an den Inhalt anpassen, Zoom um einen Punkt,
// Scrollen zu Bereichen, Einfügeposition. `container` ist das scrollende Element,
// das das JointJS-Paper enthält.

/** Leerraum rund um den Inhalt (in Bildschirmpixeln), damit man weiterzeichnen kann */
export const FIT_PADDING = 400;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2;

/** Standardgröße, falls ein Knoten im Ausschnitt keine Größe hat */
const DEFAULT_NODE_SIZE = { width: 160, height: 60 };

/** Zoomstufe auf den erlaubten Bereich begrenzen und auf 2 Nachkommastellen runden. */
export const clampZoom = (value) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

/**
 * Zoomfaktor für ein Mausrad-Ereignis. Eine Raste (deltaY ≈ 100) ergibt rund 15 %,
 * die feinen Werte von Touchpad-Gesten entsprechend weniger.
 * @param {number} deltaY
 */
export const wheelZoomFactor = (deltaY) => {
    const limited = Math.max(-100, Math.min(100, deltaY));
    return Math.exp(-limited * 0.0015);
};

/**
 * Passt die Größe des Papers an den Inhalt an (auch Bereiche mit negativen Koordinaten).
 * Verschiebt sich dabei der Ursprung, wird die Scrollposition so ausgeglichen,
 * dass der sichtbare Ausschnitt nicht springt.
 */
export function fitPaperToContent(paper, container, padding = FIT_PADDING) {
    if (!paper || !container) return;
    const before = paper.translate();
    paper.fitToContent({
        padding,
        allowNewOrigin: 'any',
        useModelGeometry: true,
        minWidth: container.clientWidth,
        minHeight: container.clientHeight
    });
    const after = paper.translate();
    container.scrollLeft += after.tx - before.tx;
    container.scrollTop += after.ty - before.ty;
}

/** Mittelpunkt des sichtbaren Bereichs in Diagrammkoordinaten. */
export function visibleCenterLocal(paper, container) {
    const rect = container.getBoundingClientRect();
    return paper.clientToLocalPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

/**
 * Skaliert das Paper und hält dabei den Punkt unter `clientPoint` (Standard: Bildmitte)
 * an derselben Stelle auf dem Bildschirm.
 * @param {{ x: number, y: number } | null} clientPoint
 * @param {() => void} [fit]  passt die Papergröße nach dem Skalieren an
 */
export function zoomAroundPoint(paper, container, scale, clientPoint = null, fit = undefined) {
    const rect = container.getBoundingClientRect();
    const anchor = clientPoint || { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const local = paper.clientToLocalPoint(anchor.x, anchor.y);
    paper.scale(scale, scale);
    fit?.();
    const moved = paper.localToClientPoint(local.x, local.y);
    container.scrollLeft += moved.x - anchor.x;
    container.scrollTop += moved.y - anchor.y;
}

/**
 * Scrollt zu einem Bereich in Diagrammkoordinaten.
 * `center`: Bereich mittig; `top`: waagerecht mittig, oben bündig; `topLeft`: links oben.
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {'center' | 'top' | 'topLeft'} [align]
 */
export function scrollToLocalRect(paper, container, rect, align = 'center', margin = 20) {
    const p = paper.localToPaperRect(rect);
    if (align === 'topLeft') {
        container.scrollLeft = p.x - margin;
        container.scrollTop = p.y - margin;
        return;
    }
    // Passt der Bereich nicht in den Ausschnitt, wird er am Anfang ausgerichtet statt mittig,
    // damit z. B. Start und Lane-Titel sichtbar bleiben.
    const fitsWidth = p.width + 2 * margin <= container.clientWidth;
    const fitsHeight = p.height + 2 * margin <= container.clientHeight;
    container.scrollLeft = fitsWidth
        ? p.x + p.width / 2 - container.clientWidth / 2
        : p.x - margin;
    container.scrollTop = align === 'top' || !fitsHeight
        ? p.y - margin
        : p.y + p.height / 2 - container.clientHeight / 2;
}

/**
 * Umriss eines Diagrammausschnitts (Knoten mit Position).
 * @param {{ nodes: Array<{ position?: { x: number, y: number }, size?: { width: number, height: number } }> }} fragment
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function fragmentBounds(fragment) {
    const placed = (fragment?.nodes || []).filter((n) => n.position);
    if (!placed.length) return null;
    const boxes = placed.map((n) => ({ ...n.position, ...(n.size || DEFAULT_NODE_SIZE) }));
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    const right = Math.max(...boxes.map((b) => b.x + b.width));
    const bottom = Math.max(...boxes.map((b) => b.y + b.height));
    return { x, y, width: right - x, height: bottom - y };
}

/**
 * Verschiebung, mit der ein Ausschnitt mittig auf `target` eingefügt wird.
 * Wird mehrfach an dieselbe Stelle eingefügt, rückt jede Kopie um `step` weiter.
 * @param {{ nodes: any[] }} fragment
 * @param {{ x: number, y: number }} target  Diagrammkoordinaten
 * @param {number} repeat  wie oft bereits an dieselbe Stelle eingefügt wurde
 */
export function pasteOffset(fragment, target, repeat = 0, step = 30) {
    const bounds = fragmentBounds(fragment);
    if (!bounds) return { x: step, y: step };
    const shift = repeat * step;
    // Auf das Raster (10 px) runden, damit eingefügte Elemente bündig bleiben
    const snap = (value) => Math.round(value / 10) * 10;
    return {
        x: snap(target.x - (bounds.x + bounds.width / 2) + shift),
        y: snap(target.y - (bounds.y + bounds.height / 2) + shift)
    };
}
