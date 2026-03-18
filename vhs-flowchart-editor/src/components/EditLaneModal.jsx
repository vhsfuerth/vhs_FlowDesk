import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const LANE_COLORS = [
    { id: 'blue',      label: 'Blau',     header: '#00285a', body: '#EEF4F7' },
    { id: 'green',     label: 'Grün',     header: '#4ba02d', body: '#f0f7eb' },
    { id: 'orange',    label: 'Orange',   header: '#eb640f', body: '#fef3ea' },
    { id: 'violet',    label: 'Violett',  header: '#7d5aa5', body: '#f4f0f9' },
    { id: 'lightblue', label: 'Hellblau', header: '#1e73af', body: '#e8f4fc' },
    { id: 'red',       label: 'Rot',      header: '#8c0a23', body: '#fdeef0' },
    { id: 'teal',      label: 'Türkis',   header: '#1a8070', body: '#e8f5f3' },
];

const EditLaneModal = ({ isOpen, initialLabel, initialHeaderColor, onSave, onCancel }) => {
    const [label, setLabel] = useState('');
    const [colorId, setColorId] = useState('blue');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setLabel(initialLabel || '');
            const found = LANE_COLORS.find(c => c.header === initialHeaderColor);
            setColorId(found ? found.id : 'blue');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, initialLabel, initialHeaderColor]);

    if (!isOpen) return null;

    const selectedColor = LANE_COLORS.find(c => c.id === colorId) || LANE_COLORS[0];

    const handleSave = () => onSave({ label, color: selectedColor });

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-label="Swimlane bearbeiten"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-bold text-[var(--color-vhs-blau)]">Swimlane bearbeiten</h3>
                    <button onClick={onCancel} className="p-1 hover:bg-gray-200 rounded-full transition-colors" aria-label="Schließen">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Bezeichnung
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full text-sm py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                            Farbakzent
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {LANE_COLORS.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setColorId(c.id)}
                                    title={c.label}
                                    className="w-8 h-8 rounded-full transition-all"
                                    style={{
                                        backgroundColor: c.header,
                                        outline: colorId === c.id ? `3px solid ${c.header}` : '3px solid transparent',
                                        outlineOffset: '2px',
                                    }}
                                    aria-label={c.label}
                                    aria-pressed={colorId === c.id}
                                />
                            ))}
                        </div>

                        {/* Live preview */}
                        <div
                            className="mt-3 rounded-md overflow-hidden"
                            style={{ border: `1.5px solid ${selectedColor.header}` }}
                        >
                            <div className="h-8 flex items-center px-3" style={{ backgroundColor: selectedColor.header }}>
                                <span className="text-white text-xs font-bold truncate">{label || 'Swimlane'}</span>
                            </div>
                            <div className="h-6" style={{ backgroundColor: selectedColor.body }} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-1.5 text-sm font-bold text-white bg-[var(--color-vhs-blau)] rounded-md hover:bg-[var(--color-vhs-blau-80)] transition-colors"
                    >
                        Speichern
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditLaneModal;
