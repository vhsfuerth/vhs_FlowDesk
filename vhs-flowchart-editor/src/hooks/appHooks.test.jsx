import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useCanvasCommands } from './useCanvasCommands';
import { cleanFilename, useDiagramExport } from './useDiagramExport';
import { useNotification } from './useNotification';
import { usePanelResize } from './usePanelResize';
import { useSubprocess } from './useSubprocess';
import { indexeddb } from '../storage/indexeddb';
import { makeRecord, resetDatabase } from '../test/db';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useCanvasCommands', () => {
  const setup = (api) => {
    const notify = vi.fn();
    const confirm = vi.fn(() => Promise.resolve(false));
    const { result } = renderHook(() => useCanvasCommands({ canvasRef: { current: api }, notify, confirm }));
    return { commands: result.current, notify, confirm };
  };

  it('erklärt, warum Swimlane-Diagramme waagerecht angeordnet werden', () => {
    const { commands, notify } = setup({ autoLayout: () => 'LR', autoLayoutSelection: () => ({ count: 3, direction: 'LR' }) });
    commands.autoLayout('TB');
    expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('von links nach rechts'), 'info');
    commands.autoLayoutSelection('TB');
    expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('jeder Schritt bleibt in seiner Lane'), 'info');
  });

  it('meldet eine zu kleine Auswahl', () => {
    const { commands, notify } = setup({ autoLayoutSelection: () => ({ count: 0, direction: 'TB' }) });
    commands.autoLayoutSelection('TB');
    expect(notify).toHaveBeenCalledWith('Wähle mindestens zwei Elemente aus, die angeordnet werden sollen.', 'info');
  });

  it('löscht nach „Nur entfernen“ ohne Überbrücken', async () => {
    const api = { getBridgeInfo: () => ({ label: 'A' }), deleteSelected: vi.fn() };
    const { commands, confirm } = setup(api);
    await commands.deleteSelection();
    expect(confirm).toHaveBeenCalled();
    expect(api.deleteSelected).toHaveBeenCalledWith({ bridge: false });
  });
});

describe('useDiagramExport', () => {
  it('bildet Dateinamen aus dem Diagrammnamen', () => {
    expect(cleanFilename('Kurs-Anmeldung 2026')).toBe('kurs_anmeldung_2026');
    expect(cleanFilename('Prüfungsanmeldung Übersicht – Maß')).toBe('pruefungsanmeldung_uebersicht___mass');
    expect(cleanFilename('')).toBe('diagram');
  });

  it('meldet auch Fehler ohne Text beim Bildexport', async () => {
    const notify = vi.fn();
    const api = { exportAsPNG: vi.fn(() => Promise.reject(new Event('error'))) };
    const { result } = renderHook(() => useDiagramExport({
      canvasRef: { current: api }, currentDiagram: { name: 'A' }, diagramMetadata: { improvementItems: [] }, liveDiagramData: null, notify
    }));
    result.current.exportImage('png');
    await vi.waitFor(() => expect(notify).toHaveBeenCalledWith('Der Export ist fehlgeschlagen.', 'error'));
  });

  it('meldet Fehler beim Bildexport', async () => {
    const notify = vi.fn();
    const api = { exportAsPDF: vi.fn(() => Promise.reject(new Error('Kein Inhalt'))) };
    const { result } = renderHook(() => useDiagramExport({
      canvasRef: { current: api }, currentDiagram: { name: 'Ablauf' }, diagramMetadata: { improvementItems: [] }, liveDiagramData: null, notify
    }));
    result.current.exportImage('pdf');
    expect(api.exportAsPDF).toHaveBeenCalledWith('ablauf.pdf', 'Ablauf');
    await vi.waitFor(() => expect(notify).toHaveBeenCalledWith('Kein Inhalt', 'error'));
  });
});

describe('useNotification', () => {
  it('blendet die Meldung nach einer textabhängigen Zeit aus', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotification());
    act(() => result.current.showNotification('Gespeichert', 'success'));
    expect(result.current.notification).toEqual({ isVisible: true, message: 'Gespeichert', type: 'success' });
    act(() => vi.advanceTimersByTime(3999));
    expect(result.current.notification.isVisible).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.notification.isVisible).toBe(false);
  });

  it('verträgt auch Meldungen, die kein Text sind', () => {
    const { result } = renderHook(() => useNotification());
    act(() => result.current.showNotification(undefined, 'error'));
    expect(result.current.notification).toMatchObject({ isVisible: true, message: '' });
  });
});

describe('usePanelResize', () => {
  it('verbreitert das Panel beim Ziehen nach links', () => {
    const onWidthChange = vi.fn();
    const { result } = renderHook(() => usePanelResize({ width: 300, onWidthChange }));
    act(() => result.current({ clientX: 500 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 450 }));
    expect(onWidthChange).toHaveBeenLastCalledWith(350);
    window.dispatchEvent(new MouseEvent('mouseup'));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));
    expect(onWidthChange).toHaveBeenCalledTimes(1);
  });
});

describe('useSubprocess', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('meldet eine fehlende Verknüpfung', async () => {
    const notify = vi.fn();
    const { result } = renderHook(() => useSubprocess({ openDialog: vi.fn(), closeDialog: vi.fn(), selectDiagram: vi.fn(), notify }));
    await act(() => result.current.openSubprocess('gibt-es-nicht'));
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('nicht gefunden'), 'error');
  });

  it('zeigt einen Teilprozess an und wechselt auf Wunsch dorthin', async () => {
    await indexeddb.saveDiagram(makeRecord());
    const openDialog = vi.fn();
    const closeDialog = vi.fn();
    const selectDiagram = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useSubprocess({ openDialog, closeDialog, selectDiagram, notify: vi.fn() }));
    await act(() => result.current.openSubprocess('d1', 'preview'));
    expect(openDialog).toHaveBeenCalled();
    expect(result.current.subprocessView).toMatchObject({ mode: 'preview', record: { id: 'd1' } });
    await act(() => result.current.switchToSubprocess());
    expect(closeDialog).toHaveBeenCalled();
    expect(selectDiagram).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1' }));
    expect(result.current.subprocessView).toBeNull();
  });
});
