// @ts-check
// Kopieren und Einfügen von Diagrammausschnitten (reine Funktionen + Ablage).
// Die Ablage liegt im localStorage, damit Einfügen auch in einem anderen Diagramm
// oder Browser-Tab funktioniert.

/** @typedef {import('./types').DiagramData} DiagramData */

const CLIPBOARD_KEY = 'vhs-clipboard';
const CLIPBOARD_FORMAT = 'vhs-flowchart-fragment';

/** @type {DiagramData | null} */
let memoryClipboard = null;

/**
 * Schneidet die ausgewählten Knoten samt der Verbindungen zwischen ihnen aus.
 * @param {DiagramData} diagram
 * @param {string[]} selectedIds
 * @returns {DiagramData}
 */
export function extractFragment(diagram, selectedIds) {
  const ids = new Set(selectedIds);
  return {
    nodes: (diagram.nodes || []).filter((n) => ids.has(n.id)).map((n) => structuredClone(n)),
    edges: (diagram.edges || []).filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => structuredClone(e))
  };
}

/**
 * Erzeugt aus einem Ausschnitt einfügbare Daten mit neuen IDs und verschobener Position.
 * @param {DiagramData} fragment
 * @param {{ offset?: { x: number, y: number }, createId: () => string }} options
 * @returns {DiagramData & { idMap: Record<string, string> }}
 */
export function instantiateFragment(fragment, { offset = { x: 30, y: 30 }, createId }) {
  /** @type {Record<string, string>} */
  const idMap = {};
  const nodes = fragment.nodes.map((node) => {
    const id = createId();
    idMap[node.id] = id;
    return {
      ...structuredClone(node),
      id,
      position: {
        x: (node.position?.x ?? 100) + offset.x,
        y: (node.position?.y ?? 100) + offset.y
      }
    };
  });
  const edges = fragment.edges
    .filter((edge) => idMap[edge.from] && idMap[edge.to])
    .map((edge) => ({ ...structuredClone(edge), id: createId(), from: idMap[edge.from], to: idMap[edge.to] }));
  return { nodes, edges, idMap };
}

/** @param {DiagramData} fragment */
export function writeClipboard(fragment) {
  memoryClipboard = fragment;
  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify({ format: CLIPBOARD_FORMAT, fragment }));
  } catch {
    // Speicher nicht verfügbar: Ablage bleibt im Arbeitsspeicher
  }
}

/** @returns {DiagramData | null} */
export function readClipboard() {
  try {
    const raw = localStorage.getItem(CLIPBOARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.format === CLIPBOARD_FORMAT && Array.isArray(parsed.fragment?.nodes) && Array.isArray(parsed.fragment?.edges)) {
        return parsed.fragment;
      }
    }
  } catch {
    // ungültiger Inhalt – Arbeitsspeicher-Ablage verwenden
  }
  return memoryClipboard;
}
