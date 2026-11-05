import React, { useEffect, useRef, useState } from 'react';

/**
 * Textfeld direkt über einem Element bzw. einer Beschriftung.
 * Enter übernimmt (Umschalt+Enter: neue Zeile), Esc bricht ab, Klick daneben übernimmt.
 * @param {{ rect: { left: number, top: number, width: number, height: number }, initialValue: string,
 *   selectAll?: boolean, fontSize?: number, label: string, onCommit: (text: string) => void, onCancel: () => void }} props
 */
const InlineTextEditor = ({ rect, initialValue, selectAll = true, fontSize = 13, label, onCommit, onCancel }) => {
    const [value, setValue] = useState(initialValue);
    const ref = useRef(null);
    // Für Ereignisse außerhalb von React: aktueller Text und Rückruffunktionen
    const stateRef = useRef({ value: initialValue, done: false, onCommit, onCancel });

    useEffect(() => {
        stateRef.current.onCommit = onCommit;
        stateRef.current.onCancel = onCancel;
    }, [onCommit, onCancel]);

    const finish = (commit) => {
        const state = stateRef.current;
        if (state.done) return;
        state.done = true;
        if (commit) state.onCommit(state.value);
        else state.onCancel();
    };

    useEffect(() => {
        const field = ref.current;
        if (!field) return;
        field.focus();
        if (selectAll) field.select();
        else field.setSelectionRange(field.value.length, field.value.length);
    }, [selectAll]);

    // Klick daneben übernimmt. Nicht nur über onBlur: JointJS verhindert beim Klick auf die
    // Arbeitsfläche den Fokuswechsel, das Textfeld würde den Fokus sonst behalten.
    useEffect(() => {
        const onPointerDown = (event) => {
            const state = stateRef.current;
            if (state.done || !ref.current || ref.current.contains(event.target)) return;
            state.done = true;
            state.onCommit(state.value);
        };
        window.addEventListener('pointerdown', onPointerDown, true);
        return () => window.removeEventListener('pointerdown', onPointerDown, true);
    }, []);

    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            finish(true);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            finish(false);
        }
    };

    return (
        <textarea
            ref={ref}
            aria-label={label}
            data-inline-editor="true"
            value={value}
            onChange={(event) => {
                stateRef.current.value = event.target.value;
                setValue(event.target.value);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => finish(true)}
            className="absolute z-20 resize-none rounded border-2 border-[var(--color-vhs-orange-hell)] bg-white p-1 text-center font-bold text-[var(--color-vhs-blau)] shadow-md focus:outline-none"
            style={{
                left: rect.left,
                top: rect.top,
                width: Math.max(rect.width, 120),
                height: Math.max(rect.height, 32),
                fontSize,
                lineHeight: 1.3
            }}
        />
    );
};

export default InlineTextEditor;
