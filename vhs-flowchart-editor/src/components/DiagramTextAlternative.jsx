import React, { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ListOrdered } from 'lucide-react';
import { buildProcessDescription, describeTransitions } from '../export/process-description';
import { NON_FLOW_TYPES } from '../diagram/types';
import { readFlag, writeFlag } from '../utils/stored-flag';

const OPEN_KEY = 'vhs-text-alternative-open';

/**
 * Ausblendbare Textfassung des Diagramms unter der Arbeitsfläche: nummerierte Schritte
 * mit Zuständigkeit, Verzweigungen und Hinweisen. Vor allem für Screenreader gedacht,
 * hilft aber auch beim Gegenlesen. Ein Klick auf einen Schritt springt zum Element.
 */
const DiagramTextAlternative = ({ diagram, onFocusNode }) => {
    const [isOpen, setIsOpen] = useState(() => readFlag(OPEN_KEY));
    const headingId = useId();
    const contentId = useId();
    // Die Beschreibung wird nur aufgebaut, solange der Bereich aufgeklappt ist
    const description = useMemo(() => (isOpen ? buildProcessDescription(diagram) : null), [diagram, isOpen]);
    const count = description
        ? description.steps.length
        : (diagram?.nodes || []).filter((n) => !NON_FLOW_TYPES.includes(n.type)).length;

    const toggle = () => {
        setIsOpen((open) => {
            writeFlag(OPEN_KEY, !open);
            return !open;
        });
    };

    return (
        <section id="vhs-text-alternative" aria-labelledby={headingId} className="shrink-0 border-t border-[var(--color-vhs-blau-20)] bg-white">
            <h2 id={headingId} className="m-0">
                <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                    className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs font-bold text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
                >
                    <ListOrdered className="w-4 h-4" aria-hidden="true" />
                    Ablauf als Text
                    <span className="font-normal text-gray-500">({count === 1 ? '1 Schritt' : `${count} Schritte`})</span>
                    {isOpen ? <ChevronDown className="ml-auto w-4 h-4" aria-hidden="true" /> : <ChevronUp className="ml-auto w-4 h-4" aria-hidden="true" />}
                </button>
            </h2>
            {description && (
                <div id={contentId} className="max-h-[35vh] overflow-y-auto px-4 pb-3 text-sm text-gray-800">
                    {description.warnings.map((warning, i) => (
                        <p key={i} className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{warning}</p>
                    ))}
                    {count === 0 ? (
                        <p className="text-gray-500">Das Diagramm enthält noch keine Schritte.</p>
                    ) : (
                        <ol className="space-y-2">
                            {description.steps.map((step) => (
                                <li key={step.id} className="list-none">
                                    <button
                                        type="button"
                                        onClick={() => onFocusNode?.(step.id)}
                                        className="text-left font-bold text-[var(--color-vhs-blau)] hover:underline"
                                        title="Zum Element springen"
                                    >
                                        {step.number}. {step.label}
                                    </button>
                                    <span className="ml-2 text-xs text-gray-500">
                                        {step.typeLabel}{step.role ? ` · Zuständig: ${step.role}` : ''}{step.unreachable ? ' · nicht mit dem Ablauf verbunden' : ''}
                                    </span>
                                    {step.description && <p className="text-gray-700">{step.description}</p>}
                                    <ul className="ml-4 list-disc text-gray-700">
                                        {step.facts.map((fact) => <li key={`f-${fact.label}`}>{fact.label}: {fact.value}</li>)}
                                        {describeTransitions(step).map((sentence, i) => <li key={`t-${i}`}>{sentence}</li>)}
                                        {step.notes.map((note, i) => <li key={`n-${i}`}>Hinweis: {note}</li>)}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    )}
                    {description.generalNotes.length > 0 && (
                        <>
                            <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-500">Weitere Hinweise</h3>
                            <ul className="ml-4 list-disc">
                                {description.generalNotes.map((note, i) => <li key={i}>{note}</li>)}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};

export default DiagramTextAlternative;
