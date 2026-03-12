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
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const img = new Image();
    // Using a blob URL is safer
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
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
        } catch (err) {
            console.error('PNG Export failed', err);
        }
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
};

export const exportToPDF = async (paper, filename = 'vhs-flowchart.pdf', title = '') => {
    const { svgString, width, height } = await getSvgString(paper, title);
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
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
        } catch (err) {
            console.error('PDF Export failed', err);
        }
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
};

export const exportToJSON = (jsonObj, filename = 'vhs-flowchart.json') => {
    const dataStr = JSON.stringify(jsonObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadBlob(blob, filename);
};

export const exportMeasuresToCSV = (items, nodeLabelLookup, filename = 'vhs-massnahmen.csv') => {
    const header = ['Bezugsknoten', 'Massnahme', 'Verantwortlich', 'Prioritaet', 'Status', 'Zieltermin'];
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
