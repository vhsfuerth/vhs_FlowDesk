import * as joint from 'jointjs';
import { COLORS, FONTS } from '../utils/constants';
import { estimateNodeSize } from './node-size';

// Shared styling mixins
const textStyle = {
  fontFamily: FONTS.primary,
  fill: COLORS.vhsBlue,
  fontSize: 13,
  fontWeight: 'bold',
};

export const linkLabelStyle = {
    attrs: {
        text: {
            fontFamily: FONTS.primary,
            fill: COLORS.vhsBlue,
            fontSize: 12,
            fontWeight: 'bold',
            'pointer-events': 'none'
        },
        rect: {
            fill: COLORS.white,
            rx: 5,
            ry: 5,
            stroke: COLORS.vhsBlue20,
            strokeWidth: 1,
            'pointer-events': 'none'
        }
    }
};

// Port configuration for manual link creation
const portAttrs = {
  circle: {
    r: 6,
    magnet: true,
    stroke: COLORS.vhsBlue60,
    strokeWidth: 2,
    fill: COLORS.white,
    style: { visibility: 'hidden' }
  }
};

const commonPorts = {
  groups: {
    top: { position: 'top', attrs: portAttrs },
    bottom: { position: 'bottom', attrs: portAttrs },
    left: { position: 'left', attrs: portAttrs },
    right: { position: 'right', attrs: portAttrs },
  },
  items: [
    { group: 'top', id: 'port-top' },
    { group: 'bottom', id: 'port-bottom' },
    { group: 'left', id: 'port-left' },
    { group: 'right', id: 'port-right' },
  ]
};

const defaultMarkup = [{
    tagName: 'rect',
    selector: 'body'
}, {
    tagName: 'text',
    selector: 'label'
}];

const ellipseMarkup = [{
    tagName: 'ellipse',
    selector: 'body'
}, {
    tagName: 'text',
    selector: 'label'
}];

const polygonMarkup = [{
    tagName: 'polygon',
    selector: 'body'
}, {
    tagName: 'text',
    selector: 'label'
}];

export const shapes = {
    Start: joint.dia.Element.define('vhs.Start', {
        attrs: {
            body: {
                refCx: '50%',
                refCy: '50%',
                refRx: '50%',
                refRy: '50%',
                fill: COLORS.vhsYellow,
                stroke: COLORS.vhsBlue,
                strokeWidth: 2,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                textWrap: {
                    width: -20,
                    height: -10,
                    ellipsis: true
                }
            }
        },
        ports: commonPorts
    }, {
        markup: ellipseMarkup
    }),
    
    End: joint.dia.Element.define('vhs.End', {
        attrs: {
            body: {
                refCx: '50%',
                refCy: '50%',
                refRx: '50%',
                refRy: '50%',
                fill: COLORS.white,
                stroke: COLORS.vhsOrange,
                strokeWidth: 3,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                textWrap: {
                    width: -20,
                    height: -10,
                    ellipsis: true
                }
            }
        },
        ports: commonPorts
    }, {
        markup: ellipseMarkup
    }),

    Process: joint.dia.Element.define('vhs.Process', {
        attrs: {
            body: {
                refWidth: '100%',
                refHeight: '100%',
                fill: COLORS.vhsBlue10,
                stroke: COLORS.vhsBlue,
                strokeWidth: 2,
                rx: 4,
                ry: 4,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                textWrap: {
                    width: -20,
                    height: -10,
                    ellipsis: true
                }
            }
        },
        ports: commonPorts
    }, {
        markup: defaultMarkup
    }),

    Decision: joint.dia.Element.define('vhs.Decision', {
        attrs: {
            body: {
                refPoints: '0,50 50,0 100,50 50,100',
                fill: COLORS.white,
                stroke: COLORS.vhsBlue80,
                strokeWidth: 2,
            },
            label: {
                ...textStyle,
                fontSize: 12,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                textWrap: {
                    width: -60,
                    height: -40,
                    ellipsis: true
                }
            }
        },
        ports: commonPorts
    }, {
        markup: polygonMarkup
    }),
    
    Lane: joint.dia.Element.define('vhs.Lane', {
        attrs: {
            body: {
                refWidth: '100%',
                refHeight: '100%',
                fill: '#EEF4F7',
                stroke: COLORS.vhsBlue,
                strokeWidth: 1.5,
                rx: 6,
                ry: 6,
            },
            header: {
                // Rounded top corners matching body, flat bottom at y=40
                d: 'M 5 0 L calc(w-5) 0 Q calc(w) 0 calc(w) 5 L calc(w) 40 L 0 40 L 0 5 Q 0 0 5 0 Z',
                fill: COLORS.vhsBlue,
                stroke: 'none',
            },
            label: {
                refX: 16,
                refY: 20,
                textVerticalAnchor: 'middle',
                textAnchor: 'left',
                fontFamily: FONTS.primary,
                fill: '#ffffff',
                fontSize: 14,
                fontWeight: 'bold',
                textWrap: {
                    width: -32,
                    height: 30,
                    ellipsis: true
                }
            }
        },
        z: -10
    }, {
        markup: [{
            tagName: 'rect',
            selector: 'body'
        }, {
            tagName: 'path',
            selector: 'header'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    }),

    Annotation: joint.dia.Element.define('vhs.Annotation', {
        attrs: {
            body: {
                refWidth: '100%',
                refHeight: '100%',
                fill: 'transparent',
                stroke: COLORS.vhsBlue40,
                strokeWidth: 1,
                strokeDasharray: '5,5',
                rx: 2,
                ry: 2,
            },
            label: {
                ...textStyle,
                fill: COLORS.vhsBlue60,
                fontSize: 12,
                fontWeight: 'normal',
                textVerticalAnchor: 'top',
                textAnchor: 'left',
                refX: 10,
                refY: 10,
                textWrap: {
                    width: -20,
                    height: -20,
                    ellipsis: true
                }
            }
        },
        ports: commonPorts
    }, {
        markup: defaultMarkup
    }),
};

Object.assign(joint.shapes, {
    vhs: shapes
});

// Helper: auto-size a node to fit its text
export function autoSizeForText(node, label, type) {
    const { width, height } = estimateNodeSize(label, type);
    node.resize(width, height);
}

export const createStartNode = (x, y, label = 'Start') => {
    const node = new shapes.Start({
        position: { x, y },
        size: { width: 140, height: 70 },
        attrs: { label: { text: label } }
    });
    autoSizeForText(node, label, 'start');
    return node;
};

export const createEndNode = (x, y, label = 'Ende') => {
    const node = new shapes.End({
        position: { x, y },
        size: { width: 140, height: 70 },
        attrs: { label: { text: label } }
    });
    autoSizeForText(node, label, 'end');
    return node;
};

export const createProcessNode = (x, y, label = 'Prozess') => {
    const node = new shapes.Process({
        position: { x, y },
        size: { width: 160, height: 60 },
        attrs: { label: { text: label } }
    });
    autoSizeForText(node, label, 'process');
    return node;
};

export const createDecisionNode = (x, y, label = 'Entscheidung?') => {
    const node = new shapes.Decision({
        position: { x, y },
        size: { width: 180, height: 110 },
        attrs: { label: { text: label } }
    });
    autoSizeForText(node, label, 'decision');
    return node;
};

/**
 * @param {number} x
 * @param {number} y
 * @param {string} [label]
 * @param {{ header: string, body: string } | null} [color]
 */
export const createLaneNode = (x, y, label = 'Swimlane', color = null) => {
    const node = new shapes.Lane({
        position: { x, y },
        size: { width: 700, height: 160 },
        attrs: { label: { text: label } }
    });
    node.set('z', -10);
    if (color) {
        node.attr('header/fill', color.header);
        node.attr('body/fill', color.body);
        node.attr('body/stroke', color.header);
    }
    return node;
};

export const createAnnotationNode = (x, y, label = 'Kommentar') => {
    const node = new shapes.Annotation({
        position: { x, y },
        size: { width: 200, height: 80 },
        attrs: { label: { text: label } }
    });
    autoSizeForText(node, label, 'annotation');
    return node;
};

export const createLink = (sourceId, targetId, label = '') => {
    const link = new joint.shapes.standard.Link({
        source: { id: sourceId },
        target: { id: targetId },
        attrs: {
            line: {
                stroke: COLORS.vhsBlue60,
                strokeWidth: 2,
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -5 0 0 10 5 z',
                    fill: COLORS.vhsBlue60,
                    stroke: 'none'
                }
            }
        },
        router: { name: 'manhattan' },
        connector: { name: 'rounded' }
    });

    if (label) {
        link.labels([{
            attrs: {
                text: {
                    text: label,
                    fontFamily: FONTS.primary,
                    fill: COLORS.vhsBlue,
                    fontSize: 12,
                    fontWeight: 'bold',
                    'pointer-events': 'none' // Prevent label movement
                },
                rect: {
                    fill: COLORS.white,
                    rx: 5,
                    ry: 5,
                    stroke: COLORS.vhsBlue20,
                    strokeWidth: 1,
                    'pointer-events': 'none'
                }
            }
        }]);
    }

    return link;
};
