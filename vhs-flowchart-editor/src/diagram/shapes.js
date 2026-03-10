import * as joint from 'jointjs';
import { COLORS, FONTS } from '../utils/constants';

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
    const minWidths = { start: 140, end: 140, process: 160, decision: 180, annotation: 200 };
    const minHeights = { start: 70, end: 70, process: 60, decision: 110, annotation: 80 };
    
    const charWidth = 8; // approx char width at 13px
    const lineHeight = 18;
    const maxCharsPerLine = type === 'decision' ? 12 : 18;
    
    const lines = Math.ceil(label.length / maxCharsPerLine);
    const longestLineLen = Math.min(label.length, maxCharsPerLine);
    
    let w = Math.max(minWidths[type] || 160, longestLineLen * charWidth + 40);
    let h = Math.max(minHeights[type] || 60, lines * lineHeight + 30);
    
    // Ovals and diamonds need extra space
    if (type === 'start' || type === 'end') {
        w = Math.max(w, h * 2); // keep oval proportions
        h = Math.max(h, 70);
    }
    if (type === 'decision') {
        w = Math.max(w, 180);
        h = Math.max(h, 110);
    }
    
    node.resize(w, h);
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
