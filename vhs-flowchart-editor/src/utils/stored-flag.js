// @ts-check
// Ein-/Aus-Einstellung pro Browser im localStorage ('1'/'0'). Ohne Speicher (privater Modus,
// gesperrte Website-Daten) gilt der Standardwert bzw. die Einstellung nur bis zum Neuladen.

/**
 * @param {string} key
 * @param {boolean} [fallback]
 * @returns {boolean}
 */
export function readFlag(key, fallback = false) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === '1';
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {boolean} value
 */
export function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Ohne Speicher gilt die Einstellung nur bis zum Neuladen
  }
}
