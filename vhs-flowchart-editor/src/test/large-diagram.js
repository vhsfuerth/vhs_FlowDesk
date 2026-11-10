// Erzeugt große, realistische Testdiagramme (für Leistungsmessungen und -tests).
// Aufbau: Start → Kette aus Schritten verschiedener Typen; jeder fünfte Schritt ist eine
// Entscheidung, deren „Nein“-Zweig einen Schritt überspringt. Optional mit Swimlanes.
import { computeAutoLayout } from '../diagram/auto-layout';
import { estimateNodeSize } from '../diagram/node-size';

const STEP_TYPES = ['process', 'document', 'system', 'process', 'wait'];

/**
 * @param {{ nodes?: number, lanes?: number }} [options]  Anzahl Elemente (ohne Lanes), Anzahl Lanes
 * @returns {{ nodes: any[], edges: any[] }}
 */
export function generateLargeDiagram({ nodes: count = 150, lanes = 0 } = {}) {
  const laneNodes = Array.from({ length: lanes }, (_, i) => ({
    id: `lane${i + 1}`, type: 'lane', label: `Bereich ${i + 1}`,
    position: { x: 0, y: i * 220 }, size: { width: 1000, height: 200 }
  }));

  const flow = [];
  for (let i = 0; i < count; i++) {
    let type;
    if (i === 0) type = 'start';
    else if (i === count - 1) type = 'end';
    else if (i % 5 === 0) type = 'decision';
    else type = STEP_TYPES[i % STEP_TYPES.length];
    const label = type === 'decision' ? `Prüfung ${i} erfolgreich?` : `Schritt ${i} im Ablauf bearbeiten`;
    const node = { id: `n${i}`, type, label, size: estimateNodeSize(label, type), position: { x: 0, y: 0 } };
    if (lanes) node.laneId = `lane${(Math.floor(i / 4) % lanes) + 1}`;
    if (type === 'document') node.document = 'Formular A';
    if (type === 'system') node.system = 'Verwaltungssoftware';
    if (type === 'wait') node.duration = '3 Tage';
    flow.push(node);
  }

  const edges = [];
  for (let i = 0; i < count - 1; i++) {
    const isDecision = flow[i].type === 'decision';
    edges.push({ id: `e${i}`, from: `n${i}`, to: `n${i + 1}`, label: isDecision ? 'Ja' : '' });
    if (isDecision && i + 2 < count) edges.push({ id: `x${i}`, from: `n${i}`, to: `n${i + 2}`, label: 'Nein' });
  }

  const all = [...laneNodes, ...flow];
  const layout = computeAutoLayout({ nodes: all, edges }, { direction: 'TB' });
  const nodes = all.map((n) => {
    if (n.type === 'lane') {
      const r = layout.lanes[n.id];
      return r ? { ...n, position: { x: r.x, y: r.y }, size: { width: r.width, height: r.height } } : n;
    }
    return { ...n, position: layout.positions[n.id] || n.position };
  });
  return { nodes, edges: edges.map((e) => ({ ...e, ...(layout.ports[e.id] || {}) })) };
}
