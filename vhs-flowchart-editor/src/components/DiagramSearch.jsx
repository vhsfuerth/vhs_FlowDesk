import React, { useEffect, useId, useRef } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

// Suchleiste über der Arbeitsfläche (Strg+F). Der Zustand liegt in DiagramCanvas.
const DiagramSearch = ({ query, matchCount, currentIndex, focusToken, onQueryChange, onNext, onPrevious, onClose }) => {
  const inputRef = useRef(null);
  const inputId = useId();

  // Bei jedem erneuten Strg+F wieder ins Suchfeld springen und den Text markieren
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusToken]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrevious();
      else onNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const status = !query.trim()
    ? ''
    : matchCount === 0
      ? 'Keine Treffer'
      : `${currentIndex + 1} von ${matchCount}`;

  const buttonClass = 'p-1 rounded hover:bg-[var(--color-vhs-blau-10)] disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div
      role="search"
      className="absolute top-3 right-5 z-20 flex items-center gap-1 rounded-md border border-[var(--color-vhs-blau-20)] bg-white px-2 py-1.5 shadow-md"
    >
      <label htmlFor={inputId} className="sr-only">Im Diagramm suchen</label>
      <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Im Diagramm suchen …"
        autoComplete="off"
        className="w-52 text-sm outline-none bg-transparent"
      />
      <span className="text-xs text-gray-500 min-w-[4.5rem] text-right tabular-nums" role="status" aria-live="polite">
        {status}
      </span>
      <button type="button" onClick={onPrevious} disabled={matchCount < 2} className={buttonClass} title="Vorheriger Treffer (Umschalt+Enter)" aria-label="Vorheriger Treffer">
        <ChevronUp className="w-4 h-4 text-[var(--color-vhs-blau)]" />
      </button>
      <button type="button" onClick={onNext} disabled={matchCount < 2} className={buttonClass} title="Nächster Treffer (Enter)" aria-label="Nächster Treffer">
        <ChevronDown className="w-4 h-4 text-[var(--color-vhs-blau)]" />
      </button>
      <button type="button" onClick={onClose} className={buttonClass} title="Suche schließen (Esc)" aria-label="Suche schließen">
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
};

export default DiagramSearch;
