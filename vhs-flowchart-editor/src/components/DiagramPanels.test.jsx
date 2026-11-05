import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import DiagramSearch from './DiagramSearch';
import { renderWithConfirm } from '../test/render';
import * as joint from 'jointjs';
import PropertiesPanel from './PropertiesPanel';
import AddNextMenu from './AddNextMenu';
import SubprocessDialog from './SubprocessDialog';
import { createDecisionNode, createLaneNode, createLink, createNode, createProcessNode } from '../diagram/shapes';
import { setElementLane } from '../diagram/converter';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DiagramSearch', () => {
  const renderSearch = (props = {}) => {
    const handlers = { onQueryChange: vi.fn(), onNext: vi.fn(), onPrevious: vi.fn(), onClose: vi.fn() };
    const result = renderWithConfirm(
      <DiagramSearch query="Antrag" matchCount={3} currentIndex={1} focusToken={1} {...handlers} {...props} />
    );
    return { ...result, ...handlers };
  };

  it('zeigt den Trefferstand und springt mit Enter bzw. Umschalt+Enter', async () => {
    const { user, onNext, onPrevious, onClose } = renderSearch();
    const input = screen.getByRole('searchbox', { name: 'Im Diagramm suchen' });
    expect(input).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('2 von 3');
    await user.keyboard('{Enter}');
    expect(onNext).toHaveBeenCalledTimes(1);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onPrevious).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('meldet, wenn nichts gefunden wurde', () => {
    renderSearch({ matchCount: 0, currentIndex: 0 });
    expect(screen.getByRole('status')).toHaveTextContent('Keine Treffer');
    expect(screen.getByRole('button', { name: 'Nächster Treffer' })).toBeDisabled();
  });
});

describe('PropertiesPanel', () => {
  const graphWith = (...cells) => {
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    graph.addCells(cells);
    return graph;
  };

  it('ändert Text und Zusatzangaben direkt am Element', async () => {
    const node = createProcessNode(0, 0, 'Antrag prüfen');
    graphWith(node);
    const { user } = renderWithConfirm(<PropertiesPanel cell={node} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Prozessschritt' })).toBeInTheDocument();

    const text = screen.getByLabelText('Text');
    await user.clear(text);
    await user.type(text, 'Antrag erfassen');
    expect(node.attr('label/text')).toBe('Antrag erfassen');

    await user.type(screen.getByLabelText('Erläuterung'), 'Formular auf Vollständigkeit prüfen');
    await user.type(screen.getByLabelText('Dauer/Frist'), '2 Tage');
    expect(node.get('details')).toEqual({ description: 'Formular auf Vollständigkeit prüfen', duration: '2 Tage' });

    await user.clear(screen.getByLabelText('Dauer/Frist'));
    expect(node.get('details')).toEqual({ description: 'Formular auf Vollständigkeit prüfen' });
  });

  it('zeigt die Zuständigkeit aus der Swimlane schreibgeschützt', () => {
    const lane = createLaneNode(0, 0, 'Kursverwaltung');
    const node = createProcessNode(50, 60, 'Prüfen');
    graphWith(lane, node);
    setElementLane(node, lane);
    renderWithConfirm(<PropertiesPanel cell={node} onClose={vi.fn()} />);
    const role = screen.getByLabelText('Zuständigkeit');
    expect(role).toHaveValue('Kursverwaltung');
    expect(role).toHaveAttribute('readonly');
  });

  it('bietet bei Ausgängen von Entscheidungen Ja/Nein und die Linienführung an', async () => {
    const decision = createDecisionNode(0, 0, 'Vollständig?');
    const target = createProcessNode(0, 200, 'Weiter');
    const link = createLink(decision.id, target.id);
    graphWith(decision, target, link);
    const { user } = renderWithConfirm(<PropertiesPanel cell={link} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Ja' }));
    expect(link.labels()[0].attrs.text.text).toBe('Ja');

    await user.click(screen.getByRole('radio', { name: 'Gerade' }));
    expect(link.router().name).toBe('normal');
    expect(screen.getByRole('button', { name: 'Knickpunkte entfernen' })).toBeDisabled();
  });

  it('hängt über die Leiste einen Folgeschritt des gewählten Typs an', async () => {
    const node = createProcessNode(0, 0, 'Prüfen');
    graphWith(node);
    const onAddNext = vi.fn();
    const { user } = renderWithConfirm(<PropertiesPanel cell={node} onClose={vi.fn()} onAddNext={onAddNext} />);
    await user.selectOptions(screen.getByLabelText('Folgeschritt anhängen'), 'decision');
    await user.click(screen.getByRole('button', { name: /Anhängen/ }));
    expect(onAddNext).toHaveBeenCalledWith(node, 'bottom', 'decision');
  });

  it('bietet bei Swimlanes Farbe und Reihenfolge an', async () => {
    const lane = createLaneNode(0, 0, 'Leitung');
    graphWith(lane);
    const onMoveLane = vi.fn();
    const { user } = renderWithConfirm(<PropertiesPanel cell={lane} onClose={vi.fn()} onMoveLane={onMoveLane} />);
    await user.click(screen.getByRole('button', { name: 'Grün' }));
    expect(lane.attr('header/fill')).toBe('#4ba02d');
    await user.click(screen.getByRole('button', { name: /Nach unten/ }));
    expect(onMoveLane).toHaveBeenCalledWith(lane, 'down');
  });

  it('zeigt je Elementtyp nur passende Felder', () => {
    const wait = createNode('wait', 0, 0);
    const system = createNode('system', 0, 300);
    graphWith(wait, system);
    const { unmount } = renderWithConfirm(<PropertiesPanel cell={wait} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Dauer/Frist')).toBeInTheDocument();
    expect(screen.queryByLabelText('Zuständigkeit')).toBeNull();
    expect(screen.queryByLabelText('Dokument/Formular')).toBeNull();
    unmount();

    renderWithConfirm(<PropertiesPanel cell={system} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Name des Systems')).toBeInTheDocument();
    expect(screen.queryByLabelText('Zuständigkeit')).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'IT-System' })).toBeNull();
  });

  it('zeigt nichts für gelöschte Zellen', () => {
    const node = createNode('document', 0, 0);
    const { container } = renderWithConfirm(<PropertiesPanel cell={node} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AddNextMenu', () => {
  it('wählt einen Typ und schließt mit Esc', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { user } = renderWithConfirm(<AddNextMenu x={10} y={20} onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByRole('menuitem', { name: 'Prozessschritt' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Entscheidung' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('decision');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SubprocessDialog', () => {
  const record = { name: 'Abrechnung', diagram: { nodes: [], edges: [] } };

  it('fragt zuerst und zeigt den Teilprozess auf Wunsch hier an', async () => {
    const onSwitch = vi.fn();
    const { user } = renderWithConfirm(<SubprocessDialog record={record} onSwitch={onSwitch} onClose={vi.fn()} />);
    expect(screen.getByText(/hier im aktuellen Diagramm anzeigen oder zu ihm wechseln/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hier anzeigen' }));
    expect(screen.getByText(/Nur zur Ansicht/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Zum Teilprozess wechseln/ }));
    expect(onSwitch).toHaveBeenCalled();
  });

  it('wechselt direkt aus der Abfrage', async () => {
    const onSwitch = vi.fn();
    const { user } = renderWithConfirm(<SubprocessDialog record={record} onSwitch={onSwitch} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Zum Teilprozess wechseln/ }));
    expect(onSwitch).toHaveBeenCalled();
  });
});
