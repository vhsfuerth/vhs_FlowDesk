import { describe, expect, it } from 'vitest';
import { matchesQuery, searchWords, splitMatches } from './text-search';

describe('Textsuche', () => {
  it('findet alle Wörter unabhängig von Groß-/Kleinschreibung und Reihenfolge', () => {
    expect(searchWords('  Swimlane   Farbe ')).toEqual(['swimlane', 'farbe']);
    expect(matchesQuery(['Swimlanes', 'Bezeichnung und Farbe'], 'farbe swimlane')).toBe(true);
    expect(matchesQuery(['Swimlanes'], 'farbe swimlane')).toBe(false);
    expect(matchesQuery(['egal'], '   ')).toBe(true);
  });

  it('zerlegt Texte für die Hervorhebung', () => {
    expect(splitMatches('Teilprozess öffnen', 'prozess')).toEqual([
      { text: 'Teil', match: false },
      { text: 'prozess', match: true },
      { text: ' öffnen', match: false }
    ]);
    expect(splitMatches('a+b (c)', '+b (')).toEqual([{ text: 'a', match: false }, { text: '+b', match: true }, { text: ' ', match: false }, { text: '(', match: true }, { text: 'c)', match: false }]);
    expect(splitMatches('Text', '')).toEqual([{ text: 'Text', match: false }]);
  });
});
