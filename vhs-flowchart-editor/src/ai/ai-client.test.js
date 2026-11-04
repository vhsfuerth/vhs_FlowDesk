import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkApiStatus, describeAiError, generateFlowchartFromText, generateWithFallback, generateImprovements, listAvailableModels, validateApiResponse } from './ai-client';
import { getProviderPreset } from './providers';
import { setAiConsent, getAiConsent, getApiKey, setAiProviderSettings, setApiKey, getAiSetupProblem } from '../storage/settings';

const GEMINI_MODELS = getProviderPreset('gemini').models;

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

describe('ai-client mit Gemini', () => {
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
    const pending = expect(generateFlowchartFromText('Text')).rejects.toThrow(/Kein verfügbares KI-Modell/);
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
    expect(await listAvailableModels()).toEqual(['gemini-2.5-flash']);
    fetchMock.mock.calls.forEach(([url, options]) => {
      expect(url).not.toContain('key=');
      expect(options.headers['x-goog-api-key']).toBe(API_KEY);
    });
  });
});

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });
const openAiResponse = (payload) => okJson({ choices: [{ message: { content: typeof payload === 'string' ? payload : JSON.stringify(payload) } }] });
const anthropicResponse = (payload) => okJson({
  stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(payload) }]
});
const SCHEMA = { type: 'OBJECT', properties: { nodes: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['nodes'] };

describe('ai-client mit anderen Anbietern', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('spricht OpenAI über /chat/completions mit Bearer-Key und JSON-Schema an', async () => {
    setAiProviderSettings({ providerId: 'openai' });
    setApiKey('sk-test');
    const fetchMock = vi.fn().mockResolvedValue(openAiResponse(diagram));
    vi.stubGlobal('fetch', fetchMock);

    await generateFlowchartFromText('Ein Antrag geht ein und wird geprüft.');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(url).not.toContain('sk-test');
    expect(options.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(options.body);
    expect(body.model).toBe(getProviderPreset('openai').models[0]);
    expect(body.messages.map((m) => m.role)).toEqual(['system', 'user']);
    expect(body.response_format).toEqual({ type: 'json_object' });
    // GPT-5-Modelle lehnen eigene Temperaturen ab
    expect(body.temperature).toBeUndefined();
  });

  it('wandelt das Antwortschema für OpenAI-kompatible Schnittstellen um', async () => {
    setAiProviderSettings({ providerId: 'mistral' });
    setApiKey('mistral-key');
    const fetchMock = vi.fn().mockResolvedValue(openAiResponse(diagram));
    vi.stubGlobal('fetch', fetchMock);

    await generateWithFallback('System', 'Text', (x) => x, { responseSchema: SCHEMA });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.mistral.ai/v1/chat/completions');
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.schema).toEqual({
      type: 'object',
      properties: { nodes: { type: 'array', items: { type: 'string' } } },
      required: ['nodes'],
      additionalProperties: false
    });
    expect(body.temperature).toBe(0.2);
  });

  it('wiederholt bei 400 einmal ohne Schema und Zusatzparameter', async () => {
    setAiProviderSettings({ providerId: 'custom', baseUrl: 'https://ki.example.de/v1/', models: 'llama' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) })
      .mockResolvedValueOnce(openAiResponse('```json\n' + JSON.stringify(diagram) + '\n```'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateFlowchartFromText('Text');
    expect(result.nodes).toHaveLength(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://ki.example.de/v1/chat/completions');
    const retry = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retry.response_format).toBeUndefined();
    expect(retry.temperature).toBeUndefined();
    // Eigener Server ohne Key: kein Authorization-Header
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('spricht Claude über die Messages API mit Browser-Header an', async () => {
    setAiProviderSettings({ providerId: 'anthropic' });
    setApiKey('sk-ant-test');
    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse(diagram));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback('System', 'Text', (x) => x, { responseSchema: SCHEMA, temperature: 0.3 });
    expect(result).toEqual(diagram);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('sk-ant-test');
    expect(options.headers['anthropic-version']).toBeTruthy();
    expect(options.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    const body = JSON.parse(options.body);
    expect(body.system).toBe('System');
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body.temperature).toBeUndefined();
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.output_config.format.schema.additionalProperties).toBe(false);
  });

  it('meldet abgelehnte Anfragen von Claude verständlich', async () => {
    setAiProviderSettings({ providerId: 'anthropic' });
    setApiKey('sk-ant-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ stop_reason: 'refusal', content: [] })));
    const error = await generateFlowchartFromText('Text').catch((e) => e);
    expect(describeAiError(error)).toMatch(/abgelehnt/);
  });

  it('übersetzt Netzwerkfehler (z. B. CORS) in eine deutsche Meldung', async () => {
    setAiProviderSettings({ providerId: 'custom', baseUrl: 'https://ki.example.de/v1', models: 'llama' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await generateFlowchartFromText('Text').catch((e) => e);
    expect(describeAiError(error)).toMatch(/CORS/);
  });

  it('verlangt beim eigenen Server Adresse und Modell, aber keinen Key', () => {
    setAiProviderSettings({ providerId: 'custom' });
    expect(getAiSetupProblem()).toMatch(/Adresse/);
    setAiProviderSettings({ providerId: 'custom', baseUrl: 'http://localhost:11434/v1', models: '' });
    expect(getAiSetupProblem()).toMatch(/Modell/);
    setAiProviderSettings({ providerId: 'custom', baseUrl: 'http://localhost:11434/v1', models: 'llama3.1:8b' });
    expect(getAiSetupProblem()).toBeNull();
  });

  it('prüft den Status anderer Anbieter über die Modellliste', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data: [{ id: 'gpt-andere' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkApiStatus({ providerId: 'openai', apiKey: 'sk-test', models: '' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/models');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-test');
    expect(result.status).toBe('warning');
    expect(result.models).toEqual(['gpt-andere']);
  });
});

describe('Einstellungen der KI-Anbindung', () => {
  beforeEach(() => localStorage.clear());

  it('übernimmt den Gemini-Key aus Version 1.2.0', () => {
    localStorage.setItem('vhs-api-key', JSON.stringify('AIza-alt'));
    expect(getApiKey()).toBe('AIza-alt');
    setApiKey('sk-neu', 'openai');
    expect(getApiKey('gemini')).toBe('AIza-alt');
    expect(getApiKey('openai')).toBe('sk-neu');
    expect(localStorage.getItem('vhs-api-key')).toBeNull();
  });

  it('verlangt nach einem Anbieterwechsel eine neue Datenschutz-Bestätigung', () => {
    setAiConsent();
    expect(getAiConsent()).not.toBeNull();
    setAiProviderSettings({ providerId: 'mistral' });
    expect(getAiConsent()).toBeNull();
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
