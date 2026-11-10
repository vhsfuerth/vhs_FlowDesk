// Leistungsmessung der Funktionen, die beim Bearbeiten häufig laufen.
// Aufruf: npm run bench  (Ergebnisse siehe improvement.md, Punkt 1)
import { bench, describe } from 'vitest';
import * as joint from 'jointjs';
import '../diagram/shapes';
import { JSONConverter } from '../diagram/converter';
import { computeSnap } from '../diagram/snaplines';
import { computeAutoLayout } from '../diagram/auto-layout';
import { validateDiagram } from '../analysis/diagram-validation';
import { buildProcessDescription } from '../export/process-description';
import { createSnapshot } from '../storage/autosave';
import { generateLargeDiagram } from './large-diagram';

const SIZES = [50, 150, 300];

for (const size of SIZES) {
  const diagram = generateLargeDiagram({ nodes: size, lanes: 4 });
  const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
  const converter = new JSONConverter(graph);
  converter.fromJson(diagram);
  const rects = diagram.nodes.filter((n) => n.type !== 'lane').map((n) => ({ ...n.position, ...n.size }));
  const moving = { ...rects[0], x: rects[0].x + 3, y: rects[0].y + 2 };

  describe(`${size} Elemente (4 Swimlanes)`, () => {
    // Pro Änderung (Ziehen: einmal pro Bildschirmbild)
    bench('toJson (Graph → JSON)', () => { converter.toJson(); });
    bench('validateDiagram (Struktur-Check)', () => { validateDiagram(diagram, []); });
    bench('createSnapshot (Autosave-Vergleich)', () => { createSnapshot({ name: 'x', diagram, metadata: {} }); });
    bench('buildProcessDescription (Ablauf als Text)', () => { buildProcessDescription(diagram); });
    // Pro Mausbewegung beim Ziehen
    bench('Hilfslinien: Umrisse sammeln + computeSnap', () => {
      const others = graph.getElements().map((cell) => cell.getBBox());
      computeSnap(moving, others);
    });
    // Pro Verlaufsschritt (entprellt)
    bench('Verlauf: JSON.stringify(graph.toJSON())', () => { JSON.stringify(graph.toJSON()); });
    // Einmalig
    bench('computeAutoLayout', () => { computeAutoLayout(diagram); });
    bench('fromJson (Laden)', () => {
      const g = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
      new JSONConverter(g).fromJson(diagram);
    });
  });
}
