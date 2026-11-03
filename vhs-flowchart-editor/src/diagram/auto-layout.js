// @ts-check
// Automatisches Anordnen auf Basis des JSON-Formats (ohne JointJS, daher testbar).
// Ohne Swimlanes: dagre-Layout in der gewünschten Richtung.
// Mit Swimlanes: Ablauf von links nach rechts, jeder Knoten bleibt in seiner Lane;
// die Lanes werden untereinander angeordnet und in der Größe angepasst.

import dagre from '@dagrejs/dagre';

/** @typedef {import('./types').DiagramData} DiagramData */
/** @typedef {import('./types').DiagramNode} DiagramNode */
/** @typedef {import('./types').DiagramEdge} DiagramEdge */
/** @typedef {'TB' | 'LR'} LayoutDirection */
/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */

/**
 * @typedef {Object} LayoutResult
 * @property {Record<string, { x: number, y: number }>} positions  Neue Position je Knoten (ohne Lanes)
 * @property {Record<string, Rect>} lanes                          Neue Lage und Größe je Lane
 * @property {Record<string, { sourcePort: string, targetPort: string }>} ports  Anschlüsse je Verbindung (nach ID)
 * @property {LayoutDirection} direction                           Tatsächlich verwendete Richtung
 */

const DEFAULT_SIZE = { width: 160, height: 60 };
const MARGIN = 80;

// Swimlane-Geometrie (Kopfzeile der Lane ist 40 px hoch, siehe shapes.js)
const LANE_HEADER = 40;
const LANE_PADDING_TOP = 20;
const LANE_PADDING_BOTTOM = 20;
const LANE_CONTENT_INSET = 40;
const LANE_GAP = 10;
const LANE_MIN_HEIGHT = 140;
const LANE_MIN_WIDTH = 400;
const ROW_GAP = 30;
const ROW_MIN_SPACING = 20;

const YES = /^(ja|yes)$/i;
const NO = /^(nein|no)$/i;

/** @param {DiagramNode} node @returns {Rect} */
const rectOf = (node) => ({
  x: node.position?.x ?? 0,
  y: node.position?.y ?? 0,
  width: node.size?.width ?? DEFAULT_SIZE.width,
  height: node.size?.height ?? DEFAULT_SIZE.height
});

/** @param {Rect} r */
const centerOf = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** @param {{ x: number, y: number }} point @param {Rect} r */
const contains = (point, r) => point.x >= r.x && point.x <= r.x + r.width && point.y >= r.y && point.y <= r.y + r.height;

/**
 * Wählt passende Anschlüsse für eine Verbindung abhängig von der Lage der Knoten.
 * Entscheidungen: „Ja“ folgt der Flussrichtung, „Nein“ geht zur Seite.
 * @param {Rect} s Quelle
 * @param {Rect} t Ziel
 * @param {{ label?: string, sourceType?: string, direction: LayoutDirection }} options
 */
export function choosePorts(s, t, { label = '', sourceType = '', direction }) {
  const sc = centerOf(s);
  const tc = centerOf(t);
  const isTB = direction === 'TB';
  const mainOut = isTB ? 'port-bottom' : 'port-right';
  const mainIn = isTB ? 'port-top' : 'port-left';
  const forward = isTB ? t.y >= s.y + s.height - 1 : t.x >= s.x + s.width - 1;
  const backward = isTB ? t.y + t.height <= s.y + 1 : t.x + t.width <= s.x + 1;

  if (sourceType === 'decision' && NO.test(label.trim())) {
    const crossOut = isTB ? (tc.x < sc.x ? 'port-left' : 'port-right') : (tc.y < sc.y ? 'port-top' : 'port-bottom');
    const crossIn = isTB ? (tc.x < sc.x ? 'port-right' : 'port-left') : (tc.y < sc.y ? 'port-bottom' : 'port-top');
    return { sourcePort: crossOut, targetPort: forward ? mainIn : crossIn };
  }

  if (forward || (sourceType === 'decision' && YES.test(label.trim()) && !backward)) {
    return { sourcePort: mainOut, targetPort: mainIn };
  }

  if (backward) {
    // Rücksprung: über die Seite zurückführen
    const side = isTB ? 'port-left' : 'port-top';
    return { sourcePort: side, targetPort: side };
  }

  // Gleiche Ebene: Seiten, die einander zugewandt sind
  if (isTB) {
    return tc.x < sc.x
      ? { sourcePort: 'port-left', targetPort: 'port-right' }
      : { sourcePort: 'port-right', targetPort: 'port-left' };
  }
  return tc.y < sc.y
    ? { sourcePort: 'port-top', targetPort: 'port-bottom' }
    : { sourcePort: 'port-bottom', targetPort: 'port-top' };
}

/**
 * dagre-Layout für alle Knoten außer Lanes.
 * @param {DiagramNode[]} nodes
 * @param {DiagramEdge[]} edges
 * @param {LayoutDirection} direction
 */
function runDagre(nodes, edges, direction) {
  const layoutGraph = new dagre.graphlib.Graph();
  layoutGraph.setGraph({ rankdir: direction, marginx: MARGIN, marginy: MARGIN, nodesep: 100, edgesep: 50, ranksep: 80 });
  layoutGraph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const { width, height } = rectOf(node);
    layoutGraph.setNode(node.id, { width, height });
  });
  edges.forEach((edge) => {
    if (layoutGraph.hasNode(edge.from) && layoutGraph.hasNode(edge.to)) {
      layoutGraph.setEdge(edge.from, edge.to);
    }
  });

  dagre.layout(layoutGraph);

  /** @type {Record<string, { x: number, y: number }>} */
  const centers = {};
  layoutGraph.nodes().forEach((id) => {
    const n = layoutGraph.node(id);
    if (n) centers[id] = { x: n.x, y: n.y };
  });
  return centers;
}

/**
 * Ordnet Knoten innerhalb ihrer Swimlanes an (Fluss von links nach rechts).
 * @param {DiagramNode[]} flowNodes
 * @param {DiagramNode[]} laneNodes
 * @param {DiagramEdge[]} edges
 */
function layoutWithLanes(flowNodes, laneNodes, edges) {
  const lanes = [...laneNodes].sort((a, b) => rectOf(a).y - rectOf(b).y);
  const laneRects = lanes.map(rectOf);

  // Zuordnung Knoten → Lane über den Mittelpunkt, sonst nächstgelegene Lane
  /** @type {Map<string, DiagramNode[]>} */
  const members = new Map(lanes.map((lane) => [lane.id, []]));
  flowNodes.forEach((node) => {
    const c = centerOf(rectOf(node));
    let index = laneRects.findIndex((r) => contains(c, r));
    if (index === -1) {
      const distances = laneRects.map((r) => (c.y < r.y ? r.y - c.y : c.y > r.y + r.height ? c.y - (r.y + r.height) : 0));
      index = distances.indexOf(Math.min(...distances));
    }
    members.get(lanes[index].id)?.push(node);
  });

  const centers = runDagre(flowNodes, edges, 'LR');
  const laneX = Math.min(...laneRects.map((r) => r.x));
  const minLeft = Math.min(...flowNodes.map((n) => (centers[n.id]?.x ?? 0) - rectOf(n).width / 2));
  const shiftX = laneX + LANE_CONTENT_INSET - minLeft;

  /** @type {Record<string, { x: number, y: number }>} */
  const positions = {};
  /** @type {Record<string, Rect>} */
  const laneResult = {};
  let laneTop = laneRects[0].y;
  let maxRight = laneX + LANE_MIN_WIDTH;

  lanes.forEach((lane) => {
    const laneMembers = (members.get(lane.id) || [])
      .map((node) => ({ node, rect: rectOf(node), left: (centers[node.id]?.x ?? 0) - rectOf(node).width / 2 + shiftX }))
      .sort((a, b) => a.left - b.left);

    // Knoten, die sich horizontal überschneiden würden, in weitere Zeilen legen
    /** @type {{ end: number, height: number }[]} */
    const rows = [];
    /** @type {number[]} */
    const rowOf = [];
    laneMembers.forEach((m) => {
      let row = rows.findIndex((r) => m.left >= r.end + ROW_MIN_SPACING);
      if (row === -1) {
        rows.push({ end: -Infinity, height: 0 });
        row = rows.length - 1;
      }
      rows[row].end = m.left + m.rect.width;
      rows[row].height = Math.max(rows[row].height, m.rect.height);
      rowOf.push(row);
    });

    /** @type {number[]} */
    const rowOffsets = [];
    let offset = 0;
    rows.forEach((r) => {
      rowOffsets.push(offset);
      offset += r.height + ROW_GAP;
    });
    const contentHeight = rows.length ? offset - ROW_GAP : 0;

    laneMembers.forEach((m, i) => {
      const row = rowOf[i];
      const y = laneTop + LANE_HEADER + LANE_PADDING_TOP + rowOffsets[row] + (rows[row].height - m.rect.height) / 2;
      positions[m.node.id] = { x: Math.round(m.left), y: Math.round(y) };
      maxRight = Math.max(maxRight, m.left + m.rect.width);
    });

    const height = Math.max(LANE_MIN_HEIGHT, LANE_HEADER + LANE_PADDING_TOP + contentHeight + LANE_PADDING_BOTTOM);
    laneResult[lane.id] = { x: laneX, y: laneTop, width: 0, height };
    laneTop += height + LANE_GAP;
  });

  const width = Math.round(maxRight - laneX + LANE_CONTENT_INSET);
  Object.values(laneResult).forEach((r) => { r.width = width; });

  return { positions, lanes: laneResult };
}

/**
 * Berechnet ein aufgeräumtes Layout für ein Diagramm.
 * @param {DiagramData} diagram
 * @param {{ direction?: LayoutDirection }} [options]
 * @returns {LayoutResult}
 */
export function computeAutoLayout(diagram, { direction = 'TB' } = {}) {
  const nodes = diagram.nodes || [];
  const edges = diagram.edges || [];
  const laneNodes = nodes.filter((n) => n.type === 'lane');
  const flowNodes = nodes.filter((n) => n.type !== 'lane');

  /** @type {LayoutResult} */
  const result = { positions: {}, lanes: {}, ports: {}, direction };
  if (flowNodes.length === 0) return result;

  if (laneNodes.length > 0) {
    // Swimlanes liegen untereinander – der Ablauf läuft daher immer von links nach rechts
    result.direction = 'LR';
    const { positions, lanes } = layoutWithLanes(flowNodes, laneNodes, edges);
    result.positions = positions;
    result.lanes = lanes;
  } else {
    const centers = runDagre(flowNodes, edges, direction);
    flowNodes.forEach((node) => {
      const c = centers[node.id];
      if (!c) return;
      const { width, height } = rectOf(node);
      result.positions[node.id] = { x: Math.round(c.x - width / 2), y: Math.round(c.y - height / 2) };
    });
  }

  /** @type {Map<string, DiagramNode>} */
  const nodeById = new Map(flowNodes.map((n) => [n.id, n]));
  edges.forEach((edge) => {
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (!edge.id || !source || !target) return;
    const s = { ...rectOf(source), ...result.positions[source.id] };
    const t = { ...rectOf(target), ...result.positions[target.id] };
    result.ports[edge.id] = choosePorts(s, t, { label: edge.label, sourceType: source.type, direction: result.direction });
  });

  return result;
}
