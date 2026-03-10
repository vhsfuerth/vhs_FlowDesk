import * as joint from 'jointjs';
import dagre from '@dagrejs/dagre';
import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createLink } from './shapes';

export class DiagramLayout {
    constructor(graph) {
        this.graph = graph;
    }

    applyLayout(direction = 'TB') {
        const layoutGraph = new dagre.graphlib.Graph();
        layoutGraph.setGraph({
            rankdir: direction,
            marginx: 50,
            marginy: 50,
            nodesep: 80,
            edgesep: 40,
            ranksep: 100
        });
        layoutGraph.setDefaultEdgeLabel(() => ({}));

        const cells = this.graph.getCells();
        const nodes = cells.filter(cell => cell.isElement());
        const links = cells.filter(cell => cell.isLink());

        // Add nodes to Dagre
        nodes.forEach(node => {
            const size = node.size();
            layoutGraph.setNode(node.id, { width: size.width, height: size.height });
        });

        // Add links to Dagre
        links.forEach(link => {
            const source = link.attributes.source.id;
            const target = link.attributes.target.id;
            if (source && target) {
                layoutGraph.setEdge(source, target);
            }
        });

        // Calculate layout
        dagre.layout(layoutGraph);

        // Apply calculated positions to JointJS nodes
        this.graph.startBatch('layout');
        layoutGraph.nodes().forEach(nodeId => {
            const dagreNode = layoutGraph.node(nodeId);
            if (dagreNode) { // check if node was successfully positioned
                const jointNode = this.graph.getCell(nodeId);
                const size = jointNode.size();
                
                // Dagre coordinates are for the center, JointJS uses top-left
                jointNode.position(
                    dagreNode.x - size.width / 2,
                    dagreNode.y - size.height / 2
                );
            }
        });

        // Reset link vertices as Dagre calculates straight or custom paths that JointJS manhattan router handles better
        links.forEach(link => link.vertices([]));
        
        this.graph.stopBatch('layout');
    }
}
