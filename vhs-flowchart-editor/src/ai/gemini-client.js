import { getApiKey, getCustomPrompt } from '../storage/settings';
import { SYSTEM_PROMPT, IMPROVEMENT_PROMPT } from './prompts';
import {
    API_TIMEOUT_MS,
    GEMINI_API_BASE,
    GEMINI_HEALTHCHECK_MODEL,
    GEMINI_MODELS,
    MODEL_FALLBACK_DELAY_MS
} from './config';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mapApiStatusToMessage = (status) => {
    if (status === 400) return 'Die Anfrage war ungültig. Bitte überprüfe den API-Key.';
    if (status === 401 || status === 403) return 'Zugriff verweigert. Bitte überprüfe deinen API-Key.';
    if (status === 429) return 'Anfrage-Limit erreicht. Bitte warte einen Moment und versuche es erneut.';
    if (status >= 500) return 'Der KI-Dienst ist momentan nicht erreichbar. Bitte versuche es später.';
    return 'Bei der KI-Generierung ist ein Fehler aufgetreten. Bitte versuche es erneut.';
};

// Der Key wird im Header übertragen, nicht als URL-Parameter –
// so landet er nicht in Proxy-, Server- oder Browser-Logs.
const buildHeaders = (apiKey) => ({
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
});

async function callGeminiApi(modelName, apiKey, prompt, userText) {
    const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        return await fetch(url, {
            method: 'POST',
            headers: buildHeaders(apiKey),
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: prompt }] },
                contents: [{ role: 'user', parts: [{ text: userText }] }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            }),
            signal: controller.signal
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Zeitüberschreitung: ${modelName} hat nicht innerhalb von ${API_TIMEOUT_MS / 1000}s geantwortet.`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Probiert die konfigurierten Modelle der Reihe nach durch. Nur ein 404
// (Modell nicht verfügbar) führt zum nächsten Modell, alle anderen Fehler brechen ab.
async function generateWithFallback(prompt, userText, parseResult) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API_KEY_MISSING');

    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const model = GEMINI_MODELS[i];
        if (i > 0) await delay(MODEL_FALLBACK_DELAY_MS);

        const response = await callGeminiApi(model, apiKey, prompt, userText);

        if (response.ok) {
            const data = await response.json();
            const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!contentText) throw new Error('INVALID_JSON_RESPONSE');
            let parsed;
            try {
                parsed = JSON.parse(contentText);
            } catch {
                throw new Error('INVALID_JSON_RESPONSE');
            }
            return parseResult(parsed);
        }

        if (response.status === 404) {
            console.warn(`Modell ${model} nicht verfügbar, versuche nächstes…`);
            continue;
        }

        const errorData = await response.json().catch(() => ({}));
        console.error(`Gemini API Error (${response.status}):`, errorData.error?.message || response.statusText);
        throw new Error(mapApiStatusToMessage(response.status));
    }

    throw new Error('Kein kompatibles KI-Modell gefunden. Bitte die Modellliste in src/ai/config.js prüfen.');
}

export const generateFlowchartFromText = (text) => {
    const activePrompt = getCustomPrompt() || SYSTEM_PROMPT;
    return generateWithFallback(activePrompt, text, validateApiResponse);
};

const SCORE_LABELS = {
    clarity: 'Klarheit',
    mediaBreaks: 'Medienbruch',
    risk: 'Risiko',
    participantFocus: 'Teilnehmendenorientierung',
    ownership: 'Verantwortlichkeit'
};

export const generateImprovements = (diagramData, reviewScores) => {
    const scoresText = Object.entries(reviewScores)
        .map(([k, v]) => `${SCORE_LABELS[k] || k}: ${v}/3`)
        .join(', ');
    const userText = `Diagramm (JSON):\n${JSON.stringify(diagramData, null, 2)}\n\nQualitätsbewertung:\n${scoresText}`;

    return generateWithFallback(IMPROVEMENT_PROMPT, userText, (parsed) => {
        if (!parsed.improvements || !Array.isArray(parsed.improvements)) {
            throw new Error('INVALID_JSON_RESPONSE');
        }
        return parsed.improvements;
    });
};

export const checkApiStatus = async (overrideKey) => {
    const apiKey = overrideKey !== undefined ? overrideKey.trim() : getApiKey();
    if (!apiKey) return { status: 'missing', message: 'Kein API-Key vorhanden.' };

    try {
        const response = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_HEALTHCHECK_MODEL}:generateContent`, {
            method: 'POST',
            headers: buildHeaders(apiKey),
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Respond with only 'OK'" }] }],
                generationConfig: { maxOutputTokens: 5 }
            })
        });

        if (response.ok) {
            return { status: 'ok', message: 'API-Key ist aktiv und bereit.' };
        }

        const errorData = await response.json().catch(() => ({}));
        console.error('API-Status-Check Fehler:', errorData.error?.message || response.statusText);
        if (response.status === 429) return { status: 'limit', message: 'Anfrage-Limit erreicht. Bitte warte einen Moment.' };
        if (response.status === 400 || response.status === 403) return { status: 'invalid', message: 'API-Key ungültig oder nicht berechtigt.' };
        if (response.status === 404) return { status: 'error', message: `Modell ${GEMINI_HEALTHCHECK_MODEL} ist nicht verfügbar.` };
        return { status: 'error', message: 'Der KI-Dienst ist momentan nicht erreichbar.' };
    } catch (error) {
        return { status: 'error', message: `Verbindung fehlgeschlagen: ${error.message}` };
    }
};

export const listAvailableModels = async (overrideKey) => {
    const apiKey = overrideKey !== undefined ? overrideKey.trim() : getApiKey();
    if (!apiKey) return [];

    try {
        const response = await fetch(`${GEMINI_API_BASE}/models`, { headers: buildHeaders(apiKey) });
        if (!response.ok) return [];
        const data = await response.json();
        return data.models || [];
    } catch {
        return [];
    }
};

export const validateApiResponse = (json) => {
    if (!json || !Array.isArray(json.nodes)) {
        throw new Error('INVALID_JSON_RESPONSE');
    }

    // Ensure minimal viable graph
    const hasStart = json.nodes.some(n => n.type === 'start');
    if (!hasStart && json.nodes.length > 0) {
        json.nodes[0].type = 'start';
    }

    // Filter out bad edges
    if (Array.isArray(json.edges)) {
        json.edges = json.edges.filter(edge => {
            const hasSource = json.nodes.some(n => n.id === edge.from);
            const hasTarget = json.nodes.some(n => n.id === edge.to);
            return hasSource && hasTarget;
        });
    } else {
        json.edges = [];
    }

    return json;
};
