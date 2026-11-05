// @ts-check
// Formatversion, Migration und Prüfung von Diagrammdaten.
// Jedes gespeicherte oder exportierte Diagramm trägt `schemaVersion`. Ändert sich
// das Format, CURRENT_SCHEMA_VERSION erhöhen und eine Migration in MIGRATIONS ergänzen.

import { NODE_DETAIL_FIELDS, NODE_TYPES } from '../diagram/types';
import { withLaneIds } from '../diagram/lanes';
import { normalizeMetadata } from '../analysis/diagram-validation';

/** @typedef {import('../diagram/types').DiagramData} DiagramData */
/** @typedef {import('../diagram/types').DiagramRecord} DiagramRecord */

export const CURRENT_SCHEMA_VERSION = 2;
export const BACKUP_FORMAT = 'vhs-flowchart-backup';

const MAX_REPORTED_ERRORS = 8;

/** Fehler mit nutzerverständlicher (deutscher) Meldung. */
export class ImportValidationError extends Error {
  /** @param {string} message @param {string[]} [details] */
  constructor(message, details = []) {
    super(details.length ? `${message}\n– ${details.join('\n– ')}` : message);
    this.name = 'ImportValidationError';
    this.details = details;
  }
}

/** @param {unknown} value @returns {value is Record<string, any>} */
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** @param {unknown} value */
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/** @param {unknown} value */
const isPoint = (value) => isObject(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);

const ROUTINGS = ['orthogonal', 'straight'];

/**
 * Prüft die Struktur `{ nodes, edges }` und liefert eine Liste deutscher Fehlermeldungen.
 * Eine leere Liste bedeutet: gültig.
 * @param {unknown} data
 * @returns {string[]}
 */
export function validateDiagramData(data) {
  /** @type {string[]} */
  const errors = [];

  if (!isObject(data)) {
    return ['Die Diagrammdaten fehlen oder sind kein Objekt.'];
  }
  if (!Array.isArray(data.nodes)) {
    return ['Die Liste der Elemente („nodes“) fehlt.'];
  }
  if (data.edges !== undefined && !Array.isArray(data.edges)) {
    errors.push('Die Liste der Verbindungen („edges“) ist ungültig.');
  }

  const ids = new Set();
  data.nodes.forEach((node, index) => {
    const ref = `Element ${index + 1}`;
    if (!isObject(node)) {
      errors.push(`${ref} ist kein gültiges Objekt.`);
      return;
    }
    if (typeof node.id !== 'string' || !node.id.trim()) {
      errors.push(`${ref} hat keine ID.`);
    } else if (ids.has(node.id)) {
      errors.push(`${ref}: Die ID „${node.id}“ kommt mehrfach vor.`);
    } else {
      ids.add(node.id);
    }
    if (typeof node.type !== 'string' || !NODE_TYPES.includes(/** @type {any} */ (node.type.toLowerCase()))) {
      errors.push(`${ref}: Unbekannter Typ „${String(node.type)}“. Erlaubt: ${NODE_TYPES.join(', ')}.`);
    }
    if (node.label !== undefined && typeof node.label !== 'string') {
      errors.push(`${ref}: Die Beschriftung muss Text sein.`);
    }
    if (node.position !== undefined && !(isObject(node.position) && isFiniteNumber(node.position.x) && isFiniteNumber(node.position.y))) {
      errors.push(`${ref}: Ungültige Position.`);
    }
    if (node.size !== undefined && !(isObject(node.size) && isFiniteNumber(node.size.width) && isFiniteNumber(node.size.height) && node.size.width > 0 && node.size.height > 0)) {
      errors.push(`${ref}: Ungültige Größe.`);
    }
    NODE_DETAIL_FIELDS.forEach((field) => {
      if (node[field] !== undefined && typeof node[field] !== 'string') {
        errors.push(`${ref}: Die Angabe „${field}“ muss Text sein.`);
      }
    });
    if (node.laneId !== undefined && typeof node.laneId !== 'string') {
      errors.push(`${ref}: Ungültige Swimlane-Zuordnung.`);
    }
  });

  // Zuordnung zu Swimlanes erst prüfen, wenn alle IDs bekannt sind
  const laneIds = new Set(data.nodes.filter((n) => isObject(n) && n.type === 'lane').map((n) => n.id));
  data.nodes.forEach((node, index) => {
    if (isObject(node) && typeof node.laneId === 'string' && !laneIds.has(node.laneId)) {
      errors.push(`Element ${index + 1}: Die Swimlane „${node.laneId}“ existiert nicht.`);
    }
  });

  if (Array.isArray(data.edges)) {
    data.edges.forEach((edge, index) => {
      const ref = `Verbindung ${index + 1}`;
      if (!isObject(edge)) {
        errors.push(`${ref} ist kein gültiges Objekt.`);
        return;
      }
      if (!ids.has(edge.from)) errors.push(`${ref}: Startelement „${String(edge.from)}“ existiert nicht.`);
      if (!ids.has(edge.to)) errors.push(`${ref}: Zielelement „${String(edge.to)}“ existiert nicht.`);
      if (edge.label !== undefined && edge.label !== null && typeof edge.label !== 'string') {
        errors.push(`${ref}: Die Beschriftung muss Text sein.`);
      }
      if (edge.vertices !== undefined && !(Array.isArray(edge.vertices) && edge.vertices.every(isPoint))) {
        errors.push(`${ref}: Ungültige Knickpunkte.`);
      }
      if (edge.labelPosition !== undefined && !(isObject(edge.labelPosition) && isFiniteNumber(edge.labelPosition.distance)
        && (edge.labelPosition.offset === undefined || isFiniteNumber(edge.labelPosition.offset)))) {
        errors.push(`${ref}: Ungültige Lage der Beschriftung.`);
      }
      if (edge.routing !== undefined && !ROUTINGS.includes(edge.routing)) {
        errors.push(`${ref}: Unbekannte Linienführung „${String(edge.routing)}“.`);
      }
    });
  }

  if (errors.length > MAX_REPORTED_ERRORS) {
    const rest = errors.length - MAX_REPORTED_ERRORS;
    return [...errors.slice(0, MAX_REPORTED_ERRORS), `… und ${rest} weitere Probleme.`];
  }
  return errors;
}

/**
 * Migrationen je Ausgangsversion. Jede Funktion hebt einen Datensatz um genau eine Version an.
 * @type {Record<number, (record: Record<string, any>) => Record<string, any>>}
 */
const MIGRATIONS = {
  // 0 → 1: Datensätze vor Einführung von schemaVersion. Struktur ist identisch,
  // nur Metadaten und leere Diagramme werden vereinheitlicht.
  0: (record) => ({ ...record, schemaVersion: 1 }),
  // 1 → 2: Zusatzangaben, Knickpunkte usw. sind optional. Neu ist die feste
  // Zuordnung zu Swimlanes (`laneId`), die bisher nur aus der Lage folgte.
  1: (record) => ({ ...record, schemaVersion: 2, diagram: migrateDiagramToV2(record.diagram) })
};

/**
 * Ergänzt `laneId` nach Lage (nur bei gültiger Grundstruktur; Fehler meldet die Prüfung).
 * @param {unknown} diagram
 */
function migrateDiagramToV2(diagram) {
  if (!isObject(diagram) || !Array.isArray(diagram.nodes)) return diagram;
  if (!diagram.nodes.every((n) => isObject(n) && typeof n.type === 'string')) return diagram;
  return { ...diagram, nodes: withLaneIds(diagram.nodes) };
}

/**
 * Wendet die Formatmigrationen an, ohne Inhalte zu korrigieren.
 * @param {Record<string, any>} record
 * @returns {Record<string, any>}
 */
function applyMigrations(record) {
  if (!isObject(record)) {
    throw new ImportValidationError('Der Datensatz ist ungültig.');
  }

  let version = isFiniteNumber(record.schemaVersion) ? record.schemaVersion : 0;
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new ImportValidationError(
      `Die Daten stammen aus einer neueren Version des Editors (Format ${version}). Bitte die App aktualisieren.`
    );
  }

  let migrated = { ...record };
  while (version < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) throw new ImportValidationError(`Keine Migration für Format ${version} vorhanden.`);
    migrated = migrate(migrated);
    version = migrated.schemaVersion;
  }
  return migrated;
}

/**
 * Vereinheitlicht einen migrierten Datensatz (fehlende Listen, Metadaten, Name).
 * @param {Record<string, any>} migrated
 * @returns {DiagramRecord}
 */
function normalizeRecord(migrated) {
  const diagram = isObject(migrated.diagram)
    ? {
        nodes: Array.isArray(migrated.diagram.nodes) ? migrated.diagram.nodes : [],
        edges: Array.isArray(migrated.diagram.edges) ? migrated.diagram.edges : []
      }
    : null;

  return /** @type {DiagramRecord} */ ({
    ...migrated,
    // Leere ID nur bei reinen Diagrammdateien; beim Import wird eine neue vergeben
    id: typeof migrated.id === 'string' ? migrated.id : '',
    name: typeof migrated.name === 'string' && migrated.name.trim() ? migrated.name : 'Unbenanntes Diagramm',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    diagram,
    metadata: normalizeMetadata(isObject(migrated.metadata) ? migrated.metadata : {})
  });
}

/**
 * Bringt einen gespeicherten Datensatz auf das aktuelle Format (für Daten aus der eigenen Datenbank).
 * @param {Record<string, any>} record
 * @returns {DiagramRecord}
 */
export function migrateDiagramRecord(record) {
  return normalizeRecord(applyMigrations(record));
}

/**
 * Prüft einen Diagramm-Datensatz vollständig (Format + Diagrammstruktur) und migriert ihn.
 * Für Daten aus Dateien: Fehler werden gemeldet statt stillschweigend korrigiert.
 * @param {unknown} record
 * @param {string} [label] Bezeichnung für Fehlermeldungen
 * @returns {DiagramRecord}
 */
export function parseDiagramRecord(record, label = 'Das Diagramm') {
  if (!isObject(record)) {
    throw new ImportValidationError(`${label} ist ungültig.`);
  }
  const migrated = applyMigrations(record);
  if (migrated.diagram !== null && migrated.diagram !== undefined) {
    const errors = validateDiagramData(migrated.diagram);
    if (errors.length) {
      throw new ImportValidationError(`${label} enthält ungültige Daten:`, errors);
    }
  }
  return normalizeRecord(migrated);
}

/**
 * @typedef {{ kind: 'project', record: DiagramRecord }
 *   | { kind: 'backup', diagrams: DiagramRecord[], versions: Record<string, any>[], exportedAt: string | null }} ImportResult
 */

/**
 * Erkennt und prüft eine importierte JSON-Datei:
 * - Backup aller Diagramme (`format: 'vhs-flowchart-backup'`)
 * - Projektdatei (Export eines einzelnen Diagramms inkl. Metadaten)
 * - reines Diagramm `{ nodes, edges }`
 * @param {unknown} json
 * @param {string} [fallbackName] Name für reine Diagramme ohne Projektdaten
 * @returns {ImportResult}
 */
export function parseImportFile(json, fallbackName = 'Importiertes Diagramm') {
  if (!isObject(json)) {
    throw new ImportValidationError('Die Datei enthält kein gültiges Diagramm.');
  }

  if (json.format === BACKUP_FORMAT) {
    if (!Array.isArray(json.diagrams)) {
      throw new ImportValidationError('Die Sicherungsdatei enthält keine Diagrammliste.');
    }
    const diagrams = json.diagrams.map((record, index) => {
      const name = isObject(record) && typeof record.name === 'string' ? `„${record.name}“` : `Diagramm ${index + 1}`;
      const parsed = parseDiagramRecord(record, name);
      if (typeof parsed.id !== 'string' || !parsed.id) {
        throw new ImportValidationError(`${name} hat keine ID.`);
      }
      return parsed;
    });
    const diagramIds = new Set(diagrams.map((d) => d.id));
    const versions = (Array.isArray(json.versions) ? json.versions : [])
      .filter((v) => isObject(v) && typeof v.id === 'string' && diagramIds.has(v.diagramId) && isObject(v.snapshot))
      .map((v) => ({ ...v, snapshot: migrateDiagramRecord(v.snapshot) }));
    return {
      kind: 'backup',
      diagrams,
      versions,
      exportedAt: typeof json.exportedAt === 'string' ? json.exportedAt : null
    };
  }

  if (isObject(json.diagram) || json.diagram === null) {
    return { kind: 'project', record: parseDiagramRecord(json) };
  }

  if (Array.isArray(json.nodes)) {
    const record = parseDiagramRecord({ name: fallbackName, diagram: json, metadata: json.metadata });
    return { kind: 'project', record };
  }

  throw new ImportValidationError('Die Datei enthält kein Diagramm im Format von vhs FlowDesk.');
}

/**
 * Erstellt den Inhalt einer Sicherungsdatei mit allen Diagrammen und Versionen.
 * @param {DiagramRecord[]} diagrams
 * @param {Record<string, any>[]} versions
 * @param {string} appVersion
 */
export function createBackup(diagrams, versions, appVersion) {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    diagrams,
    versions
  };
}
