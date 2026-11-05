import { describe, expect, it, vi } from 'vitest';
import * as joint from 'jointjs';
import { createProcessNode } from './shapes';
import { computeSnap } from './snaplines';
import { attachSnaplines } from './snapline-drag';
import { bridgeEdges } from './bridge';

const newGraph = () => new joint.dia.Graph({}, { cellNamespace: joint.shapes });

describe('Hilfslinien beim Verschieben', () => {
  const other = { x: 100, y: 100, width: 160, height: 60 };

  it('rastet an Kanten und Mitten anderer Elemente ein', () => {
    const result = computeSnap({ x: 104, y: 300, width: 160, height: 60 }, [other]);
    expect(result.dx).toBe(-4);
    expect(result.dy).toBe(0);
    expect(result.guides).toEqual([{ orientation: 'vertical', x: 100, from: 100, to: 360 }]);
    // Mitte an Mitte, auch bei unterschiedlicher Breite
    expect(computeSnap({ x: 133, y: 300, width: 100, height: 60 }, [other]).dx).toBe(-3);
    // Zu weit entfernt: nichts
    expect(computeSnap({ x: 120, y: 300, width: 100, height: 60 }, [other])).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it('verschiebt das gezogene Element und zeichnet die Linie, nicht bei Alt oder Mehrfachauswahl', () => {
    const graph = newGraph();
    const a = createProcessNode(100, 100, 'A');
    const b = createProcessNode(104, 300, 'B');
    graph.addCells([a, b]);
    const front = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const handlers = {};
    const paper = { on: (name, fn) => { handlers[name] = fn; }, off: vi.fn(), getLayerNode: () => front };
    let selection = [b];
    const detach = attachSnaplines({ paper, graph, getSelection: () => selection });

    handlers['element:pointermove']({ model: b }, {});
    expect(b.position().x).toBe(100);
    expect(front.querySelectorAll('line')).toHaveLength(1);
    handlers['element:pointerup']();
    expect(front.querySelector('line')).toBeNull();

    b.position(104, 300);
    handlers['element:pointermove']({ model: b }, { altKey: true });
    expect(b.position().x).toBe(104);
    selection = [a, b];
    handlers['element:pointermove']({ model: b }, {});
    expect(b.position().x).toBe(104);
    detach();
  });
});

describe('Schritt entfernen, Ablauf erhalten', () => {
  const diagram = {
    nodes: [
      { id: 'd', type: 'decision', label: 'OK?' },
      { id: 'x', type: 'process', label: 'Prüfen' },
      { id: 'y', type: 'process', label: 'Weiter' },
      { id: 'z', type: 'end', label: 'Ende' },
      { id: 'n', type: 'annotation', label: 'Notiz' }
    ],
    edges: [
      { id: 'e1', from: 'd', to: 'x', label: 'Ja', sourcePort: 'port-bottom', targetPort: 'port-top' },
      { id: 'e2', from: 'x', to: 'y', label: '', sourcePort: 'port-bottom', targetPort: 'port-top' },
      { id: 'e3', from: 'y', to: 'z' },
      { id: 'e4', from: 'n', to: 'x' }
    ]
  };

  it('verbindet Vorgänger und Nachfolger und übernimmt die Beschriftung', () => {
    expect(bridgeEdges(diagram, 'x')).toEqual([{ from: 'd', to: 'y', label: 'Ja', sourcePort: 'port-bottom', targetPort: 'port-top' }]);
  });

  it('bietet nichts an, wenn der Ablauf nicht eindeutig ist', () => {
    expect(bridgeEdges(diagram, 'd')).toBeNull(); // kein Vorgänger
    expect(bridgeEdges(diagram, 'z')).toBeNull(); // Ende
    expect(bridgeEdges(diagram, 'n')).toBeNull(); // Kommentar
    const twoOut = { ...diagram, edges: [...diagram.edges, { id: 'e5', from: 'x', to: 'z' }] };
    expect(bridgeEdges(twoOut, 'x')).toBeNull();
    const alreadyConnected = { ...diagram, edges: [...diagram.edges, { id: 'e6', from: 'd', to: 'y' }] };
    expect(bridgeEdges(alreadyConnected, 'x')).toBeNull();
  });
});
