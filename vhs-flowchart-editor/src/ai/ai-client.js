import { getAiProviderSettings, getApiKey, getCustomPrompt } from '../storage/settings';
import { IMPROVEMENT_PROMPT, DIAGRAM_SCHEMA, effectiveSystemPrompt } from './prompts';
import { NODE_DETAIL_FIELDS, NODE_TYPES } from '../diagram/types';
import { API_TIMEOUT_MS, MODEL_FALLBACK_DELAY_MS } from './config';
import { resolveProvider } from './providers';
import {
    buildGeminiHealthcheckRequest,
    buildGenerateRequest,
    buildListModelsRequest,
    extractText,
    parseJsonText,
    parseModelIds
} from './adapters';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 503 = überlastet; 529 = überlastet bei Claude
const OVERLOADED = new Set([503, 529]);

const mapApiStatusToMessage = (status) => {
    if (status === 400) return 'Die Anfrage war ungültig. Bitte überprüfe API-Key und Modellnamen in den Einstellungen.';
    if (status === 401 || status === 403) return 'Zugriff verweigert. Bitte überprüfe deinen API-Key.';
    if (status === 429) return 'Anfrage-Limit erreicht. Bitte warte einen Moment und versuche es erneut.';
    if (status >= 500) return 'Der KI-Dienst ist momentan nicht erreichbar. Bitte versuche es später.';
    return 'Bei der KI-Generierung ist ein Fehler aufgetreten. Bitte versuche es erneut.';
};

/**
 * Fehler, wenn der Nutzer eine laufende KI-Anfrage abbricht.
 */
export const AI_ABORTED = 'AI_ABORTED';

// Netzwerkfehler (keine HTTP-Antwort): falsche Adresse, kein Internet oder der Anbieter
// erlaubt keine Aufrufe direkt aus dem Browser (CORS).
const NETWORK_ERROR = 'AI_NETWORK_ERROR';

/** Aktuelle Anbieter-Konfiguration samt Key; wirft bei unvollständiger Einrichtung. */
const getActiveConfig = (overrides = {}) => {
    const settings = getAiProviderSettings();
    for (const field of ['providerId', 'baseUrl', 'models']) {
        if (overrides[field] !== undefined) settings[field] = overrides[field];
    }
    const resolved = resolveProvider(settings);
    const apiKey = overrides.apiKey !== undefined ? overrides.apiKey.trim() : getApiKey(resolved.preset.id);
    return { ...resolved, apiKey };
};

async function sendRequest({ url, init }, modelName, options = {}) {
    const timeoutMs = options.timeoutMs || API_TIMEOUT_MS;
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);
    // Abbruch durch den Nutzer an die Anfrage weiterreichen
    const abortFromOutside = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', abortFromOutside);

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
        if (error.name === 'AbortError') {
            if (!timedOut) throw new Error(AI_ABORTED);
            throw new Error(`Zeitüberschreitung: ${modelName} hat nicht innerhalb von ${timeoutMs / 1000}s geantwortet.`);
        }
        console.error('KI-Anfrage fehlgeschlagen:', error);
        throw new Error(NETWORK_ERROR);
    } finally {
        clearTimeout(timeoutId);
        options.signal?.removeEventListener('abort', abortFromOutside);
    }
}

// Probiert die konfigurierten Modelle der Reihe nach durch. 404 (Modell nicht verfügbar)
// und 503/529 (Modell überlastet) führen zum nächsten Modell, alle anderen Fehler brechen ab.
// Optionen: { responseSchema, timeoutMs, signal, temperature }. Lehnt die Schnittstelle
// optionale Vorgaben ab (400, z. B. Antwortschema oder JSON-Modus bei einem eigenen Server),
// wird dieselbe Anfrage einmal ohne diese Vorgaben wiederholt.
export async function generateWithFallback(prompt, userText, parseResult, options = {}) {
    const { preset, baseUrl, models, problem, apiKey } = getActiveConfig();
    if (problem) throw new Error(problem);
    if (preset.keyRequired && !apiKey) throw new Error('API_KEY_MISSING');
    let overloaded = false;

    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        if (i > 0) await delay(MODEL_FALLBACK_DELAY_MS);

        const request = (relaxed) => buildGenerateRequest({ preset, baseUrl, model, apiKey, system: prompt, user: userText, options, relaxed });
        const first = request(false);
        let response = await sendRequest(first, model, options);
        if (response.status === 400 && first.relaxable) {
            console.warn(`Modell ${model} lehnt Antwortschema oder Parameter ab, versuche ohne…`);
            response = await sendRequest(request(true), model, options);
        }

        if (response.ok) {
            const data = await response.json().catch(() => null);
            const contentText = extractText(preset.kind, data);
            if (!contentText) throw new Error('INVALID_JSON_RESPONSE');
            return parseResult(parseJsonText(contentText));
        }

        if (response.status === 404) {
            console.warn(`Modell ${model} nicht verfügbar, versuche nächstes…`);
            continue;
        }
        if (OVERLOADED.has(response.status)) {
            console.warn(`Modell ${model} ist überlastet, versuche nächstes…`);
            overloaded = true;
            continue;
        }

        const errorData = await response.json().catch(() => ({}));
        console.error(`KI-API-Fehler ${preset.label} (${response.status}):`, errorData.error?.message || response.statusText);
        throw new Error(mapApiStatusToMessage(response.status));
    }

    if (overloaded) {
        throw new Error(`Die KI-Modelle von ${preset.label} sind gerade stark ausgelastet. Bitte in ein bis zwei Minuten erneut versuchen.`);
    }
    throw new Error(`Kein verfügbares KI-Modell gefunden (${models.join(', ')}). Bitte die Modellnamen in den Einstellungen prüfen.`);
}

const ERROR_MESSAGES = {
    API_KEY_INVALID: 'Der API-Key ist ungültig oder abgelaufen.',
    API_KEY_MISSING: 'API-Key fehlt. Bitte in den Einstellungen hinterlegen.',
    RATE_LIMIT: 'Anfragelimit beim KI-Anbieter erreicht. Bitte kurz warten.',
    INVALID_JSON_RESPONSE: 'Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.',
    AI_REFUSED: 'Das KI-Modell hat die Anfrage abgelehnt. Bitte die Beschreibung umformulieren.',
    [NETWORK_ERROR]: 'Keine Verbindung zum KI-Dienst. Bitte Internetverbindung und Server-Adresse prüfen. Manche Anbieter erlauben keinen direkten Zugriff aus dem Browser (CORS).',
    [AI_ABORTED]: 'Die Anfrage wurde abgebrochen.'
};

/** Nutzerverständliche (deutsche) Meldung zu einem Fehler der KI-Anbindung. */
export const describeAiError = (error) => {
    const message = error?.message || '';
    const key = Object.keys(ERROR_MESSAGES).find((code) => message.includes(code));
    return key ? ERROR_MESSAGES[key] : (message || 'Bei der KI-Anfrage ist ein Fehler aufgetreten.');
};

export const generateFlowchartFromText = (text) => {
    const activePrompt = effectiveSystemPrompt(getCustomPrompt());
    return generateWithFallback(activePrompt, text, validateApiResponse, { responseSchema: DIAGRAM_SCHEMA });
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

const statusFromHttp = (status, model) => {
    if (status === 429) return { status: 'limit', message: 'Anfrage-Limit erreicht. Bitte warte einen Moment.' };
    if (status === 400 || status === 401 || status === 403) return { status: 'invalid', message: 'API-Key ungültig oder nicht berechtigt.' };
    if (status === 404) return { status: 'error', message: model ? `Modell ${model} ist nicht verfügbar.` : 'Die Server-Adresse wurde nicht gefunden.' };
    return { status: 'error', message: 'Der KI-Dienst ist momentan nicht erreichbar.' };
};

/**
 * Prüft die Verbindung. `overrides` erlaubt das Testen noch nicht gespeicherter Eingaben:
 * { providerId, baseUrl, models, apiKey }.
 * @returns {Promise<{ status: 'ok'|'warning'|'limit'|'invalid'|'error'|'missing', message: string, models?: string[] }>}
 */
export const checkApiStatus = async (overrides = {}) => {
    const { preset, baseUrl, models, problem, apiKey } = getActiveConfig(overrides);
    if (problem) return { status: 'error', message: problem };
    if (preset.keyRequired && !apiKey) return { status: 'missing', message: 'Kein API-Key vorhanden.' };

    try {
        if (preset.kind === 'gemini') {
            const { url, init } = buildGeminiHealthcheckRequest({ baseUrl, model: models[0], apiKey });
            const response = await fetch(url, init);
            if (response.ok) return { status: 'ok', message: 'API-Key ist aktiv und bereit.' };
            const errorData = await response.json().catch(() => ({}));
            console.error('API-Status-Check Fehler:', errorData.error?.message || response.statusText);
            return statusFromHttp(response.status, models[0]);
        }

        // Bei den übrigen Anbietern genügt die (kostenlose) Modellliste als Test
        const { url, init } = buildListModelsRequest({ preset, baseUrl, apiKey });
        const response = await fetch(url, init);
        if (!response.ok) return statusFromHttp(response.status);
        const available = parseModelIds(preset.kind, await response.json().catch(() => null));
        const missing = available.length > 0 ? models.filter((m) => !available.includes(m)) : [];
        if (missing.length === models.length) {
            return { status: 'warning', message: `Verbindung steht, aber Modell ${models[0]} wird nicht angeboten.`, models: available };
        }
        return { status: 'ok', message: 'Verbindung steht, KI-Dienst ist bereit.' };
    } catch (error) {
        console.error('API-Status-Check Fehler:', error);
        return { status: 'error', message: describeAiError(new Error(NETWORK_ERROR)) };
    }
};

/** Modelle, die der Key nutzen darf (für die Diagnose in den Einstellungen). */
export const listAvailableModels = async (overrides = {}) => {
    const { preset, baseUrl, problem, apiKey } = getActiveConfig(overrides);
    if (problem || (preset.keyRequired && !apiKey)) return [];

    try {
        const { url, init } = buildListModelsRequest({ preset, baseUrl, apiKey });
        const response = await fetch(url, init);
        if (!response.ok) return [];
        return parseModelIds(preset.kind, await response.json());
    } catch {
        return [];
    }
};

export const validateApiResponse = (json) => {
    if (!json || !Array.isArray(json.nodes)) {
        throw new Error('INVALID_JSON_RESPONSE');
    }

    // Elemente bereinigen: unbekannte Typen und Teilprozesse (ohne Verknüpfung) werden Prozessschritte,
    // Zusatzangaben nur als Text, laneId nur auf vorhandene Lanes
    json.nodes = json.nodes.filter((n) => n && typeof n === 'object' && n.id !== undefined && n.id !== null).map((n) => {
        const type = String(n.type || '').toLowerCase();
        const node = { ...n, id: String(n.id), type: NODE_TYPES.includes(type) && type !== 'subprocess' ? type : 'process', label: String(n.label ?? '') };
        NODE_DETAIL_FIELDS.forEach((field) => {
            if (typeof node[field] !== 'string' || !node[field].trim() || field === 'subprocessId') delete node[field];
        });
        return node;
    });
    const laneIds = new Set(json.nodes.filter((n) => n.type === 'lane').map((n) => n.id));
    json.nodes.forEach((n) => {
        if (n.laneId !== undefined && (n.type === 'lane' || !laneIds.has(String(n.laneId)))) delete n.laneId;
        else if (n.laneId !== undefined) n.laneId = String(n.laneId);
    });

    // Ensure minimal viable graph
    const hasStart = json.nodes.some(n => n.type === 'start');
    if (!hasStart && json.nodes.length > 0) {
        json.nodes[0].type = 'start';
    }

    // Filter out bad edges
    if (Array.isArray(json.edges)) {
        json.edges = json.edges
            .filter((edge) => edge && typeof edge === 'object')
            .map((edge) => ({ ...edge, from: String(edge.from), to: String(edge.to) }))
            .filter(edge => {
            const hasSource = json.nodes.some(n => n.id === edge.from);
            const hasTarget = json.nodes.some(n => n.id === edge.to);
            return hasSource && hasTarget;
        });
    } else {
        json.edges = [];
    }

    return json;
};
