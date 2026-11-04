import { DEFAULT_PROVIDER_ID, getProviderPreset, resolveProvider } from '../ai/providers';

const SETTINGS_KEY = 'vhs-settings';
// Bis 1.2.0 gab es nur einen Gemini-Key; er wird beim Lesen als Gemini-Key übernommen
const LEGACY_API_KEY_KEY = 'vhs-api-key';
const API_KEYS_KEY = 'vhs-api-keys';
const AI_PROVIDER_KEY = 'vhs-ai-provider';
const CUSTOM_PROMPT_KEY = 'vhs-custom-prompt';
const LAST_DIAGRAM_KEY = 'vhs-last-diagram';

const getLocalStorageItem = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
}

const setLocalStorageItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
    }
}

/**
 * Gewählter KI-Anbieter: { providerId, baseUrl, models }. `baseUrl` gilt nur für den
 * eigenen Server, `models` ist die Eingabe der Nutzenden (leer = Voreinstellung).
 */
export const getAiProviderSettings = () => {
    const stored = getLocalStorageItem(AI_PROVIDER_KEY, null) || {};
    return {
        providerId: getProviderPreset(stored.providerId).id,
        baseUrl: typeof stored.baseUrl === 'string' ? stored.baseUrl : '',
        models: typeof stored.models === 'string' ? stored.models : ''
    };
};
export const setAiProviderSettings = ({ providerId, baseUrl = '', models = '' }) =>
    setLocalStorageItem(AI_PROVIDER_KEY, { providerId: getProviderPreset(providerId).id, baseUrl: baseUrl.trim(), models: models.trim() });

/** Alle gespeicherten API-Keys, je Anbieter. */
export const getApiKeys = () => {
    const keys = { ...(getLocalStorageItem(API_KEYS_KEY, null) || {}) };
    if (keys[DEFAULT_PROVIDER_ID] === undefined) {
        const legacy = getLocalStorageItem(LEGACY_API_KEY_KEY, '');
        if (legacy) keys[DEFAULT_PROVIDER_ID] = legacy;
    }
    return keys;
};

/** API-Key des angegebenen (Standard: des gewählten) Anbieters. */
export const getApiKey = (providerId = getAiProviderSettings().providerId) =>
    String(getApiKeys()[providerId] || '').trim();

export const setApiKey = (key, providerId = getAiProviderSettings().providerId) => {
    setLocalStorageItem(API_KEYS_KEY, { ...getApiKeys(), [providerId]: (key || '').trim() });
    try {
        localStorage.removeItem(LEGACY_API_KEY_KEY);
    } catch {
        // ohne Speicherzugriff bleibt der alte Eintrag einfach liegen
    }
};

/**
 * Prüft, ob die KI-Anbindung vollständig eingerichtet ist.
 * @returns {string | null} deutsche Meldung oder null, wenn alles passt
 */
export const getAiSetupProblem = () => {
    const settings = getAiProviderSettings();
    const { preset, problem } = resolveProvider(settings);
    if (problem) return `${problem} (Einstellungen, Zahnrad oben rechts)`;
    if (preset.keyRequired && !getApiKey(preset.id)) {
        return `Für ${preset.label} wird ein API-Key benötigt. Bitte in den Einstellungen (Zahnrad oben rechts) hinterlegen.`;
    }
    return null;
};

export const getCustomPrompt = () => getLocalStorageItem(CUSTOM_PROMPT_KEY, '');
export const setCustomPrompt = (prompt) => setLocalStorageItem(CUSTOM_PROMPT_KEY, prompt);

// Zusätzliche Hinweise an den KI-Copilot (z. B. Hausbegriffe); werden an die Prompts angehängt
const COPILOT_HINTS_KEY = 'vhs-copilot-hints';
export const getCopilotHints = () => getLocalStorageItem(COPILOT_HINTS_KEY, '') || '';
export const setCopilotHints = (hints) => setLocalStorageItem(COPILOT_HINTS_KEY, hints);

export const getLastDiagramId = () => getLocalStorageItem(LAST_DIAGRAM_KEY, null);
export const setLastDiagramId = (id) => setLocalStorageItem(LAST_DIAGRAM_KEY, id);

export const getSettings = () => getLocalStorageItem(SETTINGS_KEY, {
    gridVisible: true,
    autoLayout: true
});
export const saveSettings = (newSettings) => {
    const current = getSettings();
    setLocalStorageItem(SETTINGS_KEY, { ...current, ...newSettings });
};

// Bestätigung des KI-Datenschutzhinweises. Wird der Hinweistext inhaltlich
// geändert, AI_PRIVACY_NOTICE_VERSION erhöhen – dann wird erneut gefragt.
const AI_CONSENT_KEY = 'vhs-ai-privacy-consent';
// Die Bestätigung gilt nur für den Anbieter, für den sie gegeben wurde.
export const AI_PRIVACY_NOTICE_VERSION = 3;

export const getAiConsent = () => {
    const consent = getLocalStorageItem(AI_CONSENT_KEY, null);
    if (consent?.version !== AI_PRIVACY_NOTICE_VERSION) return null;
    return consent.providerId === getAiProviderSettings().providerId ? consent : null;
};
export const hasAiConsent = () => getAiConsent() !== null;
export const setAiConsent = () => setLocalStorageItem(AI_CONSENT_KEY, {
    version: AI_PRIVACY_NOTICE_VERSION,
    providerId: getAiProviderSettings().providerId,
    acceptedAt: new Date().toISOString()
});
export const revokeAiConsent = () => {
    try {
        localStorage.removeItem(AI_CONSENT_KEY);
    } catch (error) {
        console.warn('Error removing AI consent:', error);
    }
};
