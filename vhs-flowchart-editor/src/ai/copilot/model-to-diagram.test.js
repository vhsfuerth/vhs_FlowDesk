import { describe, expect, it } from 'vitest';
import * as joint from 'jointjs';
import '../../diagram/shapes';
import { JSONConverter } from '../../diagram/converter';
import { AUTO_END_NODE_ID, START_NODE_ID, buildDiagramFromModel, nodeIdForStep, shouldUseLanesByDefault } from './model-to-diagram';
import { normalizeProcessModel } from './process-model';
import { GOOD_RESPONSE } from '../../test/copilot-fixtures';
import { validateDiagram } from '../../analysis/diagram-validation';
import { buildProcessDescription } from '../../export/process-description';
import { validateDiagramData } from '../../storage/schema';

const modelOf = (raw) => normalizeProcessModel(JSON.parse(JSON.stringify(raw))).model;
const center = (node) => ({ x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 });
const inside = (point, node) => point.x >= node.position.x && point.x <= node.position.x + node.size.width
  && point.y >= node.position.y && point.y <= node.position.y + node.size.height;

describe('buildDiagramFromModel', () => {
  it('erzeugt ein gültiges Diagramm ohne Fehler im Prozess-Check', () => {
    const diagram = buildDiagramFromModel(modelOf(GOOD_RESPONSE));
    expect(validateDiagramData(diagram)).toEqual([]);
    const result = validateDiagram(diagram);
    expect(result.findings.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('ergänzt genau einen Start mit dem Auslöser und ein gemeinsames Ende', () => {
    const diagram = buildDiagramFromModel(modelOf(GOOD_RESPONSE));
    const starts = diagram.nodes.filter((n) => n.type === 'start');
    expect(starts).toHaveLength(1);
    expect(starts[0].label).toBe('Anmeldung geht ein');
    // „Platz gebucht“ ist ein benanntes Ende, die Warteliste endet im automatischen Ende
    expect(diagram.nodes.filter((n) => n.type === 'end').map((n) => n.label).sort()).toEqual(['Ende', 'Platz gebucht']);
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: nodeIdForStep('s5'), to: AUTO_END_NODE_ID }));
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: START_NODE_ID, to: nodeIdForStep('s1') }));
  });

  it('beschriftet die Ausgänge von Entscheidungen', () => {
    const diagram = buildDiagramFromModel(modelOf(GOOD_RESPONSE));
    const outgoing = diagram.edges.filter((e) => e.from === nodeIdForStep('s2'));
    expect(outgoing.map((e) => e.label)).toEqual(['Ja', 'Nein']);
  });

  it('legt kein Ende an, wenn alle Wege benannt enden', () => {
    const diagram = buildDiagramFromModel(modelOf({
      steps: [{ id: 'a', label: 'A', next: 'e' }, { id: 'e', kind: 'end', label: 'Fertig' }]
    }));
    expect(diagram.nodes.some((n) => n.id === AUTO_END_NODE_ID)).toBe(false);
  });

  it('bildet Rücksprünge als Verbindung zurück ab', () => {
    const diagram = buildDiagramFromModel(modelOf({
      steps: [
        { id: 'p', label: 'Unterlagen prüfen', next: 'd' },
        { id: 'd', kind: 'decision', label: 'Vollständig?', branches: [{ label: 'Ja', next: 'END' }, { label: 'Nein', next: 'n' }] },
        { id: 'n', label: 'Unterlagen nachfordern', next: 'p' }
      ]
    }));
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: nodeIdForStep('n'), to: nodeIdForStep('p') }));
    expect(validateDiagram(diagram).isValid).toBe(true);
  });

  it('bindet Hinweise als Kommentare an, wenn gewünscht', () => {
    const model = modelOf(GOOD_RESPONSE);
    const withNotes = buildDiagramFromModel(model);
    const note = withNotes.nodes.find((n) => n.type === 'annotation');
    expect(note?.label).toBe('Versandweg unklar.');
    expect(withNotes.edges).toContainEqual(expect.objectContaining({ from: note?.id, to: nodeIdForStep('s3') }));

    const withoutNotes = buildDiagramFromModel(model, { includeNotes: false });
    expect(withoutNotes.nodes.some((n) => n.type === 'annotation')).toBe(false);
  });

  it('setzt Positionen, Größen und Anschlüsse für alle Elemente', () => {
    const diagram = buildDiagramFromModel(modelOf(GOOD_RESPONSE));
    diagram.nodes.forEach((node) => {
      expect(node.position).toEqual({ x: expect.any(Number), y: expect.any(Number) });
      expect(node.size?.width).toBeGreaterThan(0);
    });
    diagram.edges.forEach((edge) => {
      expect(edge.sourcePort).toBeTruthy();
      expect(edge.targetPort).toBeTruthy();
    });
  });

  describe('mit Swimlanes', () => {
    it('legt je Rolle eine Lane an und setzt jeden Schritt in seine Lane', () => {
      const model = modelOf(GOOD_RESPONSE);
      expect(shouldUseLanesByDefault(model)).toBe(true);
      const diagram = buildDiagramFromModel(model, { useLanes: true });
      const lanes = diagram.nodes.filter((n) => n.type === 'lane');
      expect(lanes.map((l) => l.label)).toEqual(['Teilnehmende', 'Verwaltung']);

      const laneOf = (nodeId) => {
        const node = diagram.nodes.find((n) => n.id === nodeId);
        return lanes.find((lane) => inside(center(node), lane))?.label;
      };
      expect(laneOf(nodeIdForStep('s1'))).toBe('Teilnehmende');
      expect(laneOf(nodeIdForStep('s2'))).toBe('Verwaltung');
      expect(laneOf(nodeIdForStep('s5'))).toBe('Verwaltung');
      expect(laneOf(START_NODE_ID)).toBe('Teilnehmende');
      // Endpunkte ohne Rolle liegen in der Lane des Schritts, der zu ihnen führt
      expect(laneOf(nodeIdForStep('s4'))).toBe('Verwaltung');
      expect(laneOf(AUTO_END_NODE_ID)).toBe('Verwaltung');
    });

    it('setzt Kommentare überschneidungsfrei neben den Ablauf in die Lane ihres Schritts', () => {
      const raw = JSON.parse(JSON.stringify(GOOD_RESPONSE));
      raw.steps.forEach((step) => { if (step.kind !== 'end') step.note = `Hinweis zu ${step.label}`; });
      const diagram = buildDiagramFromModel(modelOf(raw), { useLanes: true });
      const lanes = diagram.nodes.filter((n) => n.type === 'lane');
      const others = diagram.nodes.filter((n) => n.type !== 'lane');
      const overlaps = (a, b) => a.position.x < b.position.x + b.size.width && b.position.x < a.position.x + a.size.width
        && a.position.y < b.position.y + b.size.height && b.position.y < a.position.y + a.size.height;

      others.forEach((a, i) => others.slice(i + 1).forEach((b) => {
        expect(overlaps(a, b), `${a.id} überlappt ${b.id}`).toBe(false);
      }));
      diagram.nodes.filter((n) => n.type === 'annotation').forEach((note) => {
        const stepId = diagram.edges.find((e) => e.from === note.id)?.to;
        const step = diagram.nodes.find((n) => n.id === stepId);
        const laneOf = (node) => lanes.find((lane) => inside(center(node), lane));
        expect(laneOf(note)).toBe(laneOf(step));
        // ganz innerhalb der Lane
        const lane = laneOf(note);
        expect(note.position.y + note.size.height).toBeLessThanOrEqual(lane.position.y + lane.size.height);
        expect(note.position.x + note.size.width).toBeLessThanOrEqual(lane.position.x + lane.size.width);
      });
    });

    it('liefert Zuständigkeiten für die Prozessbeschreibung', () => {
      const diagram = buildDiagramFromModel(modelOf(GOOD_RESPONSE), { useLanes: true });
      const { roles } = buildProcessDescription(diagram);
      expect(roles.map((r) => r.name)).toEqual(expect.arrayContaining(['Teilnehmende', 'Verwaltung']));
    });

    it('lässt Lanes weg, wenn keine Rollen erkannt wurden', () => {
      const model = modelOf({ steps: [{ label: 'A' }, { label: 'B' }] });
      expect(shouldUseLanesByDefault(model)).toBe(false);
      const diagram = buildDiagramFromModel(model, { useLanes: true });
      expect(diagram.nodes.filter((n) => n.type === 'lane').map((l) => l.label)).toEqual(['Ohne Zuordnung']);
    });
  });

  it('lässt sich verlustfrei in den Editor (JointJS) laden', () => {
    const diagram = buildDiagramFromModel(modelOf(GOOD_RESPONSE), { useLanes: true });
    const converter = new JSONConverter(new joint.dia.Graph({}, { cellNamespace: joint.shapes }));
    converter.fromJson(diagram);
    const loaded = converter.toJson();

    const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));
    const original = byId(diagram.nodes);
    loaded.nodes.forEach((node) => {
      expect(node).toMatchObject({ type: original[node.id].type, label: original[node.id].label, position: original[node.id].position, size: original[node.id].size });
    });
    expect(loaded.edges.map((e) => [e.from, e.to, e.label, e.sourcePort, e.targetPort]))
      .toEqual(diagram.edges.map((e) => [e.from, e.to, e.label, e.sourcePort, e.targetPort]));
  });
});
