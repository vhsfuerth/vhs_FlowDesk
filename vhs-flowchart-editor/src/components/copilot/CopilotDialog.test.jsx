import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import CopilotDialog from './CopilotDialog';
import { analyzeProcess, refineProcess } from '../../ai/copilot/copilot-client';
import { normalizeProcessModel } from '../../ai/copilot/process-model';
import { AI_ABORTED } from '../../ai/gemini-client';
import { hasAiConsent, setAiConsent, setApiKey } from '../../storage/settings';
import { GOOD_RESPONSE } from '../../test/copilot-fixtures';
import { renderWithConfirm } from '../../test/render';

vi.mock('../../ai/copilot/copilot-client', () => ({ analyzeProcess: vi.fn(), refineProcess: vi.fn() }));
// JointJS lässt sich in jsdom nicht rendern – die Vorschau zeigt hier nur die Beschriftungen
vi.mock('../DiagramPreview', () => ({
  default: ({ diagram }) => (
    <ul aria-label="Vorschau">
      {diagram.nodes.map((node) => <li key={node.id}>{`${node.type}: ${node.label}`}</li>)}
    </ul>
  )
}));

const DESCRIPTION = 'Eine Anmeldung geht online ein. Die Verwaltung prüft freie Plätze und bestätigt oder setzt auf die Warteliste.';

const result = (overrides = {}) => normalizeProcessModel({ ...JSON.parse(JSON.stringify(GOOD_RESPONSE)), ...overrides });

const renderDialog = (initialText = DESCRIPTION) => {
  const props = { onClose: vi.fn(), onApply: vi.fn() };
  return { props, ...renderWithConfirm(<CopilotDialog initialText={initialText} {...props} />) };
};

const analyze = async (user) => user.click(screen.getByRole('button', { name: 'Prozess analysieren' }));

beforeEach(() => {
  localStorage.clear();
  setApiKey('AIza-test');
  setAiConsent();
  vi.mocked(analyzeProcess).mockReset();
  vi.mocked(refineProcess).mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CopilotDialog', () => {
  it('führt von der Beschreibung über Rückfragen zum fertigen Diagramm', async () => {
    vi.mocked(analyzeProcess).mockResolvedValue(result());
    vi.mocked(refineProcess).mockResolvedValue(result({ questions: [], assumptions: ['Bestätigung per E-Mail.'] }));
    const { user, props } = renderDialog();

    await user.click(screen.getByRole('radio', { name: /Bürgernah/ }));
    await analyze(user);
    expect(analyzeProcess).toHaveBeenCalledWith(DESCRIPTION, expect.objectContaining({ variantId: 'buergernah' }));

    // Rückfragen
    const question = await screen.findByRole('group', { name: 'Wie wird bestätigt?' });
    expect(question).toHaveTextContent('Betrifft: „Bestätigung senden“');
    await user.click(within(question).getByRole('radio', { name: 'E-Mail' }));
    await user.click(screen.getByRole('button', { name: 'Antworten übernehmen' }));
    expect(refineProcess).toHaveBeenCalledWith(DESCRIPTION, expect.any(Object), [{ question: 'Wie wird bestätigt?', answer: 'E-Mail' }], expect.objectContaining({ variantId: 'buergernah' }));

    // Prüfen
    expect(await screen.findByText('Bestätigung per E-Mail.')).toBeInTheDocument();
    const steps = within(screen.getByRole('region', { name: 'Erkannter Ablauf' })).getAllByRole('listitem');
    expect(steps.some((item) => item.textContent.includes('Kurs noch frei?'))).toBe(true);
    const preview = await screen.findByRole('list', { name: 'Vorschau' });
    expect(preview).toHaveTextContent('start: Anmeldung geht ein');
    expect(preview).toHaveTextContent('lane: Verwaltung');

    await user.click(screen.getByRole('button', { name: 'Diagramm übernehmen' }));
    expect(props.onApply).toHaveBeenCalledTimes(1);
    const { diagram, title } = props.onApply.mock.calls[0][0];
    expect(title).toBe('Kursanmeldung');
    expect(diagram.nodes.some((n) => n.type === 'lane')).toBe(true);
  });

  it('kann Rückfragen überspringen und zeigt sie dann als offen an', async () => {
    vi.mocked(analyzeProcess).mockResolvedValue(result());
    const { user } = renderDialog();
    await analyze(user);

    await user.click(await screen.findByRole('button', { name: 'Ohne Antworten weiter' }));

    expect(refineProcess).not.toHaveBeenCalled();
    expect(screen.getByText(/Noch offene Fragen/)).toBeInTheDocument();
    // Ohne Antwort geht „Antworten übernehmen“ ebenfalls ohne KI-Aufruf weiter
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    await user.click(screen.getByRole('button', { name: 'Antworten übernehmen' }));
    expect(refineProcess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Diagramm übernehmen' })).toBeInTheDocument();
  });

  it('übernimmt Korrekturen in Liste und Vorschau', async () => {
    vi.mocked(analyzeProcess).mockResolvedValue(result({ questions: [] }));
    const { user, props } = renderDialog();
    await analyze(user);
    await screen.findByRole('button', { name: 'Diagramm übernehmen' });

    await user.click(screen.getByRole('button', { name: 'Schritt 1 bearbeiten' }));
    const label = screen.getByRole('textbox', { name: 'Beschriftung' });
    await user.clear(label);
    await user.type(label, 'Online anmelden{Enter}');
    await user.click(screen.getByRole('button', { name: 'Schritt 3 entfernen' }));

    const preview = await screen.findByRole('list', { name: 'Vorschau' });
    expect(preview).toHaveTextContent('process: Online anmelden');
    expect(preview).not.toHaveTextContent('Bestätigung senden');

    await user.click(screen.getByRole('checkbox', { name: /Swimlanes/ }));
    expect(screen.getByRole('list', { name: 'Vorschau' })).not.toHaveTextContent('lane:');

    await user.click(screen.getByRole('button', { name: 'Diagramm übernehmen' }));
    const { diagram } = props.onApply.mock.calls[0][0];
    expect(diagram.nodes.map((n) => n.label)).toContain('Online anmelden');
    expect(diagram.nodes.some((n) => n.type === 'lane')).toBe(false);
  });

  it('zeigt Fehler verständlich an und erlaubt einen neuen Versuch', async () => {
    vi.mocked(analyzeProcess)
      .mockRejectedValueOnce(new Error('Anfrage-Limit erreicht. Bitte warte einen Moment und versuche es erneut.'))
      .mockResolvedValueOnce(result({ questions: [] }));
    const { user } = renderDialog();

    await analyze(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Anfrage-Limit erreicht');
    expect(screen.getByRole('textbox')).toHaveValue(DESCRIPTION);

    await analyze(user);
    expect(await screen.findByRole('button', { name: 'Diagramm übernehmen' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('bricht eine laufende Analyse ab, ohne Fehler zu melden', async () => {
    vi.mocked(analyzeProcess).mockImplementation((text, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error(AI_ABORTED)));
    }));
    const { user } = renderDialog();

    await analyze(user);
    expect(screen.getByRole('status')).toHaveTextContent('Prozess wird analysiert');
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    await waitFor(() => expect(screen.queryByText(/Prozess wird analysiert/)).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prozess analysieren' })).toBeEnabled();
  });

  it('verlangt einen API-Key und eine ausreichend lange Beschreibung', async () => {
    localStorage.clear();
    const { user } = renderDialog();
    await analyze(user);
    expect(screen.getByRole('alert')).toHaveTextContent('API-Key');
    expect(analyzeProcess).not.toHaveBeenCalled();

    const short = renderDialog('Zu kurz');
    expect(within(short.container).getByRole('button', { name: 'Prozess analysieren' })).toBeDisabled();
  });

  it('fragt vor der ersten Nutzung nach dem Datenschutzhinweis', async () => {
    localStorage.clear();
    setApiKey('AIza-test');
    vi.mocked(analyzeProcess).mockResolvedValue(result({ questions: [] }));
    const { user } = renderDialog();

    await analyze(user);
    const notice = screen.getByRole('alertdialog', { name: 'Datenschutzhinweis zur KI-Funktion' });
    expect(notice).toHaveTextContent('Antworten auf Rückfragen');
    await user.click(within(notice).getByRole('button', { name: 'Abbrechen' }));
    expect(analyzeProcess).not.toHaveBeenCalled();

    await analyze(user);
    await user.click(screen.getByRole('button', { name: 'Verstanden – fortfahren' }));
    expect(hasAiConsent()).toBe(true);
    await waitFor(() => expect(analyzeProcess).toHaveBeenCalled());
  });

  it('fragt vor dem Schließen nach, wenn ein Ergebnis verloren ginge', async () => {
    vi.mocked(analyzeProcess).mockResolvedValue(result({ questions: [] }));
    const { user, props } = renderDialog();

    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledTimes(1);

    await analyze(user);
    await screen.findByRole('button', { name: 'Diagramm übernehmen' });
    await user.click(screen.getByRole('button', { name: 'KI-Copilot schließen' }));
    const dialog = screen.getByRole('alertdialog', { name: 'KI-Copilot schließen?' });
    await user.click(within(dialog).getByRole('button', { name: 'Weiter bearbeiten' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'KI-Copilot schließen' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Schließen' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
