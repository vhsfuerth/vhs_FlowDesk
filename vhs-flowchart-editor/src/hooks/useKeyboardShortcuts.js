import { useEffect, useRef } from 'react';

// Tastenkürzel der Arbeitsfläche. Regeln:
// - Strg+S wirkt überall (auch in Eingabefeldern), Strg+F überall außer in Dialogen.
// - Alles andere nicht in Eingabefeldern und nicht, solange ein Dialog offen ist.
// - F2/Enter und Lostippen bearbeiten Text nur, wenn der Fokus auf der Arbeitsfläche
//   (#vhs-canvas-scroll) oder auf body liegt – sonst bleibt Enter z. B. für Schaltflächen.

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

const countLabel = (count) => `${count} ${count === 1 ? 'Element' : 'Elemente'}`;

const isModalOpen = () => Boolean(document.querySelector('[aria-modal="true"]'));

const isTextInput = (target) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;

const focusOnCanvas = () => {
  const active = document.activeElement;
  return !active || active === document.body || Boolean(active.closest?.('#vhs-canvas-scroll'));
};

/**
 * @param {{
 *   canvasRef: { current: any },
 *   onSave: () => void,
 *   onDelete: () => void,
 *   onZoomIn: () => void,
 *   onZoomOut: () => void,
 *   onZoomReset: () => void,
 *   notify: (message: string, type?: string) => void
 * }} handlers  Dürfen sich bei jedem Rendern ändern; es gilt immer die neueste Fassung.
 */
export function useKeyboardShortcuts(handlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const { canvasRef, onSave, onDelete, onZoomIn, onZoomOut, onZoomReset, notify } = handlersRef.current;
      const canvas = canvasRef.current;
      // Autofill und manche Eingabehilfen senden keydown ohne `key`
      if (typeof e.key !== 'string') return;
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isModifier && key === 's') {
        e.preventDefault();
        onSave();
        return;
      }
      if (isModifier && key === 'f' && !e.shiftKey && !e.altKey) {
        if (isModalOpen()) return;
        e.preventDefault();
        canvas?.openSearch();
        return;
      }

      if (isTextInput(e.target) || isModalOpen()) return;

      if (isModifier && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvas?.undo();
      }
      if (isModifier && (key === 'y' || (e.shiftKey && key === 'z'))) {
        e.preventDefault();
        canvas?.redo();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.key === 'Backspace') e.preventDefault();
        onDelete();
        return;
      }

      if (canvas && focusOnCanvas() && !isModifier && !e.altKey) {
        if (e.key === 'F2' || e.key === 'Enter') {
          if (canvas.editSelection()) e.preventDefault();
          return;
        }
        // Lostippen ersetzt den Text des ausgewählten Elements
        if (e.key.length === 1 && e.key !== ' ' && canvas.editSelection(e.key)) {
          e.preventDefault();
          return;
        }
      }

      if (isModifier && !e.shiftKey && canvas) {
        if (key === 'c') {
          const count = canvas.copySelection();
          if (count) {
            e.preventDefault();
            notify(`${countLabel(count)} kopiert`, 'info');
          }
          return;
        }
        if (key === 'v') {
          const count = canvas.paste();
          if (count) {
            e.preventDefault();
            notify(`${countLabel(count)} eingefügt`, 'info');
          }
          return;
        }
        if (key === 'd') {
          e.preventDefault();
          canvas.duplicateSelection();
          return;
        }
        if (key === 'a') {
          e.preventDefault();
          canvas.selectAll();
          return;
        }
      }

      if (e.key === 'Escape') canvas?.clearSelection();

      // Auswahl mit Pfeiltasten verschieben (Umschalt = in 1-Pixel-Schritten)
      if (ARROWS[e.key] && !isModifier) {
        const step = e.shiftKey ? 1 : 10;
        const [dx, dy] = ARROWS[e.key];
        if (canvas?.moveSelection(dx * step, dy * step)) e.preventDefault();
      }

      if (isModifier) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          onZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          onZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          onZoomReset();
        } else if (e.shiftKey && e.code === 'Digit1') {
          // Strg + Umschalt + 1: Alles einpassen (e.key ist hier je nach Tastatur „!“)
          e.preventDefault();
          canvas?.fitToView();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
