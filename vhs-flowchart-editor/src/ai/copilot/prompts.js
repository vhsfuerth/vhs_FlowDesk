// @ts-check
// Prompts und Antwortschema des KI-Copilots (Analyse, Verfeinerung, Selbstkorrektur).
// Das Schema wird der KI mitgegeben (für OpenAI/Claude umgewandelt, siehe providers.js); die Antwort wird trotzdem
// immer durch normalizeProcessModel geprüft, da sich Modelle nicht immer daran halten.

import { VARIANT_IDS, getVariant } from './variants';
import { MAX_QUESTIONS, toRawModel } from './process-model';

const STRING = { type: 'STRING' };

/** Werte für "kind": Ablauflogik (task/decision/end) bzw. Art der Tätigkeit (document/system/wait) */
export const STEP_KINDS = ['task', 'document', 'system', 'wait', 'decision', 'end'];

/**
 * Antwortschema (OpenAPI-Teilmenge im Gemini-Format; toJsonSchema wandelt es für andere Anbieter um).
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
          kind: { type: 'STRING', enum: STEP_KINDS },
          role: STRING,
          description: STRING,
          document: STRING,
          system: STRING,
          duration: STRING,
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
        propertyOrdering: ['id', 'label', 'kind', 'role', 'description', 'document', 'system', 'duration', 'transitions', 'confidence', 'note']
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

const CONTEXT = `## Kontext
vhs FlowDesk ist ein Werkzeug, mit dem Mitarbeitende von Volkshochschulen ihre Verwaltungsabläufe (z. B. Kursanmeldung, Dozentenverträge, Rechnungsprüfung) als Ablaufdiagramm dokumentieren. Aus deinem Prozessmodell baut die Anwendung das Diagramm selbst: Start, Ende, Swimlanes und Layout entstehen dort. Deine Aufgabe ist allein die fachlich richtige Struktur des Ablaufs. Die Nutzenden prüfen dein Modell anschließend in einer Vorschau, bevor es übernommen wird.`;

const MODEL_RULES = `## Aufbau des Prozessmodells

### Schritte
- "steps" stehen in Ablaufreihenfolge. Jeder Schritt hat eine eindeutige "id" (s1, s2, …) und eine kurze "label".
- "kind" legt fest, was der Schritt ist:
  - "task": eine Tätigkeit („Anmeldung erfassen“).
  - "document": eine Tätigkeit, bei der ein Dokument oder Formular im Mittelpunkt steht („Anmeldeformular ausfüllen“, „Vertrag versenden“).
  - "system": eine Tätigkeit in oder mit einem IT-System bzw. einer Datenablage („Daten in der Verwaltungssoftware erfassen“).
  - "wait": eine Wartezeit oder Frist („14 Tage auf Rückmeldung warten“). Die Dauer gehört zusätzlich in "duration".
  - "decision": eine Prüfung oder Frage; die "label" endet mit „?“.
  - "end": ein benanntes Ergebnis („Antrag abgelehnt“).
  Wähle "document", "system" oder "wait" nur, wenn die Beschreibung das nahelegt; sonst "task". Diese Arten machen Medienbrüche und Wartezeiten im Diagramm sichtbar, was die Volkshochschulen bei der Prozessbewertung nutzen.

### Übergänge
Jeder Schritt hat "transitions" mit den Übergängen zu den nächsten Schritten ("to" = id eines Schritts oder "END"):
- "task", "document", "system", "wait": genau ein Übergang mit leerer "label".
- "decision": mindestens zwei Übergänge, jeder mit "label" (meist „Ja“ und „Nein“). Jeder Weg muss irgendwohin führen – zu einem Schritt, zu einem benannten Ende oder zu "END". Ein fehlender Zweig ist der häufigste Fehler und macht das Diagramm unbrauchbar.
- "end": keine Übergänge.
Rücksprünge auf frühere Schritte sind erlaubt (z. B. „Unterlagen nachfordern“ → zurück zur Prüfung). Jeder Schritt außer dem ersten muss über einen Übergang erreichbar sein.

### Entscheidungen erkennen
Formulierungen wie „wenn“, „falls“, „ob“, „sonst“, „sofern“, „bei Ablehnung“ oder „prüfen, ob“ bedeuten fast immer eine Entscheidung mit mindestens zwei Wegen. Auch Ausnahmen und Fehlerfälle („keine Rückmeldung“, „unvollständig“) sind eigene Zweige.

### Start
Lege keinen eigenen Startschritt an. Trage den Auslöser in "trigger" ein (z. B. „Anmeldung geht ein“); die Anwendung erzeugt daraus den Startpunkt.

### Zuständigkeiten und Angaben
- "role": zuständige Rolle oder Stelle („Verwaltung“, „Kursleitung“, „Teilnehmende“), wenn erkennbar – immer in derselben Schreibweise, weil daraus Swimlanes entstehen. "roles" listet alle Rollen.
- "description": eine kurze Erläuterung, was in dem Schritt genau zu tun ist, wenn die Beschreibung das hergibt (ein Satz). Leer lassen statt erfinden.
- "document", "system", "duration": beteiligtes Dokument/Formular, IT-System und Dauer bzw. Frist, sofern in der Beschreibung genannt. Diese Angaben erscheinen später in der Prozessbeschreibung.
- "note" ist für Unsicherheiten gedacht und erscheint als Kommentar am Rand: Setze "confidence" auf "low", wenn du einen Schritt vermutest oder ergänzt hast, und begründe es in "note".

### Rückfragen und Annahmen
- "questions": höchstens ${MAX_QUESTIONS} gezielte Rückfragen zu Lücken, die den Ablauf verändern (fehlende Zweige, unklare Zuständigkeit, Fristen, unklares Ende), wenn möglich mit 2–4 Antwortvorschlägen in "options".
- Ist die Beschreibung sehr kurz oder nennt nur ein Thema (z. B. „Ablauf für ein BEM-Verfahren“), entwirf einen an Volkshochschulen üblichen Ablauf, markiere ergänzte Schritte mit "confidence": "low" und stelle mindestens zwei Rückfragen zu Ausnahmen und Zuständigkeiten.
- "assumptions": Annahmen, die du ohne Rückfrage getroffen hast. "summary": ein bis zwei Sätze, wie du den Prozess verstanden hast. "title": kurzer Prozessname.
- "recommendedVariant": die passendste Darstellungsvariante (${VARIANT_IDS.join(', ')}).

### Grenzen
Erfinde keine Personen- oder Kontaktdaten und keine Fristen, Formulare oder Systeme, die nicht in der Beschreibung stehen – Nutzende würden sie sonst ungeprüft übernehmen. Alle Texte auf Deutsch.

### Vor dem Antworten prüfen
1. Hat jede Entscheidung mindestens zwei beschriftete Übergänge?
2. Ist jeder Schritt erreichbar, und endet jeder Weg?
3. Haben alle Tätigkeiten genau einen Übergang?
4. Stehen Rollen überall in derselben Schreibweise?`;

const EXAMPLE = `## Beispiel
<beschreibung>
Eine Rechnung kommt per Post. Die Buchhaltung erfasst sie in der Finanzsoftware und prüft sie. Ist sie korrekt, wird sie innerhalb von 14 Tagen bezahlt. Sonst geht sie mit Bitte um Korrektur zurück an den Absender und wird nach Eingang der neuen Rechnung erneut geprüft.
</beschreibung>
<antwort>
{"title":"Rechnungsprüfung","summary":"Eingehende Rechnungen werden erfasst, geprüft und bezahlt oder zur Korrektur zurückgeschickt.","trigger":"Rechnung geht ein","roles":["Buchhaltung"],
 "steps":[
  {"id":"s1","label":"Rechnung erfassen","kind":"system","role":"Buchhaltung","system":"Finanzsoftware","transitions":[{"label":"","to":"s2"}]},
  {"id":"s2","label":"Rechnung korrekt?","kind":"decision","role":"Buchhaltung","transitions":[{"label":"Ja","to":"s3"},{"label":"Nein","to":"s4"}]},
  {"id":"s3","label":"Rechnung bezahlen","kind":"task","role":"Buchhaltung","duration":"innerhalb von 14 Tagen","transitions":[{"label":"","to":"END"}]},
  {"id":"s4","label":"Korrektur beim Absender anfordern","kind":"document","role":"Buchhaltung","description":"Rechnung mit Hinweis auf die Fehler zurücksenden.","transitions":[{"label":"","to":"s5"}]},
  {"id":"s5","label":"Korrigierte Rechnung abwarten","kind":"wait","role":"Buchhaltung","transitions":[{"label":"","to":"s1"}]}
 ],
 "questions":[{"id":"q1","text":"Wer gibt Rechnungen über einem bestimmten Betrag frei?","stepId":"s3","options":["Leitung","Buchhaltung allein","Keine Grenze"],"allowFreeText":true}],
 "assumptions":["Die Freigabe erfolgt ohne Vier-Augen-Prinzip."],"recommendedVariant":"kompakt"}
</antwort>`;

const OUTPUT = `## Ausgabe
Antworte ausschließlich mit dem JSON-Objekt des Prozessmodells, ohne Einleitung und ohne Markdown-Codeblock.`;

/**
 * @param {{ variantId?: string, hints?: string }} options
 */
const variantSection = ({ variantId, hints }) => {
  const variant = getVariant(variantId);
  const extra = hints?.trim()
    ? `\n\n## Hinweise der Einrichtung\nBeachte diese Hinweise, sofern sie den Regeln oben nicht widersprechen (z. B. Hausbegriffe, feste Zuständigkeiten):\n<hinweise>\n${hints.trim()}\n</hinweise>`
    : '';
  return `## Formulierung\nDarstellungsvariante „${variant.name}“: ${variant.instruction}${extra}`;
};

/** @typedef {{ variantId?: string, hints?: string }} PromptOptions */

/**
 * Systemprompt für die erste Analyse einer Prozessbeschreibung.
 * @param {PromptOptions} [options]
 */
export const buildAnalysisPrompt = (options = {}) => `Du bist eine erfahrene Prozessberaterin für Volkshochschulen. Analysiere die Prozessbeschreibung der Nutzerin bzw. des Nutzers und erstelle daraus ein strukturiertes Prozessmodell (kein Diagramm).

${CONTEXT}

${MODEL_RULES}

${variantSection(options)}

${EXAMPLE}

${OUTPUT}`;

/**
 * Systemprompt für die Überarbeitung nach beantworteten Rückfragen.
 * @param {PromptOptions} [options]
 */
export const buildRefinePrompt = (options = {}) => `Du bist eine erfahrene Prozessberaterin für Volkshochschulen. Du erhältst eine Prozessbeschreibung, dein bisheriges Prozessmodell und die Antworten auf deine Rückfragen. Überarbeite das Modell so, dass es die Antworten berücksichtigt.

${CONTEXT}

## Aufgabe bei der Überarbeitung
- Behalte unveränderte Schritte mit ihren ids und Angaben bei, damit die Nutzenden ihre Prüfung nicht wiederholen müssen.
- Übernimm Fristen, Formulare, Systeme und Zuständigkeiten aus den Antworten in die passenden Felder.
- Unbeantwortete Fragen: Triff eine plausible Annahme und nenne sie in "assumptions".
- Stelle nur dann neue Rückfragen (höchstens 2), wenn durch die Antworten neue, wesentliche Lücken entstanden sind.

${MODEL_RULES}

${variantSection(options)}

${EXAMPLE}

${OUTPUT}`;

/**
 * Systemprompt für die automatische Selbstkorrektur struktureller Fehler.
 * @param {PromptOptions} [options]
 */
export const buildRepairPrompt = (options = {}) => `Du bist eine erfahrene Prozessberaterin für Volkshochschulen. Du erhältst eine Prozessbeschreibung, ein Prozessmodell und eine Liste struktureller Fehler in diesem Modell, die eine automatische Prüfung gefunden hat.

${CONTEXT}

## Aufgabe bei der Korrektur
- Korrigiere genau die genannten Fehler anhand der Beschreibung: Ergänze fehlende Übergänge (insbesondere den zweiten Zweig von Entscheidungen) und verbinde nicht erreichbare Schritte an der fachlich richtigen Stelle.
- Ändere sonst so wenig wie möglich. Behalte ids, Beschriftungen, Angaben und Rückfragen bei.
- Antworte mit dem vollständigen, korrigierten Modell.

${MODEL_RULES}

${variantSection(options)}

${OUTPUT}`;

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
