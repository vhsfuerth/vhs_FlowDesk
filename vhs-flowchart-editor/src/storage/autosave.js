// @ts-check
// Reine Hilfsfunktionen für Autosave und Wiederherstellung (ohne React/IndexedDB).

import { normalizeMetadata } from '../analysis/diagram-validation';

/** @typedef {import('../diagram/types').DiagramData} DiagramData */
/** @typedef {import('../diagram/types').DiagramRecord} DiagramRecord */
/** @typedef {import('../diagram/types').DraftEntry} DraftEntry */

export const SAVE_STATUS = /** @type {const} */ ({
  SAVED: 'saved',       // Stand entspricht dem zuletzt gespeicherten
  DIRTY: 'dirty',       // Änderungen vorhanden, Entwurf noch nicht gesichert
  DRAFT: 'draft',       // Änderungen als Entwurf gesichert, aber nicht gespeichert
  ERROR: 'error'        // Entwurf konnte nicht gesichert werden
});

/**
 * Vergleichbarer Fingerabdruck des bearbeitbaren Diagramminhalts.
 * @param {{ name?: string, diagram?: Partial<DiagramData> | null, metadata?: Record<string, any> }} state
 * @returns {string}
 */
export function createSnapshot({ name, diagram, metadata }) {
  return JSON.stringify({
    name: name || '',
    diagram: {
      nodes: diagram?.nodes || [],
      edges: diagram?.edges || []
    },
    metadata: normalizeMetadata(metadata || {})
  });
}

/**
 * Ein leeres Diagramm wird nicht als Entwurf gesichert.
 * @param {Partial<DiagramData> | null | undefined} diagram
 */
export function isEmptyDiagram(diagram) {
  return !diagram?.nodes?.length && !diagram?.edges?.length;
}

/**
 * Soll ein vorhandener Entwurf zur Wiederherstellung angeboten werden?
 * Ja, wenn er neuer ist als der gespeicherte Stand oder es keinen gespeicherten Stand gibt.
 * @param {DraftEntry | null | undefined} draft
 * @param {{ updatedAt?: string } | null | undefined} savedRecord
 */
export function isDraftNewer(draft, savedRecord) {
  if (!draft?.savedAt) return false;
  if (!savedRecord?.updatedAt) return true;
  return new Date(draft.savedAt).getTime() > new Date(savedRecord.updatedAt).getTime();
}
