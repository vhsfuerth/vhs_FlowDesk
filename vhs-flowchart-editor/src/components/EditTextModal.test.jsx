import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import EditTextModal from './EditTextModal';
import DiagramSearch from './DiagramSearch';
import { renderWithConfirm } from '../test/render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EditTextModal', () => {
  it('speichert eine Schnellauswahl mit einem Klick', async () => {
    const onSave = vi.fn();
    const { user } = renderWithConfirm(
      <EditTextModal title="Verbindungstext" initialValue="" suggestions={['Nein', 'Ja']} onSave={onSave} onCancel={vi.fn()} />
    );
    const group = screen.getByRole('group', { name: 'Schnellauswahl' });
    expect(group).toHaveTextContent('NeinJa');
    await user.click(screen.getByRole('button', { name: 'Nein' }));
    expect(onSave).toHaveBeenCalledWith('Nein');
  });

  it('zeigt ohne Vorschläge keine Schnellauswahl', () => {
    renderWithConfirm(<EditTextModal title="Text" initialValue="A" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'Schnellauswahl' })).toBeNull();
  });
});

describe('DiagramSearch', () => {
  const renderSearch = (props = {}) => {
    const handlers = { onQueryChange: vi.fn(), onNext: vi.fn(), onPrevious: vi.fn(), onClose: vi.fn() };
    const result = renderWithConfirm(
      <DiagramSearch query="Antrag" matchCount={3} currentIndex={1} focusToken={1} {...handlers} {...props} />
    );
    return { ...result, ...handlers };
  };

  it('zeigt den Trefferstand und springt mit Enter bzw. Umschalt+Enter', async () => {
    const { user, onNext, onPrevious, onClose } = renderSearch();
    const input = screen.getByRole('searchbox', { name: 'Im Diagramm suchen' });
    expect(input).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('2 von 3');
    await user.keyboard('{Enter}');
    expect(onNext).toHaveBeenCalledTimes(1);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onPrevious).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('meldet, wenn nichts gefunden wurde', () => {
    renderSearch({ matchCount: 0, currentIndex: 0 });
    expect(screen.getByRole('status')).toHaveTextContent('Keine Treffer');
    expect(screen.getByRole('button', { name: 'Nächster Treffer' })).toBeDisabled();
  });
});
