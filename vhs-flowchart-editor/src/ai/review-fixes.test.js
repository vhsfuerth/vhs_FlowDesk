// Tests zu den Korrekturen aus dem Code-Review von src/ai (1.6.3)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkApiStatus, validateApiResponse } from './ai-client';
import { buildGenerateRequest } from './adapters';
import { getProviderPreset, validateBaseUrl } from './providers';
import { fillBranchLabels, normalizeProcessModel, END } from './copilot/process-model';
import { describeWithAnswers } from './copilot/copilot-client';
import { setApiKey } from '../storage/settings';

describe('validateApiResponse', () => {
  it('macht ohne Start den ersten Ablaufschritt zum Start, nie eine Lane', () => {
    const result = validateApiResponse({
      nodes: [
        { id: 'l1', type: 'lane', label: 'Verwaltung' },
        { id: 'n1', type: 'process', label: 'Antrag prüfen', laneId: 'l1' },
        { id: 'n2', type: 'end', label: 'Fertig', laneId: 'l1' }
      ],
      edges: [{ from: 'n1', to: 'n2' }]
    });
    expect(result.nodes.find((n) => n.id === 'l1').type).toBe('lane');
    expect(result.nodes.find((n) => n.id === 'n1').type).toBe('start');
    expect(result.nodes.find((n) => n.id === 'n1').laneId).toBe('l1');
  });

  it('wählt als Start einen Schritt ohne Vorgänger und keine Entscheidung', () => {
    const result = validateApiResponse({
      nodes: [
        { id: 'n2', type: 'decision', label: 'Plätze frei?' },
        { id: 'n1', type: 'process', label: 'Anmeldung erfassen' },
        { id: 'n3', type: 'end', label: 'Fertig' }
      ],
      edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3', label: 'Ja' }]
    });
    expect(result.nodes.find((n) => n.id === 'n1').type).toBe('start');
    expect(result.nodes.find((n) => n.id === 'n2').type).toBe('decision');
  });

  it('behält bei doppelten IDs nur das erste Element', () => {
    const result = validateApiResponse({
      nodes: [{ id: 'n1', type: 'start', label: 'A' }, { id: 'n3', type: 'process', label: 'B' }, { id: 'n3', type: 'process', label: 'C' }],
      edges: []
    });
    expect(result.nodes.map((n) => n.label)).toEqual(['A', 'B']);
  });

  it('entfernt Verbindungen von und zu Lanes', () => {
    const result = validateApiResponse({
      nodes: [{ id: 'l1', type: 'lane', label: 'L' }, { id: 'n1', type: 'start', label: 'A' }, { id: 'n2', type: 'end', label: 'B' }],
      edges: [{ from: 'n1', to: 'l1' }, { from: 'l1', to: 'n2' }, { from: 'n1', to: 'n2' }]
    });
    expect(result.edges).toEqual([{ from: 'n1', to: 'n2' }]);
  });
});

describe('Anbieter', () => {
  it('schickt OpenAI einen niedrigen Denkaufwand, im gelockerten Versuch nicht', () => {
    const preset = getProviderPreset('openai');
    const body = (relaxed) => JSON.parse(buildGenerateRequest({ preset, baseUrl: preset.baseUrl, model: 'gpt-5-mini', apiKey: 'k', system: 's', user: 'u', relaxed }).init.body);
    expect(body(false).reasoning_effort).toBe('low');
    expect(body(true).reasoning_effort).toBeUndefined();
    const mistral = getProviderPreset('mistral');
    expect(JSON.parse(buildGenerateRequest({ preset: mistral, baseUrl: mistral.baseUrl, model: 'm', apiKey: 'k', system: 's', user: 'u' }).init.body).reasoning_effort).toBeUndefined();
  });

  it('schickt den Denkaufwand nicht an OpenAI-Modelle ohne Reasoning', () => {
    const preset = getProviderPreset('openai');
    const body = (model) => JSON.parse(buildGenerateRequest({ preset, baseUrl: preset.baseUrl, model, apiKey: 'k', system: 's', user: 'u' }).init.body);
    expect(body('gpt-4o-mini').reasoning_effort).toBeUndefined();
    expect(body('gpt-4.1-mini').reasoning_effort).toBeUndefined();
    expect(body('o4-mini').reasoning_effort).toBe('low');
    expect(body('gpt-4o-mini').response_format).toBeDefined();
  });

  it('erlaubt nur lokale HTTP-Adressen, die auch die CSP zulässt', () => {
    expect(validateBaseUrl('http://localhost:11434/v1').ok).toBe(true);
    expect(validateBaseUrl('http://127.0.0.1:11434/v1').ok).toBe(true);
    expect(validateBaseUrl('http://[::1]:11434/v1').ok).toBe(false);
  });

  describe('Verbindungstest', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      localStorage.clear();
    });

    it('bricht nach dem Zeitlimit ab, auch wenn der Server nach den Kopfzeilen hängt', async () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      setApiKey('AIza-test');
      // Kopfzeilen kommen, der Inhalt nie – bis zum Abbruch
      vi.stubGlobal('fetch', vi.fn((url, init) => Promise.resolve({
        ok: true,
        status: 200,
        json: () => new Promise((_, reject) => {
          init.signal.addEventListener('abort', () => reject(Object.assign(new Error('abgebrochen'), { name: 'AbortError' })));
        })
      })));
      const pending = checkApiStatus();
      await vi.advanceTimersByTimeAsync(30000);
      const result = await pending;
      expect(result.status).toBe('error');
      expect(result.message).toContain('Zeitüberschreitung');
    });
  });
});

describe('Copilot', () => {
  it('ergänzt die fehlende Beschriftung passend zur vorhandenen', () => {
    const a = [{ label: 'Nein' }, { label: '' }];
    fillBranchLabels(a);
    expect(a.map((b) => b.label)).toEqual(['Nein', 'Ja']);
    const b = [{ label: '' }, { label: 'Ja' }];
    fillBranchLabels(b);
    expect(b.map((x) => x.label)).toEqual(['Nein', 'Ja']);
    const c = [{ label: '' }, { label: '' }];
    fillBranchLabels(c);
    expect(c.map((x) => x.label)).toEqual(['Ja', 'Nein']);
    const d = [{ label: 'Fall 2' }, { label: '' }, { label: '' }];
    fillBranchLabels(d);
    expect(new Set(d.map((x) => x.label)).size).toBe(3);
  });

  it('löst einen Schritt mit der ID „ende“ auf diesen Schritt auf, nicht auf das allgemeine Ende', () => {
    const { model } = normalizeProcessModel({
      steps: [
        { id: 'a', label: 'Antrag prüfen', next: 'ende' },
        { id: 'ende', kind: 'end', label: 'Antrag abgelehnt' }
      ]
    });
    expect(model.steps[0].next).toBe('ende');
    expect(model.steps[0].next).not.toBe(END);
  });

  it('gibt der Selbstkorrektur nach Rückfragen auch die Antworten mit', () => {
    const text = describeWithAnswers('Rechnung prüfen', [
      { question: 'Wer gibt frei?', answer: 'Die Leitung ab 500 €.' },
      { question: 'Frist?', answer: '' }
    ]);
    expect(text).toContain('Rechnung prüfen');
    expect(text).toContain('Wer gibt frei? Die Leitung ab 500 €.');
    expect(text).not.toContain('Frist?');
    expect(describeWithAnswers('Nur Text', [])).toBe('Nur Text');
  });
});
