import { openDB } from 'idb';

const DB_NAME = 'vhs-flowcharts-db';
const STORE_NAME = 'diagrams';
const VERSIONS_STORE_NAME = 'diagram-versions';
const MAX_VERSIONS_PER_DIAGRAM = 10;

const initDB = async () => {
  return await openDB(DB_NAME, 2, {
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
    },
  });
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

export const indexeddb = {
  async saveDiagram(diagramData) {
    await checkStorageQuota();
    const db = await initDB();
    const copy = { ...diagramData, updatedAt: new Date().toISOString() };
    await db.put(STORE_NAME, copy);
    return copy;
  },

  async getAllDiagrams() {
    const db = await initDB();
    return await db.getAllFromIndex(STORE_NAME, 'updatedAt');
  },

  async getDiagram(id) {
    const db = await initDB();
    return await db.get(STORE_NAME, id);
  },

  async deleteDiagram(id) {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
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
    return all.sort((a, b) => (a.savedAt || '').localeCompare(b.savedAt || ''));
  },

  async deleteVersion(versionId) {
    const db = await initDB();
    await db.delete(VERSIONS_STORE_NAME, versionId);
  }
};
