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
