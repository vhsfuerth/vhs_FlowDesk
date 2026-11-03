import { buildProcessDescription, describeTransitions, formatDate, toMarkdown } from './process-description';
import { downloadBlob } from './file-export';

// Export der Prozessbeschreibung als Markdown oder Word-Datei (.docx).
// Die docx-Bibliothek wird wie jsPDF erst beim ersten Export geladen.

const VHS_BLUE = '00285A';
const VHS_BLUE_60 = '69829B';
const MAX_IMAGE_WIDTH = 600;

export const exportProcessDescriptionMarkdown = (diagram, title, filename) => {
  const markdown = toMarkdown(buildProcessDescription(diagram), { title });
  downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), filename);
};

const dataUrlToBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * @param {import('../diagram/types').DiagramData} diagram
 * @param {string} title
 * @param {{ dataUrl: string, width: number, height: number } | null} diagramImage JPEG des Diagramms (optional)
 * @param {string} filename
 */
export const exportProcessDescriptionDocx = async (diagram, title, diagramImage, filename) => {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, ShadingType
  } = await import('docx');

  const description = buildProcessDescription(diagram);
  const children = [];

  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title || 'Prozessbeschreibung')] }));
  children.push(new Paragraph({
    spacing: { after: 240 },
    children: [new TextRun({ text: `Prozessbeschreibung · erstellt am ${formatDate(new Date())} mit dem vhs Workflow Editor`, italics: true, color: VHS_BLUE_60 })]
  }));

  description.warnings.forEach((warning) => {
    children.push(new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: 'FEF3EA', color: 'auto' },
      spacing: { after: 120 },
      children: [new TextRun({ text: 'Hinweis: ', bold: true }), new TextRun(warning)]
    }));
  });

  if (diagramImage?.dataUrl) {
    const scale = Math.min(1, MAX_IMAGE_WIDTH / diagramImage.width);
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 240 },
      children: [new ImageRun({
        type: 'jpg',
        data: dataUrlToBytes(diagramImage.dataUrl),
        transformation: { width: Math.round(diagramImage.width * scale), height: Math.round(diagramImage.height * scale) }
      })]
    }));
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Ablauf')] }));
  if (description.steps.length === 0) {
    children.push(new Paragraph('Das Diagramm enthält noch keine Schritte.'));
  }

  description.steps.forEach((step, index) => {
    const previous = description.steps[index - 1];
    if (step.unreachable && !previous?.unreachable) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Nicht mit dem Ablauf verbundene Schritte')] }));
    }
    children.push(new Paragraph({
      keepNext: true,
      spacing: { before: 200 },
      children: [new TextRun({ text: `${step.number}. ${step.label}`, bold: true, color: VHS_BLUE })]
    }));
    children.push(new Paragraph({
      keepNext: true,
      children: [new TextRun({ text: `${step.typeLabel}${step.role ? ` · Zuständig: ${step.role}` : ''}`, italics: true, color: VHS_BLUE_60, size: 20 })]
    }));
    describeTransitions(step).forEach((sentence) => {
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(sentence)] }));
    });
    step.notes.forEach((note) => {
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: 'Hinweis: ', bold: true }), new TextRun(note)] }));
    });
  });

  if (description.roles.length > 0) {
    const cell = (text, header = false) => new TableCell({
      shading: header ? { type: ShadingType.CLEAR, fill: VHS_BLUE, color: 'auto' } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text, bold: header, color: header ? 'FFFFFF' : undefined })] })]
    });
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360 }, children: [new TextRun('Zuständigkeiten')] }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [cell('Rolle', true), cell('Schritte', true)] }),
        ...description.roles.map((role) => new TableRow({ children: [cell(role.name), cell(role.steps.join(', '))] }))
      ]
    }));
  }

  if (description.generalNotes.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360 }, children: [new TextRun('Weitere Hinweise')] }));
    description.generalNotes.forEach((note) => {
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(note)] }));
    });
  }

  const doc = new Document({
    creator: 'vhs Workflow Editor',
    title: title || 'Prozessbeschreibung',
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } },
        title: { run: { font: 'Arial', size: 40, bold: true, color: VHS_BLUE } },
        heading1: { run: { font: 'Arial', size: 28, bold: true, color: VHS_BLUE }, paragraph: { spacing: { before: 240, after: 120 } } },
        heading2: { run: { font: 'Arial', size: 24, bold: true, color: VHS_BLUE }, paragraph: { spacing: { before: 240, after: 120 } } }
      }
    },
    sections: [{ children }]
  });

  downloadBlob(await Packer.toBlob(doc), filename);
};
