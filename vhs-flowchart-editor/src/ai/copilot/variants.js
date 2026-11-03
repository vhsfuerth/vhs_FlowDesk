// @ts-check
// Formulierungsvarianten des KI-Copilots. Sie steuern Sprache und Detailgrad,
// nicht die Ablauflogik. Neue Varianten hier ergänzen – UI und Prompt lesen diese Liste.

/**
 * @typedef {Object} CopilotVariant
 * @property {string} id
 * @property {string} name          Anzeigename
 * @property {string} description   Kurzbeschreibung für die Auswahl
 * @property {string} example       Beispiel-Beschriftung
 * @property {string} instruction   Prompt-Baustein für die KI
 */

/** @type {CopilotVariant[]} */
export const COPILOT_VARIANTS = [
  {
    id: 'kompakt',
    name: 'Kompakt',
    description: 'Kurze Beschriftungen, nur das Wesentliche.',
    example: 'Anmeldung prüfen',
    instruction: 'Formuliere sehr knapp: höchstens 6 Wörter je Schritt, Verb am Ende („Anmeldung prüfen“). Fasse Kleinstschritte zusammen. Nutze "note" nur für echte Unsicherheiten.'
  },
  {
    id: 'fachlich',
    name: 'Fachlich präzise',
    description: 'Fachbegriffe, Fristen und Zuständigkeiten ausdrücklich.',
    example: 'Zahlungseingang binnen 14 Tagen prüfen',
    instruction: 'Formuliere fachlich exakt mit den in der Verwaltung üblichen Begriffen. Nenne Fristen, Formulare und Systeme, wenn sie in der Beschreibung vorkommen. Entscheidungen als eindeutige Prüfbedingung („Zahlung vollständig eingegangen?“). Höchstens 12 Wörter je Schritt.'
  },
  {
    id: 'buergernah',
    name: 'Bürgernah',
    description: 'Einfache Sprache aus Sicht der Teilnehmenden.',
    example: 'Sie erhalten eine Bestätigung',
    instruction: 'Formuliere in einfacher, freundlicher Sprache ohne Abkürzungen und Fachbegriffe. Wo es passt, aus Sicht der Teilnehmenden („Sie erhalten eine Bestätigung“). Höchstens 10 Wörter je Schritt.'
  },
  {
    id: 'schulung',
    name: 'Schulung & Dokumentation',
    description: 'Wie „fachlich“, dazu kurze Erläuterungen je Schritt.',
    example: 'Teilnahmeliste ausgeben (Hinweis: Vorlage im Intranet)',
    instruction: 'Formuliere fachlich klar (höchstens 10 Wörter je Schritt) und ergänze bei wichtigen Schritten im Feld "note" eine kurze Erläuterung für neue Mitarbeitende (worauf achten, welche Unterlagen). Höchstens ein Satz je Erläuterung.'
  }
];

export const DEFAULT_VARIANT_ID = 'kompakt';

export const VARIANT_IDS = COPILOT_VARIANTS.map((variant) => variant.id);

/**
 * @param {string | null | undefined} id
 * @returns {CopilotVariant}
 */
export const getVariant = (id) => COPILOT_VARIANTS.find((variant) => variant.id === id) || COPILOT_VARIANTS[0];
