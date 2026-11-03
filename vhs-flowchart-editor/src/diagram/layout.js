import { computeAutoLayout } from './auto-layout';
import { JSONConverter } from './converter';

// Wendet das berechnete Layout (siehe auto-layout.js) auf einen JointJS-Graphen an.
export class DiagramLayout {
    constructor(graph) {
        this.graph = graph;
        this.converter = new JSONConverter(graph);
    }

    applyLayout(direction = 'TB') {
        const result = computeAutoLayout(this.converter.toJson(), { direction });

        this.graph.startBatch('layout');

        Object.entries(result.lanes).forEach(([id, rect]) => {
            const lane = this.graph.getCell(id);
            if (!lane) return;
            lane.position(rect.x, rect.y);
            lane.resize(rect.width, rect.height);
        });

        Object.entries(result.positions).forEach(([id, position]) => {
            this.graph.getCell(id)?.position(position.x, position.y);
        });

        this.graph.getLinks().forEach((link) => {
            link.vertices([]); // Reset previous manual points
            const ports = result.ports[link.id];
            if (!ports) return;
            link.source({ id: link.source().id, port: ports.sourcePort });
            link.target({ id: link.target().id, port: ports.targetPort });
        });

        this.graph.stopBatch('layout');
        return result;
    }
}
