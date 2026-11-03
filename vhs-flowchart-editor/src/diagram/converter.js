// @ts-check
// Bidirektionale Umwandlung zwischen dem App-Format `{ nodes, edges }` und JointJS-Zellen.

import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createLink, createAnnotationNode, createLaneNode } from './shapes';

/** @typedef {import('jointjs').dia.Graph} Graph */
/** @typedef {import('jointjs').dia.Element} Element */
/** @typedef {import('jointjs').dia.Link} Link */
/** @typedef {import('./types').DiagramData} DiagramData */
/** @typedef {import('./types').DiagramNode} DiagramNode */
/** @typedef {import('./types').DiagramEdge} DiagramEdge */
/** @typedef {import('./types').NodeType} NodeType */

/**
 * Erzeugt das JointJS-Element für einen Knoten (unbekannte Typen werden zu Prozessschritten).
 * @param {DiagramNode} node
 * @returns {Element}
 */
const createElementForNode = (node) => {
    const x = node.position?.x ?? 100;
    const y = node.position?.y ?? 100;
    const label = node.label || '';

    switch (node.type.toLowerCase()) {
        case 'start':
            return createStartNode(x, y, label);
        case 'end':
            return createEndNode(x, y, label);
        case 'decision':
            return createDecisionNode(x, y, label);
        case 'annotation':
            return createAnnotationNode(x, y, label);
        case 'lane':
            return createLaneNode(x, y, label, node.laneColor || null);
        case 'process':
        default:
            return createProcessNode(x, y, label);
    }
};

export class JSONConverter {
    /** @param {Graph} graph */
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Fügt die Knoten und Verbindungen aus `json` in den Graphen ein.
     * Verbindungen mit unbekanntem Start- oder Zielknoten werden übersprungen.
     * @param {DiagramData} json
     */
    fromJson(json) {
        if (!json || !json.nodes || !Array.isArray(json.nodes)) {
            throw new Error('Invalid JSON structure: Missing nodes array');
        }

        /** @type {Map<string, Element>} */
        const nodesMap = new Map();

        // Disable history tracking during import
        this.graph.startBatch('import');

        // Parse Nodes
        json.nodes.forEach(node => {
            const jointNode = createElementForNode(node);

            if (node.id) {
                jointNode.set('id', node.id);
            }

            if (node.size) {
                jointNode.resize(node.size.width, node.size.height);
            }

            nodesMap.set(node.id, jointNode);
            this.graph.addCell(jointNode);
        });

        // Parse Edges
        if (json.edges && Array.isArray(json.edges)) {
            json.edges.forEach(edge => {
                const sourceNode = nodesMap.get(edge.from);
                const targetNode = nodesMap.get(edge.to);

                if (sourceNode && targetNode) {
                    const link = createLink(sourceNode.id, targetNode.id, edge.label);

                    if (edge.sourcePort) link.source({ id: sourceNode.id, port: edge.sourcePort });
                    if (edge.targetPort) link.target({ id: targetNode.id, port: edge.targetPort });

                    if (edge.id) {
                        link.set('id', edge.id);
                    }

                    this.graph.addCell(link);
                } else {
                    console.warn(`Failed to create link: Missing source (${edge.from}) or target (${edge.to})`);
                }
            });
        }

        this.graph.stopBatch('import');
    }

    /**
     * Liest den Graphen in das App-Format aus. Lose Verbindungen ohne Start oder Ziel entfallen.
     * @returns {DiagramData}
     */
    toJson() {
        /** @type {DiagramData} */
        const json = {
            nodes: [],
            edges: []
        };

        const cells = this.graph.getCells();

        cells.forEach(cell => {
            if (cell.isElement()) {
                const element = /** @type {Element} */ (cell);
                const typeName = /** @type {NodeType} */ (String(element.get('type')).replace('vhs.', '').toLowerCase());
                const position = element.position();
                const size = element.size();
                const labelText = element.attr('label/text') || '';

                /** @type {DiagramNode} */
                const nodeData = {
                    id: String(element.id),
                    type: typeName,
                    label: labelText,
                    position: { x: position.x, y: position.y },
                    size: { width: size.width, height: size.height }
                };

                if (typeName === 'lane') {
                    const headerFill = element.attr('header/fill');
                    const bodyFill = element.attr('body/fill');
                    if (headerFill) {
                        nodeData.laneColor = { header: headerFill, body: bodyFill };
                    }
                }

                json.nodes.push(nodeData);
            } else if (cell.isLink()) {
                const link = /** @type {Link} */ (cell);
                const source = link.source();
                const target = link.target();

                if (!source || !target || !source.id || !target.id) return; // Skip floating links

                let labelText = '';
                const labels = link.labels();
                if (labels && labels.length > 0 && labels[0].attrs && labels[0].attrs.text) {
                    labelText = String(labels[0].attrs.text.text ?? '');
                }

                json.edges.push({
                    id: String(link.id),
                    from: String(source.id),
                    to: String(target.id),
                    sourcePort: source.port,
                    targetPort: target.port,
                    label: labelText
                });
            }
        });

        return json;
    }
}
