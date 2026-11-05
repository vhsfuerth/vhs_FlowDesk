// @ts-check
// Zuordnung von Elementen zu Swimlanes (ohne JointJS). Maßgeblich ist `laneId`;
// fehlt sie (ältere Daten, KI-Ergebnisse), entscheidet die Lage: die kleinste Lane,
// die den Mittelpunkt des Elements enthält.

/** @typedef {import('./types').DiagramNode} DiagramNode */
/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */

const DEFAULT_SIZE = { width: 160, height: 60 };

/** @param {DiagramNode} node @returns {Rect} */
export const nodeRect = (node) => ({
  x: node.position?.x ?? 0,
  y: node.position?.y ?? 0,
  width: node.size?.width ?? DEFAULT_SIZE.width,
  height: node.size?.height ?? DEFAULT_SIZE.height
});

/**
 * Kleinste Lane, die den Mittelpunkt von `rect` enthält.
 * @template {{ id: string }} L
 * @param {Rect} rect
 * @param {Array<{ lane: L, rect: Rect }>} lanes
 * @returns {L | null}
 */
export function laneAtCenter(rect, lanes) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const containing = lanes
    .filter(({ rect: r }) => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height)
    .sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height);
  return containing.length ? containing[0].lane : null;
}

/**
 * Lane eines Elements: gültige `laneId`, sonst nach Lage.
 * @param {DiagramNode} node
 * @param {DiagramNode[]} lanes
 * @returns {DiagramNode | null}
 */
export function laneOf(node, lanes) {
  if (node.type === 'lane') return null;
  if (node.laneId) {
    const lane = lanes.find((l) => l.id === node.laneId);
    if (lane) return lane;
  }
  return laneAtCenter(nodeRect(node), lanes.map((lane) => ({ lane, rect: nodeRect(lane) })));
}

/**
 * Ergänzt fehlende bzw. ungültige `laneId` nach Lage; Elemente außerhalb aller Lanes erhalten keine.
 * @param {DiagramNode[]} nodes
 * @returns {DiagramNode[]}
 */
export function withLaneIds(nodes) {
  const lanes = nodes.filter((n) => n.type === 'lane');
  return nodes.map((node) => {
    if (node.type === 'lane') return node;
    const lane = lanes.length ? laneOf(node, lanes) : null;
    const copy = { ...node };
    delete copy.laneId;
    return lane ? { ...copy, laneId: lane.id } : copy;
  });
}
