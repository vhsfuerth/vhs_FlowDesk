// KI-Aufrufe des Copilots. Nutzt die bestehende KI-Anbindung (Modell-Fallback,
// Header-Authentifizierung, Fehlertexte) und liefert immer ein normalisiertes Modell.
// Enthält die erste Antwort strukturelle Fehler (z. B. Entscheidungen mit nur einem
// Ausgang), wird die KI einmal mit der konkreten Fehlerliste um Korrektur gebeten.

import { AI_ABORTED, generateWithFallback } from '../ai-client';
import { getCopilotHints } from '../../storage/settings';
import { normalizeProcessModel } from './process-model';
import {
  PROCESS_MODEL_SCHEMA,
  buildAnalysisPrompt,
  buildRefineMessage,
  buildRefinePrompt,
  buildRepairMessage,
  buildRepairPrompt
} from './prompts';

// Die Analyse ist aufwendiger als die direkte Erzeugung
const COPILOT_TIMEOUT_MS = 60000;

/**
 * @typedef {Object} CopilotRequestOptions
 * @property {string} [variantId]
 * @property {AbortSignal} [signal]
 * @property {(status: string) => void} [onStatus]  meldet Zwischenschritte (z. B. Selbstkorrektur)
 */

const requestOptions = (signal) => ({
  responseSchema: PROCESS_MODEL_SCHEMA,
  timeoutMs: COPILOT_TIMEOUT_MS,
  temperature: 0.3,
  signal
});

/** Antwort einlesen und die Rohfassung für eine mögliche Selbstkorrektur aufbewahren. */
const parseWithRaw = (raw) => ({ raw, ...normalizeProcessModel(raw) });

/**
 * Fragt ein Modell an und lässt strukturelle Fehler einmal von der KI selbst korrigieren.
 * Das korrigierte Ergebnis wird nur übernommen, wenn es weniger Fehler enthält.
 * @param {string} prompt
 * @param {string} message
 * @param {string} description  ursprüngliche Prozessbeschreibung (für die Korrektur)
 * @param {CopilotRequestOptions} options
 */
async function requestModel(prompt, message, description, { variantId, signal, onStatus }) {
  const first = await generateWithFallback(prompt, message, parseWithRaw, requestOptions(signal));
  if (first.issues.length === 0) return { model: first.model, warnings: first.warnings };

  onStatus?.('Ergebnis wird überprüft und korrigiert …');
  try {
    const second = await generateWithFallback(
      buildRepairPrompt({ variantId, hints: getCopilotHints() }),
      buildRepairMessage(description, first.raw, first.issues),
      parseWithRaw,
      requestOptions(signal)
    );
    if (second.issues.length < first.issues.length) {
      return { model: second.model, warnings: second.warnings };
    }
  } catch (error) {
    if (error?.message === AI_ABORTED || signal?.aborted) throw error;
    // Die Korrektur ist ein Zusatz – ihr Scheitern macht das erste Ergebnis nicht unbrauchbar
    console.warn('Selbstkorrektur des KI-Copilots fehlgeschlagen:', error);
  }
  return { model: first.model, warnings: first.warnings };
}

/**
 * Analysiert eine Prozessbeschreibung.
 * @param {string} text
 * @param {CopilotRequestOptions} [options]
 * @returns {Promise<{ model: import('./process-model').ProcessModel, warnings: string[] }>}
 */
export const analyzeProcess = (text, options = {}) => requestModel(
  buildAnalysisPrompt({ variantId: options.variantId, hints: getCopilotHints() }),
  text,
  text,
  options
);

/**
 * Überarbeitet ein Modell anhand der Antworten auf Rückfragen.
 * @param {string} text
 * @param {import('./process-model').ProcessModel} model
 * @param {{ question: string, answer: string }[]} answers
 * @param {CopilotRequestOptions} [options]
 */
export const refineProcess = (text, model, answers, options = {}) => requestModel(
  buildRefinePrompt({ variantId: options.variantId, hints: getCopilotHints() }),
  buildRefineMessage(text, model, answers),
  // Die Selbstkorrektur braucht auch die Antworten, sonst „repariert“ sie gegen sie
  describeWithAnswers(text, answers),
  options
);

/**
 * Beschreibung samt Antworten auf die Rückfragen (für die Selbstkorrektur).
 * @param {string} text
 * @param {{ question: string, answer: string }[]} answers
 */
export const describeWithAnswers = (text, answers) => {
  const answered = answers.filter((a) => a.answer?.trim());
  if (!answered.length) return text;
  return `${text}\n\nErgänzungen aus den Rückfragen:\n${answered.map((a) => `- ${a.question} ${a.answer.trim()}`).join('\n')}`;
};
