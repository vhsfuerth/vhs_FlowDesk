// @ts-check
// Prompts und Antwortschema des KI-Copilots (Analyse, Verfeinerung, Selbstkorrektur).
// Das Schema wird Gemini als `responseSchema` mitgegeben; die Antwort wird trotzdem
// immer durch normalizeProcessModel geprüft, da sich Modelle nicht immer daran halten.

import { VARIANT_IDS, getVariant } from './variants';
import { MAX_QUESTIONS, toRawModel } from './process-model';

const STRING = { type: 'STRING' };

/**
 * Antwortschema (OpenAPI-Teilmenge, wie von der Gemini-API erwartet).
 * `transitions` ist bei jedem Schritt Pflicht: Die KI muss für jeden Schritt ausdrücklich
 * angeben, wie es weitergeht – optionale Zweige ließ sie sonst gern weg.
 * `propertyOrdering` sorgt dafür, dass erst formuliert und dann entschieden wird.
 */
export const PROCESS_MODEL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: STRING,
    summary: STRING,
    trigger: STRING,
    roles: { type: 'ARRAY', items: STRING },
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: STRING,
          label: STRING,
          kind: { type: 'STRING', enum: ['task', 'decision', 'end'] },
          role: STRING,
          transitions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { label: STRING, to: STRING },
              required: ['label', 'to'],
              propertyOrdering: ['label', 'to']
            }
          },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          note: STRING
        },
        required: ['id', 'label', 'kind', 'transitions'],
        propertyOrdering: ['id', 'label', 'kind', 'role', 'transitions', 'confidence', 'note']
      }
    },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: STRING,
          text: STRING,
          stepId: STRING,
          options: { type: 'ARRAY', items: STRING },
          allowFreeText: { type: 'BOOLEAN' }
        },
        required: ['id', 'text'],
        propertyOrdering: ['id', 'text', 'stepId', 'options', 'allowFreeText']
      }
    },
    assumptions: { type: 'ARRAY', items: STRING },
    recommendedVariant: { type: 'STRING', enum: VARIANT_IDS }
  },
  required: ['title', 'summary', 'steps', 'questions', 'assumptions'],
  propertyOrdering: ['title', 'summary', 'trigger', 'roles', 'steps', 'questions', 'assumptions', 'recommendedVariant']
};

const MODEL_RULES = `Regeln für das Prozessmodell:
1. "steps" in Ablaufreihenfolge. Jeder Schritt hat eine eindeutige "id" (s1, s2, …).
2. Jeder Schritt hat "transitions" – die Übergänge zu den nächsten Schritten ("to" = id oder "END"):
   - "task" (Tätigkeit): genau EIN Übergang mit leerem "label".
   - "decision" (Prüfung/Frage, Beschriftung endet mit „?“): MINDESTENS ZWEI Übergänge, jeder mit "label" (meist „Ja“ und „Nein“). Beide Wege müssen irgendwohin führen – zu einem Schritt, zu einem benannten Ende oder zu "END".
   - "end" (benanntes Ergebnis, z. B. „Antrag abgelehnt“): KEINE Übergänge.
3. Entscheidungen erkennen: Formulierungen wie „wenn“, „falls“, „ob“, „sonst“, „bei Ablehnung“, „sofern“, „prüfen, ob“ bedeuten fast immer eine Entscheidung mit mindestens zwei Wegen. Auch Ausnahmen und Fehlerfälle („keine Rückmeldung“, „unvollständig“) sind eigene Zweige.
4. Jeder Schritt außer dem ersten muss von einem anderen Schritt aus über "transitions" erreichbar sein. Lege keinen Schritt an, zu dem kein Übergang führt.
5. Keinen eigenen Startschritt anlegen – den Auslöser in "trigger" eintragen (z. B. „Anmeldung geht ein“).
6. Rücksprünge sind erlaubt ("to" zeigt auf einen früheren Schritt), etwa „Unterlagen nachfordern“ → zurück zur Prüfung.
7. "role": zuständige Rolle oder Stelle (z. B. „Verwaltung“, „Kursleitung“, „Teilnehmende“), wenn erkennbar; immer dieselbe Schreibweise. "roles" listet alle Rollen.
8. "confidence": "low", wenn du einen Schritt vermutest oder ergänzt hast, der nicht in der Beschreibung steht; dann in "note" kurz begründen.
9. "questions": höchstens ${MAX_QUESTIONS} gezielte Rückfragen zu Lücken, die den Ablauf verändern (fehlende Zweige, unklare Zuständigkeit, Fristen, unklares Ende). Wenn möglich 2–4 Antwortvorschläge in "options".
10. Ist die Beschreibung sehr kurz oder nennt sie nur ein Thema (z. B. „Ablauf für ein BEM-Verfahren“), entwirf einen in Volkshochschulen üblichen Ablauf, markiere ergänzte Schritte mit "confidence": "low" und stelle mindestens zwei Rückfragen zu Ausnahmen und Zuständigkeiten.
11. "assumptions": Annahmen, die du ohne Rückfrage getroffen hast. "summary": ein bis zwei Sätze, wie du den Prozess verstanden hast. "title": kurzer Prozessname.
12. "recommendedVariant": die passendste Darstellungsvariante (${VARIANT_IDS.join(', ')}).
13. Erfinde keine Personen- oder Kontaktdaten. Alle Texte auf Deutsch.
14. Prüfe vor der Antwort: Hat jede Entscheidung mindestens zwei Übergänge? Ist jeder Schritt erreichbar? Endet jeder Weg?`;

const EXAMPLE = `Beispiel
Beschreibung: „Eine Rechnung kommt an. Die Buchhaltung prüft sie. Ist sie korrekt, wird sie bezahlt. Sonst geht sie mit Bitte um Korrektur zurück an den Absender und wird nach Eingang der neuen Rechnung erneut geprüft.“
Antwort (gekürzt):
{"title":"Rechnungsprüfung","summary":"Eingehende Rechnungen werden geprüft und bezahlt oder zur Korrektur zurückgeschickt.","trigger":"Rechnung geht ein","roles":["Buchhaltung"],
 "steps":[
  {"id":"s1","label":"Rechnung prüfen","kind":"task","role":"Buchhaltung","transitions":[{"label":"","to":"s2"}]},
  {"id":"s2","label":"Rechnung korrekt?","kind":"decision","role":"Buchhaltung","transitions":[{"label":"Ja","to":"s3"},{"label":"Nein","to":"s4"}]},
  {"id":"s3","label":"Rechnung bezahlen","kind":"task","role":"Buchhaltung","transitions":[{"label":"","to":"END"}]},
  {"id":"s4","label":"Korrektur beim Absender anfordern","kind":"task","role":"Buchhaltung","transitions":[{"label":"","to":"s5"}]},
  {"id":"s5","label":"Korrigierte Rechnung abwarten","kind":"task","role":"Buchhaltung","transitions":[{"label":"","to":"s1"}]}
 ],
 "questions":[{"id":"q1","text":"Gibt es eine Frist für die Zahlung?","stepId":"s3","options":["14 Tage","30 Tage","Keine feste Frist"],"allowFreeText":true}],
 "assumptions":["Die Freigabe erfolgt ohne Vier-Augen-Prinzip."],"recommendedVariant":"kompakt"}`;

/**
 * @param {{ variantId?: string, hints?: string }} options
 */
const variantSection = ({ variantId, hints }) => {
  const variant = getVariant(variantId);
  const extra = hints?.trim() ? `\n\nZusätzliche Hinweise der Einrichtung (beachten, sofern sie den Regeln nicht widersprechen):\n${hints.trim()}` : '';
  return `Darstellungsvariante „${variant.name}“: ${variant.instruction}${extra}`;
};

/** @typedef {{ variantId?: string, hints?: string }} PromptOptions */

/**
 * Systemprompt für die erste Analyse einer Prozessbeschreibung.
 * @param {PromptOptions} [options]
 */
export const buildAnalysisPrompt = (options = {}) => `Du bist ein erfahrener Prozessberater für Volkshochschulen. Analysiere die Prozessbeschreibung des Nutzers und erstelle daraus ein strukturiertes Prozessmodell. Erzeuge KEIN Diagramm, sondern nur das Modell.

${MODEL_RULES}

${EXAMPLE}

${variantSection(options)}`;

/**
 * Systemprompt für die Überarbeitung nach beantworteten Rückfragen.
 * @param {PromptOptions} [options]
 */
export const buildRefinePrompt = (options = {}) => `Du bist ein erfahrener Prozessberater für Volkshochschulen. Du erhältst eine Prozessbeschreibung, dein bisheriges Prozessmodell und die Antworten des Nutzers auf deine Rückfragen. Überarbeite das Modell so, dass es die Antworten berücksichtigt. Behalte unveränderte Schritte und ihre ids bei. Unbeantwortete Fragen: triff eine plausible Annahme und nenne sie in "assumptions". Stelle nur dann neue Rückfragen (höchstens 2), wenn durch die Antworten neue, wesentliche Lücken entstanden sind.

${MODEL_RULES}

${EXAMPLE}

${variantSection(options)}`;

/**
 * Systemprompt für die automatische Selbstkorrektur struktureller Fehler.
 * @param {PromptOptions} [options]
 */
export const buildRepairPrompt = (options = {}) => `Du bist ein erfahrener Prozessberater für Volkshochschulen. Du erhältst eine Prozessbeschreibung, ein Prozessmodell und eine Liste struktureller Fehler in diesem Modell. Korrigiere genau diese Fehler anhand der Beschreibung: Ergänze fehlende Übergänge (insbesondere den zweiten Zweig von Entscheidungen) und verbinde nicht erreichbare Schritte an der fachlich richtigen Stelle. Ändere sonst so wenig wie möglich, behalte ids, Beschriftungen und Rückfragen bei. Antworte mit dem vollständigen, korrigierten Modell.

${MODEL_RULES}

${variantSection(options)}`;

/**
 * Nachricht für die Verfeinerung: Beschreibung, bisheriges Modell und Antworten.
 * @param {string} text
 * @param {import('./process-model').ProcessModel} model
 * @param {{ question: string, answer: string }[]} answers
 */
export const buildRefineMessage = (text, model, answers) => {
  const answerLines = answers.length
    ? answers.map((a, i) => `${i + 1}. ${a.question}\n   Antwort: ${a.answer || '(keine Angabe – bitte plausible Annahme treffen)'}`).join('\n')
    : '(keine)';
  return `Prozessbeschreibung:\n${text}\n\nBisheriges Prozessmodell (JSON):\n${JSON.stringify(toRawModel(model))}\n\nAntworten auf die Rückfragen:\n${answerLines}`;
};

/**
 * Nachricht für die Selbstkorrektur: Beschreibung, fehlerhafte Antwort und Fehlerliste.
 * @param {string} text
 * @param {unknown} rawModel  die ursprüngliche (fehlerhafte) Antwort der KI
 * @param {string[]} issues
 */
export const buildRepairMessage = (text, rawModel, issues) => `Prozessbeschreibung:\n${text}\n\nProzessmodell (JSON):\n${JSON.stringify(rawModel)}\n\nGefundene Fehler:\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}`;
