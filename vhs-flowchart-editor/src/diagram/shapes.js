import * as joint from 'jointjs';
import { COLORS, FONTS } from '../utils/constants';

// Shared styling mixins
const textStyle = {
  fontFamily: FONTS.primary,
  fill: COLORS.vhsBlue,
  fontSize: 14,
  fontWeight: 'bold',
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
            }
        }
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
                stroke: COLORS.vhsYellowB,
                strokeWidth: 4,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
            }
        }
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
                    width: -10,
                    height: -10,
                    ellipsis: true
                }
            }
        }
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
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                textWrap: {
                    width: -40,
                    height: -40,
                    ellipsis: true
                }
            }
        }
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
        }
    }, {
        markup: defaultMarkup
    }),
};

Object.assign(joint.shapes, {
    vhs: shapes
});

export const createStartNode = (x, y, label = 'Start') => {
    return new shapes.Start({
        position: { x, y },
        size: { width: 120, height: 60 },
        attrs: { label: { text: label } }
    });
};

export const createEndNode = (x, y, label = 'Ende') => {
    return new shapes.End({
        position: { x, y },
        size: { width: 120, height: 60 },
        attrs: { label: { text: label } }
    });
};

export const createProcessNode = (x, y, label = 'Prozess') => {
    return new shapes.Process({
        position: { x, y },
        size: { width: 160, height: 60 },
        attrs: { label: { text: label } }
    });
};

export const createDecisionNode = (x, y, label = 'Entscheidung?') => {
    return new shapes.Decision({
        position: { x, y },
        size: { width: 180, height: 100 },
        attrs: { label: { text: label } }
    });
};

export const createAnnotationNode = (x, y, label = 'Kommentar') => {
    return new shapes.Annotation({
        position: { x, y },
        size: { width: 200, height: 80 },
        attrs: { label: { text: label } }
    });
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
                    fontWeight: 'bold'
                },
                rect: {
                    fill: COLORS.white,
                    rx: 5,
                    ry: 5,
                    stroke: COLORS.vhsBlue20,
                    strokeWidth: 1,
                    strokeDasharray: '0'
                }
            }
        }]);
    }

    return link;
};
