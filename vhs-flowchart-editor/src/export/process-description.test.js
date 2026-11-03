import { describe, expect, it } from 'vitest';
import { buildProcessDescription, describeTransitions, toMarkdown } from './process-description';
import { STARTER_TEMPLATES } from '../data/templates';

const node = (id, type, label, x = 0, y = 0, width = 160, height = 60) => ({ id, type, label, position: { x, y }, size: { width, height } });
const edge = (from, to, label = '') => ({ id: `${from}-${to}`, from, to, label });

const decisionDiagram = {
  nodes: [
    node('s', 'start', 'Antrag geht ein', 0, 0),
    node('d', 'decision', 'Vollständig?', 0, 100),
    node('n', 'process', 'Unterlagen nachfordern', 300, 100),
    node('g', 'process', 'Antrag genehmigen', 0, 250),
    node('e', 'end', 'Bescheid versendet', 0, 400)
  ],
  edges: [
    edge('s', 'd'),
    edge('d', 'n', 'Nein'),
    edge('d', 'g', 'Ja'),
    edge('n', 'd'),
    edge('g', 'e')
  ]
};

describe('buildProcessDescription', () => {
  it('nummeriert ab dem Start und folgt zuerst dem Ja-Zweig', () => {
    const { steps } = buildProcessDescription(decisionDiagram);
    expect(steps.map((s) => s.id)).toEqual(['s', 'd', 'g', 'e', 'n']);
    expect(steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('beschreibt Verzweigungen und Rücksprünge', () => {
    const { steps } = buildProcessDescription(decisionDiagram);
    const decision = steps.find((s) => s.id === 'd');
    expect(describeTransitions(decision)).toEqual([
      'Wenn „Ja“: weiter mit Schritt 3 („Antrag genehmigen“).',
      'Wenn „Nein“: weiter mit Schritt 5 („Unterlagen nachfordern“).'
    ]);
    const loop = steps.find((s) => s.id === 'n');
    expect(describeTransitions(loop)).toEqual(['Zurück zu Schritt 2 („Vollständig?“).']);
  });

  it('lässt den direkt folgenden Schritt unerwähnt und markiert das Ende', () => {
    const { steps } = buildProcessDescription(decisionDiagram);
    expect(describeTransitions(steps.find((s) => s.id === 'g'))).toEqual([]);
    expect(describeTransitions(steps.find((s) => s.id === 'e'))).toEqual(['Ende des Prozesses.']);
  });

  it('ordnet Zuständigkeiten über Swimlanes zu', () => {
    const diagram = {
      nodes: [
        node('l1', 'lane', 'Teilnehmende', 0, 0, 800, 150),
        node('l2', 'lane', 'Service-Team', 0, 160, 800, 150),
        node('s', 'start', 'Anmeldung', 40, 60),
        node('p', 'process', 'Anmeldung prüfen', 300, 220),
        node('e', 'end', 'Bestätigt', 550, 60)
      ],
      edges: [edge('s', 'p'), edge('p', 'e')]
    };
    const { steps, roles } = buildProcessDescription(diagram);
    expect(steps.map((s) => s.role)).toEqual(['Teilnehmende', 'Service-Team', 'Teilnehmende']);
    expect(roles).toEqual([
      { name: 'Teilnehmende', steps: [1, 3] },
      { name: 'Service-Team', steps: [2] }
    ]);
  });

  it('übernimmt angebundene Kommentare als Hinweise', () => {
    const diagram = {
      nodes: [...decisionDiagram.nodes, node('k', 'annotation', 'Frist: 14 Tage', 500, 100), node('k2', 'annotation', 'Allgemeiner Hinweis', 500, 500)],
      edges: [...decisionDiagram.edges, edge('k', 'n')]
    };
    const result = buildProcessDescription(diagram);
    expect(result.steps.find((s) => s.id === 'n').notes).toEqual(['Frist: 14 Tage']);
    expect(result.generalNotes).toEqual(['Allgemeiner Hinweis']);
    expect(result.steps.some((s) => s.type === 'annotation')).toBe(false);
  });

  it('listet nicht erreichbare Schritte am Ende mit Warnung', () => {
    const diagram = { nodes: [...decisionDiagram.nodes, node('x', 'process', 'Vergessener Schritt', 0, 600)], edges: decisionDiagram.edges };
    const result = buildProcessDescription(diagram);
    const last = result.steps[result.steps.length - 1];
    expect(last).toMatchObject({ id: 'x', unreachable: true });
    expect(result.warnings[0]).toMatch(/nicht erreichbar/);
  });

  it('kommt ohne Startknoten aus', () => {
    const diagram = { nodes: [node('a', 'process', 'A', 0, 0), node('b', 'end', 'B', 0, 100)], edges: [edge('a', 'b')] };
    const result = buildProcessDescription(diagram);
    expect(result.steps.map((s) => s.id)).toEqual(['a', 'b']);
    expect(result.warnings[0]).toMatch(/keinen Startknoten/);
  });

  it('beschreibt jede Vorlage vollständig', () => {
    STARTER_TEMPLATES.forEach((template) => {
      const flowNodes = template.diagram.nodes.filter((n) => n.type !== 'lane' && n.type !== 'annotation');
      const { steps } = buildProcessDescription(template.diagram);
      expect(steps.map((s) => s.id).sort(), template.id).toEqual(flowNodes.map((n) => n.id).sort());
      expect(steps.every((s) => !s.unreachable), template.id).toBe(true);
    });
  });
});

describe('toMarkdown', () => {
  it('erzeugt eine lesbare Beschreibung mit Zuständigkeiten', () => {
    const template = STARTER_TEMPLATES.find((t) => t.id === 'swimlane-anmeldung');
    const markdown = toMarkdown(buildProcessDescription(template.diagram), { title: template.name, date: new Date('2026-11-03') });
    expect(markdown).toContain('# Kursanmeldung (Swimlane)');
    expect(markdown).toContain('03.11.2026');
    expect(markdown).toContain('**1. Kursangebot entdeckt**');
    expect(markdown).toContain('Zuständig: Interessierte');
    expect(markdown).toContain('## Zuständigkeiten');
    expect(markdown).toContain('Wenn „Ja“');
  });

  it('maskiert Markdown-Sonderzeichen', () => {
    const diagram = { nodes: [node('s', 'start', 'Start *wichtig* | A_B', 0, 0)], edges: [] };
    expect(toMarkdown(buildProcessDescription(diagram), { title: 'T' })).toContain('Start \\*wichtig\\* \\| A\\_B');
  });
});
