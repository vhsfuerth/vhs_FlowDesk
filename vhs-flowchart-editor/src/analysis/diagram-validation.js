// @ts-check
// Strukturprüfung (Prozess-Check) und Qualitätsbewertung von Diagrammen.

/** @typedef {import('../diagram/types').DiagramData} DiagramData */
/** @typedef {import('../diagram/types').DiagramNode} DiagramNode */
/** @typedef {import('../diagram/types').DiagramEdge} DiagramEdge */
import { NODE_TYPE_LABELS } from '../diagram/types';

/** @typedef {'clarity' | 'mediaBreaks' | 'risk' | 'participantFocus' | 'ownership'} ReviewScoreField */
/** @typedef {Record<ReviewScoreField, number>} ReviewScores */
/** @typedef {Record<ReviewScoreField, string>} ReviewNotes */
/** @typedef {'error' | 'warning' | 'info'} FindingSeverity */

/**
 * @typedef {Object} Finding
 * @property {FindingSeverity} severity
 * @property {string} code
 * @property {string} message
 * @property {string | null} nodeId
 */

/**
 * @typedef {Object} ValidationResult
 * @property {Finding[]} findings
 * @property {Record<FindingSeverity, number>} counts
 * @property {boolean} isValid
 */

/**
 * Metadaten eines Diagramms (Qualitätsbewertung, Maßnahmen, Vorlage).
 * Weitere Felder werden unverändert durchgereicht.
 * @typedef {{
 *   templateId: string | null,
 *   improvementItems: any[],
 *   reviewScores: ReviewScores,
 *   reviewNotes: ReviewNotes,
 *   [key: string]: any
 * }} DiagramMetadata
 */

/** @type {ReviewScoreField[]} */
const AUTOMATED_SCORE_FIELDS = [
  'clarity',
  'mediaBreaks',
  'risk',
  'participantFocus',
  'ownership'
];

/** @type {Readonly<ReviewScores>} */
export const DEFAULT_REVIEW_SCORES = {
  clarity: 2,
  mediaBreaks: 2,
  risk: 2,
  participantFocus: 2,
  ownership: 2
};

/** @type {Readonly<Record<ReviewScoreField, string>>} */
export const REVIEW_SCORE_LABELS = {
  clarity: 'Klarheit',
  mediaBreaks: 'Medienbruch',
  risk: 'Risiko',
  participantFocus: 'Teilnehmendenorientierung',
  ownership: 'Verantwortlichkeit'
};

/** @type {Readonly<Record<ReviewScoreField, string>>} */
export const REVIEW_SCORE_GUIDES = {
  clarity:          'Würde eine außenstehende Person den Ablauf sofort verstehen?',
  mediaBreaks:      'Wie viele Übergänge zwischen digital und analog gibt es im Prozess?',
  risk:             'Gibt es Schritte, bei denen häufig Fehler oder Verzögerungen auftreten?',
  participantFocus: 'Ist die Perspektive der Teilnehmenden in allen Schritten sichtbar?',
  ownership:        'Ist für jeden Schritt klar, wer die Aufgabe übernimmt?'
};

// Deutsche Bezeichnungen der Knotentypen für Meldungen

/**
 * @param {FindingSeverity} severity
 * @param {string} code
 * @param {string} message
 * @param {string | null} [nodeId]
 * @returns {Finding}
 */
const createFinding = (severity, code, message, nodeId = null) => ({
  severity,
  code,
  message,
  nodeId
});

/** @type {Readonly<ReviewNotes>} */
const DEFAULT_REVIEW_NOTES = {
  clarity: '',
  mediaBreaks: '',
  risk: '',
  participantFocus: '',
  ownership: ''
};

/** @returns {DiagramMetadata} */
export const getDefaultMetadata = () => ({
  templateId: null,
  improvementItems: [],
  reviewScores: { ...DEFAULT_REVIEW_SCORES },
  reviewNotes: { ...DEFAULT_REVIEW_NOTES }
});

/**
 * Ergänzt fehlende Felder mit Standardwerten; unbekannte Felder bleiben erhalten.
 * @param {Record<string, any> | null | undefined} [input]
 * @returns {DiagramMetadata}
 */
export const normalizeMetadata = (input = {}) => {
  const metadata = input || {};
  return {
    ...getDefaultMetadata(),
    ...metadata,
    improvementItems: Array.isArray(metadata.improvementItems) ? metadata.improvementItems : [],
    reviewScores: {
      ...DEFAULT_REVIEW_SCORES,
      ...(metadata.reviewScores || {})
    },
    reviewNotes: {
      ...DEFAULT_REVIEW_NOTES,
      ...(metadata.reviewNotes || {})
    }
  };
};

/**
 * @param {Partial<ReviewScores>} [reviewScores]
 * @returns {{ average: number, hotspots: ReviewScoreField[] }}
 */
export const getReviewScoreSummary = (reviewScores = DEFAULT_REVIEW_SCORES) => {
  /** @type {ReviewScores} */
  const normalized = {
    ...DEFAULT_REVIEW_SCORES,
    ...reviewScores
  };
  const values = AUTOMATED_SCORE_FIELDS.map((field) => Number(normalized[field] ?? 0));
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    average: avg,
    hotspots: AUTOMATED_SCORE_FIELDS.filter((field) => Number(normalized[field] ?? 0) <= 1)
  };
};

/** @param {DiagramNode} node */
const nameOf = (node) => node.label?.trim() || 'Unbenannter Knoten';

/** @param {string | undefined} label */
const normalizeLabel = (label) => (label || '').trim().toLocaleLowerCase('de');

/**
 * Ablaufprüfungen: Erreichbarkeit vom Start, Schleifen ohne Weg zum Ende,
 * Verbindungen aus einem Ende heraus, doppelte Ausgänge von Entscheidungen.
 * Kommentare und ihre Verbindungen gehören nicht zum Ablauf.
 * @param {DiagramNode[]} nodes  ohne Lanes
 * @param {DiagramEdge[]} edges
 * @param {Map<string, DiagramNode>} nodeMap
 * @param {DiagramNode[]} startNodes
 * @param {DiagramNode[]} endNodes
 * @returns {Finding[]}
 */
const checkFlow = (nodes, edges, nodeMap, startNodes, endNodes) => {
  /** @type {Finding[]} */
  const findings = [];
  const isFlowNode = (/** @type {string} */ id) => {
    const node = nodeMap.get(id);
    return Boolean(node) && node?.type !== 'annotation';
  };
  const flowEdges = edges.filter((edge) => isFlowNode(edge.from) && isFlowNode(edge.to));
  const flowNodes = nodes.filter((node) => node.type !== 'annotation');

  /** @type {Map<string, string[]>} */
  const next = new Map(flowNodes.map((node) => [node.id, []]));
  /** @type {Map<string, string[]>} */
  const previous = new Map(flowNodes.map((node) => [node.id, []]));
  flowEdges.forEach((edge) => {
    next.get(edge.from)?.push(edge.to);
    previous.get(edge.to)?.push(edge.from);
  });

  /**
   * @param {string[]} startIds
   * @param {Map<string, string[]>} graph
   */
  const reachable = (startIds, graph) => {
    const seen = new Set(startIds);
    const queue = [...startIds];
    while (queue.length) {
      const id = /** @type {string} */ (queue.shift());
      (graph.get(id) || []).forEach((target) => {
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      });
    }
    return seen;
  };

  const connected = (/** @type {DiagramNode} */ node) =>
    (next.get(node.id)?.length || 0) + (previous.get(node.id)?.length || 0) > 0;

  // Vom Start aus nicht erreichbar (isolierte Knoten meldet bereits „nicht verbunden“)
  if (startNodes.length > 0) {
    const fromStart = reachable(startNodes.map((n) => n.id), next);
    flowNodes
      .filter((node) => !fromStart.has(node.id) && connected(node))
      .forEach((node) => {
        findings.push(createFinding('warning', 'unreachable_node', `„${nameOf(node)}“ ist vom Start aus nicht erreichbar.`, node.id));
      });

    // Schleifen ohne Weg zum Ende: erreichbar, hat Ausgänge, kommt aber nie an einem Ende an
    if (endNodes.length > 0) {
      const toEnd = reachable(endNodes.map((n) => n.id), previous);
      const trapped = flowNodes.filter((node) =>
        fromStart.has(node.id) && !toEnd.has(node.id) && (next.get(node.id)?.length || 0) > 0);
      if (trapped.length > 0) {
        const names = trapped.slice(0, 3).map((node) => `„${nameOf(node)}“`).join(', ');
        const more = trapped.length > 3 ? ` und ${trapped.length - 3} weitere` : '';
        findings.push(createFinding('warning', 'endless_loop',
          `${names}${more} ${trapped.length === 1 ? 'führt' : 'führen'} in eine Schleife ohne Weg zu einem Ende.`, trapped[0].id));
      }
    }
  }

  endNodes.forEach((node) => {
    if ((next.get(node.id)?.length || 0) > 0) {
      findings.push(createFinding('warning', 'end_has_outgoing', `Vom Ende „${nameOf(node)}“ geht eine Verbindung weiter. Ein Ende sollte keinen Ausgang haben.`, node.id));
    }
  });

  nodes.filter((node) => node.type === 'decision').forEach((node) => {
    const labels = flowEdges.filter((edge) => edge.from === node.id).map((edge) => normalizeLabel(edge.label)).filter(Boolean);
    const duplicates = [...new Set(labels.filter((label, index) => labels.indexOf(label) !== index))];
    if (duplicates.length > 0) {
      findings.push(createFinding('warning', 'decision_label_duplicate',
        `Die Entscheidung „${nameOf(node)}“ hat mehrere Ausgänge mit derselben Beschriftung („${duplicates.join('“, „')}“).`, node.id));
    }
  });

  return findings;
};

/**
 * Werden Swimlanes verwendet, sollte jeder Ablaufschritt in einer Lane liegen.
 * Maßgeblich ist der Mittelpunkt des Knotens (wie bei der automatischen Anordnung).
 * @param {DiagramNode[]} nodes  ohne Lanes
 * @param {DiagramNode[]} lanes
 * @returns {Finding[]}
 */
const checkLanes = (nodes, lanes) => {
  const laneRects = lanes
    .filter((lane) => lane.position && lane.size)
    .map((lane) => ({ ...(/** @type {{x: number, y: number}} */ (lane.position)), ...(/** @type {{width: number, height: number}} */ (lane.size)) }));
  if (laneRects.length === 0) return [];

  /** @type {Finding[]} */
  const findings = [];
  nodes
    .filter((node) => node.type !== 'annotation' && node.position)
    .forEach((node) => {
      const position = /** @type {{x: number, y: number}} */ (node.position);
      const cx = position.x + (node.size?.width || 0) / 2;
      const cy = position.y + (node.size?.height || 0) / 2;
      const inside = (node.laneId && lanes.some((lane) => lane.id === node.laneId))
        || laneRects.some((r) => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height);
      if (!inside) {
        findings.push(createFinding('warning', 'outside_lane', `„${nameOf(node)}“ liegt in keiner Swimlane.`, node.id));
      }
    });
  return findings;
};

// Dokumente und IT-Systeme dürfen als angehängte Ablage enden (Schritt → Ablage ohne Ausgang)
const STORAGE_TYPES = ['document', 'system'];

/**
 * Prüft die neuen Elementtypen (Teilprozess, Warten/Frist).
 * @param {DiagramNode[]} nodes
 * @param {{ diagramIds?: string[] | null, currentDiagramId?: string | null }} context
 * @returns {Finding[]}
 */
const checkElementTypes = (nodes, { diagramIds = null, currentDiagramId = null }) => {
  /** @type {Finding[]} */
  const findings = [];
  nodes.forEach((node) => {
    if (node.type === 'subprocess') {
      if (!node.subprocessId) {
        findings.push(createFinding('info', 'subprocess_unlinked', `Der Teilprozess „${nameOf(node)}“ ist mit keinem Diagramm verknüpft (Eigenschaften-Leiste).`, node.id));
      } else if (currentDiagramId && node.subprocessId === currentDiagramId) {
        findings.push(createFinding('warning', 'subprocess_self', `Der Teilprozess „${nameOf(node)}“ verweist auf dieses Diagramm selbst.`, node.id));
      } else if (diagramIds && !diagramIds.includes(node.subprocessId)) {
        findings.push(createFinding('warning', 'subprocess_missing', `Das verknüpfte Diagramm von „${nameOf(node)}“ gibt es nicht mehr. Bitte die Verknüpfung prüfen.`, node.id));
      }
    }
    if (node.type === 'wait' && !node.duration?.trim()) {
      findings.push(createFinding('info', 'wait_without_duration', `Für „${nameOf(node)}“ ist keine Dauer oder Frist angegeben.`, node.id));
    }
  });
  return findings;
};

/**
 * Prüft die Diagrammstruktur (Start/Ende, Verbindungen, Entscheidungen, Komplexität).
 * Swimlanes werden ignoriert.
 * @param {Partial<DiagramData> | null | undefined} diagram
 * @param {any[]} [improvementItems]
 * @param {{ diagramIds?: string[] | null, currentDiagramId?: string | null }} [context]  gespeicherte Diagramme (für Teilprozesse)
 * @returns {ValidationResult}
 */
export const validateDiagram = (diagram, improvementItems = [], context = {}) => {
  const allNodes = Array.isArray(diagram?.nodes) ? diagram.nodes : [];
  // Lanes are background containers – exclude from all structural validation
  const nodes = allNodes.filter(n => n.type !== 'lane');
  const edges = Array.isArray(diagram?.edges) ? diagram.edges : [];

  /** @type {Finding[]} */
  const findings = [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  /** @type {Map<string, DiagramEdge[]>} */
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  /** @type {Map<string, DiagramEdge[]>} */
  const outgoing = new Map(nodes.map((node) => [node.id, []]));

  edges.forEach((edge) => {
    incoming.get(edge.to)?.push(edge);
    outgoing.get(edge.from)?.push(edge);
  });

  const startNodes = nodes.filter((node) => node.type === 'start');
  const endNodes = nodes.filter((node) => node.type === 'end');

  if (startNodes.length === 0) {
    findings.push(createFinding('error', 'missing_start', 'Es fehlt ein Startknoten.'));
  }
  if (startNodes.length > 1) {
    findings.push(createFinding('error', 'multiple_starts', 'Es gibt mehrere Startknoten. Für Workshop- und Exportnutzung sollte genau einer vorhanden sein.'));
  }
  if (endNodes.length === 0) {
    findings.push(createFinding('error', 'missing_end', 'Es fehlt mindestens ein Endknoten.'));
  }

  nodes.forEach((node) => {
    const nodeIncoming = incoming.get(node.id) || [];
    const nodeOutgoing = outgoing.get(node.id) || [];

    if (node.type !== 'annotation' && (!node.label || !node.label.trim())) {
      findings.push(createFinding('error', 'empty_label', `Ein Element vom Typ „${NODE_TYPE_LABELS[node.type] || node.type}“ hat keinen Text. Bitte Text vergeben.`, node.id));
    }

    if (node.type !== 'annotation' && nodeIncoming.length === 0 && nodeOutgoing.length === 0) {
      findings.push(createFinding('warning', 'isolated_node', `„${node.label || 'Unbenannter Knoten'}“ ist nicht verbunden.`, node.id));
    }

    if (node.type === 'decision') {
      if (nodeOutgoing.length < 2) {
        findings.push(createFinding('error', 'decision_branch_count', `Die Entscheidung „${node.label || 'Unbenannte Entscheidung'}“ hat weniger als zwei Ausgänge.`, node.id));
      }
      nodeOutgoing.forEach((edge) => {
        if (!edge.label || !edge.label.trim()) {
          findings.push(createFinding('warning', 'decision_label_missing', `Ein Ausgang von „${node.label || 'Unbenannte Entscheidung'}“ ist nicht beschriftet.`, node.id));
        }
      });
    }

    const isStorageSink = STORAGE_TYPES.includes(node.type) && nodeIncoming.length > 0;
    if (node.type !== 'end' && node.type !== 'annotation' && !isStorageSink && nodeOutgoing.length === 0) {
      findings.push(createFinding('warning', 'dead_end', `„${node.label || 'Unbenannter Knoten'}“ endet ohne klaren Abschluss.`, node.id));
    }

    if (node.type === 'annotation' && nodeIncoming.length === 0 && nodeOutgoing.length === 0) {
      findings.push(createFinding('info', 'orphan_annotation', `Die Annotation „${node.label || 'Kommentar'}“ ist noch nicht angebunden.`, node.id));
    }
  });

  findings.push(...checkFlow(nodes, edges, nodeMap, startNodes, endNodes));
  findings.push(...checkElementTypes(nodes, context));
  findings.push(...checkLanes(nodes, allNodes.filter((n) => n.type === 'lane')));

  const decisionNodes = nodes.filter(n => n.type === 'decision');
  const processNodes = nodes.filter(n => n.type !== 'annotation' && n.type !== 'start' && n.type !== 'end');
  if (processNodes.length >= 3 && decisionNodes.length / processNodes.length > 0.4) {
    findings.push(createFinding('warning', 'high_decision_ratio',
      `${decisionNodes.length} von ${processNodes.length} Prozessschritten sind Entscheidungen – der Prozess könnte zu komplex sein.`));
  }

  /**
   * Länge der linearen Kette (je genau ein Ein- und Ausgang) ab einem Knoten.
   * @param {string} startNodeId
   * @param {Set<string>} [visited]
   * @returns {number}
   */
  const getChainLength = (startNodeId, visited = new Set()) => {
    if (visited.has(startNodeId)) return 0;
    visited.add(startNodeId);
    const outs = outgoing.get(startNodeId) || [];
    if (outs.length !== 1) return 0;
    const nextId = outs[0].to;
    const next = nodeMap.get(nextId);
    if (!next || next.type === 'annotation' || next.type === 'decision') return 0;
    const nextIns = incoming.get(nextId) || [];
    if (nextIns.length !== 1) return 0;
    return 1 + getChainLength(nextId, visited);
  };

  const maxChain = nodes
    .filter(n => n.type !== 'annotation' && n.type !== 'decision')
    .reduce((max, n) => {
      const ins = incoming.get(n.id) || [];
      if (ins.length !== 1) return Math.max(max, getChainLength(n.id, new Set()));
      return max;
    }, 0);

  if (maxChain >= 5) {
    findings.push(createFinding('info', 'long_linear_chain',
      `Der Prozess enthält eine lineare Kette von ${maxChain} aufeinanderfolgenden Schritten. Prüfen Sie, ob Teilprozesse gebündelt werden können.`));
  }

  const annotationNodes = nodes.filter(n => n.type === 'annotation');
  if (annotationNodes.length > 0 && improvementItems.length === 0) {
    findings.push(createFinding('info', 'annotations_without_measures',
      `${annotationNodes.length} Kommentare vorhanden, aber keine Maßnahmen erfasst. Kommentare oft als Ausgangspunkt für Maßnahmen nutzen.`));
  }

  /** @type {Record<FindingSeverity, number>} */
  const counts = { error: 0, warning: 0, info: 0 };
  findings.forEach((finding) => {
    counts[finding.severity] += 1;
  });

  return {
    findings,
    counts,
    isValid: counts.error === 0
  };
};
