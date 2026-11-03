import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useAutosave } from './useAutosave';
import { indexeddb } from '../storage/indexeddb';
import { SAVE_STATUS } from '../storage/autosave';
import { makeRecord } from '../test/db';

const record = makeRecord();
const savedDiagram = record.diagram;
const changedDiagram = {
  ...savedDiagram,
  nodes: [...savedDiagram.nodes, { id: 'q', type: 'process', label: 'Rechnung schreiben' }]
};

/** Rendert den Hook mit gespeichertem Stand als Vergleichsbasis. */
const renderAutosave = () => {
  const view = renderHook((props) => useAutosave(props), {
    initialProps: { record, diagram: savedDiagram, metadata: {} }
  });
  act(() => view.result.current.markClean({ name: record.name, diagram: savedDiagram, metadata: {} }));
  return view;
};

/** Lässt die Entwurfs-Verzögerung ablaufen und wartet auf den Schreibvorgang. */
const flushAutosave = () => act(async () => {
  await vi.advanceTimersByTimeAsync(1500);
});

let saveDraft;

beforeEach(() => {
  vi.useFakeTimers();
  saveDraft = vi.spyOn(indexeddb, 'saveDraft').mockImplementation(async (r) => ({ diagramId: r.id, savedAt: '', record: r }));
});

afterEach(() => {
  // Erst aushängen: Beim Aushängen schreibt der Hook ausstehende Entwürfe – das muss
  // noch die Attrappe treffen, nicht die echte IndexedDB nach Ende der Testumgebung.
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAutosave', () => {
  it('ist ohne Vergleichsstand nicht „ungespeichert“', () => {
    const { result } = renderHook(() => useAutosave({ record, diagram: savedDiagram, metadata: {} }));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.status).toBe(SAVE_STATUS.SAVED);
  });

  it('erkennt Änderungen und sichert sie verzögert als Entwurf', async () => {
    const { result, rerender } = renderAutosave();
    expect(result.current.status).toBe(SAVE_STATUS.SAVED);

    rerender({ record, diagram: changedDiagram, metadata: {} });
    expect(result.current.status).toBe(SAVE_STATUS.DIRTY);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(saveDraft).not.toHaveBeenCalled();

    await flushAutosave();
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0]).toMatchObject({ id: 'd1', diagram: { nodes: changedDiagram.nodes } });
    expect(result.current.status).toBe(SAVE_STATUS.DRAFT);
  });

  it('sichert bei schnellen Änderungen nur den letzten Stand', async () => {
    const { rerender } = renderAutosave();
    rerender({ record, diagram: changedDiagram, metadata: {} });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    const later = { ...changedDiagram, nodes: changedDiagram.nodes.slice(0, 3).concat({ id: 'z', type: 'process', label: 'Zuletzt' }) };
    rerender({ record, diagram: later, metadata: {} });

    await flushAutosave();
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0].diagram.nodes.at(-1).label).toBe('Zuletzt');
  });

  it('meldet einen fehlgeschlagenen Entwurf', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    saveDraft.mockRejectedValueOnce(new Error('Quota'));
    const { result, rerender } = renderAutosave();

    rerender({ record, diagram: changedDiagram, metadata: {} });
    await flushAutosave();

    expect(result.current.status).toBe(SAVE_STATUS.ERROR);
  });

  it('gilt nach dem Speichern wieder als gespeichert', async () => {
    const { result, rerender } = renderAutosave();
    rerender({ record, diagram: changedDiagram, metadata: {} });

    act(() => {
      result.current.cancelPendingDraft();
      result.current.markClean({ name: record.name, diagram: changedDiagram, metadata: {} });
    });
    await flushAutosave();

    expect(result.current.status).toBe(SAVE_STATUS.SAVED);
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('sichert leere Diagramme nicht als Entwurf', async () => {
    const { result, rerender } = renderAutosave();
    rerender({ record, diagram: { nodes: [], edges: [] }, metadata: {} });
    await flushAutosave();

    expect(result.current.isDirty).toBe(true);
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('markiert wiederhergestellte Stände als ungespeichert', () => {
    const { result } = renderAutosave();
    act(() => result.current.markUnsaved());
    expect(result.current.isDirty).toBe(true);
  });

  it('schreibt einen ausstehenden Entwurf sofort, wenn das Diagramm gewechselt wird', async () => {
    const { rerender } = renderAutosave();
    rerender({ record, diagram: changedDiagram, metadata: {} });

    const other = makeRecord({ id: 'd2', name: 'Anderes' });
    rerender({ record: other, diagram: other.diagram, metadata: {} });

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0].id).toBe('d1');
  });
});
