// @ts-check
// IndexedDB-Zugriff: Diagramme, Versionen (max. 10 je Diagramm) und Autosave-Entwürfe.
// Gelesene Datensätze werden beim Lesen auf das aktuelle Format migriert.

import { openDB } from 'idb';
import { CURRENT_SCHEMA_VERSION, migrateDiagramRecord } from './schema';

/** @typedef {import('../diagram/types').DiagramRecord} DiagramRecord */
/** @typedef {import('../diagram/types').DiagramVersion} DiagramVersion */
/** @typedef {import('../diagram/types').DraftEntry} DraftEntry */

/**
 * Aufbau der Datenbank für die Typprüfung von `idb`.
 * @typedef {{
 *   'diagrams': { key: string, value: DiagramRecord, indexes: { updatedAt: string } },
 *   'diagram-versions': { key: string, value: DiagramVersion, indexes: { diagramId: string, savedAt: string } },
 *   'drafts': { key: string, value: DraftEntry }
 * }} FlowchartDB
 */

/** @typedef {import('idb').IDBPDatabase<FlowchartDB>} Database */

const DB_NAME = 'vhs-flowcharts-db';
const DB_VERSION = 3;
const STORE_NAME = /** @type {const} */ ('diagrams');
const VERSIONS_STORE_NAME = /** @type {const} */ ('diagram-versions');
const DRAFTS_STORE_NAME = /** @type {const} */ ('drafts');
const MAX_VERSIONS_PER_DIAGRAM = 10;
const MIN_FREE_BYTES = 1024 * 1024;

/** @type {Promise<Database> | null} */
let dbPromise = null;

/** @type {import('idb').OpenDBCallbacks<FlowchartDB>} */
const DB_CALLBACKS = {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    }
    if (oldVersion < 2) {
      const versionStore = db.createObjectStore(VERSIONS_STORE_NAME, { keyPath: 'id' });
      versionStore.createIndex('diagramId', 'diagramId');
      versionStore.createIndex('savedAt', 'savedAt');
    }
    if (oldVersion < 3) {
      // Autosave-Entwürfe: höchstens einer pro Diagramm
      db.createObjectStore(DRAFTS_STORE_NAME, { keyPath: 'diagramId' });
    }
  },
};

/** @returns {Promise<Database>} */
const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, DB_CALLBACKS).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
};

/** Wirft einen Fehler mit deutscher Meldung, wenn weniger als 1 MB Speicher frei ist. */
const checkStorageQuota = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    if (quota === undefined || usage === undefined) return;
    if (quota - usage < MIN_FREE_BYTES) {
      throw new Error('Speicherplatz fast voll. Bitte alte Diagramme löschen.');
    }
  }
};

/**
 * @param {DiagramVersion} version
 * @returns {DiagramVersion}
 */
const migrateVersion = (version) => ({ ...version, snapshot: migrateDiagramRecord(version.snapshot || {}) });

export const indexeddb = {
  /**
   * Speichert das Diagramm mit aktueller Formatversion und Zeitstempel.
   * @param {DiagramRecord} diagramData
   * @returns {Promise<DiagramRecord>} der gespeicherte Datensatz
   */
  async saveDiagram(diagramData) {
    await checkStorageQuota();
    const db = await initDB();
    const copy = { ...diagramData, schemaVersion: CURRENT_SCHEMA_VERSION, updatedAt: new Date().toISOString() };
    await db.put(STORE_NAME, copy);
    return copy;
  },

  /** @returns {Promise<DiagramRecord[]>} aufsteigend nach `updatedAt` */
  async getAllDiagrams() {
    const db = await initDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'updatedAt');
    return all.map(migrateDiagramRecord);
  },

  /**
   * @param {string} id
   * @returns {Promise<DiagramRecord | null>}
   */
  async getDiagram(id) {
    const db = await initDB();
    const record = await db.get(STORE_NAME, id);
    return record ? migrateDiagramRecord(record) : null;
  },

  /**
   * Löscht das Diagramm samt Versionen und Autosave-Entwurf.
   * @param {string} id
   */
  async deleteDiagram(id) {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME, VERSIONS_STORE_NAME, DRAFTS_STORE_NAME], 'readwrite');
    const versionKeys = await tx.objectStore(VERSIONS_STORE_NAME).index('diagramId').getAllKeys(id);
    await Promise.all([
      tx.objectStore(STORE_NAME).delete(id),
      tx.objectStore(DRAFTS_STORE_NAME).delete(id),
      ...versionKeys.map((key) => tx.objectStore(VERSIONS_STORE_NAME).delete(key)),
      tx.done
    ]);
  },

  // --- Versions ---

  /**
   * Legt eine Version an; danach bleiben höchstens die 10 neuesten Versionen des Diagramms erhalten.
   * @param {DiagramVersion} version
   */
  async saveVersion(version) {
    const db = await initDB();
    await db.put(VERSIONS_STORE_NAME, version);
    const all = await this.getVersionsForDiagram(version.diagramId);
    if (all.length > MAX_VERSIONS_PER_DIAGRAM) {
      // all is sorted ascending by savedAt; delete oldest entries
      const toDelete = all.slice(0, all.length - MAX_VERSIONS_PER_DIAGRAM);
      for (const v of toDelete) {
        await db.delete(VERSIONS_STORE_NAME, v.id);
      }
    }
  },

  /**
   * @param {string} diagramId
   * @returns {Promise<DiagramVersion[]>} aufsteigend nach `savedAt`
   */
  async getVersionsForDiagram(diagramId) {
    const db = await initDB();
    const all = await db.getAllFromIndex(VERSIONS_STORE_NAME, 'diagramId', diagramId);
    return all.map(migrateVersion).sort((a, b) => (a.savedAt || '').localeCompare(b.savedAt || ''));
  },

  /** @returns {Promise<DiagramVersion[]>} */
  async getAllVersions() {
    const db = await initDB();
    return (await db.getAll(VERSIONS_STORE_NAME)).map(migrateVersion);
  },

  /**
   * @param {string} versionId
   * @param {string} note
   */
  async updateVersionNote(versionId, note) {
    const db = await initDB();
    const version = await db.get(VERSIONS_STORE_NAME, versionId);
    if (!version) return;
    await db.put(VERSIONS_STORE_NAME, { ...version, note });
  },

  /** @param {string} versionId */
  async deleteVersion(versionId) {
    const db = await initDB();
    await db.delete(VERSIONS_STORE_NAME, versionId);
  },

  // --- Autosave-Entwürfe ---

  /**
   * Speichert (bzw. ersetzt) den Entwurf zum Diagramm `record.id`.
   * @param {DiagramRecord} record
   * @returns {Promise<DraftEntry>}
   */
  async saveDraft(record) {
    const db = await initDB();
    /** @type {DraftEntry} */
    const entry = {
      diagramId: record.id,
      savedAt: new Date().toISOString(),
      record: { ...record, schemaVersion: CURRENT_SCHEMA_VERSION }
    };
    await db.put(DRAFTS_STORE_NAME, entry);
    return entry;
  },

  /**
   * @param {string} diagramId
   * @returns {Promise<DraftEntry | null>}
   */
  async getDraft(diagramId) {
    const db = await initDB();
    const entry = await db.get(DRAFTS_STORE_NAME, diagramId);
    return entry ? { ...entry, record: migrateDiagramRecord(entry.record) } : null;
  },

  /** @param {string} diagramId */
  async deleteDraft(diagramId) {
    const db = await initDB();
    await db.delete(DRAFTS_STORE_NAME, diagramId);
  },

  // --- Sicherung ---

  /**
   * Spielt eine geprüfte Sicherung ein. Diagramme und Versionen mit gleicher ID werden überschrieben.
   * @param {{ diagrams: DiagramRecord[], versions: DiagramVersion[] }} backup
   */
  async importBackup({ diagrams, versions }) {
    await checkStorageQuota();
    const db = await initDB();
    const tx = db.transaction([STORE_NAME, VERSIONS_STORE_NAME], 'readwrite');
    await Promise.all([
      ...diagrams.map((record) => tx.objectStore(STORE_NAME).put(record)),
      ...versions.map((version) => tx.objectStore(VERSIONS_STORE_NAME).put(version)),
      tx.done
    ]);
  }
};

/**
 * Nur für Tests: schließt die Verbindung, damit eine frische Datenbank geöffnet werden kann.
 * @returns {Promise<void>}
 */
export const closeDatabaseForTests = async () => {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  db?.close();
  dbPromise = null;
};
