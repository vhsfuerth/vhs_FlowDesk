import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderWithConfirm } from '../test/render';
import InlineTextEditor from './InlineTextEditor';
import DiagramTextAlternative from './DiagramTextAlternative';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InlineTextEditor', () => {
  const rect = { left: 0, top: 0, width: 160, height: 60 };

  it('übernimmt mit Enter und bricht mit Esc ab', async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const first = renderWithConfirm(<InlineTextEditor rect={rect} initialValue="Alt" label="Text" onCommit={onCommit} onCancel={onCancel} />);
    expect(screen.getByRole('textbox', { name: 'Text' })).toHaveFocus();
    await first.user.keyboard('Neu{Enter}');
    expect(onCommit).toHaveBeenCalledWith('Neu');
    first.unmount();

    const second = renderWithConfirm(<InlineTextEditor rect={rect} initialValue="Alt" label="Text" onCommit={onCommit} onCancel={onCancel} />);
    await second.user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('übernimmt bei einem Klick daneben, auch wenn der Fokus nicht wechselt', async () => {
    const onCommit = vi.fn();
    const { user } = renderWithConfirm(
      <div>
        <InlineTextEditor rect={rect} initialValue="Alt" label="Text" onCommit={onCommit} onCancel={vi.fn()} />
        <div data-testid="flaeche" onPointerDown={(event) => event.preventDefault()} />
      </div>
    );
    await user.keyboard('Neu');
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('flaeche') });
    expect(onCommit).toHaveBeenCalledWith('Neu');
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('hängt beim Lostippen an den ersten Buchstaben an', async () => {
    const onCommit = vi.fn();
    const { user } = renderWithConfirm(<InlineTextEditor rect={rect} initialValue="A" selectAll={false} label="Text" onCommit={onCommit} onCancel={vi.fn()} />);
    await user.keyboard('ntrag{Enter}');
    expect(onCommit).toHaveBeenCalledWith('Antrag');
  });
});

describe('DiagramTextAlternative', () => {
  const diagram = {
    nodes: [
      { id: 's', type: 'start', label: 'Start' },
      { id: 'p', type: 'process', label: 'Antrag prüfen', duration: '2 Tage' },
      { id: 'e', type: 'end', label: 'Ende' }
    ],
    edges: [{ id: 'a', from: 's', to: 'p' }, { id: 'b', from: 'p', to: 'e' }]
  };

  it('zeigt den Ablauf als Liste und springt zum Element', async () => {
    const onFocusNode = vi.fn();
    const { user } = renderWithConfirm(<DiagramTextAlternative diagram={diagram} onFocusNode={onFocusNode} />);
    const toggle = screen.getByRole('button', { name: /Ablauf als Text/ });
    expect(toggle).toHaveTextContent('3 Schritte');
    if (toggle.getAttribute('aria-expanded') === 'false') await user.click(toggle);
    expect(screen.getByText('Dauer/Frist: 2 Tage')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '2. Antrag prüfen' }));
    expect(onFocusNode).toHaveBeenCalledWith('p');
    await user.click(toggle);
    expect(screen.queryByText('Dauer/Frist: 2 Tage')).toBeNull();
  });
});
