// @ts-check
// Welcher Punkt eines Elements rastet im Raster ein?
//
// 'center'  (ab 1.6.3): die Mitte. Untereinander gezogene Elemente liegen so mittig übereinander,
//           auch wenn sie unterschiedlich breit sind – Pfeile zwischen ihnen laufen gerade statt
//           mit einem kleinen Haken.
// 'topLeft' (bis 1.6.2): die linke obere Ecke, wie JointJS es von sich aus macht.
//
// ZURÜCKSETZEN: GRID_ANCHOR auf 'topLeft' stellen. Mehr ist nicht nötig; alle Stellen
// (Ziehen, Einfügen per Klick/Drag & Drop, Folgeschritt) lesen diese Konstante.

/** @typedef {'center' | 'topLeft'} GridAnchor */

/** @type {GridAnchor} */
export const GRID_ANCHOR = 'center';

/** Rasterweite der Arbeitsfläche (gridSize in paper.js) */
export const GRID_SIZE = 10;

/** @param {number} value @param {number} grid */
const snap = (value, grid) => Math.round(value / grid) * grid;

/**
 * Lage eines Elements nach dem Einrasten.
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {{ grid?: number, anchor?: GridAnchor }} [options]
 * @returns {{ x: number, y: number }}
 */
export function snapToGridAnchor(rect, { grid = GRID_SIZE, anchor = GRID_ANCHOR } = {}) {
  if (!grid) return { x: rect.x, y: rect.y };
  if (anchor === 'topLeft') return { x: snap(rect.x, grid), y: snap(rect.y, grid) };
  return {
    x: snap(rect.x + rect.width / 2, grid) - rect.width / 2,
    y: snap(rect.y + rect.height / 2, grid) - rect.height / 2
  };
}
