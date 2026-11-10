import { CURRENT_SCHEMA_VERSION } from '../storage/schema';
import { normalizeMetadata } from '../analysis/diagram-validation';
import { exportMeasuresToCSV, exportToJSON } from '../export/file-export';
import { EMPTY_DIAGRAM } from './useDiagramDocument';

// Exporte des geöffneten Diagramms: Bild (PNG/SVG/PDF), Projektdatei (JSON),
// Maßnahmenliste (CSV) und Prozessbeschreibung (Word/Markdown).

const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Dateiname aus dem Diagrammnamen: klein, Umlaute umschrieben, sonst nur a–z und 0–9. */
export const cleanFilename = (name) => (name || 'diagram')
  .toLowerCase()
  .replace(/[äöüß]/g, (char) => UMLAUTS[char])
  .replace(/[^a-z0-9]/g, '_');

/**
 * @param {{ canvasRef: { current: any }, currentDiagram: any, diagramMetadata: any,
 *   liveDiagramData: any, notify: (message: string, type?: string) => void }} options
 */
export function useDiagramExport({ canvasRef, currentDiagram, diagramMetadata, liveDiagramData, notify }) {
  const baseName = () => cleanFilename(currentDiagram?.name);

  /** @param {'png' | 'svg' | 'pdf'} format */
  const exportImage = (format) => {
    const canvas = canvasRef.current;
    const method = { png: 'exportAsPNG', svg: 'exportAsSVG', pdf: 'exportAsPDF' }[format];
    canvas?.[method](`${baseName()}.${format}`, currentDiagram?.name)
      ?.catch((error) => notify(error?.message || 'Der Export ist fehlgeschlagen.', 'error'));
  };

  const exportProjectJSON = () => {
    if (!currentDiagram) return;
    exportToJSON({
      ...currentDiagram,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      diagram: canvasRef.current?.getCurrentData() || currentDiagram.diagram || EMPTY_DIAGRAM,
      metadata: normalizeMetadata(diagramMetadata)
    }, `${baseName()}_projekt.json`);
  };

  const exportMeasures = () => {
    const diagram = canvasRef.current?.getCurrentData() || liveDiagramData;
    const nodeLookup = (nodeId) => diagram?.nodes?.find((node) => node.id === nodeId)?.label || '';
    exportMeasuresToCSV(diagramMetadata.improvementItems, nodeLookup, `${baseName()}_massnahmen.csv`);
    notify('Maßnahmenliste exportiert', 'success');
  };

  /** @param {'docx' | 'md'} format */
  const exportDescription = async (format) => {
    const canvas = canvasRef.current;
    const data = canvas?.getCurrentData();
    if (!data?.nodes?.some((node) => node.type !== 'lane' && node.type !== 'annotation')) {
      notify('Das Diagramm enthält noch keine Schritte.', 'info');
      return;
    }
    const title = currentDiagram?.name || 'Prozessbeschreibung';
    const fileBase = `${baseName()}_beschreibung`;
    try {
      const { exportProcessDescriptionDocx, exportProcessDescriptionMarkdown } = await import('../export/process-export');
      if (format === 'md') {
        exportProcessDescriptionMarkdown(data, title, `${fileBase}.md`);
      } else {
        const image = await canvas.captureDiagramImage().catch(() => null);
        await exportProcessDescriptionDocx(data, title, image, `${fileBase}.docx`);
      }
      notify('Prozessbeschreibung exportiert', 'success');
    } catch (error) {
      console.error('Export der Prozessbeschreibung fehlgeschlagen:', error);
      notify('Die Prozessbeschreibung konnte nicht erstellt werden.', 'error');
    }
  };

  return { exportImage, exportProjectJSON, exportMeasures, exportDescription };
}
