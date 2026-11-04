// Übersetzt eine KI-Anfrage in das Format der jeweiligen Schnittstelle und liest die Antwort.
// Der API-Key steht immer im Header, nie in der URL – so landet er nicht in Proxy-,
// Server- oder Browser-Logs.

import { toJsonSchema } from './providers';

// Obergrenze der Antwortlänge (Claude verlangt sie ausdrücklich)
const MAX_OUTPUT_TOKENS = 16000;
const ANTHROPIC_VERSION = '2023-06-01';

const jsonHeaders = (extra) => ({ 'Content-Type': 'application/json', ...extra });

const authHeaders = (kind, apiKey) => {
  if (kind === 'gemini') return { 'x-goog-api-key': apiKey };
  if (kind === 'anthropic') {
    return {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      // Pflicht für Aufrufe direkt aus dem Browser; der Key gehört hier den Nutzenden selbst
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
};

/**
 * Baut die Anfrage für eine Generierung.
 * `relaxed` lässt alle optionalen Vorgaben weg (Antwortschema, JSON-Modus, Temperatur,
 * Denkaufwand) – für Modelle oder Server, die diese Parameter ablehnen (HTTP 400).
 * @returns {{ url: string, init: RequestInit, relaxable: boolean }}
 */
export function buildGenerateRequest({ preset, baseUrl, model, apiKey, system, user, options = {}, relaxed = false }) {
  const temperature = options.temperature ?? 0.2;

  if (preset.kind === 'gemini') {
    const generationConfig = { responseMimeType: 'application/json', temperature };
    if (options.responseSchema && !relaxed) generationConfig.responseSchema = options.responseSchema;
    return {
      url: `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
      init: {
        method: 'POST',
        headers: jsonHeaders(authHeaders('gemini', apiKey)),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig
        })
      },
      // Gemini kennt JSON-Modus und Temperatur sicher – nur das Schema kann abgelehnt werden
      relaxable: Boolean(options.responseSchema) && !relaxed
    };
  }

  if (preset.kind === 'anthropic') {
    const body = {
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: 'user', content: user }]
    };
    if (!relaxed) {
      // Niedriger Denkaufwand hält die Antwortzeit innerhalb der Zeitlimits der App
      body.output_config = { effort: 'low' };
      if (options.responseSchema) {
        body.output_config.format = { type: 'json_schema', schema: toJsonSchema(options.responseSchema) };
      }
    }
    return {
      url: `${baseUrl}/messages`,
      init: { method: 'POST', headers: jsonHeaders(authHeaders('anthropic', apiKey)), body: JSON.stringify(body) },
      relaxable: !relaxed
    };
  }

  // OpenAI-kompatibel
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };
  if (!relaxed) {
    body.response_format = options.responseSchema
      ? { type: 'json_schema', json_schema: { name: 'antwort', schema: toJsonSchema(options.responseSchema), strict: false } }
      : { type: 'json_object' };
    if (preset.sendTemperature) body.temperature = temperature;
  }
  return {
    url: `${baseUrl}/chat/completions`,
    init: { method: 'POST', headers: jsonHeaders(authHeaders('openai', apiKey)), body: JSON.stringify(body) },
    relaxable: !relaxed
  };
}

/**
 * Liest den Antworttext aus der Antwort der Schnittstelle.
 * @returns {string | null}
 */
export function extractText(kind, data) {
  if (kind === 'gemini') {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    return parts.filter((p) => typeof p?.text === 'string' && !p.thought).map((p) => p.text).join('') || null;
  }
  if (kind === 'anthropic') {
    if (data?.stop_reason === 'refusal') throw new Error('AI_REFUSED');
    const blocks = Array.isArray(data?.content) ? data.content : [];
    return blocks.filter((b) => b?.type === 'text').map((b) => b.text).join('') || null;
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content || null;
  // Manche Server liefern den Inhalt als Liste von Textteilen
  if (Array.isArray(content)) return content.map((c) => c?.text || '').join('') || null;
  return null;
}

/**
 * Liest JSON aus einem Antworttext. Ohne Antwortschema verpacken manche Modelle das JSON
 * in einen Markdown-Codeblock oder schreiben einen Satz davor.
 */
export function parseJsonText(text) {
  const trimmed = (text || '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // fällt unten durch
      }
    }
    throw new Error('INVALID_JSON_RESPONSE');
  }
}

/** Anfrage für die Liste der Modelle, die der Key nutzen darf. */
export function buildListModelsRequest({ preset, baseUrl, apiKey }) {
  const url = preset.kind === 'anthropic' ? `${baseUrl}/models?limit=100` : `${baseUrl}/models`;
  return { url, init: { method: 'GET', headers: authHeaders(preset.kind, apiKey) } };
}

/** @returns {string[]} Modellnamen ohne Präfix */
export function parseModelIds(kind, data) {
  if (kind === 'gemini') {
    return (Array.isArray(data?.models) ? data.models : []).map((m) => String(m?.name || '').split('/').pop()).filter(Boolean);
  }
  return (Array.isArray(data?.data) ? data.data : []).map((m) => String(m?.id || '')).filter(Boolean);
}

/** Kurze Testanfrage für Gemini (dort sagt die Modellliste nichts über die Freischaltung aus). */
export function buildGeminiHealthcheckRequest({ baseUrl, model, apiKey }) {
  return {
    url: `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
    init: {
      method: 'POST',
      headers: jsonHeaders(authHeaders('gemini', apiKey)),
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Respond with only 'OK'" }] }],
        generationConfig: { maxOutputTokens: 5 }
      })
    }
  };
}
