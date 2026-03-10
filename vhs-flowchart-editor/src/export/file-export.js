import { jsPDF } from 'jspdf';

export const exportToSVG = (paper, filename = 'diagram.svg') => {
    // JointJS paper.toSVG returns an SVG string
    const svgString = paper.svg.outerHTML;
    
    // Add default namespace if missing
    let svgWithNamespaces = svgString;
    if (svgString.indexOf('xmlns') === -1) {
        svgWithNamespaces = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([svgWithNamespaces], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, filename);
};

export const exportToPNG = (paper, filename = 'diagram.png') => {
     const svgString = paper.svg.outerHTML;
     let svgWithNamespaces = svgString;
     if (svgString.indexOf('xmlns') === -1) {
        svgWithNamespaces = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
     }
     
     // Need the actual paper dimensions
     const bbox = paper.getContentBBox();
     
     const canvas = document.createElement('canvas');
     canvas.width = bbox.width + bbox.x * 2 + 40; // Add some padding
     canvas.height = bbox.height + bbox.y * 2 + 40;
     const ctx = canvas.getContext('2d');
     
     // White background
     ctx.fillStyle = '#ffffff';
     ctx.fillRect(0, 0, canvas.width, canvas.height);

     const img = new Image();
     const blob = new Blob([svgWithNamespaces], { type: 'image/svg+xml;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     
     img.onload = () => {
         // Draw starting from a bit of offset to map with the bbox
         ctx.drawImage(img, 0, 0);
         URL.revokeObjectURL(url);
         
         const pngUrl = canvas.toDataURL('image/png');
         
         const a = document.createElement('a');
         a.href = pngUrl;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
     };
     img.src = url;
};

export const exportToPDF = (paper, filename = 'diagram.pdf') => {
    // Basic approach using the PNG data and embedding it into a PDF
    const svgString = paper.svg.outerHTML;
    let svgWithNamespaces = svgString;
    if (svgString.indexOf('xmlns') === -1) {
        svgWithNamespaces = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    const bbox = paper.getContentBBox();
    const width = bbox.width + bbox.x * 2 + 40;
    const height = bbox.height + bbox.y * 2 + 40;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const blob = new Blob([svgWithNamespaces], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const imgData = canvas.toDataURL('image/png');
        
        // Setup jsPDF based on diagram proportions
        const orientation = width > height ? 'l' : 'p';
        const doc = new jsPDF({
            orientation: orientation,
            unit: 'px',
            format: [width, height]
        });
        
        doc.addImage(imgData, 'PNG', 0, 0, width, height);
        doc.save(filename);
    };
    img.src = url;
};

export const exportToJSON = (jsonObj, filename = 'diagram.json') => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonObj, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

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
