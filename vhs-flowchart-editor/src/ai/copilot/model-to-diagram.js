// @ts-check
// Wandelt ein (normalisiertes) Prozessmodell lokal in das Diagrammformat um –
// ohne KI-Aufruf. Start, Ende, Entscheidungszweige, Swimlanes und Layout werden
// hier sichergestellt, statt sie von der KI zu erwarten.

import { choosePorts, computeAutoLayout } from '../../diagram/auto-layout';
import { estimateNodeSize } from '../../diagram/node-size';
import { END, UNASSIGNED_ROLE } from './process-model';

/** @typedef {import('./process-model').ProcessModel} ProcessModel */
/** @typedef {import('./process-model').ProcessStep} ProcessStep */
/** @typedef {import('../../diagram/types').DiagramData} DiagramData */
/** @typedef {import('../../diagram/types').DiagramNode} DiagramNode */
/** @typedef {import('../../diagram/types').DiagramEdge} DiagramEdge */
/** @typedef {import('../../diagram/types').NodeType} NodeType */

/**
 * @typedef {Object} BuildOptions
 * @property {boolean} [useLanes]      Rollen als Swimlanes darstellen
 * @property {boolean} [includeNotes]  Hinweise der KI als Kommentare anbinden
 */

export const START_NODE_ID = 'start';
export const AUTO_END_NODE_ID = 'ende';

const LANE_INITIAL_HEIGHT = 160;
const LANE_INITIAL_WIDTH = 800;

/** @param {string} stepId */
export const nodeIdForStep = (stepId) => `n-${stepId}`;

/** @type {Record<ProcessStep['kind'], NodeType>} */
const NODE_TYPE = { task: 'process', decision: 'decision', end: 'end' };

/** Elementtyp eines Schritts: Tätigkeiten je nach Art als Dokument, IT-System oder Warten/Frist */
/** @param {ProcessStep} step @returns {NodeType} */
const nodeTypeOf = (step) => (step.kind === 'task' ? (step.taskType || 'process') : NODE_TYPE[step.kind]);

/**
 * Zusatzangaben für den Knoten. Die Rolle steht ohne Swimlanes als Zuständigkeit am Schritt.
 * @param {ProcessStep} step
 * @param {boolean} useLanes
 * @returns {Partial<DiagramNode>}
 */
const detailsOf = (step, useLanes) => {
  /** @type {Partial<DiagramNode>} */
  const details = {};
  if (step.description) details.description = step.description;
  if (step.document) details.document = step.document;
  if (step.system) details.system = step.system;
  if (step.duration) details.duration = step.duration;
  if (!useLanes && step.role) details.role = step.role;
  return details;
};

/**
 * Soll das Modell mit Swimlanes dargestellt werden, wenn niemand etwas anderes gewählt hat?
 * @param {ProcessModel} model
 */
export const shouldUseLanesByDefault = (model) => model.roles.length >= 2;

/**
 * @param {ProcessModel} model
 * @param {BuildOptions} [options]
 * @returns {DiagramData}
 */
export function buildDiagramFromModel(model, { useLanes = false, includeNotes = true } = {}) {
  /** @type {DiagramNode[]} */
  const nodes = [];
  /** @type {DiagramEdge[]} */
  const edges = [];
  /** @type {Map<string, string>} Knoten-ID → Rolle */
  const roleOfNode = new Map();
  let edgeCounter = 0;

  /**
   * @param {string} id
   * @param {NodeType} type
   * @param {string} label
   * @param {string} role
   * @param {Partial<DiagramNode>} [details]  Erläuterung, Dokument, IT-System, Dauer
   */
  const addNode = (id, type, label, role, details = {}) => {
    nodes.push({ id, type, label, size: estimateNodeSize(label, type), ...details });
    roleOfNode.set(id, role);
  };

  /**
   * @param {string} from
   * @param {string} to
   * @param {string} [label]
   */
  const addEdge = (from, to, label = '') => {
    edgeCounter += 1;
    edges.push({ id: `e${edgeCounter}`, from, to, label });
  };

  let autoEndCreated = false;
  /**
   * Knoten-ID für ein Verweisziel; legt das gemeinsame Ende bei Bedarf an.
   * @param {string} target
   * @param {string} role  Rolle des verweisenden Schritts (für die Lane des Endes)
   */
  const targetNodeId = (target, role) => {
    if (target !== END) return nodeIdForStep(target);
    if (!autoEndCreated) {
      addNode(AUTO_END_NODE_ID, 'end', 'Ende', role);
      autoEndCreated = true;
    }
    return AUTO_END_NODE_ID;
  };

  const steps = model.steps;
  const firstRole = steps[0]?.role || '';
  const inheritedRole = inheritRolesForEnds(steps);
  addNode(START_NODE_ID, 'start', model.trigger || 'Start', firstRole);
  steps.forEach((step) => {
    const role = step.role || inheritedRole.get(step.id) || '';
    addNode(nodeIdForStep(step.id), nodeTypeOf(step), step.label, role, detailsOf(step, useLanes));
  });

  if (steps.length > 0) addEdge(START_NODE_ID, nodeIdForStep(steps[0].id));
  steps.forEach((step) => {
    const from = nodeIdForStep(step.id);
    if (step.kind === 'task') {
      addEdge(from, targetNodeId(step.next, step.role));
    } else if (step.kind === 'decision') {
      step.branches.forEach((branch) => addEdge(from, targetNodeId(branch.next, step.role), branch.label));
    }
  });

  if (includeNotes) {
    steps.filter((step) => step.note).forEach((step) => {
      const noteId = `note-${step.id}`;
      addNode(noteId, 'annotation', step.note, step.role);
      addEdge(noteId, nodeIdForStep(step.id));
    });
  }

  const diagram = { nodes, edges };
  if (useLanes) addLanes(diagram, model, roleOfNode);
  applyLayout(diagram);
  return diagram;
}

/**
 * Endpunkte ohne eigene Rolle übernehmen die Rolle des ersten Schritts, der zu ihnen führt –
 * so entsteht für sie keine eigene Lane „Ohne Zuordnung“.
 * @param {ProcessStep[]} steps
 * @returns {Map<string, string>}
 */
function inheritRolesForEnds(steps) {
  /** @type {Map<string, string>} */
  const roles = new Map();
  const endIds = new Set(steps.filter((s) => s.kind === 'end' && !s.role).map((s) => s.id));
  steps.forEach((step) => {
    if (!step.role) return;
    const targets = step.kind === 'decision' ? step.branches.map((b) => b.next) : [step.next];
    targets.forEach((target) => {
      if (endIds.has(target) && !roles.has(target)) roles.set(target, step.role);
    });
  });
  return roles;
}

/**
 * Legt je Rolle eine Lane an und setzt jeden Knoten vorläufig in seine Lane.
 * Die endgültige Anordnung übernimmt danach das automatische Layout.
 * @param {DiagramData} diagram
 * @param {ProcessModel} model
 * @param {Map<string, string>} roleOfNode
 */
function addLanes(diagram, model, roleOfNode) {
  const roles = [...model.roles];
  const hasUnassigned = diagram.nodes.some((node) => !roleOfNode.get(node.id));
  if (hasUnassigned) roles.push(UNASSIGNED_ROLE);
  if (roles.length === 0) return;

  const laneIndex = new Map(roles.map((role, i) => [role, i]));
  diagram.nodes.forEach((node) => {
    const index = laneIndex.get(roleOfNode.get(node.id) || UNASSIGNED_ROLE) ?? roles.length - 1;
    const height = node.size?.height ?? 60;
    node.position = { x: 40, y: index * LANE_INITIAL_HEIGHT + (LANE_INITIAL_HEIGHT - height) / 2 + 20 };
    // Feste Zuordnung (Format 2), damit Layout und Editor nicht nach Lage raten müssen
    node.laneId = `lane-${index + 1}`;
  });

  /** @type {DiagramNode[]} */
  const laneNodes = roles.map((role, i) => ({
    id: `lane-${i + 1}`,
    type: 'lane',
    label: role,
    position: { x: 0, y: i * LANE_INITIAL_HEIGHT },
    size: { width: LANE_INITIAL_WIDTH, height: LANE_INITIAL_HEIGHT }
  }));
  // Lanes zuerst, damit sie im Hintergrund liegen
  diagram.nodes.unshift(...laneNodes);
}

/**
 * Berechnet Positionen, Lane-Größen und Anschlüsse und schreibt sie ins Diagramm.
 * Kommentare (Hinweise) nehmen nicht am Ablauf-Layout teil, sondern werden danach
 * als Randnotizen rechts neben den Ablauf gesetzt – so überdecken sie keine Verbindungen.
 * @param {DiagramData} diagram
 */
function applyLayout(diagram) {
  const noteIds = new Set(diagram.nodes.filter((n) => n.type === 'annotation').map((n) => n.id));
  const core = {
    nodes: diagram.nodes.filter((n) => !noteIds.has(n.id)),
    edges: diagram.edges.filter((e) => !noteIds.has(e.from) && !noteIds.has(e.to))
  };
  const layout = computeAutoLayout(core, { direction: 'TB' });
  core.nodes.forEach((node) => {
    const lane = layout.lanes[node.id];
    if (lane) {
      node.position = { x: lane.x, y: lane.y };
      node.size = { width: lane.width, height: lane.height };
      return;
    }
    const position = layout.positions[node.id];
    if (position) node.position = position;
  });
  core.edges.forEach((edge) => {
    const ports = edge.id ? layout.ports[edge.id] : undefined;
    if (ports) {
      edge.sourcePort = ports.sourcePort;
      edge.targetPort = ports.targetPort;
    }
  });
  if (noteIds.size > 0) placeNotes(diagram, noteIds, layout.direction);
}

const NOTE_COLUMN_GAP = 60;
const NOTE_SPACING = 15;
const LANE_HEADER = 40;

/** @param {DiagramNode} node */
const rect = (node) => ({
  x: node.position?.x ?? 0,
  y: node.position?.y ?? 0,
  width: node.size?.width ?? 160,
  height: node.size?.height ?? 60
});

/**
 * Setzt Kommentare in eine Spalte rechts neben den Ablauf, jeweils auf Höhe ihres Schritts
 * (bei Swimlanes in dessen Lane; die Lane wächst bei Bedarf).
 * @param {DiagramData} diagram
 * @param {Set<string>} noteIds
 * @param {'TB' | 'LR'} direction
 */
function placeNotes(diagram, noteIds, direction) {
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const lanes = diagram.nodes.filter((n) => n.type === 'lane').sort((a, b) => rect(a).y - rect(b).y);
  const flow = diagram.nodes.filter((n) => n.type !== 'lane' && !noteIds.has(n.id));
  const items = diagram.edges
    .filter((edge) => noteIds.has(edge.from))
    .map((edge) => ({ edge, note: /** @type {DiagramNode} */ (byId.get(edge.from)), step: /** @type {DiagramNode} */ (byId.get(edge.to)) }))
    .filter((item) => item.note && item.step)
    .sort((a, b) => rect(a.step).y - rect(b.step).y || rect(a.step).x - rect(b.step).x);

  const columnX = Math.max(...flow.map((n) => rect(n).x + rect(n).width)) + NOTE_COLUMN_GAP;

  /**
   * Stapelt Kommentare untereinander ab `startY`; liefert die Unterkante.
   * @param {typeof items} group
   * @param {number} startY
   */
  const stack = (group, startY) => {
    let cursor = startY;
    group.forEach(({ note, step }) => {
      const y = Math.max(rect(step).y, cursor);
      note.position = { x: Math.round(columnX), y: Math.round(y) };
      cursor = y + rect(note).height + NOTE_SPACING;
    });
    return cursor;
  };

  if (lanes.length === 0) {
    stack(items, -Infinity);
  } else {
    // Lane je Schritt vor dem Verschieben bestimmen
    const laneOfStep = new Map(items.map(({ step }) => {
      const cy = rect(step).y + rect(step).height / 2;
      return [step.id, lanes.find((lane) => cy >= rect(lane).y && cy <= rect(lane).y + rect(lane).height) || lanes[lanes.length - 1]];
    }));
    lanes.forEach((lane) => {
      const group = items.filter(({ step }) => laneOfStep.get(step.id) === lane);
      if (group.length === 0) return;
      const bottom = stack(group, rect(lane).y + LANE_HEADER + 10);
      const laneBottom = rect(lane).y + rect(lane).height;
      const missing = bottom + 10 - laneBottom;
      if (missing <= 0) return;
      // Lane vergrößern und alles darunter nach unten schieben
      lane.size = { width: rect(lane).width, height: rect(lane).height + missing };
      diagram.nodes.forEach((node) => {
        if (node !== lane && rect(node).y >= laneBottom) node.position = { x: rect(node).x, y: rect(node).y + missing };
      });
    });
    const right = Math.max(...items.map(({ note }) => rect(note).x + rect(note).width)) + 40;
    lanes.forEach((lane) => {
      lane.size = { width: Math.max(rect(lane).width, right - rect(lane).x), height: rect(lane).height };
    });
  }

  items.forEach(({ edge, note, step }) => {
    const ports = choosePorts(rect(note), rect(step), { direction });
    edge.sourcePort = ports.sourcePort;
    edge.targetPort = ports.targetPort;
  });
}
