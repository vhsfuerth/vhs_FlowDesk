// @ts-check
// Hilfslinien beim Verschieben (ohne JointJS): Fluchtet eine Kante oder die Mitte des
// gezogenen Elements mit einem anderen Element, rastet es dort ein.

/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */
/** @typedef {{ orientation: 'vertical', x: number, from: number, to: number } | { orientation: 'horizontal', y: number, from: number, to: number }} Guide */

/** Abstand in Diagrammkoordinaten, ab dem eingerastet wird */
export const SNAP_DISTANCE = 6;

/** @param {Rect} r */
const xAnchors = (r) => [r.x, r.x + r.width / 2, r.x + r.width];
/** @param {Rect} r */
const yAnchors = (r) => [r.y, r.y + r.height / 2, r.y + r.height];

/**
 * Kleinste Verschiebung auf einer Achse, mit der ein Ankerpunkt des Elements
 * auf einen Ankerpunkt eines anderen Elements fällt.
 * @param {number[]} own
 * @param {number[][]} others
 * @param {number} threshold
 */
function bestOffset(own, others, threshold) {
  /** @type {{ delta: number, target: number } | null} */
  let best = null;
  for (const anchors of others) {
    for (const target of anchors) {
      for (const value of own) {
        const delta = target - value;
        if (Math.abs(delta) <= threshold && (best === null || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, target };
        }
      }
    }
  }
  return best;
}

/**
 * @param {Rect} moving  Lage des gezogenen Elements
 * @param {Rect[]} others  übrige Elemente
 * @param {number} [threshold]
 * @returns {{ dx: number, dy: number, guides: Guide[] }}
 */
export function computeSnap(moving, others, threshold = SNAP_DISTANCE) {
  const bx = bestOffset(xAnchors(moving), others.map(xAnchors), threshold);
  const by = bestOffset(yAnchors(moving), others.map(yAnchors), threshold);
  const dx = bx ? bx.delta : 0;
  const dy = by ? by.delta : 0;
  const snapped = { ...moving, x: moving.x + dx, y: moving.y + dy };

  /** @type {Guide[]} */
  const guides = [];
  if (bx) {
    // Alle Elemente, die auf dieser senkrechten Linie liegen, für die Länge der Linie berücksichtigen
    const aligned = [snapped, ...others.filter((r) => xAnchors(r).some((v) => Math.abs(v - bx.target) < 0.5))];
    guides.push({ orientation: 'vertical', x: bx.target, from: Math.min(...aligned.map((r) => r.y)), to: Math.max(...aligned.map((r) => r.y + r.height)) });
  }
  if (by) {
    const aligned = [snapped, ...others.filter((r) => yAnchors(r).some((v) => Math.abs(v - by.target) < 0.5))];
    guides.push({ orientation: 'horizontal', y: by.target, from: Math.min(...aligned.map((r) => r.x)), to: Math.max(...aligned.map((r) => r.x + r.width)) });
  }
  return { dx, dy, guides };
}
