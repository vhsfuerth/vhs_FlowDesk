// @ts-check
// Führt Änderungen als einen JointJS-Batch aus. Der Batch wird immer geschlossen, auch wenn
// unterwegs ein Fehler auftritt – ein offener Batch würde sonst z. B. die Lane-Zuordnung
// (lane-embedding.js) und das Zusammenfassen von Meldungen (change-notifier.js) blockieren.

/**
 * @template T
 * @param {{ startBatch: (name: string) => any, stopBatch: (name: string) => any }} graph
 * @param {string} name
 * @param {() => T} fn
 * @returns {T}
 */
export function inBatch(graph, name, fn) {
  graph.startBatch(name);
  try {
    return fn();
  } finally {
    graph.stopBatch(name);
  }
}
