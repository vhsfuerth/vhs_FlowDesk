import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Eye, Plus, X } from 'lucide-react';
import { LANE_COLORS } from '../utils/constants';
import { NODE_TYPE_LABELS } from '../diagram/types';
import { getNodeDetails, ROUTERS, setNodeDetail } from '../diagram/converter';
import { decisionLabelSuggestions, getLinkLabelText, resetLinkLabelPosition, setLaneLabelAndColor, setLinkLabelText, setNodeText } from '../diagram/text-editing';
import { CAN_HAVE_NEXT, NEXT_STEP_TYPES } from '../diagram/add-next';
import { isLane } from '../diagram/lane-embedding';
import { indexeddb } from '../storage/indexeddb';


const typeOf = (cell) => String(cell.get('type')).replace('vhs.', '').toLowerCase();

const inputClass = 'w-full text-sm py-1.5 px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent';
const labelClass = 'text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block';
const buttonClass = 'inline-flex items-center gap-1 rounded-md border border-[var(--color-vhs-blau-20)] px-2 py-1 text-xs font-medium text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)] disabled:opacity-40 disabled:cursor-not-allowed';

// Liest die Darstellung neu, sobald sich die Zelle ändert (auch durch Bearbeitung auf der Fläche)
function useCellRevision(cell) {
    const [, setRevision] = useState(0);
    useEffect(() => {
        if (!cell) return undefined;
        const refresh = () => setRevision((n) => n + 1);
        cell.on('change', refresh);
        return () => cell.off('change', refresh);
    }, [cell]);
}

const Field = ({ label, children, hint }) => {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className={labelClass}>{label}</label>
            {children(id)}
            {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
        </div>
    );
};

const DetailInput = ({ cell, field, label, placeholder, multiline = false }) => {
    const value = getNodeDetails(cell)[field] || '';
    return (
        <Field label={label}>
            {(id) => (multiline
                ? <textarea id={id} rows={3} value={value} placeholder={placeholder} onChange={(e) => setNodeDetail(cell, field, e.target.value)} className={inputClass} />
                : <input id={id} type="text" value={value} placeholder={placeholder} onChange={(e) => setNodeDetail(cell, field, e.target.value)} className={inputClass} />)}
        </Field>
    );
};

// Auswahl des verknüpften Diagramms für Teilprozesse
const SubprocessField = ({ cell, currentDiagramId, onOpenSubprocess }) => {
    const [diagrams, setDiagrams] = useState(null);
    const value = getNodeDetails(cell).subprocessId || '';

    useEffect(() => {
        let cancelled = false;
        indexeddb.getAllDiagrams()
            .then((all) => { if (!cancelled) setDiagrams(all.filter((d) => d.id !== currentDiagramId)); })
            .catch(() => { if (!cancelled) setDiagrams([]); });
        return () => { cancelled = true; };
    }, [currentDiagramId]);

    const missing = value && diagrams && !diagrams.some((d) => d.id === value);
    return (
        <Field
            label="Verknüpftes Diagramm"
            hint={missing ? 'Das verknüpfte Diagramm wurde nicht gefunden (gelöscht?).' : null}
        >
            {(id) => (
                <>
                <div className="flex gap-2">
                    <select id={id} value={value} onChange={(e) => setNodeDetail(cell, 'subprocessId', e.target.value)} className={inputClass}>
                        <option value="">– keins –</option>
                        {(diagrams || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        {missing && <option value={value}>(nicht gefunden)</option>}
                    </select>
                </div>
                    <div className="mt-2 flex gap-2">
                        <button type="button" className={buttonClass} disabled={!value || missing} onClick={() => onOpenSubprocess?.(value, 'preview')} title="Teilprozess im aktuellen Diagramm anzeigen">
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            Hier anzeigen
                        </button>
                        <button type="button" className={buttonClass} disabled={!value || missing} onClick={() => onOpenSubprocess?.(value, 'switch')} title="Zum Teilprozess wechseln">
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            Wechseln
                        </button>
                    </div>
                </>
            )}
        </Field>
    );
};

// Angaben je Elementtyp: `main` immer sichtbar, `more` unter „Weitere Angaben“ (aufgeklappt, sobald etwas eingetragen ist)
const NODE_FIELDS = {
    start: { text: 'Text', main: ['description'] },
    end: { text: 'Text', main: ['description'] },
    process: { text: 'Text', main: ['role', 'description'], more: ['document', 'system', 'duration'] },
    decision: { text: 'Frage', main: ['role', 'description'] },
    document: { text: 'Bezeichnung des Dokuments', main: ['role', 'description'], more: ['system'] },
    system: { text: 'Name des Systems', main: ['description'] },
    wait: { text: 'Text', main: ['duration', 'description'] },
    subprocess: { text: 'Name des Teilprozesses', main: ['subprocessId', 'role', 'description'] },
    annotation: { text: 'Kommentar', main: [] }
};

const FIELD_DEFS = {
    description: { label: 'Erläuterung', placeholder: 'Was passiert hier genau?', multiline: true },
    document: { label: 'Dokument/Formular', placeholder: 'z. B. Anmeldeformular' },
    system: { label: 'IT-System', placeholder: 'z. B. Verwaltungssoftware' },
    duration: { label: 'Dauer/Frist', placeholder: 'z. B. 14 Tage' }
};

const RoleField = ({ cell }) => {
    const parent = cell.getParentCell();
    if (!isLane(parent)) return <DetailInput cell={cell} field="role" label="Zuständigkeit" placeholder="z. B. Kursverwaltung" />;
    return (
        <Field label="Zuständigkeit" hint="aus der Swimlane">
            {(id) => <input id={id} type="text" readOnly value={parent.attr('label/text') || 'Swimlane'} className={`${inputClass} bg-gray-50`} />}
        </Field>
    );
};

const NodeField = ({ field, cell, currentDiagramId, onOpenSubprocess }) => {
    if (field === 'role') return <RoleField cell={cell} />;
    if (field === 'subprocessId') return <SubprocessField cell={cell} currentDiagramId={currentDiagramId} onOpenSubprocess={onOpenSubprocess} />;
    const def = FIELD_DEFS[field];
    return <DetailInput cell={cell} field={field} label={def.label} placeholder={def.placeholder} multiline={def.multiline} />;
};

const NodeProperties = ({ cell, textRef, currentDiagramId, onOpenSubprocess, onAddNext }) => {
    const type = typeOf(cell);
    const config = NODE_FIELDS[type] || NODE_FIELDS.process;
    const details = getNodeDetails(cell);
    const more = config.more || [];
    const [nextType, setNextType] = useState('process');
    const fieldProps = { cell, currentDiagramId, onOpenSubprocess };

    return (
        <>
            <Field label={config.text}>
                {(id) => (
                    <textarea
                        id={id}
                        ref={textRef}
                        rows={2}
                        value={cell.attr('label/text') || ''}
                        onChange={(e) => setNodeText(cell, e.target.value)}
                        className={inputClass}
                    />
                )}
            </Field>

            {config.main.map((field) => <NodeField key={field} field={field} {...fieldProps} />)}

            {more.length > 0 && (
                <details open={more.some((field) => details[field]) || undefined} className="rounded-md border border-[var(--color-vhs-blau-10)] px-2 py-1.5">
                    <summary className="cursor-pointer text-xs font-bold text-[var(--color-vhs-blau)]">Weitere Angaben</summary>
                    <div className="mt-2 space-y-3">
                        {more.map((field) => <NodeField key={field} field={field} {...fieldProps} />)}
                    </div>
                </details>
            )}

            {CAN_HAVE_NEXT.includes(type) && (
                <div className="border-t border-[var(--color-vhs-blau-10)] pt-3">
                    <Field label="Folgeschritt anhängen">
                        {(id) => (
                            <div className="flex gap-2">
                                <select id={id} value={nextType} onChange={(e) => setNextType(e.target.value)} className={inputClass}>
                                    {NEXT_STEP_TYPES.map((t) => <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>)}
                                </select>
                                <button type="button" className={buttonClass} onClick={() => onAddNext?.(cell, 'bottom', nextType)}>
                                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                    Anhängen
                                </button>
                            </div>
                        )}
                    </Field>
                </div>
            )}
        </>
    );
};

const LaneProperties = ({ cell, textRef, onMoveLane }) => {
    const headerColor = cell.attr('header/fill');
    const label = cell.attr('label/text') || '';
    const count = cell.getEmbeddedCells().filter((c) => c.isElement()).length;
    const setColor = (color) => setLaneLabelAndColor(cell, { label, color });

    return (
        <>
            <Field label="Bezeichnung (Rolle/Abteilung)">
                {(id) => <input id={id} ref={textRef} type="text" value={label} onChange={(e) => setNodeText(cell, e.target.value)} className={inputClass} />}
            </Field>
            <div>
                <span className={labelClass}>Farbe</span>
                <div className="flex gap-2 flex-wrap" role="group" aria-label="Farbe der Swimlane">
                    {LANE_COLORS.map((c) => (
                        <button
                            type="button"
                            key={c.id}
                            onClick={() => setColor(c)}
                            title={c.label}
                            aria-label={c.label}
                            aria-pressed={headerColor === c.header}
                            className="w-7 h-7 rounded-full"
                            style={{
                                backgroundColor: c.header,
                                outline: headerColor === c.header ? `3px solid ${c.header}` : '3px solid transparent',
                                outlineOffset: '2px'
                            }}
                        />
                    ))}
                </div>
            </div>
            <div>
                <span className={labelClass}>Reihenfolge</span>
                <div className="flex gap-2">
                    <button type="button" className={buttonClass} onClick={() => onMoveLane?.(cell, 'up')}>
                        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" /> Nach oben
                    </button>
                    <button type="button" className={buttonClass} onClick={() => onMoveLane?.(cell, 'down')}>
                        <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" /> Nach unten
                    </button>
                </div>
            </div>
            <p className="text-[11px] text-gray-500">
                {count === 1 ? '1 Element' : `${count} Elemente`} in dieser Swimlane (wandern beim Verschieben mit).
            </p>
        </>
    );
};

const LinkProperties = ({ cell, graph, textRef }) => {
    const text = getLinkLabelText(cell);
    const suggestions = decisionLabelSuggestions(graph, cell);
    const isStraight = cell.router()?.name === ROUTERS.straight;
    const hasVertices = cell.vertices().length > 0;
    const labelMoved = Boolean(cell.labels()[0]?.position);

    return (
        <>
            <Field label="Beschriftung">
                {(id) => <input id={id} ref={textRef} type="text" value={text} onChange={(e) => setLinkLabelText(cell, e.target.value)} className={inputClass} />}
            </Field>
            {suggestions.length > 0 && (
                <div className="flex gap-2" role="group" aria-label="Schnellauswahl">
                    {suggestions.map((s) => (
                        <button type="button" key={s} className={buttonClass} onClick={() => setLinkLabelText(cell, s)}>{s}</button>
                    ))}
                </div>
            )}
            <fieldset>
                <legend className={labelClass}>Linienführung</legend>
                <div className="flex gap-3 text-sm">
                    {[['orthogonal', 'Rechtwinklig'], ['straight', 'Gerade']].map(([value, label]) => (
                        <label key={value} className="inline-flex items-center gap-1.5">
                            <input
                                type="radio"
                                name={`routing-${cell.id}`}
                                checked={(value === 'straight') === isStraight}
                                onChange={() => cell.router({ name: ROUTERS[value] })}
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </fieldset>
            <div className="flex flex-wrap gap-2">
                <button type="button" className={buttonClass} disabled={!hasVertices} onClick={() => cell.vertices([])}>
                    Knickpunkte entfernen
                </button>
                <button type="button" className={buttonClass} disabled={!labelMoved} onClick={() => resetLinkLabelPosition(cell)}>
                    Beschriftung mittig
                </button>
            </div>
            <p className="text-[11px] text-gray-500">
                Auf der Linie ziehen setzt einen Knickpunkt, Doppelklick entfernt ihn. Die Beschriftung lässt sich verschieben.
            </p>
        </>
    );
};

/**
 * Seitenleiste für das ausgewählte Element bzw. die ausgewählte Verbindung.
 * Änderungen wirken sofort auf das Diagramm (Rückgängig mit Strg+Z).
 */
const PropertiesPanel = ({ cell, focusToken, currentDiagramId, className = '', onClose, onOpenSubprocess, onAddNext, onMoveLane }) => {
    useCellRevision(cell);
    const textRef = useRef(null);
    const titleId = useId();

    // Doppelklick auf der Fläche: Textfeld fokussieren und markieren
    useEffect(() => {
        if (!focusToken || !textRef.current) return;
        textRef.current.focus();
        textRef.current.select?.();
    }, [focusToken, cell]);

    const graph = cell?.graph;
    if (!cell || !graph) return null;
    const isLink = cell.isLink();
    const type = isLink ? null : typeOf(cell);
    const title = isLink ? 'Verbindung' : (NODE_TYPE_LABELS[type] || 'Element');

    return (
        <aside
            aria-labelledby={titleId}
            className={`absolute right-3 z-10 w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border border-[var(--color-vhs-blau-20)] bg-white shadow-lg ${className}`}
        >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-vhs-blau-10)] bg-gray-50 px-3 py-2">
                <div>
                    <div className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Eigenschaften</div>
                    <h2 id={titleId} className="text-sm font-bold text-[var(--color-vhs-blau)]">{title}</h2>
                </div>
                <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" aria-label="Eigenschaften ausblenden" title="Eigenschaften ausblenden">
                    <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                </button>
            </div>
            <div className="space-y-3 p-3">
                {isLink && <LinkProperties cell={cell} graph={graph} textRef={textRef} />}
                {!isLink && type === 'lane' && <LaneProperties cell={cell} textRef={textRef} onMoveLane={onMoveLane} />}
                {!isLink && type !== 'lane' && (
                    <NodeProperties
                        cell={cell}
                        textRef={textRef}
                        currentDiagramId={currentDiagramId}
                        onOpenSubprocess={onOpenSubprocess}
                        onAddNext={onAddNext}
                    />
                )}
            </div>
        </aside>
    );
};

export default PropertiesPanel;
