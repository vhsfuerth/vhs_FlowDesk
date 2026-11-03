import { describe, expect, it, vi } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { STARTER_TEMPLATES } from '../data/templates';

const downloads = [];
vi.mock('./file-export', () => ({
  downloadBlob: (blob, filename) => downloads.push({ blob, filename })
}));

// jsdom-Blobs haben kein arrayBuffer()/text() – daher über FileReader lesen
const readBlob = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result));
  reader.onerror = reject;
  reader.readAsArrayBuffer(blob);
});

const { exportProcessDescriptionDocx, exportProcessDescriptionMarkdown } = await import('./process-export');

describe('Export der Prozessbeschreibung', () => {
  const template = STARTER_TEMPLATES.find((t) => t.id === 'swimlane-anmeldung');

  it('erzeugt eine Word-Datei mit allen Schritten', async () => {
    downloads.length = 0;
    await exportProcessDescriptionDocx(template.diagram, template.name, null, 'anmeldung.docx');

    expect(downloads).toHaveLength(1);
    const { blob, filename } = downloads[0];
    expect(filename).toBe('anmeldung.docx');

    const files = unzipSync(await readBlob(blob));
    const xml = strFromU8(files['word/document.xml']);
    expect(xml).toContain('Kursanmeldung (Swimlane)');
    expect(xml).toContain('1. Kursangebot entdeckt');
    expect(xml).toContain('Zuständigkeiten');
    expect(xml).toContain('Service-Team');
  });

  it('erzeugt eine Markdown-Datei', async () => {
    downloads.length = 0;
    exportProcessDescriptionMarkdown(template.diagram, template.name, 'anmeldung.md');
    expect(downloads[0].filename).toBe('anmeldung.md');
    expect(strFromU8(await readBlob(downloads[0].blob))).toContain('## Ablauf');
  });
});
