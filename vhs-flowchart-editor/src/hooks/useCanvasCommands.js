import { useCallback } from 'react';

// Befehle an die Arbeitsfläche, die eine Rückmeldung oder Nachfrage brauchen:
// Anordnen, Alles einpassen und Löschen mit Überbrücken.

const SWIMLANE_HINT = 'In Swimlane-Diagrammen läuft der Ablauf von links nach rechts; jeder Schritt bleibt in seiner Lane.';
const UNDO_HINT = 'Rückgängig mit Strg+Z.';

/**
 * @param {{ canvasRef: { current: any }, notify: (message: string, type?: string) => void,
 *   confirm: (options: object) => Promise<boolean> }} options
 */
export function useCanvasCommands({ canvasRef, notify, confirm }) {
  /** @param {'TB' | 'LR'} direction */
  const autoLayout = (direction) => {
    const usedDirection = canvasRef.current?.autoLayout(direction);
    if (!usedDirection) {
      notify('Das Diagramm ist noch leer.', 'info');
    } else if (usedDirection !== direction) {
      notify(`Diagramm angeordnet. ${SWIMLANE_HINT} ${UNDO_HINT}`, 'info');
    } else {
      notify(`Diagramm angeordnet. ${UNDO_HINT}`, 'success');
    }
  };

  /** @param {'TB' | 'LR'} direction */
  const autoLayoutSelection = (direction) => {
    const result = canvasRef.current?.autoLayoutSelection(direction);
    if (!result?.count) {
      notify('Wähle mindestens zwei Elemente aus, die angeordnet werden sollen.', 'info');
    } else if (result.direction !== direction) {
      notify(`Auswahl angeordnet. ${SWIMLANE_HINT} ${UNDO_HINT}`, 'info');
    } else {
      notify(`Auswahl angeordnet. ${UNDO_HINT}`, 'success');
    }
  };

  const fitToView = () => {
    if (!canvasRef.current?.fitToView()) notify('Das Diagramm ist noch leer.', 'info');
  };

  // Entf bzw. X am Element: Liegt ein einzelner Schritt im Ablauf, wird angeboten,
  // Vorgänger und Nachfolger direkt zu verbinden. Beides lässt sich mit Strg+Z zurücknehmen.
  const deleteSelection = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bridge = canvas.getBridgeInfo();
    if (!bridge) {
      canvas.deleteSelected();
      return;
    }
    const keepFlow = await confirm({
      title: 'Schritt entfernen',
      message: `„${bridge.label || 'Unbenannter Schritt'}“ liegt zwischen anderen Schritten. Sollen Vorgänger und Nachfolger danach direkt verbunden werden, damit der Ablauf erhalten bleibt?`,
      confirmLabel: 'Entfernen und Ablauf verbinden',
      cancelLabel: 'Nur entfernen'
    });
    canvas.deleteSelected({ bridge: keepFlow });
  }, [canvasRef, confirm]);

  return { autoLayout, autoLayoutSelection, fitToView, deleteSelection };
}
