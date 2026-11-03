import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkApiStatus, generateFlowchartFromText, generateImprovements, listAvailableModels, validateApiResponse } from './gemini-client';
import { GEMINI_MODELS } from './config';
import { setApiKey } from '../storage/settings';

const API_KEY = 'AIza-test-key';

const geminiResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] })
});

const errorResponse = (status) => ({
  ok: false,
  status,
  statusText: 'Fehler',
  json: async () => ({ error: { message: 'Fehler' } })
});

const diagram = {
  nodes: [{ id: 'n1', type: 'start', label: 'Start' }, { id: 'n2', type: 'end', label: 'Ende' }],
  edges: [{ from: 'n1', to: 'n2' }]
};

describe('gemini-client', () => {
  beforeEach(() => {
    localStorage.clear();
    setApiKey(API_KEY);
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sendet den API-Key im Header und nie in der URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(diagram));
    vi.stubGlobal('fetch', fetchMock);

    await generateFlowchartFromText('Ein Antrag geht ein und wird geprüft.');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).not.toContain(API_KEY);
    expect(url).not.toContain('key=');
    expect(url).toContain(`/models/${GEMINI_MODELS[0]}:generateContent`);
    expect(options.headers['x-goog-api-key']).toBe(API_KEY);
  });

  it('wechselt bei 404 zum nächsten Modell der konfigurierten Liste', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(404))
      .mockResolvedValueOnce(geminiResponse(diagram));
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateFlowchartFromText('Ein Antrag geht ein und wird geprüft.');
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.nodes).toHaveLength(2);
    expect(fetchMock.mock.calls[1][0]).toContain(`/models/${GEMINI_MODELS[1]}:`);
  });

  it('weicht bei Überlastung (503) auf das nächste Modell aus', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(geminiResponse(diagram));
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateFlowchartFromText('Ein Antrag geht ein und wird geprüft.');
    await vi.runAllTimersAsync();
    await pending;

    expect(fetchMock.mock.calls[1][0]).toContain(`/models/${GEMINI_MODELS[1]}:generateContent`);
  });

  it('meldet verständlich, wenn alle Modelle überlastet sind', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(503)));
    const pending = expect(generateFlowchartFromText('Text')).rejects.toThrow(/stark ausgelastet/);
    await vi.runAllTimersAsync();
    await pending;
  });

  it('meldet, wenn kein Modell verfügbar ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(404)));
    const pending = expect(generateFlowchartFromText('Text')).rejects.toThrow(/Kein kompatibles KI-Modell/);
    await vi.runAllTimersAsync();
    await pending;
  });

  it('bricht bei anderen Fehlern sofort mit deutscher Meldung ab', async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(429));
    vi.stubGlobal('fetch', fetchMock);
    await expect(generateFlowchartFromText('Text')).rejects.toThrow(/Anfrage-Limit/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('meldet fehlenden API-Key ohne Netzwerkzugriff', async () => {
    localStorage.clear();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(generateFlowchartFromText('Text')).rejects.toThrow('API_KEY_MISSING');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('erkennt unbrauchbare KI-Antworten', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'kein JSON' }] } }] })
    }));
    await expect(generateFlowchartFromText('Text')).rejects.toThrow('INVALID_JSON_RESPONSE');
  });

  it('liefert Verbesserungsvorschläge', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiResponse({ improvements: [{ title: 'Medienbruch beseitigen' }] })));
    const result = await generateImprovements(diagram, { clarity: 1 });
    expect(result).toEqual([{ title: 'Medienbruch beseitigen' }]);
  });

  it('nutzt den Header auch für Status-Check und Modellliste', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash' }] }) });
    vi.stubGlobal('fetch', fetchMock);

    expect((await checkApiStatus()).status).toBe('ok');
    expect(await listAvailableModels()).toHaveLength(1);
    fetchMock.mock.calls.forEach(([url, options]) => {
      expect(url).not.toContain('key=');
      expect(options.headers['x-goog-api-key']).toBe(API_KEY);
    });
  });
});

describe('validateApiResponse', () => {
  it('ergänzt einen Startknoten und entfernt ungültige Verbindungen', () => {
    const result = validateApiResponse({
      nodes: [{ id: 'a', type: 'process' }, { id: 'b', type: 'end' }],
      edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'x' }]
    });
    expect(result.nodes[0].type).toBe('start');
    expect(result.edges).toEqual([{ from: 'a', to: 'b' }]);
  });

  it('ergänzt fehlende Verbindungen als leere Liste', () => {
    expect(validateApiResponse({ nodes: [] }).edges).toEqual([]);
  });

  it('lehnt Antworten ohne Knotenliste ab', () => {
    expect(() => validateApiResponse({})).toThrow('INVALID_JSON_RESPONSE');
  });
});
