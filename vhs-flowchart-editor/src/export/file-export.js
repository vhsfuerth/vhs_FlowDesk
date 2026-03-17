import { jsPDF } from 'jspdf';

// Helper to convert an image URL to Base64
const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error('Failed to load logo for export', e);
        return null;
    }
};

const getSvgString = async (paper, title = '') => {
    const paperSvg = paper.svg;
    const serializer = new XMLSerializer();
    
    // JointJS content bbox
    const bbox = paper.getContentBBox();
    
    // Create a clone to manipulate without affecting UI
    const svgClone = paperSvg.cloneNode(true);
    
    // Set viewBox to include header space
    const padding = 20;
    const headerHeight = 70; // Space for Logo and Title
    
    const vx = bbox.x - padding;
    const vy = bbox.y - padding - headerHeight;
    const vw = bbox.width + padding * 2;
    const vh = bbox.height + padding * 2 + headerHeight;
    
    svgClone.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
    svgClone.setAttribute('width', vw);
    svgClone.setAttribute('height', vh);
    
    // Embed CSS styles
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    let cssText = '';
    styles.forEach(s => {
        try {
            if (s.tagName === 'STYLE') {
                cssText += s.innerHTML;
            } else if (s.sheet) {
                const rules = s.sheet.cssRules;
                for (let i = 0; i < rules.length; i++) {
                    cssText += rules[i].cssText;
                }
            }
        } catch (e) {}
    });
    
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `<![CDATA[${cssText}]]>`;
    svgClone.insertBefore(styleElement, svgClone.firstChild);

    // Add Logo and Title to SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const headerGroup = document.createElementNS(svgNS, "g");
    
    // CRITICAL: Embed Logo as Base64 to avoid tainted canvas issues
    const logoBase64 = await getBase64Image('/Logo_HQ_pos.png');
    if (logoBase64) {
        const logoImg = document.createElementNS(svgNS, "image");
        logoImg.setAttributeNS(null, "href", logoBase64);
        logoImg.setAttributeNS(null, "x", vx + padding);
        logoImg.setAttributeNS(null, "y", vy + padding + 10);
        logoImg.setAttributeNS(null, "width", "100");
        logoImg.setAttributeNS(null, "height", "40");
        headerGroup.appendChild(logoImg);
    }
    
    // Title Text
    if (title) {
        const titleText = document.createElementNS(svgNS, "text");
        titleText.setAttributeNS(null, "x", vx + padding + 115);
        titleText.setAttributeNS(null, "y", vy + padding + 40);
        titleText.setAttributeNS(null, "font-family", "Outfit, sans-serif");
        titleText.setAttributeNS(null, "font-size", "22px");
        titleText.setAttributeNS(null, "font-weight", "900");
        titleText.setAttributeNS(null, "fill", "#00285A");
        titleText.textContent = title;
        headerGroup.appendChild(titleText);
    }
    
    svgClone.appendChild(headerGroup);

    let svgString = serializer.serializeToString(svgClone);
    if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!svgString.match(/^<svg[^>]+xmlns\:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    
    return {
        svgString: '<?xml version="1.0" standalone="no"?>\r\n' + svgString,
        width: vw,
        height: vh
    };
};

export const getDiagramPngDataUrl = async (paper, title = '') => {
    const { svgString, width, height } = await getSvgString(paper, title);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            try { resolve({ dataUrl: canvas.toDataURL('image/png'), width, height }); }
            catch { resolve(null); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
};

export const exportToSVG = async (paper, filename = 'vhs-flowchart.svg', title = '') => {
    const { svgString } = await getSvgString(paper, title);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, filename);
};

export const exportToPNG = async (paper, filename = 'vhs-flowchart.png', title = '') => {
    const { svgString, width, height } = await getSvgString(paper, title);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('PNG-Export fehlgeschlagen: Canvas konnte nicht erstellt werden.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            try {
                const pngUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                resolve();
            } catch (err) {
                reject(new Error('PNG-Export fehlgeschlagen: ' + err.message));
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('PNG-Export fehlgeschlagen: SVG konnte nicht als Bild geladen werden.'));
        };
        img.src = url;
    });
};

export const exportToPDF = async (paper, filename = 'vhs-flowchart.pdf', title = '') => {
    const { svgString, width, height } = await getSvgString(paper, title);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('PDF-Export fehlgeschlagen: Canvas konnte nicht erstellt werden.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            try {
                const imgData = canvas.toDataURL('image/png');
                const orientation = width > height ? 'l' : 'p';
                const doc = new jsPDF({
                    orientation: orientation,
                    unit: 'px',
                    format: [width, height]
                });
                doc.addImage(imgData, 'PNG', 0, 0, width, height);
                doc.save(filename);
                resolve();
            } catch (err) {
                reject(new Error('PDF-Export fehlgeschlagen: ' + err.message));
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('PDF-Export fehlgeschlagen: SVG konnte nicht als Bild geladen werden.'));
        };
        img.src = url;
    });
};

export const exportToJSON = (jsonObj, filename = 'vhs-flowchart.json') => {
    const dataStr = JSON.stringify(jsonObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadBlob(blob, filename);
};

export const exportMeasuresToCSV = (items, nodeLabelLookup, filename = 'vhs-massnahmen.csv') => {
    const header = ['Bezugsknoten', 'Maßnahme', 'Verantwortlich', 'Priorität', 'Status', 'Zieltermin'];
    const rows = items.map((item) => ([
        escapeCsv(nodeLabelLookup(item.nodeId)),
        escapeCsv(item.title),
        escapeCsv(item.owner),
        escapeCsv(item.priority),
        escapeCsv(item.status),
        escapeCsv(item.dueDate)
    ].join(';')));

    const csv = [header.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
};

export const exportWorkshopSummary = (title, steps, notes, filename = 'vhs-workshop.txt') => {
    const lines = [
        `Workshop-Zusammenfassung: ${title || 'Unbenanntes Diagramm'}`,
        '',
        'Schritte im Fokus:'
    ];

    steps.forEach((step, index) => {
        lines.push(`${index + 1}. ${step.label}`);
    });

    lines.push('');
    lines.push('Diskussionspunkte:');

    notes.forEach((note, index) => {
        const stepLabel = steps.find((step) => step.id === note.nodeId)?.label || 'Nicht zugeordnet';
        lines.push(`${index + 1}. ${note.title || 'Ohne Titel'} [${stepLabel}]`);
        lines.push(`   Status: ${note.status || 'open'}`);
        if (note.note) {
            lines.push(`   Notiz: ${note.note}`);
        }
    });

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8;' });
    downloadBlob(blob, filename);
};

export const exportQualityReport = (
  title,
  findings,
  counts,
  reviewScores,
  reviewSummary,
  improvementItems,
  nodeLabelLookup,
  reviewNotes = {},
  filename = 'vhs-qualitaetsbericht.txt'
) => {
  const date = new Date().toLocaleDateString('de-DE');
  const SCORE_LABELS = {
    clarity: 'Klarheit',
    mediaBreaks: 'Medienbruch',
    risk: 'Risiko',
    participantFocus: 'Teilnehmendenorientierung',
    ownership: 'Verantwortlichkeit'
  };
  const SEVERITY_LABELS = { error: 'Fehler', warning: 'Warnung', info: 'Hinweis' };

  const lines = [
    `Qualitätsbericht – ${title || 'Unbenanntes Diagramm'}`,
    `Erstellt am: ${date}`,
    '==============================',
    '',
    'AUTOMATISCHE PRÜFUNG',
    `  Fehler: ${counts.error} | Warnungen: ${counts.warning} | Hinweise: ${counts.info}`,
    `  Status: ${counts.error === 0 ? 'Struktur grundsätzlich stimmig' : 'Prüfbedarf vorhanden'}`,
  ];

  if (findings.length > 0) {
    lines.push('');
    lines.push('  Befunde:');
    findings.forEach((f) => {
      const nodeHint = f.nodeId ? ` (Knoten: ${nodeLabelLookup(f.nodeId)})` : '';
      lines.push(`  [${SEVERITY_LABELS[f.severity] || f.severity}] ${f.message}${nodeHint}`);
    });
  }

  lines.push('');
  lines.push('SELBSTBEWERTUNG');
  Object.entries(SCORE_LABELS).forEach(([field, label]) => {
    const score = String(reviewScores[field] ?? '-');
    const padded = label.padEnd(26, ' ');
    lines.push(`  ${padded}${score}/3`);
    const note = reviewNotes[field];
    if (note && note.trim()) {
      lines.push(`    Notiz: ${note.trim()}`);
    }
  });
  lines.push('  ' + '─'.repeat(30));
  lines.push(`  ${'Durchschnitt:'.padEnd(26, ' ')}${reviewSummary.average.toFixed(1)}/3`);
  const hotspotLabels = reviewSummary.hotspots.map((f) => SCORE_LABELS[f] || f);
  lines.push(`  Hotspots: ${hotspotLabels.length > 0 ? hotspotLabels.join(', ') : 'keine'}`);

  lines.push('');
  lines.push(`MAßNAHMEN (${improvementItems.length} gesamt)`);
  if (improvementItems.length === 0) {
    lines.push('  Keine Maßnahmen erfasst.');
  } else {
    improvementItems.forEach((item, index) => {
      const node = nodeLabelLookup(item.nodeId);
      lines.push(
        `  ${index + 1}. ${item.title || '(ohne Titel)'} | ${node} | Prio: ${item.priority} | Status: ${item.status} | Bis: ${item.dueDate || '–'} | Wer: ${item.owner || '–'}`
      );
    });
  }

  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, filename);
};

export const exportQualityReportPDF = async (
  title,
  findings,
  counts,
  reviewScores,
  reviewSummary,
  improvementItems,
  nodeLabelLookup,
  reviewNotes = {},
  diagramImage = null,
  filename = 'vhs-qualitaetsbericht.pdf'
) => {
  // jsPDF Helvetica only covers Latin-1 / CP1252.
  // Replace every character outside that range to avoid "²%" artifacts.
  const safe = (str) => String(str == null ? '' : str)
    .replace(/\u2192/g, '->') // → arrow
    .replace(/\u26A0/g, '(!)') // ⚠ warning
    .replace(/\u25AA/g, '-')   // ▪ black small square
    .replace(/\u25B2/g, '!')   // ▲ triangle
    .replace(/\u25B3/g, '!')   // △ triangle outline
    .replace(/\u25CF/g, 'i')   // ● black circle
    .replace(/\u2713/g, 'OK')  // ✓ checkmark
    .replace(/\u2714/g, 'OK')  // ✔ heavy checkmark
    .replace(/\u00D8/g, 'Oe')  // Ø (keep it just in case)
    .replace(/[\u0100-\uFFFF]/g, '?'); // catch-all for remaining non-Latin1

  // Load logo with correct aspect ratio
  const loadLogoProportional = async (maxW, maxH) => {
    const b64 = await getBase64Image('/Logo_HQ_pos.png');
    if (!b64) return null;
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: maxW * 4, h: maxH }); // fallback: assume wide logo
      img.src = b64;
    });
    const scale = Math.min(maxW / dims.w, maxH / dims.h);
    return { b64, w: dims.w * scale, h: dims.h * scale };
  };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210;
  const PH = 297;
  const M = 16;
  const CW = PW - 2 * M;

  // Brand colours
  const BLUE   = [0, 40, 90];
  const BLUE_L = [235, 240, 245];
  const ORANGE = [233, 78, 27];
  const WHITE  = [255, 255, 255];
  const GRAY   = [110, 110, 110];
  const LGRAY  = [210, 210, 210];

  const SCORE_LABELS = {
    clarity: 'Klarheit',
    mediaBreaks: 'Medienbruch',
    risk: 'Risiko',
    participantFocus: 'Teilnehmendenorientierung',
    ownership: 'Verantwortlichkeit'
  };
  const WIZARD_FIELDS = ['clarity', 'mediaBreaks', 'risk', 'participantFocus', 'ownership'];
  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const scoreRgb = (s) => s >= 3 ? [34, 139, 34] : s === 2 ? [200, 155, 0] : s === 1 ? [220, 120, 0] : [200, 40, 40];

  // Measure text width in mm at the currently active font/size
  const textWidthMm = (str, fontSize) => doc.getStringUnitWidth(safe(str)) * fontSize / doc.internal.scaleFactor;

  // Wrap + render multi-line text; returns new y after last line
  const multiLine = (str, x, y, maxW, fontSize, style = 'normal', color = GRAY) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lineH = fontSize * 0.3528 * 1.3; // ~130% of point size in mm
    const lines = doc.splitTextToSize(safe(str), maxW);
    lines.forEach((line, i) => doc.text(line, x, y + i * lineH));
    return y + lines.length * lineH;
  };

  const sectionHeader = (text, y) => {
    doc.setFillColor(...BLUE);
    doc.rect(M, y, CW, 8, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(safe(text), M + 4, y + 5.5);
    return y + 8;
  };

  const footer = (pageNum) => {
    doc.setFillColor(...BLUE);
    doc.rect(0, PH - 12, PW, 12, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('vhs Flowchart-Editor  -  Prozessanalyse & Selbstbewertung', M, PH - 4);
    doc.text(`Seite ${pageNum}`, PW - M, PH - 4, { align: 'right' });
  };

  let currentPage = 1;
  const guard = (y, needed = 20) => {
    if (y + needed > PH - 16) {
      footer(currentPage);
      doc.addPage();
      currentPage++;
      doc.setFillColor(...BLUE);
      doc.rect(0, 0, PW, 14, 'F');
      doc.setFillColor(...ORANGE);
      doc.rect(0, 14, PW, 1.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('QUALITAETSBERICHT', M, 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(safe(title || 'Unbenanntes Diagramm'), M, 11.5);
      doc.text(`Seite ${currentPage}`, PW - M, 9, { align: 'right' });
      return 22;
    }
    return y;
  };

  // ── PAGE 1: COVER + DIAGRAM ─────────────────────────────────────────────

  const HEADER_H = 32;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PW, HEADER_H, 'F');

  // Logo proportional
  const logo = await loadLogoProportional(48, 20);
  if (logo) {
    const logoY = (HEADER_H - logo.h) / 2;
    doc.addImage(logo.b64, 'PNG', M, logoY, logo.w, logo.h);
  } else {
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('vhs', M, 21);
  }

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('QUALITAETSBERICHT', PW - M, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Prozessanalyse & Selbstbewertung', PW - M, 22, { align: 'right' });

  doc.setFillColor(...ORANGE);
  doc.rect(0, HEADER_H, PW, 2.5, 'F');

  let y = HEADER_H + 14;

  // Title (large, may wrap)
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleLineH = 20 * 0.3528 * 1.3;
  const titleLines = doc.splitTextToSize(safe(title || 'Unbenanntes Diagramm'), CW);
  titleLines.forEach((l, i) => doc.text(l, M, y + i * titleLineH));
  y += titleLines.length * titleLineH + 4;

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Erstellt am ${date}`, M, y);
  y += 7;

  // Status badge
  const statusOk = counts.error === 0;
  const badgeText = statusOk ? '  Struktur stimmig' : '  Pruefbedarf vorhanden';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const badgeW = textWidthMm(badgeText, 8) + 6;
  doc.setFillColor(...(statusOk ? [34, 139, 34] : [200, 40, 40]));
  doc.rect(M, y - 4.5, badgeW, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.text(safe(badgeText), M + 3, y + 0.5);
  y += 10;

  // Score bar
  const avg = reviewSummary.average;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text(`Selbstbewertung  Oe: ${avg.toFixed(1)} / 3`, M, y);
  y += 5;

  const PBW = 80;
  doc.setFillColor(...LGRAY);
  doc.rect(M, y, PBW, 4, 'F');
  doc.setFillColor(...scoreRgb(Math.round(avg)));
  doc.rect(M, y, (avg / 3) * PBW, 4, 'F');
  if (reviewSummary.hotspots.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...ORANGE);
    const hsText = 'Handlungsbedarf: ' + reviewSummary.hotspots.map((f) => SCORE_LABELS[f]).join(', ');
    doc.text(safe(hsText), M + PBW + 4, y + 3);
  }
  y += 11;

  // Divider
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(M, y, PW - M, y);
  y += 5;

  // Flowchart image — scale to fill remaining page height
  if (diagramImage?.dataUrl && diagramImage.width > 0 && diagramImage.height > 0) {
    const maxW = CW;
    const maxH = PH - y - 16;
    // Convert pixel dimensions to mm at 96dpi (1px = 0.2646mm)
    const pxToMm = 0.2646;
    const naturalW = diagramImage.width * pxToMm;
    const naturalH = diagramImage.height * pxToMm;
    const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
    const imgW = naturalW * scale;
    const imgH = naturalH * scale;
    const imgX = M + (CW - imgW) / 2;
    doc.addImage(diagramImage.dataUrl, 'PNG', imgX, y, imgW, imgH);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('(Kein Diagramm vorhanden)', M, y + 6);
  }

  footer(currentPage);

  // ── PAGE 2+: DETAILED ANALYSIS ──────────────────────────────────────────

  doc.addPage();
  currentPage++;

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PW, 17, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, 17, PW, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('QUALITAETSBERICHT', M, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(safe(title || 'Unbenanntes Diagramm'), M, 13.5);
  doc.text(`Seite ${currentPage}`, PW - M, 10.5, { align: 'right' });

  y = 26;

  // ── AUTOMATISCHE PRÜFUNG ─────────────────────────────────────────────────
  y = sectionHeader('AUTOMATISCHE PRUEFUNG', y);
  y += 5;

  // Count pills – measure after setting font
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const pills = [
    { label: `${counts.error} Fehler`, rgb: [200, 40, 40] },
    { label: `${counts.warning} Warnungen`, rgb: [200, 120, 0] },
    { label: `${counts.info} Hinweise`, rgb: [30, 100, 200] }
  ];
  let px = M;
  pills.forEach((p) => {
    const pw = textWidthMm(p.label, 8) + 7;
    doc.setFillColor(...p.rgb);
    doc.rect(px, y - 4, pw, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(p.label, px + 3, y + 0.5);
    px += pw + 3;
  });
  y += 9;

  const SEV_RGB  = { error: [200, 40, 40], warning: [200, 120, 0], info: [30, 100, 200] };
  const SEV_MARK = { error: '[!] ', warning: '[W] ', info: '[i] ' };

  if (findings.length === 0) {
    y = multiLine('Keine Auffaelligkeiten gefunden.', M, y, CW, 9, 'italic', GRAY) + 2;
  } else {
    findings.forEach((f) => {
      y = guard(y, 10);
      const nodeHint = f.nodeId ? ` [${safe(nodeLabelLookup(f.nodeId))}]` : '';
      const prefix = SEV_MARK[f.severity] || '- ';
      const color = SEV_RGB[f.severity] || GRAY;
      // Draw prefix in bold color, then message in normal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...color);
      const prefixW = textWidthMm(prefix, 8);
      doc.text(prefix, M, y);
      const msgLines = doc.splitTextToSize(safe(f.message + nodeHint), CW - prefixW);
      doc.setFont('helvetica', 'normal');
      msgLines.forEach((l, i) => doc.text(l, M + prefixW, y + i * (8 * 0.3528 * 1.3)));
      y += msgLines.length * (8 * 0.3528 * 1.3) + 1.5;
    });
  }

  y += 5;

  // ── SELBSTBEWERTUNG ───────────────────────────────────────────────────────
  y = guard(y, 60);
  y = sectionHeader('SELBSTBEWERTUNG', y);
  y += 5;

  WIZARD_FIELDS.forEach((field) => {
    y = guard(y, 18);
    const score = reviewScores[field] ?? 0;
    const isHotspot = score <= 1;
    const label = SCORE_LABELS[field];
    const labelSuffix = isHotspot ? '  (!)' : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(isHotspot ? ORANGE : BLUE));
    doc.text(safe(label + labelSuffix), M, y);

    // Score text (right of bar)
    doc.setTextColor(...scoreRgb(score));
    doc.text(`${score}/3`, PW - M, y, { align: 'right' });

    // Score bar
    const SBW = 35;
    const SBH = 3;
    const SBX = PW - M - SBW - 14;
    const SBY = y - SBH + 0.5;
    doc.setFillColor(...LGRAY);
    doc.rect(SBX, SBY, SBW, SBH, 'F');
    if (score > 0) {
      doc.setFillColor(...scoreRgb(score));
      doc.rect(SBX, SBY, (score / 3) * SBW, SBH, 'F');
    }

    y += 6.5;

    const note = reviewNotes[field];
    if (note && note.trim()) {
      y = guard(y, 8);
      y = multiLine('>> ' + note.trim(), M + 4, y, CW - 8, 8, 'italic', GRAY) + 1.5;
    }
    y += 1.5;
  });

  // Summary box
  y = guard(y, 14);
  doc.setFillColor(...BLUE_L);
  doc.rect(M, y, CW, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLUE);
  doc.text('Durchschnitt:', M + 4, y + 7);
  doc.setTextColor(...scoreRgb(Math.round(avg)));
  doc.text(`${avg.toFixed(1)} / 3`, M + 42, y + 7);
  if (reviewSummary.hotspots.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...ORANGE);
    const htText = 'Handlungsbedarf: ' + reviewSummary.hotspots.map((f) => SCORE_LABELS[f]).join(', ');
    // Measure available space from after the avg value
    const usedW = textWidthMm(`${avg.toFixed(1)} / 3`, 9) + 42 - M + 4;
    const htLines = doc.splitTextToSize(safe(htText), CW - usedW - 4);
    doc.text(htLines[0] || '', M + usedW + 4, y + 7);
  }
  y += 16;

  // ── MASSNAHMEN ────────────────────────────────────────────────────────────
  y = guard(y, 20);
  y = sectionHeader(`MASSNAHMEN (${improvementItems.length})`, y);
  y += 5;

  if (improvementItems.length === 0) {
    y = multiLine('Keine Massnahmen erfasst.', M, y, CW, 9, 'italic', GRAY) + 2;
  } else {
    improvementItems.forEach((item, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const titleH = 9 * 0.3528 * 1.3;
      const tLines = doc.splitTextToSize(safe(item.title || '(ohne Titel)'), CW - 10);
      const metaText = [
        `Bezug: ${safe(nodeLabelLookup(item.nodeId) || '-')}`,
        `Prio: ${item.priority}`,
        `Status: ${item.status}`,
        `Bis: ${item.dueDate || '-'}`,
        `Wer: ${safe(item.owner || '-')}`
      ].join('  |  ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const mLines = doc.splitTextToSize(safe(metaText), CW - 10);
      const rowH = tLines.length * titleH + mLines.length * (7.5 * 0.3528 * 1.3) + 7;

      y = guard(y, rowH);

      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 251);
        doc.rect(M, y - 3, CW, rowH, 'F');
      }

      // Number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BLUE);
      doc.text(`${i + 1}.`, M, y);

      // Title
      doc.setTextColor(40, 40, 40);
      tLines.forEach((l, li) => doc.text(l, M + 7, y + li * titleH));
      y += tLines.length * titleH + 1;

      // Meta
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      const metaLineH = 7.5 * 0.3528 * 1.3;
      mLines.forEach((l, li) => doc.text(l, M + 7, y + li * metaLineH));
      y += mLines.length * metaLineH + 4;
    });
  }

  footer(currentPage);

  doc.save(filename);
};

export const exportWorkshopReportPDF = async (
  title,
  workshopSteps,
  workshopNotes,
  improvementItems,
  reviewScores,
  reviewSummary,
  diagramImage = null,
  filename = 'vhs-workshop-bericht.pdf'
) => {
  const safe = (str) => String(str == null ? '' : str)
    .replace(/\u2192/g, '->').replace(/\u26A0/g, '(!)').replace(/\u25AA/g, '-')
    .replace(/\u2713/g, 'OK').replace(/\u2714/g, 'OK')
    .replace(/[\u0100-\uFFFF]/g, '?');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210;
  const PH = 297;
  const M = 16;
  const CW = PW - 2 * M;

  const BLUE   = [0, 40, 90];
  const BLUE_L = [235, 240, 245];
  const ORANGE = [233, 78, 27];
  const WHITE  = [255, 255, 255];
  const GRAY   = [110, 110, 110];
  const LGRAY  = [210, 210, 210];
  const GREEN  = [34, 139, 34];

  const SCORE_LABELS = {
    clarity: 'Klarheit', mediaBreaks: 'Medienbruch', risk: 'Risiko',
    participantFocus: 'Teilnehmendenorientierung', ownership: 'Verantwortlichkeit'
  };
  const WIZARD_FIELDS = ['clarity', 'mediaBreaks', 'risk', 'participantFocus', 'ownership'];

  const scoreRgb = (s) => s >= 3 ? [34, 139, 34] : s === 2 ? [200, 155, 0] : s === 1 ? [220, 120, 0] : [200, 40, 40];
  const textWidthMm = (str, fontSize) => doc.getStringUnitWidth(safe(str)) * fontSize / doc.internal.scaleFactor;
  const multiLine = (str, x, y, maxW, fontSize, style = 'normal', color = GRAY) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lineH = fontSize * 0.3528 * 1.3;
    const lines = doc.splitTextToSize(safe(str), maxW);
    lines.forEach((line, i) => doc.text(line, x, y + i * lineH));
    return y + lines.length * lineH;
  };

  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let currentPage = 1;
  const addPageHeader = (isFirst = false) => {
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, PW, isFirst ? 36 : 17, 'F');
    doc.setFillColor(...ORANGE);
    doc.rect(0, isFirst ? 36 : 17, PW, 2.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirst ? 12 : 9);
    doc.text('WORKSHOP-ABSCHLUSSBERICHT', isFirst ? M : PW - M, isFirst ? 16 : 8, isFirst ? {} : { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirst ? 9 : 7.5);
    doc.text(safe(title || 'Unbenanntes Diagramm'), isFirst ? M : M, isFirst ? 24 : 13.5);
    if (!isFirst) doc.text(`Seite ${currentPage}`, PW - M, 9, { align: 'right' });
  };

  const addFooter = () => {
    doc.setFillColor(...BLUE);
    doc.rect(0, PH - 12, PW, 12, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('vhs Flowchart-Editor  -  Workshop-Abschlussbericht', M, PH - 4);
    doc.text(`Seite ${currentPage}`, PW - M, PH - 4, { align: 'right' });
  };

  const sectionHeader = (text, y) => {
    doc.setFillColor(...BLUE);
    doc.rect(M, y, CW, 8, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(safe(text), M + 4, y + 5.5);
    return y + 8;
  };

  const guard = (y, needed = 20) => {
    if (y + needed > PH - 16) {
      addFooter();
      doc.addPage();
      currentPage++;
      addPageHeader(false);
      return 26;
    }
    return y;
  };

  // Load logo
  const loadLogoProportional = async (maxW, maxH) => {
    const b64 = await getBase64Image('/Logo_HQ_pos.png');
    if (!b64) return null;
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: maxW * 4, h: maxH });
      img.src = b64;
    });
    const scale = Math.min(maxW / dims.w, maxH / dims.h);
    return { b64, w: dims.w * scale, h: dims.h * scale };
  };

  // ── PAGE 1: COVER ───────────────────────────────────────────────────────
  addPageHeader(true);
  const HEADER_H = 38.5;

  const logo = await loadLogoProportional(48, 20);
  if (logo) {
    const logoY = (HEADER_H - logo.h) / 2 - 2;
    doc.addImage(logo.b64, 'PNG', M, logoY, logo.w, logo.h);
  }

  let y = HEADER_H + 14;

  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleLineH = 20 * 0.3528 * 1.3;
  const titleLines = doc.splitTextToSize(safe(title || 'Unbenanntes Diagramm'), CW);
  titleLines.forEach((l, i) => doc.text(l, M, y + i * titleLineH));
  y += titleLines.length * titleLineH + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Workshop-Datum: ${date}`, M, y);
  y += 7;

  // Quick score overview
  const avg = reviewSummary.average;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLUE);
  doc.text(`Qualitätsbewertung  Ø: ${avg.toFixed(1)} / 3`, M, y);
  y += 5;
  const PBW = 80;
  doc.setFillColor(...LGRAY);
  doc.rect(M, y, PBW, 4, 'F');
  doc.setFillColor(...scoreRgb(Math.round(avg)));
  doc.rect(M, y, (avg / 3) * PBW, 4, 'F');
  y += 11;

  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(M, y, PW - M, y);
  y += 6;

  // Summary stats
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Prozessschritte: ${workshopSteps.length}  |  Diskussionspunkte: ${workshopNotes.length}  |  Maßnahmen: ${improvementItems.length}`, M, y);
  y += 9;

  // Diagram image
  if (diagramImage?.dataUrl && diagramImage.width > 0 && diagramImage.height > 0) {
    const maxW = CW;
    const maxH = PH - y - 16;
    const pxToMm = 0.2646;
    const naturalW = diagramImage.width * pxToMm;
    const naturalH = diagramImage.height * pxToMm;
    const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
    const imgW = naturalW * scale;
    const imgH = naturalH * scale;
    const imgX = M + (CW - imgW) / 2;
    doc.addImage(diagramImage.dataUrl, 'PNG', imgX, y, imgW, imgH);
  }

  addFooter();

  // ── PAGE 2: QUALITY SCORES ──────────────────────────────────────────────
  doc.addPage();
  currentPage++;
  addPageHeader(false);
  y = 26;

  y = sectionHeader('QUALITAETSBEWERTUNG', y);
  y += 5;

  WIZARD_FIELDS.forEach((field) => {
    y = guard(y, 14);
    const score = reviewScores[field] ?? 2;
    const label = SCORE_LABELS[field];
    const isHotspot = score <= 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(isHotspot ? ORANGE : BLUE));
    doc.text(safe(label + (isHotspot ? '  (!)' : '')), M, y);
    doc.setTextColor(...scoreRgb(score));
    doc.text(`${score}/3`, PW - M, y, { align: 'right' });
    const SBW = 40;
    const SBX = PW - M - SBW - 14;
    const SBY = y - 3;
    doc.setFillColor(...LGRAY);
    doc.rect(SBX, SBY, SBW, 3, 'F');
    if (score > 0) {
      doc.setFillColor(...scoreRgb(score));
      doc.rect(SBX, SBY, (score / 3) * SBW, 3, 'F');
    }
    y += 9;
  });

  // Summary box
  y = guard(y, 14);
  doc.setFillColor(...BLUE_L);
  doc.rect(M, y, CW, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLUE);
  doc.text('Durchschnitt:', M + 4, y + 7);
  doc.setTextColor(...scoreRgb(Math.round(avg)));
  doc.text(`${avg.toFixed(1)} / 3`, M + 40, y + 7);
  y += 16;

  // ── PROZESSSCHRITTE ─────────────────────────────────────────────────────
  y = guard(y, 20);
  y = sectionHeader(`PROZESSSCHRITTE (${workshopSteps.length})`, y);
  y += 5;

  if (workshopSteps.length === 0) {
    y = multiLine('Keine Prozessschritte vorhanden.', M, y, CW, 9, 'italic', GRAY) + 4;
  } else {
    workshopSteps.forEach((step, i) => {
      y = guard(y, 10);
      const typeLabels = { start: 'Start', end: 'Ende', process: 'Prozess', decision: 'Entscheidung', annotation: 'Kommentar' };
      const typeLabel = typeLabels[step.type] || step.type;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...BLUE);
      doc.text(`${i + 1}.`, M, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const stepLines = doc.splitTextToSize(safe(step.label || '(leer)'), CW - 15);
      stepLines.forEach((l, li) => doc.text(l, M + 8, y + li * (8.5 * 0.3528 * 1.3)));
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(safe(typeLabel), PW - M, y, { align: 'right' });
      y += stepLines.length * (8.5 * 0.3528 * 1.3) + 2;
    });
  }

  y += 5;

  // ── DISKUSSIONSPUNKTE ───────────────────────────────────────────────────
  y = guard(y, 20);
  y = sectionHeader(`DISKUSSIONSPUNKTE (${workshopNotes.length})`, y);
  y += 5;

  if (workshopNotes.length === 0) {
    y = multiLine('Keine Diskussionspunkte erfasst.', M, y, CW, 9, 'italic', GRAY) + 4;
  } else {
    const STATUS_LABELS = { open: 'offen', decided: 'entschieden', 'follow-up': 'nachverfolgen' };
    workshopNotes.forEach((note, i) => {
      const stepLabel = workshopSteps.find((s) => s.id === note.nodeId)?.label || 'Allgemein';
      const titleLines = doc.splitTextToSize(safe(note.title || '(ohne Titel)'), CW - 10);
      const noteLines = note.note ? doc.splitTextToSize(safe(note.note), CW - 14) : [];
      const rowH = titleLines.length * (9 * 0.3528 * 1.3) + (noteLines.length > 0 ? noteLines.length * (8 * 0.3528 * 1.3) + 2 : 0) + 8;
      y = guard(y, rowH);

      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 251);
        doc.rect(M, y - 3, CW, rowH, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BLUE);
      doc.text(`${i + 1}.`, M, y);
      doc.setTextColor(40, 40, 40);
      titleLines.forEach((l, li) => doc.text(l, M + 7, y + li * (9 * 0.3528 * 1.3)));
      y += titleLines.length * (9 * 0.3528 * 1.3) + 1;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      const metaText = `Bezug: ${safe(stepLabel)}  |  Status: ${STATUS_LABELS[note.status] || note.status}`;
      doc.text(safe(metaText), M + 7, y);
      y += 5;

      if (note.note && noteLines.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        noteLines.forEach((l, li) => doc.text(l, M + 9, y + li * (8 * 0.3528 * 1.3)));
        y += noteLines.length * (8 * 0.3528 * 1.3) + 2;
      }
      y += 3;
    });
  }

  // ── MASSNAHMEN ───────────────────────────────────────────────────────────
  y = guard(y, 20);
  y = sectionHeader(`MASSNAHMEN (${improvementItems.length})`, y);
  y += 5;

  if (improvementItems.length === 0) {
    y = multiLine('Keine Massnahmen erfasst.', M, y, CW, 9, 'italic', GRAY) + 2;
  } else {
    improvementItems.forEach((item, i) => {
      const tLines = doc.splitTextToSize(safe(item.title || '(ohne Titel)'), CW - 10);
      const rowH = tLines.length * (9 * 0.3528 * 1.3) + 12;
      y = guard(y, rowH);

      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 251);
        doc.rect(M, y - 3, CW, rowH, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BLUE);
      doc.text(`${i + 1}.`, M, y);
      doc.setTextColor(40, 40, 40);
      tLines.forEach((l, li) => doc.text(l, M + 7, y + li * (9 * 0.3528 * 1.3)));
      y += tLines.length * (9 * 0.3528 * 1.3) + 1;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      const metaText = `Prio: ${item.priority}  |  Status: ${item.status}  |  Bis: ${item.dueDate || '-'}  |  Wer: ${safe(item.owner || '-')}`;
      const mLines = doc.splitTextToSize(safe(metaText), CW - 10);
      mLines.forEach((l, li) => doc.text(l, M + 7, y + li * (7.5 * 0.3528 * 1.3)));
      y += mLines.length * (7.5 * 0.3528 * 1.3) + 4;
    });
  }

  addFooter();
  doc.save(filename);
};

const escapeCsv = (value) => `"${String(value || '').replace(/"/g, '""')}"`;

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};
