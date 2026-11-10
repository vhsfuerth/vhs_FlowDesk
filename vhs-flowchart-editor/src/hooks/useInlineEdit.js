import { useState } from 'react';
import { getLinkLabelText, setLinkLabelText, setNodeText } from '../diagram/text-editing';

// Text direkt auf der Fläche bearbeiten (Doppelklick, F2/Enter, Lostippen).
// Liefert den Zustand für <InlineTextEditor> und die Funktionen zum Starten, Übernehmen, Abbrechen.

const typeName = (cell) => String(cell.get('type')).replace('vhs.', '').toLowerCase();

/** Lage des Textfelds (Diagrammkoordinaten): Element, Kopfzeile einer Lane bzw. Beschriftung der Verbindung */
const editRectFor = (paper, cell) => {
  if (cell.isLink()) {
    const view = paper.findViewByModel(cell);
    const distance = cell.labels()[0]?.position?.distance ?? 0.5;
    const point = view?.getPointAtRatio(distance) || cell.getBBox().center();
    return { x: point.x - 80, y: point.y - 16, width: 160, height: 32 };
  }
  const box = cell.getBBox();
  return typeName(cell) === 'lane' ? { ...box, height: 40 } : box;
};

/**
 * @param {{ paperRef: { current: any }, graphRef: { current: any }, wrapperRef: { current: HTMLElement | null },
 *   canvasRef: { current: HTMLElement | null }, zoomRef: { current: number }, setSelection: (cells: any[]) => void }} options
 */
export function useInlineEdit({ paperRef, graphRef, wrapperRef, canvasRef, zoomRef, setSelection }) {
  // { cellId, initialValue, selectAll, rect, fontSize, label }
  const [inlineEdit, setInlineEdit] = useState(null);

  /**
   * Startet die Bearbeitung. `initialText`: ersetzt den Text (Lostippen), sonst wird er markiert.
   * @returns {boolean}
   */
  const startInlineEdit = (cell, initialText = null) => {
    const paper = paperRef.current;
    if (!cell?.graph || !paper || !wrapperRef.current) return false;
    const client = paper.localToClientRect(editRectFor(paper, cell));
    const bounds = wrapperRef.current.getBoundingClientRect();
    const current = cell.isLink() ? getLinkLabelText(cell) : (cell.attr('label/text') || '');
    setSelection([cell]);
    setInlineEdit({
      cellId: cell.id,
      initialValue: initialText ?? current,
      selectAll: initialText === null,
      rect: { left: client.x - bounds.left, top: client.y - bounds.top, width: client.width, height: client.height },
      fontSize: Math.max(10, Math.round(13 * (zoomRef.current || 1))),
      label: cell.isLink() ? 'Beschriftung der Verbindung' : 'Text des Elements'
    });
    return true;
  };

  // Nach dem Bearbeiten zurück auf die Fläche, damit Tastenkürzel wieder dort wirken
  const refocusCanvas = () => {
    const active = document.activeElement;
    if (!active || active === document.body || active.dataset?.inlineEditor) canvasRef.current?.focus({ preventScroll: true });
  };

  const commitInlineEdit = (text) => {
    const cell = inlineEdit && graphRef.current?.getCell(inlineEdit.cellId);
    setInlineEdit(null);
    refocusCanvas();
    if (!cell) return;
    if (cell.isLink()) {
      if (text !== getLinkLabelText(cell)) setLinkLabelText(cell, text);
    } else if (text !== (cell.attr('label/text') || '')) {
      setNodeText(cell, text);
    }
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
    refocusCanvas();
  };

  return { inlineEdit, startInlineEdit, commitInlineEdit, cancelInlineEdit };
}
