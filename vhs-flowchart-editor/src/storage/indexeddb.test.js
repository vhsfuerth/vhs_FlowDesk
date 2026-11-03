import { beforeEach, describe, expect, it } from 'vitest';
import { indexeddb } from './indexeddb';
import { CURRENT_SCHEMA_VERSION } from './schema';
import { makeRecord, makeVersion, resetDatabase } from '../test/db';

beforeEach(async () => {
  await resetDatabase();
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
