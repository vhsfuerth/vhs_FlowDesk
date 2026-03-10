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
            marginx: 80,
            marginy: 80,
            nodesep: 100, 
            edgesep: 50,
            ranksep: 80 
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

        // Apply calculated positions
        this.graph.startBatch('layout');
        layoutGraph.nodes().forEach(nodeId => {
            const dagreNode = layoutGraph.node(nodeId);
            if (dagreNode) {
                const jointNode = this.graph.getCell(nodeId);
                const size = jointNode.size();
                jointNode.position(dagreNode.x - size.width / 2, dagreNode.y - size.height / 2);
            }
        });

        // Smart routing for decision labels
        links.forEach(link => {
            link.vertices([]); // Reset previous manual points
            
            const sourceId = link.source().id;
            const targetId = link.target().id;
            const sourceNode = this.graph.getCell(sourceId);
            const targetNode = this.graph.getCell(targetId);
            
            if (sourceNode && targetNode) {
                // If it's a decision, we want to avoid overlapping paths
                if (sourceNode.get('type') === 'vhs.Decision') {
                    const labelText = (link.labels()[0]?.attrs?.text?.text || '').toLowerCase();
                    const sPos = sourceNode.position();
                    const tPos = targetNode.position();

                    // Logic: Ja goes DOWN (bottom port), Nein goes SIDE (left or right port)
                    if (labelText === 'ja' || labelText === 'yes') {
                        link.source({ id: sourceId, port: 'port-bottom' });
                        link.target({ id: targetId, port: 'port-top' });
                    } else if (labelText === 'nein' || labelText === 'no') {
                        // Choose side based on target position relative to source
                        const port = tPos.x < sPos.x ? 'port-left' : 'port-right';
                        link.source({ id: sourceId, port: port });
                        link.target({ id: targetId, port: 'port-top' });
                    }
                } else {
                    // Standard flow: top to bottom
                    link.source({ id: sourceId, port: 'port-bottom' });
                    link.target({ id: targetId, port: 'port-top' });
                }
            }
        });
        
        this.graph.stopBatch('layout');
    }
}
