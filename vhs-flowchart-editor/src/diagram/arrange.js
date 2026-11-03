// @ts-check
// Ausrichten und gleichmäßiges Verteilen mehrerer Elemente (reine Funktionen).

/** @typedef {{ id: string, x: number, y: number, width: number, height: number }} Box */
/** @typedef {'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'} AlignMode */
/** @typedef {Record<string, { x: number, y: number }>} Positions */

/**
 * Richtet Elemente an einer gemeinsamen Kante bzw. Mittellinie aus.
 * @param {Box[]} boxes
 * @param {AlignMode} mode
 * @returns {Positions}
 */
export function alignBoxes(boxes, mode) {
  /** @type {Positions} */
  const result = {};
  if (boxes.length < 2) return result;

  const left = Math.min(...boxes.map((b) => b.x));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const top = Math.min(...boxes.map((b) => b.y));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  boxes.forEach((b) => {
    let { x, y } = b;
    if (mode === 'left') x = left;
    if (mode === 'right') x = right - b.width;
    if (mode === 'center') x = centerX - b.width / 2;
    if (mode === 'top') y = top;
    if (mode === 'bottom') y = bottom - b.height;
    if (mode === 'middle') y = centerY - b.height / 2;
    result[b.id] = { x: Math.round(x), y: Math.round(y) };
  });
  return result;
}

/**
 * Verteilt Elemente mit gleichen Abständen zwischen den beiden äußeren Elementen.
 * @param {Box[]} boxes
 * @param {'horizontal' | 'vertical'} axis
 * @returns {Positions}
 */
export function distributeBoxes(boxes, axis) {
  /** @type {Positions} */
  const result = {};
  if (boxes.length < 3) return result;

  const horizontal = axis === 'horizontal';
  const sorted = [...boxes].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const start = horizontal ? first.x : first.y;
  const end = horizontal ? last.x + last.width : last.y + last.height;
  const occupied = sorted.reduce((sum, b) => sum + (horizontal ? b.width : b.height), 0);
  const gap = (end - start - occupied) / (sorted.length - 1);

  let cursor = start;
  sorted.forEach((b) => {
    result[b.id] = horizontal
      ? { x: Math.round(cursor), y: b.y }
      : { x: b.x, y: Math.round(cursor) };
    cursor += (horizontal ? b.width : b.height) + gap;
  });
  return result;
}
