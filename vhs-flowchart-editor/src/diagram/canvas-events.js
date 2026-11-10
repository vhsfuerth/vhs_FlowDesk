// Paper- und Container-Ereignisse der Arbeitsfläche, die an Funktionen der Komponente gehen:
// Doppelklick, Rechtsklick, „+“-Griff, Teilprozess-Symbol, X am Element, Fokus und Scrollen.
// `getHandlers` liefert immer die aktuellen Funktionen (die Ereignisse werden nur einmal angemeldet).

/**
 * @typedef {Object} CanvasHandlers
 * @property {(cell: any) => void} editCell
 * @property {(cell: any) => void} requestDelete
 * @property {(cell: any) => void} togglePropertiesFor
 * @property {(cell: any, direction: string) => void} addNextStep
 * @property {(cell: any, direction: string, client: { clientX: number, clientY: number }) => void} openAddNextMenu
 * @property {(cell: any) => void} openSubprocess
 */

/** Offenes Textfeld auf der Fläche übernehmen (es übernimmt beim Verlassen des Fokus). */
export const commitOpenInlineEditor = () => {
  const active = document.activeElement;
  if (active?.dataset?.inlineEditor) active.blur();
};

/**
 * @param {{ paper: any, container: HTMLElement, focusTarget: () => HTMLElement | null,
 *   getHandlers: () => CanvasHandlers }} options
 * @returns {() => void} Abmelden
 */
export function attachCanvasEvents({ paper, container, focusTarget, getHandlers }) {
  const onDoubleClick = (view) => getHandlers().editCell(view.model);
  const onRemoveRequest = (view) => getHandlers().requestDelete(view.model);
  // Rechtsklick auf Element oder Verbindung: Eigenschaften ein-/ausblenden statt Browser-Kontextmenü
  const onContextMenu = (view, evt) => {
    evt.preventDefault();
    getHandlers().togglePropertiesFor(view.model);
  };
  const onAddNext = (view, direction) => getHandlers().addNextStep(view.model, direction);
  const onAddNextMenu = (view, direction, client) => getHandlers().openAddNextMenu(view.model, direction, client);
  const onSubprocessOpen = (view, evt) => {
    evt.stopPropagation();
    getHandlers().openSubprocess(view.model);
  };
  // Klick auf die Fläche: Fokus dorthin holen. JointJS verhindert den Fokuswechsel beim Klicken,
  // sonst bliebe er z. B. auf einer Schaltfläche, und Enter/Lostippen gingen an diese.
  const focusCanvas = () => focusTarget()?.focus({ preventScroll: true });

  /** @type {[string, Function][]} */
  const paperEvents = [
    ['element:pointerdblclick', onDoubleClick],
    ['link:pointerdblclick', onDoubleClick],
    ['element:remove-request', onRemoveRequest],
    ['element:contextmenu', onContextMenu],
    ['link:contextmenu', onContextMenu],
    ['element:add-next', onAddNext],
    ['element:add-next-menu', onAddNextMenu],
    ['element:subprocess:open', onSubprocessOpen]
  ];
  paperEvents.forEach(([name, fn]) => paper.on(name, fn));
  // Beim Scrollen passt die Lage des Textfelds nicht mehr: Text übernehmen
  container.addEventListener('scroll', commitOpenInlineEditor, { passive: true });
  container.addEventListener('pointerdown', focusCanvas);

  return () => {
    paperEvents.forEach(([name, fn]) => paper.off(name, fn));
    container.removeEventListener('scroll', commitOpenInlineEditor);
    container.removeEventListener('pointerdown', focusCanvas);
  };
}
