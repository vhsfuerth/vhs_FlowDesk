import * as joint from 'jointjs';
import { COLORS, FONTS, LANE_COLORS } from '../utils/constants';
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
            cursor: 'move'
        },
        rect: {
            fill: COLORS.white,
            rx: 5,
            ry: 5,
            stroke: COLORS.vhsBlue20,
            strokeWidth: 1,
            cursor: 'move'
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

// Dokument: Die Wellenkante liegt in der Mitte etwa 11 px über der Unterkante. Der untere
// Anschluss sitzt deshalb auf der Welle, sonst verlässt die Maus auf dem Weg dorthin die Form
// und die Anschlusspunkte verschwinden.
export const DOCUMENT_BOTTOM_PORT_OFFSET = -11;
const documentPorts = {
  ...commonPorts,
  groups: {
    ...commonPorts.groups,
    bottom: { position: { name: 'bottom', args: { dy: DOCUMENT_BOTTOM_PORT_OFFSET } }, attrs: portAttrs }
  }
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

const pathMarkup = [{
    tagName: 'path',
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
                fill: LANE_COLORS[0].body,
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
                fill: COLORS.white,
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
        // Beim Löschen einer Lane bleiben ihre Elemente erhalten (JointJS löscht sonst eingebettete Zellen mit)
        remove(opt) {
            this.getEmbeddedCells().forEach((cell) => this.unembed(cell, opt));
            return joint.dia.Element.prototype.remove.call(this, opt);
        },
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

    // Dokument/Formular: Rechteck mit gewellter Unterkante
    Document: joint.dia.Element.define('vhs.Document', {
        attrs: {
            body: {
                d: 'M 0 4 Q 0 0 4 0 L calc(w-4) 0 Q calc(w) 0 calc(w) 4 L calc(w) calc(h-10) C calc(0.75*w) calc(h-26) calc(0.25*w) calc(h+6) 0 calc(h-10) Z',
                fill: COLORS.vhsLightBlueTint,
                stroke: COLORS.vhsLightBlueB,
                strokeWidth: 2,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                refY2: -6,
                textWrap: { width: -20, height: -24, ellipsis: true }
            }
        },
        ports: documentPorts
    }, {
        markup: pathMarkup
    }),

    // IT-System/Datenablage: Zylinder
    System: joint.dia.Element.define('vhs.System', {
        attrs: {
            body: {
                d: 'M 0 10 A calc(0.5*w) 10 0 0 1 calc(w) 10 L calc(w) calc(h-10) A calc(0.5*w) 10 0 0 1 0 calc(h-10) Z',
                fill: COLORS.vhsVioletTint,
                stroke: COLORS.vhsViolet,
                strokeWidth: 2,
            },
            top: {
                d: 'M 0 10 A calc(0.5*w) 10 0 0 0 calc(w) 10',
                fill: 'none',
                stroke: COLORS.vhsViolet,
                strokeWidth: 2,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                refY2: 5,
                textWrap: { width: -20, height: -34, ellipsis: true }
            }
        },
        ports: commonPorts
    }, {
        markup: [
            { tagName: 'path', selector: 'body' },
            { tagName: 'path', selector: 'top' },
            { tagName: 'text', selector: 'label' }
        ]
    }),

    // Teilprozess: weiße Fläche mit doppeltem Rahmen und Symbol zum Öffnen
    // (deutlich anders als der hellblau gefüllte Prozessschritt)
    Subprocess: joint.dia.Element.define('vhs.Subprocess', {
        attrs: {
            body: {
                refWidth: '100%',
                refHeight: '100%',
                fill: COLORS.white,
                stroke: COLORS.vhsBlue,
                strokeWidth: 2,
                rx: 8,
                ry: 8,
            },
            inner: {
                x: 4,
                y: 4,
                width: 'calc(w-8)',
                height: 'calc(h-8)',
                rx: 5,
                ry: 5,
                fill: 'none',
                stroke: COLORS.vhsBlue60,
                strokeWidth: 1,
                'pointer-events': 'none'
            },
            openIcon: {
                // Klick fragt, ob der Teilprozess hier angezeigt oder zu ihm gewechselt wird (DiagramCanvas)
                // Etwas oberhalb des unteren Anschlusspunkts, damit beide nicht zusammenfallen
                event: 'element:subprocess:open',
                cursor: 'pointer',
                d: 'M calc(0.5*w-7) calc(h-30) l 14 0 l 0 14 l -14 0 Z M calc(0.5*w) calc(h-27) l 0 8 M calc(0.5*w-4) calc(h-23) l 8 0',
                fill: COLORS.vhsBlue10,
                stroke: COLORS.vhsBlue,
                strokeWidth: 1.5,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refY: '50%',
                refY2: -10,
                textWrap: { width: -30, height: -44, ellipsis: true }
            }
        },
        ports: commonPorts
    }, {
        markup: [
            { tagName: 'rect', selector: 'body' },
            { tagName: 'rect', selector: 'inner' },
            { tagName: 'path', selector: 'openIcon' },
            { tagName: 'text', selector: 'label' }
        ]
    }),

    // Warten/Frist: Verzögerungsform (rechts abgerundet)
    Wait: joint.dia.Element.define('vhs.Wait', {
        attrs: {
            body: {
                d: 'M 0 0 L calc(w-calc(0.5*h)) 0 A calc(0.5*h) calc(0.5*h) 0 0 1 calc(w-calc(0.5*h)) calc(h) L 0 calc(h) Z',
                fill: COLORS.vhsYellowTint,
                stroke: COLORS.vhsOrangeHellB,
                strokeWidth: 2,
            },
            label: {
                ...textStyle,
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                refX: '50%',
                refX2: -10,
                refY: '50%',
                textWrap: { width: -40, height: -10, ellipsis: true }
            }
        },
        ports: commonPorts
    }, {
        markup: pathMarkup
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
        const labelDef = JSON.parse(JSON.stringify(linkLabelStyle));
        labelDef.attrs.text.text = label;
        link.labels([labelDef]);
    }

    return link;
};

// Fabriken für Typen ohne eigene Funktion (Dokument, IT-System, Teilprozess, Warten)
const SIMPLE_TYPES = {
    document: { shape: () => shapes.Document, size: { width: 160, height: 70 } },
    system: { shape: () => shapes.System, size: { width: 160, height: 80 } },
    subprocess: { shape: () => shapes.Subprocess, size: { width: 180, height: 90 } },
    wait: { shape: () => shapes.Wait, size: { width: 170, height: 60 } }
};

/** Standardtext und Größe je Typ, z. B. für neue Elemente aus der Werkzeugleiste */
export const NODE_DEFAULTS = {
    start: { label: 'Start', size: { width: 140, height: 70 } },
    end: { label: 'Ende', size: { width: 140, height: 70 } },
    process: { label: 'Prozess', size: { width: 160, height: 60 } },
    decision: { label: 'Entscheidung?', size: { width: 180, height: 110 } },
    annotation: { label: 'Kommentar', size: { width: 200, height: 80 } },
    lane: { label: 'Swimlane', size: { width: 700, height: 160 } },
    document: { label: 'Dokument', size: SIMPLE_TYPES.document.size },
    system: { label: 'IT-System', size: SIMPLE_TYPES.system.size },
    subprocess: { label: 'Teilprozess', size: SIMPLE_TYPES.subprocess.size },
    wait: { label: 'Warten', size: SIMPLE_TYPES.wait.size }
};

/**
 * Erzeugt ein Element beliebigen Typs (unbekannte Typen werden zu Prozessschritten).
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {string} [label]
 * @param {{ header: string, body: string } | null} [laneColor]
 */
export function createNode(type, x, y, label = NODE_DEFAULTS[type]?.label ?? 'Prozess', laneColor = null) {
    switch (type) {
        case 'start': return createStartNode(x, y, label);
        case 'end': return createEndNode(x, y, label);
        case 'decision': return createDecisionNode(x, y, label);
        case 'annotation': return createAnnotationNode(x, y, label);
        case 'lane': return createLaneNode(x, y, label, laneColor);
        default: {
            const simple = SIMPLE_TYPES[type];
            if (!simple) return createProcessNode(x, y, label);
            const Shape = simple.shape();
            const node = new Shape({ position: { x, y }, size: { ...simple.size }, attrs: { label: { text: label } } });
            autoSizeForText(node, label, type);
            return node;
        }
    }
}

/**
 * Neues Element eines Typs aus der Werkzeugleiste, zentriert um den Punkt (x, y).
 * @param {string} type  siehe NODE_TYPES in types.js
 */
export const createNodeAt = (type, x, y) => {
    const node = createNode(NODE_DEFAULTS[type] ? type : 'process', 0, 0);
    // Erst nach der automatischen Größenanpassung zentrieren
    const size = node.size();
    node.position(Math.round(x - size.width / 2), Math.round(y - size.height / 2));
    return node;
};
