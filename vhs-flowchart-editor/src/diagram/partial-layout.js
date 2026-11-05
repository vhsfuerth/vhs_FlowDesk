// @ts-check
// Teilweises automatisches Anordnen (ohne JointJS, daher testbar):
// layoutSelection ordnet nur die ausgewählten Elemente neu, der Rest bleibt liegen.

import dagre from '@dagrejs/dagre';
import { choosePorts } from './auto-layout';

/** @typedef {import('./types').DiagramData} DiagramData */
/** @typedef {import('./types').DiagramNode} DiagramNode */
/** @typedef {import('./types').DiagramEdge} DiagramEdge */
/** @typedef {'TB' | 'LR'} LayoutDirection */
/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */

/**
 * @typedef {Object} PartialLayoutResult
 * @property {Record<string, { x: number, y: number }>} positions  Neue Position je verschobenem Knoten
 * @property {Record<string, { sourcePort: string, targetPort: string }>} ports  Neue Anschlüsse je betroffener Verbindung
 * @property {LayoutDirection} direction                           Tatsächlich verwendete Richtung
 */

const DEFAULT_SIZE = { width: 160, height: 60 };
// Abstand zwischen Elementen (wie beim Anordnen des ganzen Diagramms)
const NODE_SEP = 100;
const RANK_SEP = 80;
// Waagerechter Mindestabstand, wenn Elemente in Swimlanes auf gleicher Höhe liegen
const SAME_ROW_GAP = 40;

/** @param {DiagramNode} node @returns {Rect} */
const rectOf = (node) => ({
  x: node.position?.x ?? 0,
  y: node.position?.y ?? 0,
  width: node.size?.width ?? DEFAULT_SIZE.width,
  height: node.size?.height ?? DEFAULT_SIZE.height
});

/** @param {Rect[]} rects @returns {Rect | null} */
function unionRect(rects) {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

/** @param {Rect} a @param {Rect} b */
const overlapsVertically = (a, b) => a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Neue Anschlüsse für alle Verbindungen, die einen verschobenen Knoten berühren.
 * @param {DiagramNode[]} nodes
 * @param {DiagramEdge[]} edges
 * @param {Record<string, { x: number, y: number }>} positions
 * @param {LayoutDirection} direction
 */
function portsFor(nodes, edges, positions, direction) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  /** @type {Record<string, { sourcePort: string, targetPort: string }>} */
  const ports = {};
  edges.forEach((edge) => {
    if (!edge.id || !(edge.from in positions || edge.to in positions)) return;
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) return;
    const s = { ...rectOf(source), ...positions[source.id] };
    const t = { ...rectOf(target), ...positions[target.id] };
    ports[edge.id] = choosePorts(s, t, { label: edge.label, sourceType: source.type, direction });
  });
  return ports;
}

/**
 * Ordnet nur die ausgewählten Knoten an. Das Ergebnis beginnt an der linken oberen Ecke
 * der bisherigen Auswahl. In Swimlane-Diagrammen läuft der Ablauf von links nach rechts
 * und jeder Knoten behält seine Höhe (bleibt also in seiner Lane).
 * @param {DiagramData} diagram
 * @param {string[]} ids  Ausgewählte Knoten (Lanes zählen mit ihrem Inhalt)
 * @param {{ direction?: LayoutDirection }} [options]
 * @returns {PartialLayoutResult}
 */
export function layoutSelection(diagram, ids, { direction = 'TB' } = {}) {
  const nodes = diagram.nodes || [];
  const edges = diagram.edges || [];
  const hasLanes = nodes.some((n) => n.type === 'lane');
  const selectedLanes = new Set(nodes.filter((n) => n.type === 'lane' && ids.includes(n.id)).map((n) => n.id));
  const selected = nodes.filter((n) => n.type !== 'lane'
    && (ids.includes(n.id) || (n.laneId !== undefined && selectedLanes.has(n.laneId))));
  const usedDirection = hasLanes ? 'LR' : direction;

  /** @type {PartialLayoutResult} */
  const result = { positions: {}, ports: {}, direction: usedDirection };
  if (selected.length < 2) return result;

  const selectedIds = new Set(selected.map((n) => n.id));
  const layoutGraph = new dagre.graphlib.Graph();
  layoutGraph.setGraph({ rankdir: usedDirection, nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 0, marginy: 0 });
  layoutGraph.setDefaultEdgeLabel(() => ({}));
  selected.forEach((node) => {
    const { width, height } = rectOf(node);
    layoutGraph.setNode(node.id, { width, height });
  });
  edges.forEach((edge) => {
    if (selectedIds.has(edge.from) && selectedIds.has(edge.to) && edge.from !== edge.to) layoutGraph.setEdge(edge.from, edge.to);
  });
  dagre.layout(layoutGraph);

  /** @type {Record<string, { x: number, y: number }>} */
  const raw = {};
  selected.forEach((node) => {
    const n = layoutGraph.node(node.id);
    const { width, height } = rectOf(node);
    raw[node.id] = { x: n.x - width / 2, y: n.y - height / 2 };
  });

  // Ergebnis an die bisherige linke obere Ecke der Auswahl setzen
  const before = /** @type {Rect} */ (unionRect(selected.map(rectOf)));
  const minX = Math.min(...Object.values(raw).map((p) => p.x));
  const minY = Math.min(...Object.values(raw).map((p) => p.y));

  if (hasLanes) {
    // Nur waagerecht anordnen; Elemente derselben Höhe dürfen sich nicht überdecken
    /** @type {Rect[]} */
    const placed = [];
    [...selected]
      .sort((a, b) => raw[a.id].x - raw[b.id].x)
      .forEach((node) => {
        const rect = { ...rectOf(node), x: Math.round(raw[node.id].x - minX + before.x) };
        placed.filter((other) => overlapsVertically(rect, other)).forEach((other) => {
          rect.x = Math.max(rect.x, other.x + other.width + SAME_ROW_GAP);
        });
        placed.push(rect);
        result.positions[node.id] = { x: rect.x, y: rect.y };
      });
  } else {
    selected.forEach((node) => {
      result.positions[node.id] = {
        x: Math.round(raw[node.id].x - minX + before.x),
        y: Math.round(raw[node.id].y - minY + before.y)
      };
    });
  }

  result.ports = portsFor(nodes, edges, result.positions, usedDirection);
  return result;
}
