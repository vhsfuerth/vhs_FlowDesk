// @ts-check
// Bidirektionale Umwandlung zwischen dem App-Format `{ nodes, edges }` und JointJS-Zellen.

import { createLink, createNode } from './shapes';
import { NODE_DETAIL_FIELDS } from './types';
import { laneOf } from './lanes';

/** @typedef {import('jointjs').dia.Graph} Graph */
/** @typedef {import('jointjs').dia.Element} Element */
/** @typedef {import('jointjs').dia.Link} Link */
/** @typedef {import('./types').DiagramData} DiagramData */
/** @typedef {import('./types').DiagramNode} DiagramNode */
/** @typedef {import('./types').DiagramEdge} DiagramEdge */
/** @typedef {import('./types').NodeType} NodeType */

/** Router je Linienführung (JointJS-Name) */
export const ROUTERS = /** @type {const} */ ({ orthogonal: 'manhattan', straight: 'normal' });

/**
 * Zusatzangaben eines Elements (Erläuterung, Zuständigkeit …) aus dem Modell.
 * @param {Element} element
 * @returns {Record<string, string>}
 */
export const getNodeDetails = (element) => ({ ...(element.get('details') || {}) });

/**
 * Setzt eine Zusatzangabe; leerer Text entfernt sie.
 * @param {Element} element
 * @param {string} field
 * @param {string} value
 */
export function setNodeDetail(element, field, value) {
    const details = getNodeDetails(element);
    if (value && value.trim()) {
        details[field] = value;
    } else {
        delete details[field];
    }
    element.set('details', details);
}

/**
 * Bettet ein Element in eine Lane ein bzw. löst es (lane = null).
 * @param {Element} element
 * @param {Element | null} lane
 */
export function setElementLane(element, lane) {
    const parent = element.getParentCell();
    if (parent === lane) return;
    if (parent) parent.unembed(element);
    if (lane) lane.embed(element);
}

/** @param {any} cell */
const isLaneCell = (cell) => Boolean(cell) && cell.get('type') === 'vhs.Lane';

export class JSONConverter {
    /** @param {Graph} graph */
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Fügt die Knoten und Verbindungen aus `json` in den Graphen ein.
     * Verbindungen mit unbekanntem Start- oder Zielknoten werden übersprungen.
     * Elemente ohne gültige `laneId` werden nach Lage einer Swimlane zugeordnet.
     * @param {DiagramData} json
     */
    fromJson(json) {
        if (!json || !json.nodes || !Array.isArray(json.nodes)) {
            throw new Error('Invalid JSON structure: Missing nodes array');
        }

        /** @type {Map<string, Element>} */
        const nodesMap = new Map();

        this.graph.startBatch('import');

        json.nodes.forEach((node) => {
            const element = createNode(
                node.type.toLowerCase(),
                node.position?.x ?? 100,
                node.position?.y ?? 100,
                node.label || '',
                node.laneColor || null
            );
            if (node.id) element.set('id', node.id);
            if (node.size) element.resize(node.size.width, node.size.height);

            /** @type {Record<string, string>} */
            const details = {};
            NODE_DETAIL_FIELDS.forEach((field) => {
                const value = node[field];
                if (typeof value === 'string' && value.trim()) details[field] = value;
            });
            if (Object.keys(details).length) element.set('details', details);

            nodesMap.set(node.id, element);
            this.graph.addCell(element);
        });

        // Swimlanes halten ihre Elemente (Einbettung)
        const laneNodes = json.nodes.filter((n) => n.type === 'lane');
        if (laneNodes.length) {
            json.nodes.forEach((node) => {
                const lane = laneOf(node, laneNodes);
                const element = nodesMap.get(node.id);
                const laneElement = lane ? nodesMap.get(lane.id) : null;
                if (element && laneElement) setElementLane(element, laneElement);
            });
        }

        (json.edges || []).forEach((edge) => {
            const sourceNode = nodesMap.get(edge.from);
            const targetNode = nodesMap.get(edge.to);
            if (!sourceNode || !targetNode) {
                console.warn(`Failed to create link: Missing source (${edge.from}) or target (${edge.to})`);
                return;
            }
            const link = createLink(sourceNode.id, targetNode.id, edge.label);
            if (edge.sourcePort) link.source({ id: sourceNode.id, port: edge.sourcePort });
            if (edge.targetPort) link.target({ id: targetNode.id, port: edge.targetPort });
            if (edge.id) link.set('id', edge.id);
            if (Array.isArray(edge.vertices) && edge.vertices.length) {
                link.vertices(edge.vertices.map(({ x, y }) => ({ x, y })));
            }
            if (edge.routing === 'straight') link.router({ name: ROUTERS.straight });
            if (edge.labelPosition && link.labels().length) {
                link.prop(['labels', 0, 'position'], { ...edge.labelPosition });
            }
            this.graph.addCell(link);
        });

        this.graph.stopBatch('import');
    }

    /**
     * Liest den Graphen in das App-Format aus. Lose Verbindungen ohne Start oder Ziel entfallen.
     * @returns {DiagramData}
     */
    toJson() {
        /** @type {DiagramData} */
        const json = { nodes: [], edges: [] };

        this.graph.getCells().forEach((cell) => {
            if (cell.isElement()) {
                const element = /** @type {Element} */ (cell);
                const typeName = /** @type {NodeType} */ (String(element.get('type')).replace('vhs.', '').toLowerCase());
                const position = element.position();
                const size = element.size();

                /** @type {DiagramNode} */
                const nodeData = {
                    id: String(element.id),
                    type: typeName,
                    label: element.attr('label/text') || '',
                    position: { x: position.x, y: position.y },
                    size: { width: size.width, height: size.height }
                };

                if (typeName === 'lane') {
                    const headerFill = element.attr('header/fill');
                    const bodyFill = element.attr('body/fill');
                    if (headerFill) nodeData.laneColor = { header: headerFill, body: bodyFill };
                } else {
                    const parent = element.getParentCell();
                    if (parent && isLaneCell(parent)) nodeData.laneId = String(parent.id);
                }

                Object.assign(nodeData, getNodeDetails(element));
                json.nodes.push(nodeData);
            } else if (cell.isLink()) {
                const link = /** @type {Link} */ (cell);
                const source = link.source();
                const target = link.target();
                if (!source || !target || !source.id || !target.id) return; // Lose Verbindungen entfallen

                const firstLabel = link.labels()[0];
                /** @type {DiagramEdge} */
                const edgeData = {
                    id: String(link.id),
                    from: String(source.id),
                    to: String(target.id),
                    sourcePort: source.port,
                    targetPort: target.port,
                    label: String(firstLabel?.attrs?.text?.text ?? '')
                };

                const vertices = link.vertices();
                if (vertices.length) edgeData.vertices = vertices.map(({ x, y }) => ({ x, y }));
                const position = /** @type {any} */ (firstLabel?.position);
                if (edgeData.label && position && typeof position === 'object' && Number.isFinite(position.distance)) {
                    edgeData.labelPosition = Number.isFinite(position.offset) && position.offset
                        ? { distance: position.distance, offset: position.offset }
                        : { distance: position.distance };
                }
                const router = /** @type {any} */ (link.router());
                if (router?.name === ROUTERS.straight) edgeData.routing = 'straight';

                json.edges.push(edgeData);
            }
        });

        return json;
    }
}
