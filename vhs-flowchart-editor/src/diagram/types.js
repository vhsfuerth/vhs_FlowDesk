// @ts-check
// Zentrale Typdefinitionen des Diagrammformats. Wird per JSDoc in anderen
// Modulen referenziert (`import('../diagram/types').DiagramData`) und von
// `npm run typecheck` geprüft. Erster Schritt der schrittweisen TypeScript-Einführung.

/**
 * @typedef {'start' | 'end' | 'process' | 'decision' | 'annotation' | 'lane'
 *   | 'document' | 'system' | 'subprocess' | 'wait'} NodeType
 */

/**
 * @typedef {Object} DiagramNode
 * @property {string} id
 * @property {NodeType} type
 * @property {string} [label]
 * @property {{ x: number, y: number }} [position]
 * @property {{ width: number, height: number }} [size]
 * @property {{ header: string, body: string }} [laneColor]  Nur bei type 'lane'
 * @property {string} [laneId]        Swimlane, in der das Element liegt (ab Format 2)
 * @property {string} [description]   Erläuterung des Schritts
 * @property {string} [role]          Zuständigkeit, wenn das Element in keiner Swimlane liegt
 * @property {string} [document]      Beteiligtes Dokument oder Formular
 * @property {string} [system]        Beteiligtes IT-System
 * @property {string} [duration]      Dauer bzw. Frist
 * @property {string} [subprocessId]  Nur bei type 'subprocess': ID des verknüpften Diagramms
 */

/**
 * @typedef {Object} DiagramEdge
 * @property {string} [id]
 * @property {string} from
 * @property {string} to
 * @property {string} [label]
 * @property {string} [sourcePort]
 * @property {string} [targetPort]
 * @property {{ x: number, y: number }[]} [vertices]  Knickpunkte (ab Format 2)
 * @property {{ distance: number, offset?: number }} [labelPosition]  Lage der Beschriftung entlang der Linie (0–1)
 * @property {'orthogonal' | 'straight'} [routing]  Linienführung, Standard rechtwinklig
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
 * Gespeicherte Version eines Diagramms (IndexedDB-Store `diagram-versions`).
 * @typedef {Object} DiagramVersion
 * @property {string} id
 * @property {string} diagramId
 * @property {string} [savedAt]
 * @property {string} [note]  Notiz „Was wurde geändert?“
 * @property {DiagramRecord} snapshot
 */

/**
 * Automatisch gesicherter Entwurf (IndexedDB-Store `drafts`).
 * @typedef {Object} DraftEntry
 * @property {string} diagramId
 * @property {string} savedAt
 * @property {DiagramRecord} record
 */

export const NODE_TYPES = /** @type {const} */ ([
  'start', 'end', 'process', 'decision', 'annotation', 'lane', 'document', 'system', 'subprocess', 'wait'
]);

/** Deutsche Bezeichnung je Elementtyp (Meldungen, Eigenschaften-Leiste) */
export const NODE_TYPE_LABELS = /** @type {Record<string, string>} */ ({
  start: 'Start',
  end: 'Ende',
  process: 'Prozessschritt',
  decision: 'Entscheidung',
  annotation: 'Kommentar',
  lane: 'Swimlane',
  document: 'Dokument/Formular',
  system: 'IT-System',
  subprocess: 'Teilprozess',
  wait: 'Warten/Frist'
});

/** Zusatzangaben eines Elements (Eigenschaften-Leiste, Prozessbeschreibung) */
export const NODE_DETAIL_FIELDS = /** @type {const} */ (['description', 'role', 'document', 'system', 'duration', 'subprocessId']);

/** Elementtypen, die keine Ablaufschritte sind */
export const NON_FLOW_TYPES = /** @type {const} */ (['lane', 'annotation']);
