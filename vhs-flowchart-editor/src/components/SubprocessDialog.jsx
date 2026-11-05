import React, { useId, useState } from 'react';
import { ExternalLink, Layers, X } from 'lucide-react';
import { useDialogA11y } from '../hooks/useDialogA11y';
import DiagramPreview from './DiagramPreview';

/**
 * Teilprozess öffnen: erst fragen („hier anzeigen“ oder „wechseln“), dann ggf.
 * das verknüpfte Diagramm schreibgeschützt im aktuellen Diagramm anzeigen.
 * Das aktuelle Diagramm bleibt dabei unverändert geöffnet.
 * @param {{ record: { name: string, diagram: any }, initialMode?: 'ask' | 'preview', onSwitch: () => void, onClose: () => void }} props
 */
const SubprocessDialog = ({ record, initialMode = 'ask', onSwitch, onClose }) => {
    const [mode, setMode] = useState(initialMode);
    const dialogRef = useDialogA11y(true, onClose);
    const titleId = useId();
    const name = record.name || 'Unbenanntes Diagramm';
    const isEmpty = !record.diagram?.nodes?.length;

    const primaryButton = 'inline-flex items-center gap-1.5 rounded-md bg-[var(--color-vhs-blau)] px-3 py-2 text-sm font-bold text-white hover:bg-[var(--color-vhs-blau-80)]';
    const secondaryButton = 'inline-flex items-center gap-1.5 rounded-md border border-[var(--color-vhs-blau-20)] px-3 py-2 text-sm font-medium text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]';

    return (
        <div
            ref={dialogRef}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ${mode === 'preview' ? 'max-w-6xl h-[85vh]' : 'max-w-md'}`}>
                <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                        <Layers className="w-5 h-5 text-[var(--color-vhs-blau)] shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                            <h2 id={titleId} className="font-bold text-[var(--color-vhs-blau)] text-lg truncate">Teilprozess „{name}“</h2>
                            {mode === 'preview' && <p className="text-xs text-gray-500">Nur zur Ansicht – bearbeiten nach dem Wechsel zum Teilprozess.</p>}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Schließen">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {mode === 'ask' ? (
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-gray-700">
                            Möchten Sie den Teilprozess hier im aktuellen Diagramm anzeigen oder zu ihm wechseln?
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" className={secondaryButton} onClick={onClose}>Abbrechen</button>
                            <button type="button" className={secondaryButton} onClick={onSwitch}>
                                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                                Zum Teilprozess wechseln
                            </button>
                            <button type="button" data-autofocus className={primaryButton} onClick={() => setMode('preview')}>
                                Hier anzeigen
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 min-h-0 relative">
                            {isEmpty
                                ? <p className="p-6 text-sm text-gray-500">Das verknüpfte Diagramm ist leer.</p>
                                : <DiagramPreview diagram={record.diagram} label={`Teilprozess „${name}“ (Ansicht)`} />}
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                            <button type="button" className={secondaryButton} onClick={onClose}>Schließen</button>
                            <button type="button" className={primaryButton} onClick={onSwitch}>
                                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                                Zum Teilprozess wechseln
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SubprocessDialog;
