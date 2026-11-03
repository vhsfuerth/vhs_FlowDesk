import { openDB } from 'idb';
import { CURRENT_SCHEMA_VERSION, migrateDiagramRecord } from './schema';

const DB_NAME = 'vhs-flowcharts-db';
const STORE_NAME = 'diagrams';
const VERSIONS_STORE_NAME = 'diagram-versions';
const DRAFTS_STORE_NAME = 'drafts';
const MAX_VERSIONS_PER_DIAGRAM = 10;

let dbPromise = null;

const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 3, {
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
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
};

const checkStorageQuota = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    const remaining = quota - usage;
    if (remaining < 1024 * 1024) {
      throw new Error('Speicherplatz fast voll. Bitte alte Diagramme löschen.');
    }
  }
};

const migrateVersion = (version) => ({ ...version, snapshot: migrateDiagramRecord(version.snapshot || {}) });

export const indexeddb = {
  async saveDiagram(diagramData) {
    await checkStorageQuota();
    const db = await initDB();
    const copy = { ...diagramData, schemaVersion: CURRENT_SCHEMA_VERSION, updatedAt: new Date().toISOString() };
    await db.put(STORE_NAME, copy);
    return copy;
  },

  async getAllDiagrams() {
    const db = await initDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'updatedAt');
    return all.map(migrateDiagramRecord);
  },

  async getDiagram(id) {
    const db = await initDB();
    const record = await db.get(STORE_NAME, id);
    return record ? migrateDiagramRecord(record) : null;
  },

  // Löscht das Diagramm samt Versionen und Autosave-Entwurf
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

  async saveVersion(version) {
    const db = await initDB();
    await db.put(VERSIONS_STORE_NAME, version);
    // Enforce max versions per diagram
    const all = await this.getVersionsForDiagram(version.diagramId);
    if (all.length > MAX_VERSIONS_PER_DIAGRAM) {
      // all is sorted ascending by savedAt; delete oldest entries
      const toDelete = all.slice(0, all.length - MAX_VERSIONS_PER_DIAGRAM);
      for (const v of toDelete) {
        await db.delete(VERSIONS_STORE_NAME, v.id);
      }
    }
  },

  async getVersionsForDiagram(diagramId) {
    const db = await initDB();
    const all = await db.getAllFromIndex(VERSIONS_STORE_NAME, 'diagramId', diagramId);
    // Sort ascending by savedAt
    return all.map(migrateVersion).sort((a, b) => (a.savedAt || '').localeCompare(b.savedAt || ''));
  },

  async getAllVersions() {
    const db = await initDB();
    return (await db.getAll(VERSIONS_STORE_NAME)).map(migrateVersion);
  },

  async updateVersionNote(versionId, note) {
    const db = await initDB();
    const version = await db.get(VERSIONS_STORE_NAME, versionId);
    if (!version) return;
    await db.put(VERSIONS_STORE_NAME, { ...version, note });
  },

  async deleteVersion(versionId) {
    const db = await initDB();
    await db.delete(VERSIONS_STORE_NAME, versionId);
  },

  // --- Autosave-Entwürfe ---

  async saveDraft(record) {
    const db = await initDB();
    const entry = {
      diagramId: record.id,
      savedAt: new Date().toISOString(),
      record: { ...record, schemaVersion: CURRENT_SCHEMA_VERSION }
    };
    await db.put(DRAFTS_STORE_NAME, entry);
    return entry;
  },

  async getDraft(diagramId) {
    const db = await initDB();
    const entry = await db.get(DRAFTS_STORE_NAME, diagramId);
    return entry ? { ...entry, record: migrateDiagramRecord(entry.record) } : null;
  },

  async deleteDraft(diagramId) {
    const db = await initDB();
    await db.delete(DRAFTS_STORE_NAME, diagramId);
  },

  // --- Sicherung ---

  // Spielt eine geprüfte Sicherung ein. Diagramme und Versionen mit gleicher ID werden überschrieben.
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
