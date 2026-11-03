// @ts-check
// Zentrale Typdefinitionen des Diagrammformats. Wird per JSDoc in anderen
// Modulen referenziert (`import('../diagram/types').DiagramData`) und von
// `npm run typecheck` geprüft. Erster Schritt der schrittweisen TypeScript-Einführung.

/**
 * @typedef {'start' | 'end' | 'process' | 'decision' | 'annotation' | 'lane'} NodeType
 */

/**
 * @typedef {Object} DiagramNode
 * @property {string} id
 * @property {NodeType} type
 * @property {string} [label]
 * @property {{ x: number, y: number }} [position]
 * @property {{ width: number, height: number }} [size]
 * @property {{ header: string, body: string }} [laneColor]  Nur bei type 'lane'
 */

/**
 * @typedef {Object} DiagramEdge
 * @property {string} [id]
 * @property {string} from
 * @property {string} to
 * @property {string} [label]
 * @property {string} [sourcePort]
 * @property {string} [targetPort]
 */

/**
 * @typedef {Object} DiagramData
 * @property {DiagramNode[]} nodes
 * @property {DiagramEdge[]} edges
 */

/**
 * Gespeichertes Diagramm (IndexedDB-Store `diagrams`, Projekt-JSON-Export).
 * @typedef {Object} DiagramRecord
 * @property {string} id
 * @property {string} name
 * @property {number} schemaVersion
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 * @property {DiagramData | null} diagram
 * @property {Record<string, any>} metadata
 */

/**
 * Automatisch gesicherter Entwurf (IndexedDB-Store `drafts`).
 * @typedef {Object} DraftEntry
 * @property {string} diagramId
 * @property {string} savedAt
 * @property {DiagramRecord} record
 */

export const NODE_TYPES = /** @type {const} */ (['start', 'end', 'process', 'decision', 'annotation', 'lane']);
