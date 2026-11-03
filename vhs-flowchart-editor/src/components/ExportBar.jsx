import React from 'react';
import { Share2, Printer, CheckSquare, Trash2, FolderOpen, ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Clock, CheckCircle2, CircleDot, CloudOff, HardDrive, LayoutGrid, FileText } from 'lucide-react';
import { SAVE_STATUS } from '../storage/autosave';
import MenuButton from './MenuButton';

const SAVE_STATUS_DISPLAY = {
  [SAVE_STATUS.SAVED]: { icon: CheckCircle2, text: 'Alle Änderungen gespeichert', className: 'text-green-700' },
  [SAVE_STATUS.DIRTY]: { icon: CircleDot, text: 'Ungespeicherte Änderungen', className: 'text-[var(--color-vhs-orange-b)]' },
  [SAVE_STATUS.DRAFT]: { icon: HardDrive, text: 'Entwurf gesichert – noch nicht gespeichert', className: 'text-[var(--color-vhs-orange-b)]' },
  [SAVE_STATUS.ERROR]: { icon: CloudOff, text: 'Entwurf konnte nicht gesichert werden', className: 'text-red-700' }
};

const SaveStatusIndicator = ({ status }) => {
  const display = SAVE_STATUS_DISPLAY[status] || SAVE_STATUS_DISPLAY[SAVE_STATUS.SAVED];
  const Icon = display.icon;
  return (
    <div className={`flex items-center text-xs font-medium max-w-[160px] leading-tight ${display.className}`} role="status" aria-live="polite">
      <Icon className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />
      <span>{display.text}</span>
    </div>
  );
};

const ALIGN_OPTIONS = [
  { mode: 'left', label: 'Links ausrichten' },
  { mode: 'center', label: 'Horizontal zentrieren' },
  { mode: 'right', label: 'Rechts ausrichten' },
  { mode: 'top', label: 'Oben ausrichten' },
  { mode: 'middle', label: 'Vertikal zentrieren' },
  { mode: 'bottom', label: 'Unten ausrichten' }
];

const ExportBar = ({
  onExportSVG,
  onExportPNG,
  onExportPDF,
  onExportJSON,
  onSave,
  saveStatus,
  onClear,
  onLoadClick,
  onVersionsClick,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onCenterContent,
  onAutoLayout,
  onAlign,
  onDistribute,
  selectionCount = 0,
  onExportDescription,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  return (
    <div className="bg-white border-t border-[var(--color-vhs-blau-20)] p-4 flex justify-between items-center shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-30">
      <div className="flex space-x-3 items-center">
        <button
          onClick={onSave}
          title="Lokal speichern (Strg+S)"
          className="flex items-center bg-[var(--color-vhs-blau)] text-white px-5 py-2 rounded-md hover:bg-opacity-90 text-sm font-black transition-all shadow-sm active:scale-95"
        >
          <CheckSquare className="w-4 h-4 mr-2" aria-hidden="true" />
          Speichern
        </button>
        <SaveStatusIndicator status={saveStatus} />
        <button
          onClick={onLoadClick}
          title="Gespeicherte laden"
          className="flex items-center bg-white border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] px-4 py-2 rounded-md hover:bg-[var(--color-vhs-blau-10)] text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          <FolderOpen className="w-4 h-4 mr-2" aria-hidden="true" />
          Öffnen
        </button>
        {onVersionsClick && (
          <button
            onClick={onVersionsClick}
            title="Versionshistorie anzeigen"
            className="flex items-center bg-white border border-gray-200 text-gray-500 px-3 py-2 rounded-md hover:bg-gray-50 text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <Clock className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Versionen
          </button>
        )}
        <div className="w-px h-8 bg-gray-200 mx-1" />
        <button
          onClick={onClear}
          title="Arbeitsfläche leeren"
          className="flex items-center text-red-600 hover:text-red-800 px-3 py-2 rounded-md hover:bg-red-50 text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
          Neues Blatt
        </button>
      </div>

      <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Rückgängig (Strg+Z)"
          aria-label="Rückgängig"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Wiederholen (Strg+Y)"
          aria-label="Wiederholen"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
          title="Herauszoomen"
          aria-label="Herauszoomen"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="text-xs font-black w-12 text-center text-[var(--color-vhs-blau)]" aria-label={`Zoom ${Math.round(zoomLevel * 100)} Prozent`}>
          {Math.round(zoomLevel * 100)}%
        </div>
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
          title="Hineinzoomen"
          aria-label="Hineinzoomen"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={onCenterContent}
          className="p-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
          title="Zentrieren"
          aria-label="Inhalt zentrieren"
        >
          <Maximize className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <MenuButton
          label="Anordnen"
          icon={LayoutGrid}
          title="Diagramm automatisch anordnen, Auswahl ausrichten oder verteilen"
          className="flex items-center px-2 py-2 hover:bg-white hover:shadow-sm rounded transition-all text-gray-600 text-xs font-bold"
          items={[
            { heading: 'Gesamtes Diagramm' },
            { label: 'Automatisch anordnen – von oben nach unten', onSelect: () => onAutoLayout('TB') },
            { label: 'Automatisch anordnen – von links nach rechts', onSelect: () => onAutoLayout('LR') },
            { heading: `Auswahl ausrichten${selectionCount < 2 ? ' (ab 2 Elementen)' : ''}`, separatorBefore: true },
            ...ALIGN_OPTIONS.map(({ mode, label }) => ({ label, onSelect: () => onAlign(mode), disabled: selectionCount < 2 })),
            { heading: `Auswahl verteilen${selectionCount < 3 ? ' (ab 3 Elementen)' : ''}`, separatorBefore: true },
            { label: 'Horizontal gleichmäßig verteilen', onSelect: () => onDistribute('horizontal'), disabled: selectionCount < 3 },
            { label: 'Vertikal gleichmäßig verteilen', onSelect: () => onDistribute('vertical'), disabled: selectionCount < 3 }
          ]}
        />
      </div>

      <div className="flex items-center space-x-2 pl-4 border-l border-gray-100">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2">
          Exportieren
        </span>
        <button
          onClick={onExportPNG}
          aria-label="Als PNG exportieren"
          className="px-3 py-1.5 text-xs font-black bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
        >
          PNG
        </button>
        <button
          onClick={onExportSVG}
          aria-label="Als SVG exportieren"
          className="px-3 py-1.5 text-xs font-black bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
        >
          SVG
        </button>
        <button
          onClick={onExportPDF}
          aria-label="Als PDF exportieren"
          className="px-3 py-1.5 text-xs font-black bg-[var(--color-vhs-orange-b)] text-white rounded hover:bg-opacity-90 transition-colors flex items-center shadow-sm"
        >
          <Printer className="w-4 h-4 mr-1" aria-hidden="true" />
          PDF
        </button>
        <MenuButton
          label="Beschreibung"
          icon={FileText}
          align="right"
          title="Prozessbeschreibung (Verfahrensanweisung) als Text exportieren"
          className="px-3 py-1.5 text-xs font-black bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center"
          items={[
            { heading: 'Prozessbeschreibung exportieren' },
            { label: 'Word-Dokument', hint: '.docx', onSelect: () => onExportDescription('docx') },
            { label: 'Markdown', hint: '.md', onSelect: () => onExportDescription('md') }
          ]}
        />
        <button
          onClick={onExportJSON}
          title="Als Projektdatei (.json) exportieren"
          aria-label="Als JSON exportieren"
          className="p-2 text-gray-500 hover:text-[var(--color-vhs-blau)] transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ExportBar;
