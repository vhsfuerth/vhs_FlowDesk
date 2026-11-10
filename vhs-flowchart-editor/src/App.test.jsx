// Verhaltenstest für App: Die Arbeitsfläche ist eine Attrappe mit derselben Imperative-API.
// Er sichert das Zusammenspiel von Laden, Speichern, Tastenkürzeln, Löschen und Exporten ab.
import React, { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithConfirm } from './test/render';
import { makeRecord, resetDatabase } from './test/db';
import { indexeddb } from './storage/indexeddb';
import { setLastDiagramId } from './storage/settings';

const canvas = vi.hoisted(() => ({ api: null, data: { nodes: [], edges: [] } }));

vi.mock('./components/DiagramCanvas', () => ({
  default: forwardRef(function FakeCanvas(_props, ref) {
    useImperativeHandle(ref, () => canvas.api, []);
    return <div id="vhs-canvas-scroll" data-testid="canvas" tabIndex={-1} />;
  })
}));

const createApi = () => ({
  loadDiagram: vi.fn((record) => { canvas.data = record.diagram || { nodes: [], edges: [] }; }),
  loadGeneratedData: vi.fn((data) => { canvas.data = data; }),
  getCurrentData: vi.fn(() => canvas.data),
  getZoom: vi.fn(() => 1),
  clear: vi.fn(() => { canvas.data = { nodes: [], edges: [] }; }),
  setPresentationFocus: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  openSearch: vi.fn(),
  editSelection: vi.fn(() => true),
  copySelection: vi.fn(() => 2),
  paste: vi.fn(() => 1),
  duplicateSelection: vi.fn(),
  selectAll: vi.fn(),
  clearSelection: vi.fn(),
  moveSelection: vi.fn(() => true),
  fitToView: vi.fn(() => true),
  center: vi.fn(),
  getBridgeInfo: vi.fn(() => null),
  deleteSelected: vi.fn(),
  autoLayout: vi.fn((direction) => direction),
  autoLayoutSelection: vi.fn(() => ({ count: 0, direction: 'TB' })),
  alignSelection: vi.fn(),
  distributeSelection: vi.fn(),
  addNodeAtCenter: vi.fn(),
  revealNode: vi.fn(),
  exportAsPNG: vi.fn(() => Promise.resolve()),
  exportAsSVG: vi.fn(() => Promise.resolve()),
  exportAsPDF: vi.fn(() => Promise.resolve()),
  captureDiagramImage: vi.fn(() => Promise.resolve(null))
});

const renderApp = async () => {
  const { default: App } = await import('./App');
  const result = renderWithConfirm(<App />);
  // Startdiagramm ist geladen
  await waitFor(() => expect(canvas.api.loadDiagram).toHaveBeenCalled());
  return result;
};

const key = (init) => fireEvent.keyDown(document.body, init);

beforeEach(async () => {
  await resetDatabase();
  localStorage.clear();
  canvas.data = { nodes: [], edges: [] };
  canvas.api = createApi();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('startet mit einem neuen Diagramm', async () => {
    await renderApp();
    expect(canvas.api.loadDiagram).toHaveBeenCalledWith(expect.objectContaining({ name: 'Neues Diagramm', diagram: null }));
  });

  it('öffnet das zuletzt bearbeitete Diagramm', async () => {
    await indexeddb.saveDiagram(makeRecord());
    setLastDiagramId('d1');
    await renderApp();
    expect(canvas.api.loadDiagram).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', name: 'Kursanmeldung' }));
  });

  it('speichert mit Strg+S in IndexedDB und legt eine Version an', async () => {
    await renderApp();
    canvas.data = makeRecord().diagram;
    key({ key: 's', ctrlKey: true });
    expect(await screen.findByText('Diagramm erfolgreich gespeichert')).toBeInTheDocument();
    const all = await indexeddb.getAllDiagrams();
    expect(all).toHaveLength(1);
    expect(all[0].diagram.nodes).toHaveLength(3);
    expect(await indexeddb.getVersionsForDiagram(all[0].id)).toHaveLength(1);
  });

  it('speichert bei schnell wiederholtem Strg+S nur einmal', async () => {
    await renderApp();
    canvas.data = makeRecord().diagram;
    const save = vi.spyOn(indexeddb, 'saveDiagram');
    key({ key: 's', ctrlKey: true });
    key({ key: 's', ctrlKey: true });
    key({ key: 's', ctrlKey: true });
    expect(await screen.findByText('Diagramm erfolgreich gespeichert')).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('übersteht Tastenereignisse ohne Taste (Autofill)', async () => {
    await renderApp();
    const event = new KeyboardEvent('keydown', { bubbles: true });
    Object.defineProperty(event, 'key', { value: undefined });
    // Fehler in Listenern landen nicht beim Aufrufer, sondern als error-Ereignis am Fenster
    const errors = [];
    const onError = (e) => { errors.push(e.error); e.preventDefault(); };
    window.addEventListener('error', onError);
    window.dispatchEvent(event);
    window.removeEventListener('error', onError);
    expect(errors).toEqual([]);
  });

  it('leitet Tastenkürzel an die Arbeitsfläche weiter', async () => {
    await renderApp();
    key({ key: 'z', ctrlKey: true });
    expect(canvas.api.undo).toHaveBeenCalled();
    key({ key: 'y', ctrlKey: true });
    key({ key: 'z', ctrlKey: true, shiftKey: true });
    expect(canvas.api.redo).toHaveBeenCalledTimes(2);
    key({ key: 'f', ctrlKey: true });
    expect(canvas.api.openSearch).toHaveBeenCalled();
    key({ key: 'd', ctrlKey: true });
    expect(canvas.api.duplicateSelection).toHaveBeenCalled();
    key({ key: 'a', ctrlKey: true });
    expect(canvas.api.selectAll).toHaveBeenCalled();
    key({ key: 'Escape' });
    expect(canvas.api.clearSelection).toHaveBeenCalled();
    key({ key: 'ArrowLeft' });
    key({ key: 'ArrowDown', shiftKey: true });
    expect(canvas.api.moveSelection).toHaveBeenCalledWith(-10, 0);
    expect(canvas.api.moveSelection).toHaveBeenCalledWith(0, 1);
    key({ key: '!', code: 'Digit1', ctrlKey: true, shiftKey: true });
    expect(canvas.api.fitToView).toHaveBeenCalled();
    key({ key: 'F2' });
    key({ key: 'x' });
    expect(canvas.api.editSelection).toHaveBeenCalledWith();
    expect(canvas.api.editSelection).toHaveBeenCalledWith('x');
  });

  it('meldet Kopieren und Einfügen', async () => {
    await renderApp();
    key({ key: 'c', ctrlKey: true });
    expect(await screen.findByText('2 Elemente kopiert')).toBeInTheDocument();
    key({ key: 'v', ctrlKey: true });
    expect(await screen.findByText('1 Element eingefügt')).toBeInTheDocument();
  });

  it('ignoriert Tastenkürzel in Eingabefeldern (außer Strg+S)', async () => {
    await renderApp();
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'Delete' });
    expect(canvas.api.undo).not.toHaveBeenCalled();
    expect(canvas.api.deleteSelected).not.toHaveBeenCalled();
    input.remove();
  });

  it('bearbeitet Text nur, wenn der Fokus auf der Arbeitsfläche liegt', async () => {
    await renderApp();
    const button = screen.getByRole('button', { name: 'Inhalt zentrieren' });
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(canvas.api.editSelection).not.toHaveBeenCalled();
    screen.getByTestId('canvas').focus();
    fireEvent.keyDown(screen.getByTestId('canvas'), { key: 'Enter' });
    expect(canvas.api.editSelection).toHaveBeenCalled();
  });

  it('löscht ohne Nachfrage, wenn nichts zu überbrücken ist', async () => {
    await renderApp();
    key({ key: 'Delete' });
    expect(canvas.api.deleteSelected).toHaveBeenCalledWith();
  });

  it('fragt beim Löschen eines Zwischenschritts nach und verbindet auf Wunsch', async () => {
    const { user } = await renderApp();
    canvas.api.getBridgeInfo.mockReturnValue({ label: 'Antrag prüfen' });
    key({ key: 'Delete' });
    await user.click(await screen.findByRole('button', { name: 'Entfernen und Ablauf verbinden' }));
    expect(canvas.api.deleteSelected).toHaveBeenCalledWith({ bridge: true });
  });

  it('meldet das Ergebnis des Anordnens', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole('button', { name: /Anordnen/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Automatisch anordnen – von oben nach unten' }));
    expect(canvas.api.autoLayout).toHaveBeenCalledWith('TB');
    expect(await screen.findByText('Diagramm angeordnet. Rückgängig mit Strg+Z.')).toBeInTheDocument();
  });

  it('meldet „Alles einpassen“ bei leerem Diagramm', async () => {
    const { user } = await renderApp();
    canvas.api.fitToView.mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'Ganzes Diagramm einpassen' }));
    expect(await screen.findByText('Das Diagramm ist noch leer.')).toBeInTheDocument();
  });

  it('exportiert Bilder mit dem Dateinamen des Diagramms', async () => {
    await indexeddb.saveDiagram(makeRecord({ name: 'Kurs Anmeldung' }));
    setLastDiagramId('d1');
    const { user } = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Als PNG exportieren' }));
    expect(canvas.api.exportAsPNG).toHaveBeenCalledWith('kurs_anmeldung.png', 'Kurs Anmeldung');
  });

  it('meldet einen leeren Export der Prozessbeschreibung', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole('button', { name: /Beschreibung/ }));
    await user.click(screen.getByRole('menuitem', { name: /Word-Dokument/ }));
    expect(await screen.findByText('Das Diagramm enthält noch keine Schritte.')).toBeInTheDocument();
  });

  it('leert die Arbeitsfläche rückgängig machbar', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole('button', { name: /Neues Blatt/ }));
    expect(canvas.api.clear).toHaveBeenCalled();
    expect(await screen.findByText('Arbeitsfläche geleert (Rückgängig möglich).')).toBeInTheDocument();
  });
});
