import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import DiagramListModal from './DiagramListModal';
import { indexeddb } from '../storage/indexeddb';
import { pickJsonFile } from '../storage/file-import';
import { exportToJSON } from '../export/file-export';
import { BACKUP_FORMAT } from '../storage/schema';
import { makeRecord, makeVersion, resetDatabase } from '../test/db';
import { renderWithConfirm } from '../test/render';

// Datei-Dialog und Download lassen sich in jsdom nicht bedienen
vi.mock('../storage/file-import', () => ({ pickJsonFile: vi.fn() }));
vi.mock('../export/file-export', () => ({ exportToJSON: vi.fn() }));

const renderModal = () => {
  const props = { onClose: vi.fn(), onSelect: vi.fn(), onNotify: vi.fn() };
  return { props, ...renderWithConfirm(<DiagramListModal {...props} />) };
};

/** Simuliert die Auswahl einer JSON-Datei im Datei-Dialog. */
const pickFile = (json, fileName = 'datei.json') => {
  vi.mocked(pickJsonFile).mockResolvedValueOnce({ file: /** @type {File} */ ({ name: fileName }), json });
};

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiagramListModal', () => {
  it('zeigt einen Hinweis, wenn noch nichts gespeichert ist', async () => {
    renderModal();
    expect(await screen.findByText('Noch keine Diagramme gespeichert.')).toBeInTheDocument();
  });

  it('listet gespeicherte Diagramme, das zuletzt bearbeitete zuerst', async () => {
    await indexeddb.importBackup({
      diagrams: [
        makeRecord({ id: 'a', name: 'Älteres', updatedAt: '2026-01-01T10:00:00.000Z' }),
        makeRecord({ id: 'b', name: 'Neueres', updatedAt: '2026-02-01T10:00:00.000Z' })
      ],
      versions: []
    });
    renderModal();

    const list = await screen.findByRole('list');
    const names = within(list).getAllByRole('listitem').map((item) => item.querySelector('.font-bold')?.textContent);
    expect(names).toEqual(['Neueres', 'Älteres']);
  });

  it('öffnet ein Diagramm per Klick und schließt den Dialog', async () => {
    await indexeddb.saveDiagram(makeRecord());
    const { user, props } = renderModal();

    await user.click(await screen.findByRole('button', { name: /^Kursanmeldung Bearbeitet/ }));

    expect(props.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', name: 'Kursanmeldung' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('löscht ein Diagramm erst nach Bestätigung', async () => {
    await indexeddb.saveDiagram(makeRecord());
    const { user } = renderModal();
    const deleteButton = await screen.findByRole('button', { name: '„Kursanmeldung“ löschen' });

    await user.click(deleteButton);
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(await indexeddb.getDiagram('d1')).not.toBeNull();

    await user.click(deleteButton);
    const dialog = screen.getByRole('alertdialog', { name: 'Diagramm löschen' });
    await user.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(await screen.findByText('Noch keine Diagramme gespeichert.')).toBeInTheDocument();
    expect(await indexeddb.getDiagram('d1')).toBeNull();
  });

  it('importiert eine Projektdatei immer als neuen Datensatz', async () => {
    await indexeddb.saveDiagram(makeRecord());
    const { user, props } = renderModal();
    await screen.findByRole('list');

    pickFile(makeRecord({ name: 'Importiert' }));
    await user.click(screen.getByRole('button', { name: 'Importieren' }));

    await waitFor(() => expect(props.onSelect).toHaveBeenCalled());
    const imported = props.onSelect.mock.calls[0][0];
    expect(imported.name).toBe('Importiert');
    expect(imported.id).not.toBe('d1');
    expect(await indexeddb.getAllDiagrams()).toHaveLength(2);
    expect(props.onNotify).toHaveBeenCalledWith('„Importiert“ importiert', 'success');
  });

  it('importiert ein reines Diagramm unter dem Dateinamen', async () => {
    const { user, props } = renderModal();
    await screen.findByText('Noch keine Diagramme gespeichert.');

    pickFile({ nodes: [{ id: 's', type: 'start', label: 'Start' }], edges: [] }, 'Rückmeldung.json');
    await user.click(screen.getByRole('button', { name: 'Importieren' }));

    await waitFor(() => expect(props.onSelect).toHaveBeenCalled());
    expect(props.onSelect.mock.calls[0][0].name).toBe('Rückmeldung');
  });

  it('meldet ungültige Dateien verständlich und speichert nichts', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user, props } = renderModal();
    await screen.findByText('Noch keine Diagramme gespeichert.');

    pickFile({ nodes: [{ id: 'x', type: 'kreis' }] });
    await user.click(screen.getByRole('button', { name: 'Importieren' }));

    await waitFor(() => expect(props.onNotify).toHaveBeenCalledWith(expect.stringContaining('Unbekannter Typ „kreis“'), 'error'));
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(await indexeddb.getAllDiagrams()).toEqual([]);
  });

  it('meldet Fehler beim Lesen der Datei', async () => {
    const { user, props } = renderModal();
    await screen.findByText('Noch keine Diagramme gespeichert.');

    vi.mocked(pickJsonFile).mockRejectedValueOnce(new Error('„x.json“ ist keine gültige JSON-Datei.'));
    await user.click(screen.getByRole('button', { name: 'Importieren' }));

    await waitFor(() => expect(props.onNotify).toHaveBeenCalledWith('„x.json“ ist keine gültige JSON-Datei.', 'error'));
  });

  it('spielt ein Backup nach Rückfrage ein und warnt vor dem Überschreiben', async () => {
    await indexeddb.saveDiagram(makeRecord({ name: 'Lokaler Stand' }));
    const { user, props } = renderModal();
    await screen.findByRole('list');

    pickFile({
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: '2026-03-01T09:00:00.000Z',
      diagrams: [makeRecord({ name: 'Aus Sicherung' }), makeRecord({ id: 'd2', name: 'Zweites' })],
      versions: [makeVersion(1)]
    });
    await user.click(screen.getByRole('button', { name: 'Importieren' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Backup einspielen' });
    expect(dialog).toHaveTextContent('2 Diagramme und 1 Version');
    expect(dialog).toHaveTextContent('1 Diagramm ist bereits vorhanden');
    await user.click(within(dialog).getByRole('button', { name: 'Einspielen' }));

    expect(await screen.findByText('Aus Sicherung')).toBeInTheDocument();
    expect(screen.getByText('Zweites')).toBeInTheDocument();
    expect(screen.queryByText('Lokaler Stand')).not.toBeInTheDocument();
    expect(await indexeddb.getVersionsForDiagram('d1')).toHaveLength(1);
    expect(props.onNotify).toHaveBeenCalledWith('2 Diagramme aus der Sicherung wiederhergestellt', 'success');
  });

  it('ändert nichts, wenn das Einspielen abgebrochen wird', async () => {
    await indexeddb.saveDiagram(makeRecord({ name: 'Lokaler Stand' }));
    const { user } = renderModal();
    await screen.findByRole('list');

    pickFile({ format: BACKUP_FORMAT, diagrams: [makeRecord({ name: 'Aus Sicherung' })], versions: [] });
    await user.click(screen.getByRole('button', { name: 'Importieren' }));
    await user.click(await screen.findByRole('button', { name: 'Abbrechen' }));

    expect((await indexeddb.getDiagram('d1'))?.name).toBe('Lokaler Stand');
  });

  it('erstellt ein Backup aller Diagramme und Versionen', async () => {
    await indexeddb.saveDiagram(makeRecord());
    await indexeddb.saveVersion(makeVersion(1));
    const { user, props } = renderModal();
    await screen.findByRole('list');

    await user.click(screen.getByRole('button', { name: 'Backup erstellen' }));

    await waitFor(() => expect(exportToJSON).toHaveBeenCalled());
    const [backup, fileName] = vi.mocked(exportToJSON).mock.calls[0];
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, diagrams: [expect.objectContaining({ id: 'd1' })], versions: [expect.objectContaining({ id: 'v1' })] });
    expect(fileName).toMatch(/^vhs-flowcharts-backup_\d{4}-\d{2}-\d{2}\.json$/);
    expect(props.onNotify).toHaveBeenCalledWith('Backup mit 1 Diagramm erstellt', 'success');
  });

  it('erstellt ohne gespeicherte Diagramme kein Backup', async () => {
    const { user, props } = renderModal();
    await screen.findByText('Noch keine Diagramme gespeichert.');

    await user.click(screen.getByRole('button', { name: 'Backup erstellen' }));

    await waitFor(() => expect(props.onNotify).toHaveBeenCalledWith('Es sind keine gespeicherten Diagramme vorhanden.', 'info'));
    expect(exportToJSON).not.toHaveBeenCalled();
  });

  it('schließt mit Escape', async () => {
    const { user, props } = renderModal();
    await screen.findByText('Noch keine Diagramme gespeichert.');
    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalled();
  });
});
