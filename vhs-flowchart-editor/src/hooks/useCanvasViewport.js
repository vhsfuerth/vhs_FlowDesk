import { useEffect, useRef } from 'react';
import { scrollToLocalRect, zoomAroundPoint } from '../diagram/viewport';
import { fitZoom } from '../diagram/overview';
import { addFocusHighlight, clearFocusHighlight, setPresentationDim } from '../diagram/highlight';
import { commitOpenInlineEditor } from '../diagram/canvas-events';

// Ansicht der Arbeitsfläche: Zoom, Papiergröße, Zentrieren, Alles einpassen, Springen zu einem
// Element (mit kurzer Markierung), Präsentationsfokus und Navigation über die Übersichtskarte.

// Dauer der roten Markierung beim Springen zu einem Element
const FOCUS_HIGHLIGHT_MS = 1800;

/**
 * @param {{ paperRef: { current: any }, graphRef: { current: any }, autoFitRef: { current: any },
 *   getContainer: () => HTMLElement, zoomLevel: number, zoomRef: { current: number },
 *   zoomAnchorRef: { current: any }, onZoomSetRef: { current: ((zoom: number) => void) | undefined } }} options
 */
export function useCanvasViewport({ paperRef, graphRef, autoFitRef, getContainer, zoomLevel, zoomRef, zoomAnchorRef, onZoomSetRef }) {
  // „Alles einpassen“: nach dem Zoomen den Inhalt mittig zeigen
  const fitAfterZoomRef = useRef(false);
  const highlightTimeoutRef = useRef(null);

  // Zoom um die Mausposition (Mausrad) bzw. die Bildmitte (Tasten, Schaltflächen)
  useEffect(() => {
    commitOpenInlineEditor();
    const paper = paperRef.current;
    if (!paper) return;
    const anchor = zoomAnchorRef.current;
    zoomAnchorRef.current = null;
    zoomAroundPoint(paper, getContainer(), zoomLevel, anchor, () => autoFitRef.current?.fit());
    if (fitAfterZoomRef.current) {
      fitAfterZoomRef.current = false;
      scrollToLocalRect(paper, getContainer(), paper.getContentArea({ useModelGeometry: true }), 'center');
    }
    // Nur auf Zoomänderungen reagieren; Refs und getContainer sind über die Lebensdauer gleich
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel]);

  useEffect(() => () => window.clearTimeout(highlightTimeoutRef.current), []);

  const fitPaper = () => autoFitRef.current?.fit();
  const hasContent = () => Boolean(paperRef.current && graphRef.current?.getElements().length);
  const contentArea = () => paperRef.current.getContentArea({ useModelGeometry: true });

  const centerContent = () => {
    if (!hasContent()) return;
    fitPaper();
    scrollToLocalRect(paperRef.current, getContainer(), contentArea(), 'top');
  };

  // Nach dem automatischen Anordnen: an den Anfang, damit Start und Lane-Titel sichtbar sind
  const showStart = () => {
    if (!paperRef.current) return;
    fitPaper();
    scrollToLocalRect(paperRef.current, getContainer(), contentArea(), 'topLeft');
  };

  // Zoom so wählen, dass das ganze Diagramm sichtbar ist (höchstens 100 %), und mittig zeigen
  const fitToView = () => {
    if (!hasContent()) return false;
    const container = getContainer();
    const content = contentArea();
    const zoom = fitZoom(content, { width: container.clientWidth, height: container.clientHeight });
    if (zoom === zoomRef.current) {
      fitPaper();
      scrollToLocalRect(paperRef.current, container, content, 'center');
    } else {
      fitAfterZoomRef.current = true;
      onZoomSetRef.current?.(zoom);
    }
    return true;
  };

  // Klick auf die Übersichtskarte: Ansicht auf diesen Punkt zentrieren
  const navigateTo = (point) => {
    if (!paperRef.current) return;
    scrollToLocalRect(paperRef.current, getContainer(), { x: point.x, y: point.y, width: 0, height: 0 }, 'center', 0);
  };

  // Entfernt die rote Markierung sofort (Hervorhebungen wirken nur auf die Darstellung)
  const clearHighlight = () => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    clearFocusHighlight(paperRef.current);
  };

  const focusNode = (nodeId) => {
    const node = graphRef.current?.getCell(nodeId);
    if (!node || !node.isElement()) return;
    scrollToLocalRect(paperRef.current, getContainer(), node.getBBox(), 'center');
    clearHighlight();
    addFocusHighlight(paperRef.current, node);
    highlightTimeoutRef.current = window.setTimeout(clearHighlight, FOCUS_HIGHLIGHT_MS);
  };

  const setPresentationFocus = (nodeId = null) => {
    setPresentationDim(paperRef.current, graphRef.current, nodeId);
    if (nodeId) focusNode(nodeId);
    else clearHighlight();
  };

  return { fitPaper, centerContent, showStart, fitToView, navigateTo, focusNode, setPresentationFocus };
}
