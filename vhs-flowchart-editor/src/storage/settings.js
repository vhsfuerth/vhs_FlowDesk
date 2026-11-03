const SETTINGS_KEY = 'vhs-settings';
const API_KEY_KEY = 'vhs-api-key';
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

export const getApiKey = () => (getLocalStorageItem(API_KEY_KEY, '') || '').trim();
export const setApiKey = (key) => setLocalStorageItem(API_KEY_KEY, key);

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
export const AI_PRIVACY_NOTICE_VERSION = 2;

export const getAiConsent = () => {
    const consent = getLocalStorageItem(AI_CONSENT_KEY, null);
    return consent?.version === AI_PRIVACY_NOTICE_VERSION ? consent : null;
};
export const hasAiConsent = () => getAiConsent() !== null;
export const setAiConsent = () => setLocalStorageItem(AI_CONSENT_KEY, {
    version: AI_PRIVACY_NOTICE_VERSION,
    acceptedAt: new Date().toISOString()
});
export const revokeAiConsent = () => {
    try {
        localStorage.removeItem(AI_CONSENT_KEY);
    } catch (error) {
        console.warn('Error removing AI consent:', error);
    }
};
