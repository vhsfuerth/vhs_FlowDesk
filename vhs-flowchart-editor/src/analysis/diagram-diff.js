// @ts-check
// Vergleicht zwei Fassungen eines Diagramms (reine Funktion, verändert keine Daten).

/** @typedef {import('../diagram/types').DiagramData} DiagramData */
/** @typedef {import('../diagram/types').DiagramNode} DiagramNode */
/** @typedef {import('../diagram/types').DiagramEdge} DiagramEdge */

/**
 * @typedef {Object} DiagramDiff
 * @property {{ added: DiagramNode[], removed: DiagramNode[], changed: { before: DiagramNode, after: DiagramNode, changes: string[] }[], moved: DiagramNode[] }} nodes
 * @property {{ added: DiagramEdge[], removed: DiagramEdge[], changed: { before: DiagramEdge, after: DiagramEdge, changes: string[] }[] }} edges
 * @property {{ kind: 'added' | 'removed' | 'changed' | 'moved', text: string, nodeId?: string }[]} summary
 * @property {boolean} isEmpty
 */

const NODE_NOUNS = /** @type {Record<string, string>} */ ({
  start: 'Startpunkt',
  end: 'Endpunkt',
  process: 'Schritt',
  decision: 'Entscheidung',
  annotation: 'Kommentar',
  lane: 'Swimlane'
});

/** @param {string | undefined} text */
const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
/** @param {DiagramNode | undefined} node */
const nameOf = (node) => (node ? `„${clean(node.label) || 'ohne Beschriftung'}“` : '„?“');
/** @param {DiagramNode} node */
const nounOf = (node) => NODE_NOUNS[node.type] || 'Element';

/** @param {DiagramEdge} edge */
const edgeKey = (edge) => edge.id || `${edge.from}->${edge.to}`;

/**
 * @param {DiagramData | null | undefined} before
 * @param {DiagramData | null | undefined} after
 * @returns {DiagramDiff}
 */
export function diffDiagrams(before, after) {
  const beforeNodes = new Map((before?.nodes || []).map((n) => [n.id, n]));
  const afterNodes = new Map((after?.nodes || []).map((n) => [n.id, n]));
  const beforeEdges = new Map((before?.edges || []).map((e) => [edgeKey(e), e]));
  const afterEdges = new Map((after?.edges || []).map((e) => [edgeKey(e), e]));

  /** @type {DiagramDiff} */
  const diff = {
    nodes: { added: [], removed: [], changed: [], moved: [] },
    edges: { added: [], removed: [], changed: [] },
    summary: [],
    isEmpty: true
  };

  afterNodes.forEach((node, id) => {
    const old = beforeNodes.get(id);
    if (!old) {
      diff.nodes.added.push(node);
      return;
    }
    const changes = [];
    if (clean(old.label) !== clean(node.label)) changes.push('label');
    if (old.type !== node.type) changes.push('type');
    if (JSON.stringify(old.laneColor || null) !== JSON.stringify(node.laneColor || null)) changes.push('laneColor');
    if (changes.length) diff.nodes.changed.push({ before: old, after: node, changes });

    const moved = JSON.stringify(old.position || null) !== JSON.stringify(node.position || null)
      || JSON.stringify(old.size || null) !== JSON.stringify(node.size || null);
    if (moved) diff.nodes.moved.push(node);
  });
  beforeNodes.forEach((node, id) => {
    if (!afterNodes.has(id)) diff.nodes.removed.push(node);
  });

  afterEdges.forEach((edge, key) => {
    const old = beforeEdges.get(key);
    if (!old) {
      diff.edges.added.push(edge);
      return;
    }
    const changes = [];
    if (clean(old.label) !== clean(edge.label)) changes.push('label');
    if (old.from !== edge.from) changes.push('from');
    if (old.to !== edge.to) changes.push('to');
    if (changes.length) diff.edges.changed.push({ before: old, after: edge, changes });
  });
  beforeEdges.forEach((edge, key) => {
    if (!afterEdges.has(key)) diff.edges.removed.push(edge);
  });

  // Knotennamen für Verbindungsbeschreibungen: aktuelle Fassung bevorzugt
  /** @param {string} id */
  const nodeName = (id) => nameOf(afterNodes.get(id) || beforeNodes.get(id));
  /** @param {DiagramEdge} edge */
  const edgeName = (edge) => `${nodeName(edge.from)} → ${nodeName(edge.to)}${clean(edge.label) ? ` („${clean(edge.label)}“)` : ''}`;

  diff.nodes.added.forEach((node) => diff.summary.push({ kind: 'added', text: `Neu: ${nounOf(node)} ${nameOf(node)}`, nodeId: node.id }));
  diff.nodes.changed.forEach(({ before: old, after: node, changes }) => {
    const parts = [];
    if (changes.includes('label')) parts.push(`${nounOf(node)} ${nameOf(old)} umbenannt in ${nameOf(node)}`);
    if (changes.includes('type')) parts.push(`${nameOf(node)} ist jetzt ${nounOf(node) === 'Entscheidung' ? 'eine' : 'ein'} ${nounOf(node)} (vorher: ${nounOf(old)})`);
    if (changes.includes('laneColor')) parts.push(`Farbe der Swimlane ${nameOf(node)} geändert`);
    parts.forEach((text) => diff.summary.push({ kind: 'changed', text, nodeId: node.id }));
  });
  diff.nodes.removed.forEach((node) => diff.summary.push({ kind: 'removed', text: `Entfernt: ${nounOf(node)} ${nameOf(node)}`, nodeId: node.id }));

  diff.edges.added.forEach((edge) => diff.summary.push({ kind: 'added', text: `Neue Verbindung ${edgeName(edge)}` }));
  diff.edges.changed.forEach(({ before: old, after: edge, changes }) => {
    if (changes.includes('from') || changes.includes('to')) {
      diff.summary.push({ kind: 'changed', text: `Verbindung umgehängt: ${edgeName(old)} ist jetzt ${edgeName(edge)}` });
    } else {
      diff.summary.push({ kind: 'changed', text: `Beschriftung geändert: ${edgeName(old)} → „${clean(edge.label) || 'ohne Beschriftung'}“` });
    }
  });
  diff.edges.removed.forEach((edge) => diff.summary.push({ kind: 'removed', text: `Verbindung entfernt: ${edgeName(edge)}` }));

  if (diff.nodes.moved.length > 0) {
    const count = diff.nodes.moved.length;
    diff.summary.push({ kind: 'moved', text: `${count} ${count === 1 ? 'Element' : 'Elemente'} verschoben oder in der Größe geändert` });
  }

  diff.isEmpty = diff.summary.length === 0;
  return diff;
}

/**
 * Kombiniert beide Fassungen für die Vergleichsansicht: die neuere Fassung plus
 * entfernte Elemente, jeweils mit Markierung.
 * @param {DiagramData | null | undefined} before
 * @param {DiagramData | null | undefined} after
 * @param {DiagramDiff} diff
 */
export function buildComparisonView(before, after, diff) {
  /** @type {Record<string, 'added' | 'changed' | 'removed'>} */
  const marks = {};
  diff.nodes.added.forEach((n) => { marks[n.id] = 'added'; });
  diff.nodes.changed.forEach(({ after: n }) => { marks[n.id] = 'changed'; });
  diff.nodes.removed.forEach((n) => { marks[n.id] = 'removed'; });

  const nodes = [...(after?.nodes || []), ...diff.nodes.removed];
  const nodeIds = new Set(nodes.map((n) => n.id));

  /** @type {Record<string, 'added' | 'changed' | 'removed'>} */
  const edgeMarks = {};
  const edges = [...(after?.edges || []), ...diff.edges.removed]
    .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
    .map((e, index) => ({ ...e, id: e.id || `vergleich-${index}` }));
  diff.edges.added.forEach((e) => { edgeMarks[e.id || ''] = 'added'; });
  diff.edges.changed.forEach(({ after: e }) => { edgeMarks[e.id || ''] = 'changed'; });
  diff.edges.removed.forEach((e) => { edgeMarks[e.id || ''] = 'removed'; });

  return { diagram: { nodes, edges }, marks, edgeMarks };
}
