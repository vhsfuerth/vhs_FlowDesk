import React from 'react';
import { Share2, Printer, CheckSquare, Trash2, FolderOpen, ZoomIn, ZoomOut, Maximize, Presentation } from 'lucide-react';

const ExportBar = ({
  onExportSVG,
  onExportPNG,
  onExportPDF,
  onExportJSON,
  onSave,
  onClear,
  onLoadClick,
  onToggleWorkshop,
  isWorkshopMode,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onCenterContent
}) => {
  return (
    <div className="bg-white border-t border-[var(--color-vhs-blau-20)] p-4 flex justify-between items-center shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-30">
      <div className="flex space-x-3 items-center">
        <button
          onClick={onSave}
          title="Lokal Speichern"
          className="flex items-center bg-[var(--color-vhs-blau)] text-white px-5 py-2 rounded-md hover:bg-opacity-90 text-sm font-black transition-all shadow-sm active:scale-95"
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          Speichern
        </button>
        <button
          onClick={onLoadClick}
          title="Gespeicherte laden"
          className="flex items-center bg-white border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] px-4 py-2 rounded-md hover:bg-[var(--color-vhs-blau-10)] text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Oeffnen
        </button>
        <button
          onClick={onToggleWorkshop}
          title="Workshop-Modus"
          className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all shadow-sm active:scale-95 ${isWorkshopMode ? 'bg-[var(--color-vhs-orange)] text-white' : 'bg-white border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]'}`}
        >
          <Presentation className="w-4 h-4 mr-2" />
          Workshop
        </button>
        <div className="w-px h-8 bg-gray-200 mx-1" />
        <button
          onClick={onClear}
          title="Arbeitsflaeche leeren"
          className="flex items-center text-red-500 hover:text-red-700 px-3 py-2 rounded-md hover:bg-red-50 text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Neues Blatt
        </button>
      </div>

      <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
          title="Herauszoomen"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="text-xs font-black w-12 text-center text-[var(--color-vhs-blau)]">
          {Math.round(zoomLevel * 100)}%
        </div>
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
          title="Hineinzoomen"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={onCenterContent}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
          title="Zentrieren"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-2 pl-4 border-l border-gray-100">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">
          Exportieren
        </span>
        <button
          onClick={onExportPNG}
          className="px-3 py-1.5 text-xs font-black bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
        >
          PNG
        </button>
        <button
          onClick={onExportSVG}
          className="px-3 py-1.5 text-xs font-black bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
        >
          SVG
        </button>
        <button
          onClick={onExportPDF}
          className="px-3 py-1.5 text-xs font-black bg-[var(--color-vhs-orange-hell)] text-white rounded hover:bg-opacity-90 transition-colors flex items-center shadow-sm"
        >
          <Printer className="w-4 h-4 mr-1" />
          PDF
        </button>
        <button
          onClick={onExportJSON}
          title="Als Projektdatei (.json) laden"
          className="p-2 text-gray-400 hover:text-[var(--color-vhs-blau)] transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ExportBar;
