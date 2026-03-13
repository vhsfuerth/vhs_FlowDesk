import { getApiKey, getCustomPrompt } from '../storage/settings';
import { SYSTEM_PROMPT } from './prompts';

const API_TIMEOUT_MS = 30000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiApi(modelName, apiKey, prompt, userText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: prompt }] },
                contents: [{ role: 'user', parts: [{ text: userText }] }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            }),
            signal: controller.signal
        });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Zeitüberschreitung: ${modelName} hat nicht innerhalb von ${API_TIMEOUT_MS / 1000}s geantwortet.`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export const generateFlowchartFromText = async (text) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API_KEY_MISSING');
    
    const activePrompt = getCustomPrompt() || SYSTEM_PROMPT;
    // Updated based on diagnosis for this specific key
    const modelsToTry = [
        'gemini-2.5-flash', 
        'gemini-2.0-flash', 
        'gemini-1.5-flash', 
        'gemini-1.5-flash-latest'
    ];
    
    let lastError = null;
    for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
            if (i > 0) await delay(1500);

            const response = await callGeminiApi(model, apiKey, activePrompt, text);

            if (response.ok) {
                const data = await response.json();
                const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!contentText) throw new Error('INVALID_JSON_RESPONSE');
                return validateApiResponse(JSON.parse(contentText));
            }

            if (response.status === 404) {
                console.warn(`Model ${model} not found, trying next...`);
                continue;
            }

            const errorData = await response.json().catch(() => ({}));
            const apiErrorMessage = errorData.error?.message || response.statusText || 'Unknown API Error';
            throw new Error(`Gemini API Error (${response.status}): ${apiErrorMessage}`);

        } catch (error) {
            lastError = error;
            if (error.message.includes('INVALID_JSON_RESPONSE')) throw error;
            if (lastError.message.includes('404')) continue;
            throw error;
        }
    }
    
    throw lastError || new Error('Kein kompatibles KI-Modell gefunden.');
};

export const checkApiStatus = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return { status: 'missing', message: 'Kein API-Key vorhanden.' };

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Respond with only 'OK'" }] }],
                generationConfig: { maxOutputTokens: 5 }
            })
        });

        if (response.ok) {
            return { status: 'ok', message: 'API-Key ist aktiv und bereit.' };
        } else {
            const errorData = await response.json().catch(() => ({}));
            const apiErrorMessage = errorData.error?.message || response.statusText || 'Unbekannter Fehler';

            if (response.status === 429) return { status: 'limit', message: `Limit erreicht: ${apiErrorMessage}` };
            if (response.status === 400 || response.status === 403) return { status: 'invalid', message: `Key ungültig: ${apiErrorMessage}` };
            return { status: 'error', message: `Fehler: ${apiErrorMessage}` };
        }
    } catch (error) {
        return { status: 'error', message: `Verbindung fehlgeschlagen: ${error.message}` };
    }
};

export const listAvailableModels = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.models || [];
    } catch (e) {
        return [];
    }
};

const validateApiResponse = (json) => {
    if (!json.nodes || !Array.isArray(json.nodes)) {
         throw new Error('JSON validation failed: missing nodes array');
    }
    
    // Ensure minimal viable graph
    const hasStart = json.nodes.some(n => n.type === 'start');
    if (!hasStart && json.nodes.length > 0) {
        json.nodes[0].type = 'start';
    }

    // Filter out bad edges
    if (json.edges && Array.isArray(json.edges)) {
        json.edges = json.edges.filter(edge => {
            const hasSource = json.nodes.some(n => n.id === edge.from);
            const hasTarget = json.nodes.some(n => n.id === edge.to);
            return hasSource && hasTarget;
        });
    }

    return json;
};
