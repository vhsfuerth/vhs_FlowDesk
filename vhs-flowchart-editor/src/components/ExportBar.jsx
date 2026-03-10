import React from 'react';
import { Download, Share2, Printer, CheckSquare } from 'lucide-react';

const ExportBar = ({ onExportSVG, onExportPNG, onExportPDF, onExportJSON, onSave }) => {
  return (
    <div className="bg-white border-t border-[var(--color-vhs-blau-20)] p-4 flex justify-between items-center shadow-lg">
      <div className="flex space-x-4">
        <button
          onClick={onSave}
          title="Lokal Speichern"
          className="flex items-center text-[var(--color-vhs-blau)] hover:text-[var(--color-vhs-blau-80)] px-3 py-2 rounded-md hover:bg-[var(--color-vhs-blau-10)] text-sm font-medium transition-colors"
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          Speichern
        </button>
      </div>

      <div className="flex items-center space-x-2 border-l pl-4 border-gray-200">
        <span className="text-sm font-medium text-gray-500 mr-2 flex items-center">
          <Download className="w-4 h-4 mr-1" />
          Exportieren:
        </span>
        <button
          onClick={onExportPNG}
          className="px-3 py-1.5 text-sm bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-blau)] rounded-md hover:bg-[var(--color-vhs-blau-20)] transition-colors"
        >
          PNG
        </button>
        <button
          onClick={onExportSVG}
          className="px-3 py-1.5 text-sm bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-blau)] rounded-md hover:bg-[var(--color-vhs-blau-20)] transition-colors"
        >
          SVG
        </button>
        <button
          onClick={onExportPDF}
          className="px-3 py-1.5 text-sm bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-blau)] rounded-md hover:bg-[var(--color-vhs-blau-20)] transition-colors flex items-center"
        >
          <Printer className="w-4 h-4 mr-1" />
          PDF
        </button>
        <button
          onClick={onExportJSON}
          className="px-3 py-1.5 text-sm bg-[var(--color-vhs-blau-10)] text-[var(--color-vhs-blau)] rounded-md hover:bg-[var(--color-vhs-blau-20)] transition-colors flex items-center group relative overflow-visible"
        >
           <Share2 className="w-4 h-4 mr-1" />
           JSON
        </button>
      </div>
    </div>
  );
};

export default ExportBar;
