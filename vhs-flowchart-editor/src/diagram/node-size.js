// @ts-check
// Geschätzte Elementgröße für eine Beschriftung (ohne JointJS, daher auch für
// das Vorab-Layout des KI-Copilots nutzbar). Wird von shapes.js verwendet.

/** @typedef {import('./types').NodeType} NodeType */

/** @type {Record<string, number>} */
const MIN_WIDTHS = { start: 140, end: 140, process: 160, decision: 180, annotation: 200, document: 160, system: 160, subprocess: 180, wait: 170 };
/** @type {Record<string, number>} */
const MIN_HEIGHTS = { start: 70, end: 70, process: 60, decision: 110, annotation: 80, document: 70, system: 80, subprocess: 90, wait: 60 };
/** Zusätzlicher Platz je Typ (Wellenkante, Zylinderdeckel, Rundung, Seitenlinien) */
/** @type {Record<string, { width: number, height: number }>} */
const EXTRA = {
  document: { width: 0, height: 14 },
  system: { width: 0, height: 24 },
  subprocess: { width: 10, height: 34 },
  wait: { width: 30, height: 0 }
};

const CHAR_WIDTH = 8; // ungefähre Zeichenbreite bei 13 px
const LINE_HEIGHT = 18;

/**
 * @param {string} label
 * @param {NodeType | string} type
 * @returns {{ width: number, height: number }}
 */
export function estimateNodeSize(label, type) {
  const text = label || '';
  const maxCharsPerLine = type === 'decision' ? 12 : 18;
  const lines = Math.max(1, Math.ceil(text.length / maxCharsPerLine));
  const longestLineLen = Math.min(text.length, maxCharsPerLine);

  const extra = EXTRA[type] || { width: 0, height: 0 };
  let width = Math.max(MIN_WIDTHS[type] || 160, longestLineLen * CHAR_WIDTH + 40 + extra.width);
  let height = Math.max(MIN_HEIGHTS[type] || 60, lines * LINE_HEIGHT + 30 + extra.height);

  // Ovale und Rauten brauchen mehr Platz
  if (type === 'start' || type === 'end') {
    width = Math.max(width, height * 2);
    height = Math.max(height, 70);
  }
  if (type === 'decision') {
    width = Math.max(width, 180);
    height = Math.max(height, 110);
  }
  return { width, height };
}
