// @ts-check
// Erzeugt aus einem Diagramm eine textliche Prozessbeschreibung (Verfahrensanweisung).
// Reine Logik ohne DOM – die Ausgabe als Markdown steht hier, die Word-Ausgabe in process-export.js.

/** @typedef {import('../diagram/types').DiagramData} DiagramData */
/** @typedef {import('../diagram/types').DiagramNode} DiagramNode */
/** @typedef {import('../diagram/types').DiagramEdge} DiagramEdge */

/**
 * @typedef {Object} Transition
 * @property {string} label            Beschriftung der Verbindung (z. B. „Ja“)
 * @property {number} targetNumber
 * @property {string} targetLabel
 * @property {'next' | 'jump' | 'back'} kind  next = direkt folgender Schritt, back = Rücksprung
 */

/**
 * @typedef {Object} ProcessStep
 * @property {number} number
 * @property {string} id
 * @property {string} type
 * @property {string} typeLabel
 * @property {string} label
 * @property {string | null} role       Zuständigkeit aus der Swimlane
 * @property {string[]} notes           Angebundene Kommentare
 * @property {Transition[]} transitions
 * @property {boolean} unreachable      Vom Start aus nicht erreichbar
 */

/**
 * @typedef {Object} ProcessDescription
 * @property {ProcessStep[]} steps
 * @property {{ name: string, steps: number[] }[]} roles
 * @property {string[]} generalNotes    Nicht angebundene Kommentare
 * @property {string[]} warnings
 */

export const TYPE_LABELS = /** @type {Record<string, string>} */ ({
  start: 'Start',
  end: 'Ende',
  process: 'Schritt',
  decision: 'Entscheidung',
  annotation: 'Kommentar',
  lane: 'Swimlane'
});

const YES = /^(ja|yes)$/i;
const NO = /^(nein|no)$/i;
const UNLABELED = '(ohne Beschriftung)';

/** @param {DiagramNode} node */
const rectOf = (node) => ({
  x: node.position?.x ?? 0,
  y: node.position?.y ?? 0,
  width: node.size?.width ?? 160,
  height: node.size?.height ?? 60
});

/** @param {DiagramNode} a @param {DiagramNode} b */
const byPosition = (a, b) => (rectOf(a).y - rectOf(b).y) || (rectOf(a).x - rectOf(b).x);

/** @param {string | undefined} text */
const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();

/**
 * @param {DiagramData | null | undefined} diagram
 * @returns {ProcessDescription}
 */
export function buildProcessDescription(diagram) {
  const nodes = diagram?.nodes || [];
  const edges = diagram?.edges || [];
  const lanes = nodes.filter((n) => n.type === 'lane');
  const annotations = nodes.filter((n) => n.type === 'annotation');
  const flow = nodes.filter((n) => n.type !== 'lane' && n.type !== 'annotation');
  const nodeById = new Map(flow.map((n) => [n.id, n]));
  const annotationById = new Map(annotations.map((n) => [n.id, n]));
  /** @type {string[]} */
  const warnings = [];

  // Zuständigkeit: kleinste Lane, die den Mittelpunkt des Knotens enthält
  /** @param {DiagramNode} node */
  const roleOf = (node) => {
    const r = rectOf(node);
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const containing = lanes
      .map((lane) => ({ lane, rect: rectOf(lane) }))
      .filter(({ rect }) => cx >= rect.x && cx <= rect.x + rect.width && cy >= rect.y && cy <= rect.y + rect.height)
      .sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height);
    return containing.length ? clean(containing[0].lane.label) || 'Swimlane' : null;
  };

  // Kommentare, die per Verbindung an einem Schritt hängen
  /** @type {Map<string, string[]>} */
  const notesByNode = new Map();
  const attachedAnnotations = new Set();
  edges.forEach((edge) => {
    const pairs = [[edge.from, edge.to], [edge.to, edge.from]];
    pairs.forEach(([annotationId, nodeId]) => {
      const annotation = annotationById.get(annotationId);
      if (annotation && nodeById.has(nodeId) && clean(annotation.label)) {
        notesByNode.set(nodeId, [...(notesByNode.get(nodeId) || []), clean(annotation.label)]);
        attachedAnnotations.add(annotationId);
      }
    });
  });

  /** @type {Map<string, DiagramEdge[]>} */
  const outgoing = new Map(flow.map((n) => [n.id, []]));
  /** @type {Map<string, number>} */
  const incomingCount = new Map(flow.map((n) => [n.id, 0]));
  edges.forEach((edge) => {
    if (nodeById.has(edge.from) && nodeById.has(edge.to)) {
      outgoing.get(edge.from)?.push(edge);
      incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
    }
  });

  // Reihenfolge der Ausgänge: bei Entscheidungen „Ja“ vor „Nein“, sonst nach Lage des Ziels
  /** @param {DiagramEdge} edge */
  const branchRank = (edge) => (YES.test(clean(edge.label)) ? 0 : NO.test(clean(edge.label)) ? 1 : 2);
  /** @param {DiagramNode} node */
  const sortedOutgoing = (node) => [...(outgoing.get(node.id) || [])].sort((a, b) => {
    if (node.type === 'decision') {
      const rank = branchRank(a) - branchRank(b);
      if (rank !== 0) return rank;
    }
    const ta = nodeById.get(a.to);
    const tb = nodeById.get(b.to);
    return ta && tb ? byPosition(ta, tb) : 0;
  });

  let starts = flow.filter((n) => n.type === 'start').sort(byPosition);
  if (starts.length === 0 && flow.length > 0) {
    warnings.push('Das Diagramm hat keinen Startknoten. Die Beschreibung beginnt bei den Elementen ohne Vorgänger.');
    starts = flow.filter((n) => (incomingCount.get(n.id) || 0) === 0).sort(byPosition);
    if (starts.length === 0) starts = [[...flow].sort(byPosition)[0]];
  }

  // Nummerierung per Tiefensuche: erst ein Zweig bis zum Ende, dann der nächste
  /** @type {Map<string, number>} */
  const numbers = new Map();
  /** @type {string[]} */
  const order = [];
  const unreachable = new Set();
  /** @param {string} id @param {boolean} isUnreachable */
  const visit = (id, isUnreachable) => {
    if (numbers.has(id)) return;
    const node = nodeById.get(id);
    if (!node) return;
    order.push(id);
    numbers.set(id, order.length);
    if (isUnreachable) unreachable.add(id);
    sortedOutgoing(node).forEach((edge) => visit(edge.to, isUnreachable));
  };

  starts.forEach((node) => visit(node.id, false));
  const rest = flow.filter((n) => !numbers.has(n.id)).sort(byPosition);
  rest.forEach((node) => visit(node.id, true));
  if (unreachable.size > 0) {
    warnings.push(`${unreachable.size === 1 ? 'Ein Schritt ist' : `${unreachable.size} Schritte sind`} vom Start aus nicht erreichbar und am Ende aufgeführt.`);
  }

  /** @type {ProcessStep[]} */
  const steps = order.map((id) => {
    const node = /** @type {DiagramNode} */ (nodeById.get(id));
    const number = /** @type {number} */ (numbers.get(id));
    return {
      number,
      id,
      type: node.type,
      typeLabel: TYPE_LABELS[node.type] || 'Schritt',
      label: clean(node.label) || UNLABELED,
      role: roleOf(node),
      notes: notesByNode.get(id) || [],
      unreachable: unreachable.has(id),
      transitions: sortedOutgoing(node).map((edge) => {
        const targetNumber = /** @type {number} */ (numbers.get(edge.to));
        const target = nodeById.get(edge.to);
        return {
          label: clean(edge.label),
          targetNumber,
          targetLabel: clean(target?.label) || UNLABELED,
          kind: targetNumber === number + 1 ? 'next' : targetNumber <= number ? 'back' : 'jump'
        };
      })
    };
  });

  /** @type {Map<string, number[]>} */
  const roleMap = new Map();
  steps.forEach((step) => {
    if (step.role) roleMap.set(step.role, [...(roleMap.get(step.role) || []), step.number]);
  });

  return {
    steps,
    roles: [...roleMap.entries()].map(([name, roleSteps]) => ({ name, steps: roleSteps })),
    generalNotes: annotations
      .filter((a) => !attachedAnnotations.has(a.id) && clean(a.label))
      .sort(byPosition)
      .map((a) => clean(a.label)),
    warnings
  };
}

/**
 * Formuliert die Übergänge eines Schritts als Sätze.
 * @param {ProcessStep} step
 * @returns {string[]}
 */
export function describeTransitions(step) {
  /** @param {Transition} t */
  const target = (t) => `${t.kind === 'back' ? 'zurück zu' : 'weiter mit'} Schritt ${t.targetNumber} („${t.targetLabel}“)`;

  if (step.transitions.length === 0) {
    return [step.type === 'end' ? 'Ende des Prozesses.' : 'Der Ablauf endet hier (kein Folgeschritt festgelegt).'];
  }

  if (step.type === 'decision') {
    return step.transitions.map((t) => `Wenn „${t.label || UNLABELED}“: ${target(t)}.`);
  }

  if (step.transitions.length === 1) {
    const [t] = step.transitions;
    if (t.kind === 'next' && !t.label) return [];
    const sentence = `${target(t)}.`;
    return [t.label ? `${t.label}: ${sentence}` : sentence.charAt(0).toUpperCase() + sentence.slice(1)];
  }

  return step.transitions.map((t) => {
    const sentence = `${target(t)}.`;
    return t.label ? `${t.label}: ${sentence}` : sentence.charAt(0).toUpperCase() + sentence.slice(1);
  });
}

/** @param {Date} date */
export const formatDate = (date) => date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** @param {string} text */
const escapeMarkdown = (text) => text.replace(/([\\`*_[\]<>|#])/g, '\\$1');

/**
 * @param {ProcessDescription} description
 * @param {{ title: string, date?: Date }} options
 * @returns {string}
 */
export function toMarkdown(description, { title, date = new Date() }) {
  const lines = [
    `# ${escapeMarkdown(title || 'Prozessbeschreibung')}`,
    '',
    `Prozessbeschreibung · erstellt am ${formatDate(date)} mit dem vhs Workflow Editor`,
    ''
  ];

  description.warnings.forEach((warning) => lines.push(`> **Hinweis:** ${escapeMarkdown(warning)}`, ''));

  lines.push('## Ablauf', '');
  if (description.steps.length === 0) {
    lines.push('Das Diagramm enthält noch keine Schritte.', '');
  }
  description.steps.forEach((step, index) => {
    const previous = description.steps[index - 1];
    if (step.unreachable && !previous?.unreachable) {
      lines.push('### Nicht mit dem Ablauf verbundene Schritte', '');
    }
    lines.push(`**${step.number}. ${escapeMarkdown(step.label)}**  `);
    lines.push(`*${step.typeLabel}${step.role ? ` · Zuständig: ${escapeMarkdown(step.role)}` : ''}*`, '');
    describeTransitions(step).forEach((sentence) => lines.push(`- ${escapeMarkdown(sentence)}`));
    step.notes.forEach((note) => lines.push(`- Hinweis: ${escapeMarkdown(note)}`));
    lines.push('');
  });

  if (description.roles.length > 0) {
    lines.push('## Zuständigkeiten', '', '| Rolle | Schritte |', '|---|---|');
    description.roles.forEach((role) => lines.push(`| ${escapeMarkdown(role.name)} | ${role.steps.join(', ')} |`));
    lines.push('');
  }

  if (description.generalNotes.length > 0) {
    lines.push('## Weitere Hinweise', '');
    description.generalNotes.forEach((note) => lines.push(`- ${escapeMarkdown(note)}`));
    lines.push('');
  }

  return lines.join('\n');
}
