import { IDBFactory } from 'fake-indexeddb';
import { closeDatabaseForTests } from '../storage/indexeddb';

/** Schließt die offene Verbindung und ersetzt die IndexedDB durch eine leere. */
export async function resetDatabase() {
  await closeDatabaseForTests();
  globalThis.indexedDB = new IDBFactory();
}

/** Minimaler gespeicherter Datensatz für Tests. */
export function makeRecord(overrides = {}) {
  return {
    id: 'd1',
    name: 'Kursanmeldung',
    schemaVersion: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    diagram: {
      nodes: [
        { id: 's', type: 'start', label: 'Start' },
        { id: 'p', type: 'process', label: 'Anmeldung prüfen' },
        { id: 'e', type: 'end', label: 'Ende' }
      ],
      edges: [
        { id: 'e1', from: 's', to: 'p' },
        { id: 'e2', from: 'p', to: 'e' }
      ]
    },
    metadata: {},
    ...overrides
  };
}

/** Version eines Datensatzes; `minute` bestimmt die Reihenfolge. */
export function makeVersion(minute, overrides = {}) {
  const savedAt = `2026-01-01T10:${String(minute).padStart(2, '0')}:00.000Z`;
  return {
    id: `v${minute}`,
    diagramId: 'd1',
    savedAt,
    note: '',
    snapshot: makeRecord({ updatedAt: savedAt }),
    ...overrides
  };
}
