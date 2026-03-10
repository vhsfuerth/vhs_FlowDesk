import * as joint from 'jointjs';

export const createGraph = () => {
    return new joint.dia.Graph({}, { cellNamespace: joint.shapes });
};

export const createPaper = (graph, element) => {
    return new joint.dia.Paper({
        el: element,
        model: graph,
        width: '100%',
        height: '100%',
        gridSize: 10,
        drawGrid: {
            name: 'dot',
            args: { color: '#CDD7DC', thickness: 1 } 
        },
        background: { color: '#ffffff' },
        defaultLink: () => new joint.shapes.standard.Link({
            attrs: {
                line: {
                    stroke: '#69829B',
                    strokeWidth: 2,
                    targetMarker: {
                        type: 'path',
                        d: 'M 10 -5 0 0 10 5 z',
                        fill: '#69829B',
                        stroke: 'none'
                    }
                }
            },
            router: { name: 'manhattan' },
            connector: { name: 'rounded' }
        }),
        interactive: { linkMove: true },
        snapLinks: { radius: 30 },
        linkPinning: false,
        validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
            // Prevent linking to itself
            if (cellViewS === cellViewT) return false;
            // Target cannot be a link
            if (cellViewT.model.isLink()) return false;
            return true;
        },
        cellViewNamespace: joint.shapes
    });
};
