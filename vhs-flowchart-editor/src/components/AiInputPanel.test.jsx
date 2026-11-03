import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AiInputPanel from './AiInputPanel';
import { renderWithConfirm } from '../test/render';

describe('AiInputPanel', () => {
  it('öffnet den KI-Copilot mit dem bereits eingegebenen Text', async () => {
    const onOpenCopilot = vi.fn();
    const { user } = renderWithConfirm(<AiInputPanel onOpenCopilot={onOpenCopilot} onDiagramGenerated={vi.fn()} onError={vi.fn()} />);

    await user.type(screen.getByRole('textbox', { name: 'Prozessbeschreibung' }), 'Antrag geht ein');
    await user.click(screen.getByRole('button', { name: /Mit KI-Copilot erstellen/ }));

    expect(onOpenCopilot).toHaveBeenCalledWith('Antrag geht ein');
    // Der Text bleibt erhalten, falls der Copilot abgebrochen wird
    expect(screen.getByRole('textbox', { name: 'Prozessbeschreibung' })).toHaveValue('Antrag geht ein');
  });

  it('bietet weiterhin die direkte Erzeugung an', () => {
    renderWithConfirm(<AiInputPanel onOpenCopilot={vi.fn()} onDiagramGenerated={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Direkt erzeugen/ })).toBeDisabled();
  });
});
