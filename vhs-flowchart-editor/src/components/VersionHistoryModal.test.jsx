import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import VersionHistoryModal from './VersionHistoryModal';
import { indexeddb } from '../storage/indexeddb';
import { makeRecord, makeVersion, resetDatabase } from '../test/db';
import { renderWithConfirm } from '../test/render';

const renderModal = () => {
  const props = { onClose: vi.fn(), onRestore: vi.fn(), diagramId: 'd1', currentDiagram: makeRecord().diagram };
  return { props, ...renderWithConfirm(<VersionHistoryModal {...props} />) };
};

/** Die Listeneinträge in Anzeigereihenfolge. */
const versionItems = async () => within(await screen.findByRole('list')).getAllByRole('listitem');

beforeEach(async () => {
  await resetDatabase();
});

describe('VersionHistoryModal', () => {
  it('zeigt einen Hinweis, wenn es noch keine Versionen gibt', async () => {
    renderModal();
    expect(await screen.findByText(/Noch keine Versionen gespeichert/)).toBeInTheDocument();
  });

  it('listet nur Versionen des Diagramms, die neueste zuerst', async () => {
    const withLane = makeRecord();
    withLane.diagram.nodes.push({ id: 'l', type: 'lane', label: 'Verwaltung' });
    await indexeddb.saveVersion(makeVersion(1, { note: 'Erster Entwurf', snapshot: withLane }));
    await indexeddb.saveVersion(makeVersion(2, { note: 'Prüfschritt ergänzt' }));
    await indexeddb.saveVersion(makeVersion(3, { diagramId: 'anderes' }));
    renderModal();

    const items = await versionItems();
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Neueste');
    expect(items[0]).toHaveTextContent('Prüfschritt ergänzt');
    expect(items[1]).toHaveTextContent('Erster Entwurf');
    // Lanes zählen nicht als Knoten
    expect(items[1]).toHaveTextContent('3 Knoten');
  });

  it('bietet für die neueste Version kein Wiederherstellen an', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2));
    renderModal();

    const [newest, older] = await versionItems();
    expect(within(newest).queryByRole('button', { name: /wiederherstellen/ })).not.toBeInTheDocument();
    expect(within(older).getByRole('button', { name: /wiederherstellen/ })).toBeInTheDocument();
  });

  it('stellt eine ältere Version nach Bestätigung wieder her', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2));
    const { user, props } = renderModal();

    const [, older] = await versionItems();
    await user.click(within(older).getByRole('button', { name: /wiederherstellen/ }));
    const dialog = screen.getByRole('alertdialog', { name: 'Version wiederherstellen' });
    expect(dialog).toHaveTextContent('neue, noch ungespeicherte Kopie');
    await user.click(within(dialog).getByRole('button', { name: 'Wiederherstellen' }));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1', snapshot: expect.objectContaining({ id: 'd1' }) }));
  });

  it('stellt bei Abbruch nichts wieder her', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2));
    const { user, props } = renderModal();

    const [, older] = await versionItems();
    await user.click(within(older).getByRole('button', { name: /wiederherstellen/ }));
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(props.onRestore).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('speichert eine Notiz mit Enter', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    const { user } = renderModal();
    await versionItems();

    await user.click(screen.getByRole('button', { name: 'Notiz hinzufügen' }));
    await user.type(screen.getByRole('textbox', { name: 'Notiz zur Version' }), '  Rollen getauscht  {Enter}');

    expect(await screen.findByText('Rollen getauscht')).toBeInTheDocument();
    await waitFor(async () => {
      const [version] = await indexeddb.getVersionsForDiagram('d1');
      expect(version.note).toBe('Rollen getauscht');
    });
  });

  it('bricht die Notizbearbeitung mit Escape ab, ohne den Dialog zu schließen', async () => {
    await indexeddb.saveVersion(makeVersion(1, { note: 'Alt' }));
    const { user, props } = renderModal();
    await versionItems();

    await user.click(screen.getByRole('button', { name: 'Alt' }));
    const input = screen.getByRole('textbox', { name: 'Notiz zur Version' });
    await user.clear(input);
    await user.type(input, 'Neu{Escape}');

    expect(screen.getByText('Alt')).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('löscht eine Version nach Bestätigung', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2));
    const { user } = renderModal();

    const [, older] = await versionItems();
    await user.click(within(older).getByRole('button', { name: /löschen/ }));
    const dialog = screen.getByRole('alertdialog', { name: 'Version löschen' });
    await user.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await waitFor(async () => expect(await versionItems()).toHaveLength(1));
    expect((await indexeddb.getVersionsForDiagram('d1')).map((v) => v.id)).toEqual(['v2']);
  });

  it('erlaubt den Vergleich erst bei genau zwei ausgewählten Versionen', async () => {
    await indexeddb.saveVersion(makeVersion(1));
    await indexeddb.saveVersion(makeVersion(2));
    await indexeddb.saveVersion(makeVersion(3));
    const { user } = renderModal();
    await versionItems();

    const compareButton = screen.getByRole('button', { name: 'Auswahl vergleichen' });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(compareButton).toBeDisabled();

    await user.click(checkboxes[0]);
    expect(compareButton).toBeDisabled();
    await user.click(checkboxes[1]);
    expect(compareButton).toBeEnabled();

    // Eine dritte Auswahl ersetzt die älteste
    await user.click(checkboxes[2]);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });
});
