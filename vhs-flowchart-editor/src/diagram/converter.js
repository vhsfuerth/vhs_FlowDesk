import * as joint from 'jointjs';
import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createLink, createAnnotationNode } from './shapes';

export class JSONConverter {
    constructor(graph) {
        this.graph = graph;
    }

    fromJson(json) {
        if (!json || !json.nodes || !Array.isArray(json.nodes)) {
            throw new Error('Invalid JSON structure: Missing nodes array');
        }

        const nodesMap = new Map();
        
        // Disable history tracking during import
        this.graph.startBatch('import');

        // Parse Nodes
        json.nodes.forEach(node => {
            let jointNode;
            const x = node.position?.x || 100;
            const y = node.position?.y || 100;
            const label = node.label || '';

            switch (node.type.toLowerCase()) {
                case 'start':
                    jointNode = createStartNode(x, y, label);
                    break;
                case 'end':
                    jointNode = createEndNode(x, y, label);
                    break;
                case 'decision':
                    jointNode = createDecisionNode(x, y, label);
                    break;
                case 'annotation':
                    jointNode = createAnnotationNode(x, y, label);
                    break;
                case 'process':
                default:
                    jointNode = createProcessNode(x, y, label);
                    break;
            }

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

    toJson() {
        const json = {
            nodes: [],
            edges: []
        };

        const cells = this.graph.getCells();

        cells.forEach(cell => {
            if (cell.isElement()) {
                const typeName = cell.get('type').replace('vhs.', '').toLowerCase();
                const position = cell.position();
                const size = cell.size();
                const labelText = cell.attr('label/text') || '';

                json.nodes.push({
                    id: cell.id,
                    type: typeName,
                    label: labelText,
                    position: { x: position.x, y: position.y },
                    size: { width: size.width, height: size.height }
                });
            } else if (cell.isLink()) {
                const source = cell.get('source');
                const target = cell.get('target');
                
                if (!source || !target || !source.id || !target.id) return; // Skip floating links
                
                const sourceId = source.id;
                const targetId = target.id;
                
                let labelText = '';
                const labels = cell.labels();
                if (labels && labels.length > 0 && labels[0].attrs && labels[0].attrs.text) {
                    labelText = labels[0].attrs.text.text;
                }

                json.edges.push({
                    id: cell.id,
                    from: sourceId,
                    to: targetId,
                    sourcePort: source.port,
                    targetPort: target.port,
                    label: labelText
                });
            }
        });

        return json;
    }
}
