// Texte von Elementen und Verbindungen ändern (Doppelklick-Bearbeitung).
import { autoSizeForText, linkLabelStyle } from './shapes';

// Schnellauswahl für Ausgänge von Entscheidungen
const DECISION_ANSWERS = ['Ja', 'Nein'];

/** Beschriftung einer Verbindung ('' ohne Beschriftung). */
export const getLinkLabelText = (link) => String(link.labels()[0]?.attrs?.text?.text || '');

/** Setzt die Beschriftung einer Verbindung; leerer Text entfernt sie. */
export function setLinkLabelText(link, text) {
    if (text.trim() === '') {
        link.labels([]);
        return;
    }
    const label = JSON.parse(JSON.stringify(linkLabelStyle));
    label.attrs.text.text = text;
    // Verschobene Beschriftung behält ihre Lage
    const position = link.labels()[0]?.position;
    if (position) label.position = position;
    link.label(0, label);
}

/** Setzt eine verschobene Beschriftung wieder auf die Mitte der Linie. */
export function resetLinkLabelPosition(link) {
    const [label, ...rest] = link.labels();
    if (!label?.position) return;
    const withoutPosition = { ...label };
    delete withoutPosition.position;
    link.labels([withoutPosition, ...rest]);
}

/** Setzt den Text eines Elements und passt seine Größe an (nicht bei Lanes). */
export function setNodeText(node, text) {
    node.attr('label/text', text);
    const type = node.get('type').split('.')[1]?.toLowerCase();
    if (type && type !== 'lane') autoSizeForText(node, text, type);
}

/**
 * Setzt Titel und Farbe einer Swimlane.
 * @param {{ label: string, color: { header: string, body: string } }} value
 */
export function setLaneLabelAndColor(lane, { label, color }) {
    lane.attr('label/text', label);
    lane.attr('header/fill', color.header);
    lane.attr('body/fill', color.body);
    lane.attr('body/stroke', color.header);
}

/**
 * Vorschläge für die Beschriftung eines Ausgangs einer Entscheidung:
 * Ja/Nein, noch nicht vergebene Antworten zuerst. Bei anderen Verbindungen keine.
 */
export function decisionLabelSuggestions(graph, link) {
    const source = link.getSourceElement();
    if (!source || source.get('type') !== 'vhs.Decision') return [];
    const used = graph.getConnectedLinks(source, { outbound: true })
        .filter((other) => other !== link)
        .map((other) => getLinkLabelText(other).trim().toLowerCase());
    const isUsed = (answer) => used.includes(answer.toLowerCase());
    return [...DECISION_ANSWERS.filter((a) => !isUsed(a)), ...DECISION_ANSWERS.filter(isUsed)];
}
