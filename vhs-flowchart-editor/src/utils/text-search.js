// @ts-check
// Einfache Volltextsuche für Hilfetexte (Anleitung): Groß-/Kleinschreibung egal,
// mehrere Wörter müssen alle vorkommen (in beliebiger Reihenfolge).

/**
 * Suchwörter einer Eingabe (klein geschrieben, ohne leere Teile).
 * @param {string} query
 * @returns {string[]}
 */
export const searchWords = (query) => String(query || '').toLowerCase().split(/\s+/).filter(Boolean);

/**
 * Kommen alle Suchwörter in den Texten vor? Leere Suche passt immer.
 * @param {Array<string | null | undefined>} texts
 * @param {string} query
 */
export function matchesQuery(texts, query) {
  const words = searchWords(query);
  if (!words.length) return true;
  const haystack = texts.filter(Boolean).join(' ').toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * Zerlegt einen Text in Teile mit Treffern (`match: true`) für die Hervorhebung.
 * @param {string} text
 * @param {string} query
 * @returns {{ text: string, match: boolean }[]}
 */
export function splitMatches(text, query) {
  const words = searchWords(query).sort((a, b) => b.length - a.length);
  if (!words.length || !text) return [{ text, match: false }];
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  // Durch die Klammer im Muster liefert split() auch die Treffer selbst als Teile
  return text.split(pattern).filter((part) => part !== '').map((part) => ({ text: part, match: words.includes(part.toLowerCase()) }));
}
