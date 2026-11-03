// Zentrale Konfiguration der Gemini-Anbindung.
// Modelle werden in dieser Reihenfolge probiert; ein 404 (Modell nicht verfügbar
// oder abgeschaltet) führt zum nächsten Eintrag. Bei Modell-Abkündigungen durch
// Google muss nur diese Liste angepasst werden.

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite'
];

// Modell für den Verbindungstest in den Einstellungen
export const GEMINI_HEALTHCHECK_MODEL = GEMINI_MODELS[0];

export const API_TIMEOUT_MS = 30000;

// Wartezeit zwischen zwei Modellversuchen
export const MODEL_FALLBACK_DELAY_MS = 1500;
