import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDB } from 'idb';
import { indexeddb } from './indexeddb';
import { CURRENT_SCHEMA_VERSION } from './schema';
import { makeRecord, makeVersion, resetDatabase } from '../test/db';

beforeEach(async () => {
  await resetDatabase();
});

describe('getAllDiagramIds', () => {
  it('liefert nur die IDs der gespeicherten Diagramme', async () => {
    await indexeddb.saveDiagram(makeRecord({ id: 'a' }));
    await indexeddb.saveDiagram(makeRecord({ id: 'b' }));
    expect((await indexeddb.getAllDiagramIds()).sort()).toEqual(['a', 'b']);
  });
});

describe('Diagramme', () => {
  it('speichert mit Formatversion und Zeitstempel und liest wieder ein', async () => {
    const saved = await indexeddb.saveDiagram(makeRecord({ schemaVersion: 0 }));
    expect(saved.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(saved.updatedAt).not.toBe('2026-01-01T10:00:00.000Z');

    const loaded = await indexeddb.getDiagram('d1');
    expect(loaded?.name).toBe('Kursanmeldung');
    expect(loaded?.diagram?.nodes).toHaveLength(3);
    // Metadaten werden beim Lesen vervollständigt
    expect(loaded?.metadata.reviewScores.clarity).toBe(2);
  });

  it('liefert null für unbekannte IDs', async () => {
    expect(await indexeddb.getDiagram('gibt-es-nicht')).toBeNull();
  });

  it('migriert alte Datensätze ohne schemaVersion beim Lesen', async () => {
    // Direkt über importBackup schreiben, damit saveDiagram die Version nicht setzt
    const { schemaVersion: _omit, ...legacy } = makeRecord({ id: 'alt' });
    await indexeddb.importBackup({ diagrams: [/** @type {any} */ (legacy)], versions: [] });
    const loaded = await indexeddb.getDiagram('alt');
    expect(loaded?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('löscht ein Diagramm samt Versionen und Entwurf', async () => {
    await indexeddb.saveDiagram(makeRecord());
    await indexeddb.saveDiagram(makeRecord({ id: 'd2', name: 'Andere' }));
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2, { id: 'fremd', diagramId: 'd2' }));
    await indexeddb.saveDraft(makeRecord());

    await indexeddb.deleteDiagram('d1');

    expect(await indexeddb.getDiagram('d1')).toBeNull();
    expect(await indexeddb.getVersionsForDiagram('d1')).toEqual([]);
    expect(await indexeddb.getDraft('d1')).toBeNull();
    // Andere Diagramme bleiben unberührt
    expect(await indexeddb.getDiagram('d2')).not.toBeNull();
    expect(await indexeddb.getVersionsForDiagram('d2')).toHaveLength(1);
  });
});

describe('Versionen', () => {
  it('liefert Versionen aufsteigend nach Speicherzeit', async () => {
    await indexeddb.saveVersion(makeVersion(3));
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2));
    const versions = await indexeddb.getVersionsForDiagram('d1');
    expect(versions.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
  });

  it('behält höchstens 10 Versionen je Diagramm und löscht die ältesten', async () => {
    for (let minute = 1; minute <= 12; minute += 1) {
      await indexeddb.saveVersion(makeVersion(minute));
    }
    const versions = await indexeddb.getVersionsForDiagram('d1');
    expect(versions).toHaveLength(10);
    expect(versions[0].id).toBe('v3');
    expect(versions[9].id).toBe('v12');
  });

  it('ändert die Notiz einer Version und ignoriert unbekannte IDs', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.updateVersionNote('v1', 'Prüfschritt ergänzt');
    await indexeddb.updateVersionNote('unbekannt', 'egal');
    const [version] = await indexeddb.getVersionsForDiagram('d1');
    expect(version.note).toBe('Prüfschritt ergänzt');
    expect(await indexeddb.getAllVersions()).toHaveLength(1);
  });

  it('löscht einzelne Versionen', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2));
    await indexeddb.deleteVersion('v1');
    expect((await indexeddb.getVersionsForDiagram('d1')).map((v) => v.id)).toEqual(['v2']);
  });
});

describe('Entwürfe', () => {
  it('ersetzt den Entwurf eines Diagramms und liest ihn migriert ein', async () => {
    await indexeddb.saveDraft(makeRecord({ name: 'Erster Entwurf' }));
    const entry = await indexeddb.saveDraft(makeRecord({ name: 'Zweiter Entwurf', schemaVersion: 0 }));
    expect(entry.diagramId).toBe('d1');

    const draft = await indexeddb.getDraft('d1');
    expect(draft?.record.name).toBe('Zweiter Entwurf');
    expect(draft?.record.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    await indexeddb.deleteDraft('d1');
    expect(await indexeddb.getDraft('d1')).toBeNull();
  });
});

describe('Sicherung', () => {
  it('spielt Diagramme und Versionen ein und überschreibt gleiche IDs', async () => {
    await indexeddb.saveDiagram(makeRecord({ name: 'Alter Stand' }));
    await indexeddb.importBackup({
      diagrams: [makeRecord({ name: 'Aus Sicherung' }), makeRecord({ id: 'd2', name: 'Neu' })],
      versions: [makeVersion(1), makeVersion(2, { diagramId: 'd2' })]
    });

    const all = await indexeddb.getAllDiagrams();
    expect(all.map((d) => d.name).sort()).toEqual(['Aus Sicherung', 'Neu']);
    expect(await indexeddb.getAllVersions()).toHaveLength(2);
  });
});

describe('Robustheit (Code-Review src/storage)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Schreibt einen Datensatz unverändert an der App vorbei in die Datenbank
  const putRaw = async (store, value) => {
    await indexeddb.getAllDiagramIds(); // Datenbank anlegen
    const db = await openDB('vhs-flowcharts-db');
    await db.put(store, value);
    db.close();
  };

  it('verwirft beim Einspielen einer Sicherung die Entwürfe der betroffenen Diagramme', async () => {
    await indexeddb.saveDraft(makeRecord({ name: 'Entwurf' }));
    await indexeddb.importBackup({ diagrams: [makeRecord({ name: 'Aus Sicherung' })], versions: [] });
    expect(await indexeddb.getDraft('d1')).toBeNull();
  });

  it('hält beim Einspielen die Grenze von 10 Versionen je Diagramm ein', async () => {
    for (let m = 0; m < 10; m++) await indexeddb.saveVersion(makeVersion(m));
    await indexeddb.importBackup({
      diagrams: [makeRecord()],
      versions: Array.from({ length: 5 }, (_, i) => makeVersion(30 + i))
    });
    const versions = await indexeddb.getVersionsForDiagram('d1');
    expect(versions).toHaveLength(10);
    expect(versions[0].id).toBe('v5');
    expect(versions[9].id).toBe('v34');
  });

  it('überspringt unlesbare Diagramme, statt die ganze Liste scheitern zu lassen', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await indexeddb.saveDiagram(makeRecord({ id: 'ok', name: 'Lesbar' }));
    await putRaw('diagrams', { ...makeRecord({ id: 'neu', name: 'Aus neuerer Version' }), schemaVersion: 99 });
    const all = await indexeddb.getAllDiagrams();
    expect(all.map((d) => d.id)).toEqual(['ok']);
  });

  it('bricht für die Sicherung ab, statt unlesbare Diagramme still wegzulassen', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await indexeddb.saveDiagram(makeRecord({ id: 'ok', name: 'Lesbar' }));
    await putRaw('diagrams', { ...makeRecord({ id: 'neu', name: 'Aus neuerer Version' }), schemaVersion: 99 });
    await expect(indexeddb.getAllDiagrams({ strict: true })).rejects.toThrow();
    expect(await indexeddb.getAllDiagrams()).toHaveLength(1);
  });

  it('zeigt Versionen ohne Schnappschuss nicht als leeres Diagramm an', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await indexeddb.saveVersion(makeVersion(1));
    await putRaw('diagram-versions', { id: 'kaputt', diagramId: 'd1', savedAt: '2026-01-01T11:00:00.000Z', note: '' });
    const versions = await indexeddb.getVersionsForDiagram('d1');
    expect(versions.map((v) => v.id)).toEqual(['v1']);
  });

  it('speichert eine Version auch dann, wenn eine andere Version unlesbar ist', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await putRaw('diagram-versions', { ...makeVersion(1), snapshot: { ...makeRecord(), schemaVersion: 99 } });
    await expect(indexeddb.saveVersion(makeVersion(2))).resolves.toBeUndefined();
  });

  it('speichert auch, wenn der Browser die Speicherschätzung verweigert', async () => {
    const original = navigator.storage;
    Object.defineProperty(navigator, 'storage', { value: { estimate: () => Promise.reject(new Error('verweigert')) }, configurable: true });
    try {
      await expect(indexeddb.saveDiagram(makeRecord())).resolves.toMatchObject({ id: 'd1' });
    } finally {
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true });
    }
  });
});
