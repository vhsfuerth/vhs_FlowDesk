// Suche im Diagramm (Strg+F): Zustand der Suchleiste, Markierung der Treffer, Springen.
// Markiert wird nur über Highlighter, das Diagramm selbst bleibt unverändert.
import { useState } from 'react';
import { clearSearchHighlights, setSearchHighlights } from '../diagram/highlight';
import { findMatches } from '../diagram/search';
import { scrollToLocalRect } from '../diagram/viewport';

const CLOSED = { isOpen: false, query: '', matches: [], index: 0, focusToken: 0 };

/**
 * @param {{ paperRef: { current: any }, graphRef: { current: any }, converterRef: { current: any }, getContainer: () => HTMLElement }} refs
 */
export function useDiagramSearch({ paperRef, graphRef, converterRef, getContainer }) {
    const [search, setSearch] = useState(CLOSED);

    const showResult = (matches, index) => {
        const currentId = matches[index] || null;
        setSearchHighlights(paperRef.current, graphRef.current, matches, currentId);
        const cell = currentId && graphRef.current?.getCell(currentId);
        if (cell) scrollToLocalRect(paperRef.current, getContainer(), cell.getBBox(), 'center');
    };

    const updateQuery = (query) => {
        const nodes = converterRef.current?.toJson()?.nodes || [];
        const matches = findMatches(nodes, query);
        setSearch((prev) => ({ ...prev, query, matches, index: 0 }));
        showResult(matches, 0);
    };

    /** @param {1 | -1} direction */
    const step = (direction) => {
        if (!search.matches.length) return;
        const index = (search.index + direction + search.matches.length) % search.matches.length;
        setSearch((prev) => ({ ...prev, index }));
        showResult(search.matches, index);
    };

    // Öffnen bzw. erneut ins Suchfeld springen; ein vorhandener Suchbegriff wird neu ausgewertet
    const open = () => {
        setSearch((prev) => ({ ...prev, isOpen: true, focusToken: prev.focusToken + 1 }));
        if (search.query) updateQuery(search.query);
    };

    const close = () => {
        clearSearchHighlights(paperRef.current);
        setSearch((prev) => (prev.isOpen ? { ...prev, isOpen: false, matches: [], index: 0 } : prev));
    };

    return { search, open, close, updateQuery, step };
}
