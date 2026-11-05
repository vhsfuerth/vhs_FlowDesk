// @ts-check
// Übersichtskarte und „Alles einpassen“: reine Geometrie (ohne JointJS, daher testbar).
// Alle Rechtecke sind in Diagrammkoordinaten, sofern nicht anders angegeben.

/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */
/** @typedef {{ scale: number, offsetX: number, offsetY: number }} MinimapFrame */

/** Größe der Übersichtskarte in Bildschirmpixeln */
export const MINIMAP_SIZE = { width: 200, height: 140 };
const MINIMAP_PADDING = 6;

/** Zoomgrenzen (wie viewport.js) */
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;

/** @param {Rect[]} rects @returns {Rect | null} */
export function unionRects(rects) {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Zoom, bei dem der ganze Inhalt in den sichtbaren Bereich passt.
 * Vergrößert höchstens auf 100 %, damit kleine Diagramme nicht riesig werden.
 * @param {Rect} content  Umriss des Inhalts
 * @param {{ width: number, height: number }} viewport  sichtbarer Bereich in Bildschirmpixeln
 * @param {{ margin?: number, max?: number }} [options]
 */
export function fitZoom(content, viewport, { margin = 40, max = 1 } = {}) {
  const availableWidth = Math.max(1, viewport.width - 2 * margin);
  const availableHeight = Math.max(1, viewport.height - 2 * margin);
  const zoom = Math.min(availableWidth / Math.max(1, content.width), availableHeight / Math.max(1, content.height), max);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(zoom * 100) / 100));
}

/**
 * Liegt der ganze Inhalt im sichtbaren Ausschnitt?
 * @param {Rect} content
 * @param {Rect} view
 */
export const isFullyVisible = (content, view) => content.x >= view.x - 1 && content.y >= view.y - 1
  && content.x + content.width <= view.x + view.width + 1 && content.y + content.height <= view.y + view.height + 1;

/**
 * Abbildung Diagramm → Übersichtskarte: Inhalt und Sichtfenster passen zusammen hinein (zentriert).
 * @param {Rect} content
 * @param {Rect} view
 * @param {{ width: number, height: number }} [size]
 * @returns {MinimapFrame}
 */
export function minimapFrame(content, view, size = MINIMAP_SIZE) {
  const bounds = /** @type {Rect} */ (unionRects([content, view]));
  const innerWidth = size.width - 2 * MINIMAP_PADDING;
  const innerHeight = size.height - 2 * MINIMAP_PADDING;
  const scale = Math.min(innerWidth / Math.max(1, bounds.width), innerHeight / Math.max(1, bounds.height));
  return {
    scale,
    offsetX: MINIMAP_PADDING + (innerWidth - bounds.width * scale) / 2 - bounds.x * scale,
    offsetY: MINIMAP_PADDING + (innerHeight - bounds.height * scale) / 2 - bounds.y * scale
  };
}

/**
 * Rechteck in Kartenkoordinaten.
 * @param {MinimapFrame} frame
 * @param {Rect} rect
 * @returns {Rect}
 */
export const toMinimap = (frame, rect) => ({
  x: rect.x * frame.scale + frame.offsetX,
  y: rect.y * frame.scale + frame.offsetY,
  width: rect.width * frame.scale,
  height: rect.height * frame.scale
});

/**
 * Punkt auf der Karte → Diagrammkoordinaten.
 * @param {MinimapFrame} frame
 * @param {{ x: number, y: number }} point
 */
export const fromMinimap = (frame, point) => ({
  x: (point.x - frame.offsetX) / frame.scale,
  y: (point.y - frame.offsetY) / frame.scale
});
