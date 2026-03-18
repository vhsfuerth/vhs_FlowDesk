const AUTOMATED_SCORE_FIELDS = [
  'clarity',
  'mediaBreaks',
  'risk',
  'participantFocus',
  'ownership'
];

export const DEFAULT_REVIEW_SCORES = {
  clarity: 2,
  mediaBreaks: 2,
  risk: 2,
  participantFocus: 2,
  ownership: 2
};

export const REVIEW_SCORE_LABELS = {
  clarity: 'Klarheit',
  mediaBreaks: 'Medienbruch',
  risk: 'Risiko',
  participantFocus: 'Teilnehmendenorientierung',
  ownership: 'Verantwortlichkeit'
};

export const REVIEW_SCORE_GUIDES = {
  clarity:          'Würde eine außenstehende Person den Ablauf sofort verstehen?',
  mediaBreaks:      'Wie viele Übergänge zwischen digital und analog gibt es im Prozess?',
  risk:             'Gibt es Schritte, bei denen häufig Fehler oder Verzögerungen auftreten?',
  participantFocus: 'Ist die Perspektive der Teilnehmenden in allen Schritten sichtbar?',
  ownership:        'Ist für jeden Schritt klar, wer die Aufgabe übernimmt?'
};

const createFinding = (severity, code, message, nodeId = null) => ({
  severity,
  code,
  message,
  nodeId
});

const DEFAULT_REVIEW_NOTES = {
  clarity: '',
  mediaBreaks: '',
  risk: '',
  participantFocus: '',
  ownership: ''
};

export const getDefaultMetadata = () => ({
  templateId: null,
  improvementItems: [],
  reviewScores: { ...DEFAULT_REVIEW_SCORES },
  reviewNotes: { ...DEFAULT_REVIEW_NOTES }
});

export const normalizeMetadata = (metadata = {}) => ({
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
});

export const getReviewScoreSummary = (reviewScores = DEFAULT_REVIEW_SCORES) => {
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

export const validateDiagram = (diagram, improvementItems = []) => {
  const allNodes = Array.isArray(diagram?.nodes) ? diagram.nodes : [];
  // Lanes are background containers – exclude from all structural validation
  const nodes = allNodes.filter(n => n.type !== 'lane');
  const edges = Array.isArray(diagram?.edges) ? diagram.edges : [];

  const findings = [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));

  edges.forEach((edge) => {
    if (incoming.has(edge.to)) incoming.get(edge.to).push(edge);
    if (outgoing.has(edge.from)) outgoing.get(edge.from).push(edge);
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
      findings.push(createFinding('error', 'empty_label', `Ein Knoten vom Typ „${node.type}” hat keinen Text. Bitte Label vergeben.`, node.id));
    }

    if (node.type !== 'annotation' && nodeIncoming.length === 0 && nodeOutgoing.length === 0) {
      findings.push(createFinding('warning', 'isolated_node', `„${node.label || 'Unbenannter Knoten'}” ist nicht verbunden.`, node.id));
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

    if (node.type !== 'end' && node.type !== 'annotation' && nodeOutgoing.length === 0) {
      findings.push(createFinding('warning', 'dead_end', `„${node.label || 'Unbenannter Knoten'}“ endet ohne klaren Abschluss.`, node.id));
    }

    if (node.type === 'annotation' && nodeIncoming.length === 0 && nodeOutgoing.length === 0) {
      findings.push(createFinding('info', 'orphan_annotation', `Die Annotation „${node.label || 'Kommentar'}“ ist noch nicht angebunden.`, node.id));
    }
  });

  const decisionNodes = nodes.filter(n => n.type === 'decision');
  const processNodes = nodes.filter(n => n.type !== 'annotation' && n.type !== 'start' && n.type !== 'end');
  if (processNodes.length >= 3 && decisionNodes.length / processNodes.length > 0.4) {
    findings.push(createFinding('warning', 'high_decision_ratio',
      `${decisionNodes.length} von ${processNodes.length} Prozessschritten sind Entscheidungen – der Prozess könnte zu komplex sein.`));
  }

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

  const counts = findings.reduce((acc, finding) => {
    acc[finding.severity] += 1;
    return acc;
  }, { error: 0, warning: 0, info: 0 });

  return {
    findings,
    counts,
    isValid: counts.error === 0
  };
};
