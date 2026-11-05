import { describe, expect, it } from 'vitest';
import { STARTER_TEMPLATES } from './templates';
import { validateDiagramData } from '../storage/schema';
import { validateDiagram } from '../analysis/diagram-validation';
import { buildProcessDescription } from '../export/process-description';

describe('Vorlagen', () => {
  it('haben eindeutige IDs und sind gültige Diagramme ohne Fehler', () => {
    expect(new Set(STARTER_TEMPLATES.map((t) => t.id)).size).toBe(STARTER_TEMPLATES.length);
    STARTER_TEMPLATES.forEach((template) => {
      expect(validateDiagramData(template.diagram), template.id).toEqual([]);
      // Ältere Vorlagen enthalten bewusst offene Enden (Warnungen), Fehler darf keine haben;
      // die Vorlagen ab 1.5.0 sind ganz ohne Fehler und Warnungen
      const isNew = ['swimlane-rechnung', 'anmeldung-warteliste'].includes(template.id);
      const problems = validateDiagram(template.diagram).findings.filter((f) => (isNew ? f.severity !== 'info' : f.severity === 'error'));
      expect(problems.map((f) => f.code), template.id).toEqual([]);
    });
  });

  it('zeigen die neuen Elementtypen und Angaben', () => {
    const types = new Set(STARTER_TEMPLATES.flatMap((t) => t.diagram.nodes.map((n) => n.type)));
    ['document', 'system', 'wait', 'subprocess'].forEach((type) => expect(types).toContain(type));

    const rechnung = STARTER_TEMPLATES.find((t) => t.id === 'swimlane-rechnung');
    const { steps } = buildProcessDescription(rechnung.diagram);
    const erfassen = steps.find((s) => s.label === 'Rechnung erfassen');
    expect(erfassen.role).toBe('Buchhaltung');
    expect(erfassen.facts).toEqual([{ label: 'IT-System', value: 'Finanzsoftware' }]);
    expect(steps.find((s) => s.label === 'Zahlung freigeben').role).toBe('Leitung');
  });
});
