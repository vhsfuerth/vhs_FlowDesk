// @ts-check
// KI-Anbieter: Voreinstellungen, Prüfung der Server-Adresse und Umwandlung des Antwortschemas.
// Drei Schnittstellenarten werden unterstützt:
//   - 'gemini'    Google Gemini (generateContent)
//   - 'openai'    OpenAI-kompatible Schnittstelle (/chat/completions) – OpenAI, Mistral und
//                 viele deutsche oder selbst betriebene Dienste (z. B. Ollama, IONOS, StackIT)
//   - 'anthropic' Claude (Messages API)
// Modelle werden nur hier als Voreinstellung gepflegt; Nutzende können sie in den Einstellungen ändern.

/** @typedef {'gemini' | 'openai' | 'anthropic'} ProviderKind */

/**
 * @typedef {Object} ProviderPreset
 * @property {string} id
 * @property {string} label
 * @property {ProviderKind} kind
 * @property {string} baseUrl            leer = muss von Nutzenden eingetragen werden
 * @property {string[]} models           Voreinstellung; werden der Reihe nach probiert
 * @property {boolean} keyRequired
 * @property {string} keyPlaceholder
 * @property {string} [keyUrl]           Seite, auf der man einen API-Key erhält
 * @property {boolean} sendTemperature   manche Modelle (z. B. OpenAI GPT-5) lehnen eigene Werte ab
 * @property {string} [reasoningEffort]  Denkaufwand (OpenAI `reasoning_effort`), hält Antworten im Zeitlimit
 */

/** @type {ProviderPreset[]} */
export const PROVIDERS = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    // Ein 404 (Modell nicht verfügbar) oder 503 (überlastet) führt zum nächsten Eintrag
    models: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'],
    keyRequired: true,
    keyPlaceholder: 'AIzaSy…',
    keyUrl: 'https://aistudio.google.com',
    sendTemperature: true
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5-mini'],
    keyRequired: true,
    keyPlaceholder: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
    reasoningEffort: 'low',
    sendTemperature: false
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    kind: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-medium-latest'],
    keyRequired: true,
    keyPlaceholder: 'API-Key von Mistral',
    keyUrl: 'https://console.mistral.ai/api-keys',
    sendTemperature: true
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-opus-5-5'],
    keyRequired: true,
    keyPlaceholder: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    sendTemperature: false
  },
  {
    id: 'custom',
    label: 'Eigener Server (OpenAI-kompatibel)',
    kind: 'openai',
    baseUrl: '',
    models: [],
    keyRequired: false,
    keyPlaceholder: 'falls vom Server verlangt',
    sendTemperature: true
  }
];

export const DEFAULT_PROVIDER_ID = 'gemini';

/** @param {string | undefined | null} id */
export const getProviderPreset = (id) =>
  PROVIDERS.find((p) => p.id === id) || /** @type {ProviderPreset} */ (PROVIDERS.find((p) => p.id === DEFAULT_PROVIDER_ID));

/**
 * Modellliste aus der Eingabe („a, b“ oder zeilenweise) lesen.
 * @param {string | undefined | null} text
 * @returns {string[]}
 */
export const parseModelList = (text) =>
  (text || '').split(/[,\n]/).map((m) => m.trim()).filter(Boolean);

// Genau die Adressen, die die CSP in vercel.json (connect-src) per HTTP erlaubt
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/**
 * Prüft eine eingetragene Server-Adresse. Erlaubt sind HTTPS-Adressen und – für lokal
 * betriebene Modelle – HTTP auf dem eigenen Rechner. Der Schrägstrich am Ende wird entfernt.
 * @param {string | undefined | null} url
 * @returns {{ ok: true, url: string } | { ok: false, message: string }}
 */
export const validateBaseUrl = (url) => {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return { ok: false, message: 'Bitte die Adresse des KI-Servers eintragen.' };
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, message: 'Die Server-Adresse ist ungültig (Beispiel: https://example.de/v1).' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, message: 'Die Server-Adresse darf keine Zugangsdaten enthalten – den Key bitte ins Key-Feld eintragen.' };
  }
  if (parsed.search || parsed.hash) {
    return { ok: false, message: 'Die Server-Adresse darf keine Parameter (?…) enthalten.' };
  }
  const isLocal = LOCAL_HOSTS.includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
    return { ok: false, message: 'Nur verschlüsselte Adressen (https://) sind erlaubt; http:// nur für localhost.' };
  }
  return { ok: true, url: trimmed };
};

/**
 * @typedef {Object} ProviderSettings
 * @property {string} providerId
 * @property {string} [baseUrl]   nur beim eigenen Server
 * @property {string} [models]    Eingabe der Nutzenden; leer = Voreinstellung
 */

/**
 * @typedef {Object} ResolvedProvider
 * @property {ProviderPreset} preset
 * @property {string} baseUrl
 * @property {string[]} models
 * @property {string | null} problem   deutsche Meldung, falls die Konfiguration unvollständig ist
 */

/**
 * Ermittelt aus den gespeicherten Einstellungen Adresse und Modellliste.
 * @param {ProviderSettings} settings
 * @returns {ResolvedProvider}
 */
export const resolveProvider = (settings) => {
  const preset = getProviderPreset(settings?.providerId);
  const ownModels = parseModelList(settings?.models);
  const models = ownModels.length > 0 ? ownModels : preset.models;
  let baseUrl = preset.baseUrl;
  /** @type {string | null} */
  let problem = null;

  if (!preset.baseUrl) {
    const check = validateBaseUrl(settings?.baseUrl);
    if (check.ok) baseUrl = check.url;
    else problem = check.message;
  }
  if (!problem && models.length === 0) problem = 'Bitte mindestens ein Modell eintragen.';
  return { preset, baseUrl, models, problem };
};

/**
 * Wandelt das Antwortschema (OpenAPI-Teilmenge im Gemini-Format: Typen in Großbuchstaben,
 * `propertyOrdering`) in ein JSON-Schema für OpenAI und Claude um. Objekte erhalten
 * `additionalProperties: false`; die Reihenfolge der Felder bleibt erhalten.
 * @param {any} schema
 * @returns {any}
 */
export const toJsonSchema = (schema) => {
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;

  /** @type {Record<string, any>} */
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'propertyOrdering') continue;
    if (key === 'type' && typeof value === 'string') result.type = value.toLowerCase();
    else if (key === 'properties') {
      /** @type {Record<string, any>} */
      const props = {};
      /** @type {string[]} */
      const order = Array.isArray(schema.propertyOrdering) ? schema.propertyOrdering : [];
      const names = [...order.filter((n) => n in value), ...Object.keys(value).filter((n) => !order.includes(n))];
      for (const name of names) props[name] = toJsonSchema(value[name]);
      result.properties = props;
    } else result[key] = toJsonSchema(value);
  }
  if (result.type === 'object') result.additionalProperties = false;
  return result;
};
