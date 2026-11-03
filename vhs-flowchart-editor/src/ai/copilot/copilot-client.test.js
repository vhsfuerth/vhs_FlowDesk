import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeProcess, refineProcess } from './copilot-client';
import { normalizeProcessModel } from './process-model';
import { AI_ABORTED, describeAiError } from '../gemini-client';
import { setApiKey, setCopilotHints } from '../../storage/settings';
import { GOOD_RESPONSE } from '../../test/copilot-fixtures';

const geminiResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] })
});

const errorResponse = (status) => ({ ok: false, status, statusText: 'Fehler', json: async () => ({ error: { message: 'Fehler' } }) });

const requestBody = (fetchMock, call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body);

describe('copilot-client', () => {
  beforeEach(() => {
    localStorage.clear();
    setApiKey('AIza-test');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sendet Antwortschema, Variante und Hinweise und liefert ein normalisiertes Modell', async () => {
    setCopilotHints('Wir sagen „Fachbereich“.');
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(GOOD_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);

    const { model, warnings } = await analyzeProcess('Eine Anmeldung geht ein …', { variantId: 'buergernah' });

    const body = requestBody(fetchMock);
    expect(body.generationConfig.responseSchema.properties.steps).toBeDefined();
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.systemInstruction.parts[0].text).toContain('Bürgernah');
    expect(body.systemInstruction.parts[0].text).toContain('Wir sagen „Fachbereich“.');
    expect(body.contents[0].parts[0].text).toBe('Eine Anmeldung geht ein …');
    expect(model).toEqual(normalizeProcessModel(JSON.parse(JSON.stringify(GOOD_RESPONSE))).model);
    expect(warnings).toEqual([]);
  });

  it('wiederholt die Anfrage ohne Schema, wenn die API es ablehnt', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(geminiResponse(GOOD_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);

    await analyzeProcess('Eine Anmeldung geht ein …');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestBody(fetchMock, 1).generationConfig.responseSchema).toBeUndefined();
  });

  it('meldet Antworten ohne verwertbare Schritte verständlich', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiResponse({ title: 'Leer', steps: [] })));
    await expect(analyzeProcess('Eine Anmeldung geht ein …')).rejects.toThrow('keine Prozessschritte');
  });

  it('meldet einen Abbruch durch den Nutzer als AI_ABORTED', async () => {
    const fetchMock = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    const pending = analyzeProcess('Eine Anmeldung geht ein …', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow(AI_ABORTED);
    expect(describeAiError(new Error(AI_ABORTED))).toBe('Die Anfrage wurde abgebrochen.');
  });

  it('schickt bei der Verfeinerung Modell und Antworten mit, aber nicht die alten Fragen', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(GOOD_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    const { model } = normalizeProcessModel(JSON.parse(JSON.stringify(GOOD_RESPONSE)));

    await refineProcess('Beschreibung', model, [{ question: 'Wie wird bestätigt?', answer: 'Per E-Mail' }]);

    const message = requestBody(fetchMock).contents[0].parts[0].text;
    expect(message).toContain('Beschreibung');
    expect(message).toContain('"Bestätigung senden"');
    expect(message).toContain('"transitions"');
    expect(message).toContain('Antwort: Per E-Mail');
    expect(message).not.toContain('"questions"');
  });

  describe('Selbstkorrektur', () => {
    const DEFECTIVE = {
      title: 'Zustimmung',
      steps: [
        { id: 's1', label: 'Zustimmung erteilt?', kind: 'task', next: 's2' },
        { id: 's2', label: 'Gespräch führen', kind: 'task', next: 'END' },
        { id: 's3', label: 'Nachfragen', kind: 'task', next: 'END' }
      ]
    };
    const FIXED = {
      title: 'Zustimmung',
      steps: [
        { id: 's1', label: 'Zustimmung erteilt?', kind: 'decision', transitions: [{ label: 'Ja', to: 's2' }, { label: 'Nein', to: 's3' }] },
        { id: 's2', label: 'Gespräch führen', kind: 'task', transitions: [{ label: '', to: 'END' }] },
        { id: 's3', label: 'Nachfragen', kind: 'task', transitions: [{ label: '', to: 'END' }] }
      ]
    };

    it('fragt bei einer fehlerfreien Antwort nur einmal an', async () => {
      const fetchMock = vi.fn().mockResolvedValue(geminiResponse(GOOD_RESPONSE));
      vi.stubGlobal('fetch', fetchMock);
      await analyzeProcess('Beschreibung');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('lässt strukturelle Fehler von der KI korrigieren und meldet den Zwischenschritt', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(geminiResponse(DEFECTIVE))
        .mockResolvedValueOnce(geminiResponse(FIXED));
      vi.stubGlobal('fetch', fetchMock);
      const onStatus = vi.fn();

      const { model, warnings } = await analyzeProcess('Wer zustimmt, bekommt ein Gespräch, sonst wird nachgefragt.', { onStatus });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const repair = requestBody(fetchMock, 1);
      expect(repair.systemInstruction.parts[0].text).toContain('Liste struktureller Fehler');
      expect(repair.contents[0].parts[0].text).toContain('Wer zustimmt, bekommt ein Gespräch');
      expect(repair.contents[0].parts[0].text).toContain('„Zustimmung erteilt?“ (id s1) hat weniger als zwei Übergänge');
      expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('korrigiert'));
      expect(model.steps[0].branches).toEqual([{ label: 'Ja', next: 's2' }, { label: 'Nein', next: 's3' }]);
      expect(warnings).toEqual([]);
    });

    it('behält die lokal reparierte Fassung, wenn die Korrektur nicht besser ist', async () => {
      const fetchMock = vi.fn().mockResolvedValue(geminiResponse(DEFECTIVE));
      vi.stubGlobal('fetch', fetchMock);

      const { model, warnings } = await analyzeProcess('Beschreibung');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(model.steps[0].kind).toBe('decision');
      expect(warnings.some((w) => w.includes('Bitte prüfen'))).toBe(true);
    });

    it('behält das erste Ergebnis, wenn die Korrektur fehlschlägt', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(geminiResponse(DEFECTIVE))
        .mockResolvedValueOnce(errorResponse(500));
      vi.stubGlobal('fetch', fetchMock);

      const { model } = await analyzeProcess('Beschreibung');
      expect(model.steps).toHaveLength(3);
    });

    it('verlangt im Schema Übergänge für jeden Schritt', async () => {
      const fetchMock = vi.fn().mockResolvedValue(geminiResponse(GOOD_RESPONSE));
      vi.stubGlobal('fetch', fetchMock);
      await analyzeProcess('Beschreibung');
      const stepSchema = requestBody(fetchMock).generationConfig.responseSchema.properties.steps.items;
      expect(stepSchema.required).toContain('transitions');
      expect(stepSchema.propertyOrdering.indexOf('label')).toBeLessThan(stepSchema.propertyOrdering.indexOf('kind'));
    });
  });
});
