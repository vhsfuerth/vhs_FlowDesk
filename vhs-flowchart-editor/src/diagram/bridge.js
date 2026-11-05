// @ts-check
// „Schritt entfernen, Ablauf erhalten“ (ohne JointJS): Beim Löschen eines Schritts mit genau
// einem Nachfolger werden seine Vorgänger direkt mit dem Nachfolger verbunden.

/** @typedef {import('./types').DiagramData} DiagramData */
/** @typedef {{ from: string, to: string, label: string, sourcePort?: string, targetPort?: string }} BridgeEdge */

const NOT_BRIDGEABLE = ['lane', 'annotation', 'start', 'end'];

/**
 * Verbindungen, die nach dem Entfernen von `nodeId` den Ablauf erhalten, oder null,
 * wenn das nicht eindeutig möglich ist (kein Vorgänger, mehrere Nachfolger, Start/Ende …).
 * Beschriftung und Startanschluss stammen von der eingehenden Verbindung (z. B. „Ja“ einer
 * Entscheidung), der Zielanschluss von der ausgehenden.
 * @param {DiagramData} diagram
 * @param {string} nodeId
 * @returns {BridgeEdge[] | null}
 */
export function bridgeEdges(diagram, nodeId) {
  const nodes = new Map(diagram.nodes.map((n) => [n.id, n]));
  const node = nodes.get(nodeId);
  if (!node || NOT_BRIDGEABLE.includes(node.type)) return null;

  const isFlow = (/** @type {string} */ id) => {
    const other = nodes.get(id);
    return Boolean(other) && other?.type !== 'annotation' && other?.type !== 'lane';
  };
  const incoming = diagram.edges.filter((e) => e.to === nodeId && e.from !== nodeId && isFlow(e.from));
  const outgoing = diagram.edges.filter((e) => e.from === nodeId && e.to !== nodeId && isFlow(e.to));
  if (incoming.length === 0 || outgoing.length !== 1) return null;

  const [next] = outgoing;
  const exists = (/** @type {string} */ from) => diagram.edges.some((e) => e.from === from && e.to === next.to);
  const bridges = incoming
    .filter((edge) => edge.from !== next.to && !exists(edge.from))
    .map((edge) => ({
      from: edge.from,
      to: next.to,
      label: edge.label || '',
      ...(edge.sourcePort ? { sourcePort: edge.sourcePort } : {}),
      ...(next.targetPort ? { targetPort: next.targetPort } : {})
    }));
  return bridges.length ? bridges : null;
}
