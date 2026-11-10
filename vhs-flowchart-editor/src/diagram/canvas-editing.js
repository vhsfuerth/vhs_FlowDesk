// Bearbeitungsbefehle der Arbeitsfläche als Funktionen über dem JointJS-Graphen (ohne React).
// DiagramCanvas ruft sie auf und kümmert sich nur noch um Auswahl und Ansicht.
import { createLink, createNode } from './shapes';
import { setElementLane } from './converter';
import { extractFragment, instantiateFragment } from './clipboard';
import { assignLane, growLaneToFit, isLane } from './lane-embedding';
import { nextDecisionLabel, nextEdgePorts, placeNextNode } from './add-next';
import { getLinkLabelText } from './text-editing';
import { bridgeEdges } from './bridge';
import { hasSelectedAncestor } from './selection';
import { inBatch } from './batch';

/** Ordnet Elemente nach dem Verschieben der Lane unter ihnen zu (bzw. löst sie). */
export const reassignLanes = (graph, cells) => cells.forEach((cell) => assignLane(graph, cell));

/**
 * Folgeschritt anhängen („+“-Griff, Menü oder Eigenschaften-Leiste): neues Element rechts bzw.
 * unterhalb der Quelle, verbunden mit ihr und in derselben Lane. Liefert das neue Element.
 * @param {any} graph
 * @param {any} source
 * @param {'right' | 'bottom'} direction
 * @param {string} [type]
 */
export function addNextStep(graph, source, direction, type = 'process') {
  if (!graph || !source) return null;
  const node = createNode(type, 0, 0);
  const obstacles = graph.getElements().filter((cell) => !isLane(cell)).map((cell) => cell.getBBox());
  const { x, y } = placeNextNode(source.getBBox(), node.size(), direction, obstacles);
  node.position(x, y);

  const label = String(source.get('type')) === 'vhs.Decision'
    ? nextDecisionLabel(graph.getConnectedLinks(source, { outbound: true }).map(getLinkLabelText))
    : '';
  const ports = nextEdgePorts(direction);
  const link = createLink(source.id, node.id, label);
  link.source({ id: source.id, port: ports.sourcePort });
  link.target({ id: node.id, port: ports.targetPort });

  inBatch(graph, 'add-next', () => {
    graph.addCell(node);
    // Gleiche Lane wie die Quelle, auch wenn der neue Schritt über ihren Rand hinausragt
    const lane = source.getParentCell();
    if (isLane(lane)) {
      setElementLane(node, lane);
      growLaneToFit(lane);
    }
    graph.addCell(link);
  });
  return node;
}

/**
 * Löscht Zellen. `bridge` (nur bei genau einem Schritt): Vorgänger und Nachfolger verbinden.
 * @returns {number} Anzahl gelöschter Zellen
 */
export function deleteCells(graph, converter, cells, { bridge = false } = {}) {
  if (!cells.length) return 0;
  const bridges = bridge && cells.length === 1 ? bridgeEdges(converter.toJson(), String(cells[0].id)) || [] : [];
  inBatch(graph, 'delete', () => {
    graph.removeCells(cells);
    bridges.forEach((edge) => {
      const link = createLink(edge.from, edge.to, edge.label);
      if (edge.sourcePort) link.source({ id: edge.from, port: edge.sourcePort });
      if (edge.targetPort) link.target({ id: edge.to, port: edge.targetPort });
      graph.addCell(link);
    });
  });
  return cells.length;
}

/** Liegt der einzeln ausgewählte Schritt im Ablauf (Vorgänger und genau ein Nachfolger)? */
export function bridgeInfo(converter, cells) {
  if (cells.length !== 1 || !cells[0].isElement()) return null;
  const edges = bridgeEdges(converter.toJson(), String(cells[0].id));
  return edges ? { label: cells[0].attr('label/text') || '', count: edges.length } : null;
}

/**
 * Verschiebt Elemente (Pfeiltasten). Elemente in einer mit ausgewählten Lane wandern mit ihr.
 * @returns {boolean} ob etwas verschoben wurde
 */
export function moveElements(graph, elements, dx, dy) {
  if (!elements.length) return false;
  const movable = elements.filter((cell) => !hasSelectedAncestor(cell, elements));
  inBatch(graph, 'move', () => {
    movable.forEach((cell) => cell.translate(dx, dy));
    reassignLanes(graph, movable);
  });
  return true;
}

/** Setzt Elemente auf neue Positionen (Ausrichten, Verteilen). */
export function applyPositions(graph, positions) {
  const entries = Object.entries(positions);
  if (!entries.length) return false;
  inBatch(graph, 'arrange', () => {
    entries.forEach(([id, { x, y }]) => graph.getCell(id)?.position(x, y, { deep: true }));
    reassignLanes(graph, entries.map(([id]) => graph.getCell(id)).filter(Boolean));
  });
  return true;
}

/**
 * Wendet das Ergebnis von layoutSelection (partial-layout.js) an: nur die betroffenen Elemente
 * und Verbindungen ändern sich. Liefert die Anzahl verschobener Elemente.
 */
export function applyPartialLayout(graph, result) {
  const entries = Object.entries(result.positions);
  if (!entries.length) return 0;
  const moved = inBatch(graph, 'layout', () => {
    const cells = entries.map(([id, { x, y }]) => {
      const cell = graph.getCell(id);
      cell?.position(x, y, { deep: true });
      return cell;
    }).filter(Boolean);
    Object.entries(result.ports).forEach(([id, ports]) => {
      const link = graph.getCell(id);
      if (!link?.isLink()) return;
      link.vertices([]);
      link.source({ id: link.source().id, port: ports.sourcePort });
      link.target({ id: link.target().id, port: ports.targetPort });
    });
    // Elemente in einer Lane bleiben dort (die Lane wächst mit), freie Elemente werden neu zugeordnet
    cells.forEach((cell) => {
      const lane = cell.getParentCell();
      if (isLane(lane)) growLaneToFit(lane);
      else assignLane(graph, cell);
    });
    return cells;
  });
  return moved.length;
}

/** Ausgewählte Elemente als Ausschnitt; bei Lanes samt ihrem Inhalt. */
export function fragmentOf(converter, elements) {
  const withContent = elements.flatMap((cell) => (isLane(cell) ? [cell, ...cell.getEmbeddedCells({ deep: true })] : [cell]));
  const ids = [...new Set(withContent.filter((cell) => cell.isElement()).map((cell) => cell.id))];
  return ids.length ? extractFragment(converter.toJson(), ids) : null;
}

/**
 * Fügt einen Ausschnitt mit neuen IDs ein. Elemente ohne mitkopierte Lane landen in der Lane,
 * über der sie eingefügt wurden. Liefert die eingefügten Elemente.
 */
export function insertFragment(graph, converter, fragment, offset, createId) {
  const { nodes, edges } = instantiateFragment(fragment, { offset, createId });
  converter.fromJson({ nodes, edges });
  const cells = nodes.map((node) => graph.getCell(node.id)).filter(Boolean);
  cells.filter((cell) => !cell.getParentCell()).forEach((cell) => assignLane(graph, cell));
  return cells;
}
