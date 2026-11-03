import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { useConfirm } from '../hooks/useConfirm';
import { renderWithConfirm } from '../test/render';

// Kleine Testkomponente: löst eine Rückfrage aus und zeigt das Ergebnis an
const Asker = ({ tone = 'default' }) => {
  const confirm = useConfirm();
  const [result, setResult] = useState('offen');
  const ask = async () => {
    const confirmed = await confirm({ title: 'Wirklich?', message: 'Das kann nicht rückgängig gemacht werden.', confirmLabel: 'Ja', tone });
    setResult(confirmed ? 'bestätigt' : 'abgebrochen');
  };
  return (
    <>
      <button onClick={ask}>Fragen</button>
      <output>{result}</output>
    </>
  );
};

describe('ConfirmDialog', () => {
  it('zeigt Titel und Text als zugänglichen Dialog an', async () => {
    const { user } = renderWithConfirm(<Asker />);
    await user.click(screen.getByRole('button', { name: 'Fragen' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Wirklich?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Das kann nicht rückgängig gemacht werden.');
  });

  it('liefert true beim Bestätigen und schließt den Dialog', async () => {
    const { user } = renderWithConfirm(<Asker />);
    await user.click(screen.getByRole('button', { name: 'Fragen' }));
    await user.click(screen.getByRole('button', { name: 'Ja' }));

    expect(screen.getByRole('status')).toHaveTextContent('bestätigt');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('liefert false bei Abbrechen und bei Escape', async () => {
    const { user } = renderWithConfirm(<Asker />);
    await user.click(screen.getByRole('button', { name: 'Fragen' }));
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.getByRole('status')).toHaveTextContent('abgebrochen');

    await user.click(screen.getByRole('button', { name: 'Fragen' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('abgebrochen');
  });

  it('setzt den Fokus bei gefährlichen Aktionen auf „Abbrechen“', async () => {
    const { user } = renderWithConfirm(<Asker tone="danger" />);
    await user.click(screen.getByRole('button', { name: 'Fragen' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus());
  });

  it('setzt den Fokus sonst auf die Bestätigung und gibt ihn danach zurück', async () => {
    const { user } = renderWithConfirm(<Asker />);
    const trigger = screen.getByRole('button', { name: 'Fragen' });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ja' })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('hält den Tab-Fokus innerhalb des Dialogs', async () => {
    const { user } = renderWithConfirm(<Asker />);
    await user.click(screen.getByRole('button', { name: 'Fragen' }));
    const confirmButton = screen.getByRole('button', { name: 'Ja' });
    await waitFor(() => expect(confirmButton).toHaveFocus());

    await user.tab();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });
});
