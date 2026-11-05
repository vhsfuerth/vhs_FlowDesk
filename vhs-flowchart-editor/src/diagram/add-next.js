// @ts-check
// Folgeschritt direkt anhängen (ohne JointJS): Lage des neuen Elements,
// Anschlüsse der Verbindung und Beschriftung bei Entscheidungen.

/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */
/** @typedef {'right' | 'bottom'} AddDirection */

/** Abstand zwischen Element und Folgeschritt */
export const NEXT_GAP = { right: 80, bottom: 70 };
const MAX_TRIES = 12;
const CLEARANCE = 10;
const GRID = 10;

/** Elementtypen, an die ein Folgeschritt angehängt werden kann */
export const CAN_HAVE_NEXT = ['start', 'process', 'decision', 'document', 'system', 'subprocess', 'wait'];

/** Typen, die als Folgeschritt angelegt werden können (Menü, Eigenschaften-Leiste) */
export const NEXT_STEP_TYPES = ['process', 'decision', 'document', 'system', 'wait', 'subprocess', 'end'];

/** @param {Rect} a @param {Rect} b */
const overlaps = (a, b) => a.x < b.x + b.width + CLEARANCE && b.x < a.x + a.width + CLEARANCE
  && a.y < b.y + b.height + CLEARANCE && b.y < a.y + a.height + CLEARANCE;

/** @param {number} value */
const snap = (value) => Math.round(value / GRID) * GRID;

/**
 * Position des neuen Elements rechts bzw. unterhalb der Quelle.
 * Ist der Platz belegt, rückt es quer zur Richtung weiter (rechts: nach unten, unten: nach rechts).
 * @param {Rect} source
 * @param {{ width: number, height: number }} size
 * @param {AddDirection} direction
 * @param {Rect[]} obstacles  andere Elemente (ohne Lanes)
 * @returns {{ x: number, y: number }}
 */
export function placeNextNode(source, size, direction, obstacles) {
  const base = direction === 'right'
    ? { x: source.x + source.width + NEXT_GAP.right, y: source.y + source.height / 2 - size.height / 2 }
    : { x: source.x + source.width / 2 - size.width / 2, y: source.y + source.height + NEXT_GAP.bottom };
  const step = direction === 'right' ? { x: 0, y: size.height + 30 } : { x: size.width + 40, y: 0 };

  for (let i = 0; i < MAX_TRIES; i += 1) {
    const candidate = { x: snap(base.x + step.x * i), y: snap(base.y + step.y * i), ...size };
    if (!obstacles.some((o) => overlaps(candidate, o))) return { x: candidate.x, y: candidate.y };
  }
  return { x: snap(base.x), y: snap(base.y) };
}

/**
 * Anschlüsse der neuen Verbindung.
 * @param {AddDirection} direction
 */
export const nextEdgePorts = (direction) => (direction === 'right'
  ? { sourcePort: 'port-right', targetPort: 'port-left' }
  : { sourcePort: 'port-bottom', targetPort: 'port-top' });

/**
 * Beschriftung des nächsten Ausgangs einer Entscheidung: erst „Ja“, dann „Nein“, danach keine.
 * @param {string[]} existingLabels  Beschriftungen der vorhandenen Ausgänge
 */
export function nextDecisionLabel(existingLabels) {
  const used = new Set(existingLabels.map((label) => label.trim().toLowerCase()));
  if (!used.has('ja')) return 'Ja';
  if (!used.has('nein')) return 'Nein';
  return '';
}
