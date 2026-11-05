import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderWithConfirm } from '../test/render';
import GuideModal from './GuideModal';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GuideModal – Suche', () => {
  it('filtert die Abschnitte, hebt Treffer hervor und leert die Suche mit Esc', async () => {
    const onClose = vi.fn();
    const { user } = renderWithConfirm(<GuideModal onClose={onClose} />);
    const search = screen.getByRole('searchbox', { name: 'Anleitung durchsuchen' });
    const allHeadings = screen.getAllByRole('heading', { level: 3 }).length;

    await user.type(search, 'Teilprozess');
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings.length).toBeLessThan(allHeadings);
    expect(headings).toContain('Elemente bearbeiten');
    expect(document.querySelectorAll('mark').length).toBeGreaterThan(0);

    await user.keyboard('{Escape}');
    expect(search).toHaveValue('');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(allHeadings);
  });

  it('findet Tastenkürzel und meldet fehlende Treffer', async () => {
    const { user } = renderWithConfirm(<GuideModal onClose={vi.fn()} />);
    const search = screen.getByRole('searchbox', { name: 'Anleitung durchsuchen' });
    await user.type(search, 'F2');
    expect(screen.getByRole('heading', { name: 'Tastenkürzel' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2); // Kopfzeile + ein Treffer

    await user.clear(search);
    await user.type(search, 'xyzzy');
    expect(screen.getByText(/Keine Treffer für „xyzzy“/)).toBeInTheDocument();
  });
});
