import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT,
  CURRENT_SCHEMA_VERSION,
  ImportValidationError,
  createBackup,
  migrateDiagramRecord,
  parseImportFile,
  validateDiagramData
} from './schema';
import { STARTER_TEMPLATES } from '../data/templates';

const validDiagram = () => ({
  nodes: [
    { id: 'a', type: 'start', label: 'Start', position: { x: 0, y: 0 }, size: { width: 140, height: 70 } },
    { id: 'b', type: 'process', label: 'Schritt' },
    { id: 'c', type: 'end', label: 'Ende' }
  ],
  edges: [
    { id: 'e1', from: 'a', to: 'b', label: '' },
    { id: 'e2', from: 'b', to: 'c' }
  ]
});

describe('validateDiagramData', () => {
  it('akzeptiert ein gültiges Diagramm', () => {
    expect(validateDiagramData(validDiagram())).toEqual([]);
  });

  it('akzeptiert Typen in Großschreibung (wie vom Konverter verarbeitet)', () => {
    const diagram = validDiagram();
    diagram.nodes[1].type = 'Process';
    expect(validateDiagramData(diagram)).toEqual([]);
  });

  it('akzeptiert fehlende Verbindungsliste', () => {
    expect(validateDiagramData({ nodes: [{ id: 'a', type: 'start' }] })).toEqual([]);
  });

  it('meldet fehlende nodes', () => {
    expect(validateDiagramData({ edges: [] })[0]).toMatch(/nodes/);
    expect(validateDiagramData(null)[0]).toMatch(/fehlen/);
  });

  it('meldet doppelte IDs, unbekannte Typen und kaputte Verbindungen', () => {
    const diagram = validDiagram();
    diagram.nodes.push({ id: 'a', type: 'kreis' });
    diagram.edges.push({ from: 'b', to: 'x' });
    const errors = validateDiagramData(diagram);
    expect(errors.some((e) => e.includes('mehrfach'))).toBe(true);
    expect(errors.some((e) => e.includes('Unbekannter Typ „kreis“'))).toBe(true);
    expect(errors.some((e) => e.includes('„x“ existiert nicht'))).toBe(true);
  });

  it('meldet ungültige Position und Größe', () => {
    const diagram = validDiagram();
    diagram.nodes[0].position = { x: 'links', y: 0 };
    diagram.nodes[1].size = { width: 0, height: 10 };
    const errors = validateDiagramData(diagram);
    expect(errors).toContain('Element 1: Ungültige Position.');
    expect(errors).toContain('Element 2: Ungültige Größe.');
  });

  it('begrenzt die Anzahl gemeldeter Fehler', () => {
    const nodes = Array.from({ length: 20 }, () => ({ type: 'process' }));
    const errors = validateDiagramData({ nodes, edges: [] });
    expect(errors).toHaveLength(9);
    expect(errors[8]).toMatch(/weitere Probleme/);
  });

  it('alle mitgelieferten Vorlagen sind gültig', () => {
    STARTER_TEMPLATES.forEach((template) => {
      expect(validateDiagramData(template.diagram), template.id).toEqual([]);
    });
  });
});

describe('migrateDiagramRecord', () => {
  it('hebt Altdaten ohne schemaVersion auf die aktuelle Version', () => {
    const migrated = migrateDiagramRecord({ id: '1', name: 'Alt', diagram: validDiagram() });
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.metadata.reviewScores.clarity).toBe(2);
    expect(migrated.metadata.improvementItems).toEqual([]);
  });

  it('ergänzt fehlende edges und behält leere Diagramme als null', () => {
    expect(migrateDiagramRecord({ id: '1', diagram: { nodes: [] } }).diagram).toEqual({ nodes: [], edges: [] });
    expect(migrateDiagramRecord({ id: '1', diagram: null }).diagram).toBeNull();
  });

  it('vergibt einen Standardnamen', () => {
    expect(migrateDiagramRecord({ id: '1' }).name).toBe('Unbenanntes Diagramm');
  });

  it('lehnt Daten aus einer neueren Version ab', () => {
    expect(() => migrateDiagramRecord({ id: '1', schemaVersion: CURRENT_SCHEMA_VERSION + 1 }))
      .toThrow(ImportValidationError);
  });

  it('behält bestehende Metadaten', () => {
    const migrated = migrateDiagramRecord({
      id: '1',
      metadata: { reviewScores: { clarity: 0 }, improvementItems: [{ id: 'm1' }] }
    });
    expect(migrated.metadata.reviewScores).toMatchObject({ clarity: 0, risk: 2 });
    expect(migrated.metadata.improvementItems).toEqual([{ id: 'm1' }]);
  });
});

describe('parseImportFile', () => {
  it('erkennt eine Projektdatei', () => {
    const result = parseImportFile({ id: 'p1', name: 'Projekt', diagram: validDiagram(), metadata: {} });
    expect(result.kind).toBe('project');
    expect(result.record.name).toBe('Projekt');
    expect(result.record.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('erkennt ein reines Diagramm und nutzt den Dateinamen', () => {
    const result = parseImportFile(validDiagram(), 'kursplanung');
    expect(result.kind).toBe('project');
    expect(result.record.name).toBe('kursplanung');
    expect(result.record.diagram.nodes).toHaveLength(3);
  });

  it('lehnt ungültige Projektdateien mit deutscher Meldung ab', () => {
    const broken = { name: 'Kaputt', diagram: { nodes: [{ id: 'a', type: 'kreis' }] } };
    expect(() => parseImportFile(broken)).toThrow(/enthält ungültige Daten/);
  });

  it('lehnt fremde Dateien ab', () => {
    expect(() => parseImportFile({ foo: 'bar' })).toThrow(/kein Diagramm/);
    expect(() => parseImportFile([1, 2, 3])).toThrow(ImportValidationError);
  });

  it('liest eine Sicherung inkl. Versionen ein', () => {
    const diagram = { id: 'd1', name: 'Eins', diagram: validDiagram(), metadata: {} };
    const backup = createBackup(
      [diagram],
      [
        { id: 'v1', diagramId: 'd1', savedAt: '2026-01-01T00:00:00Z', snapshot: diagram },
        { id: 'v2', diagramId: 'unbekannt', snapshot: diagram }
      ],
      '1.0.0'
    );
    expect(backup.format).toBe(BACKUP_FORMAT);

    const result = parseImportFile(JSON.parse(JSON.stringify(backup)));
    expect(result.kind).toBe('backup');
    expect(result.diagrams.map((d) => d.id)).toEqual(['d1']);
    // Versionen ohne zugehöriges Diagramm werden verworfen
    expect(result.versions.map((v) => v.id)).toEqual(['v1']);
    expect(result.exportedAt).toBe(backup.exportedAt);
  });

  it('nennt das fehlerhafte Diagramm einer Sicherung', () => {
    const backup = createBackup([{ id: 'd1', name: 'Defekt', diagram: { nodes: 'x' } }], [], '1.0.0');
    expect(() => parseImportFile(backup)).toThrow(/„Defekt“/);
  });

  it('verlangt IDs für Diagramme in einer Sicherung', () => {
    const backup = createBackup([{ name: 'Ohne ID', diagram: validDiagram() }], [], '1.0.0');
    expect(() => parseImportFile(backup)).toThrow(/keine ID/);
  });
});
