import { openDB } from 'idb';

const DB_NAME = 'vhs-flowcharts-db';
const STORE_NAME = 'diagrams';

const initDB = async () => {
  return await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
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
  }
};
