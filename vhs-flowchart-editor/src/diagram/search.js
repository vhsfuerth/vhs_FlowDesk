// @ts-check
// Suche nach Elementen im Diagramm (Strg+F).

/** @typedef {import('./types').DiagramNode} DiagramNode */

/**
 * Vereinheitlicht Text für den Vergleich: Kleinschreibung, Leerraum/Zeilenumbrüche
 * zusammengefasst, Akzente entfernt (Umlaute bleiben erhalten: „ä“ ≠ „a“).
 * @param {string | undefined | null} text
 */
export const normalizeSearchText = (text) =>
  (text || '')
    .toLocaleLowerCase('de')
    .replace(/[à-ãå]/g, 'a')
    .replace(/[è-ë]/g, 'e')
    .replace(/[ì-ï]/g, 'i')
    .replace(/[ò-õ]/g, 'o')
    .replace(/[ù-û]/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Findet Elemente, deren Text die Suche enthält – in Leserichtung sortiert
 * (von oben nach unten, bei gleicher Höhe von links nach rechts).
 * @param {DiagramNode[]} nodes
 * @param {string} query
 * @returns {string[]} IDs der Treffer
 */
export function findMatches(nodes, query) {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  return (nodes || [])
    .filter((node) => normalizeSearchText(node.label).includes(needle))
    .sort((a, b) => {
      const ay = a.position?.y ?? 0;
      const by = b.position?.y ?? 0;
      // Zeilen mit weniger als 20 px Höhenunterschied gelten als gleich hoch
      if (Math.abs(ay - by) >= 20) return ay - by;
      return (a.position?.x ?? 0) - (b.position?.x ?? 0);
    })
    .map((node) => node.id);
}
