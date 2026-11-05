import React, { useEffect, useRef } from 'react';
import { NODE_TYPE_LABELS } from '../diagram/types';
import { NEXT_STEP_TYPES } from '../diagram/add-next';

/**
 * Kleines Menü am „+“-Griff: Typ des Folgeschritts wählen.
 * Esc oder ein Klick daneben schließt es.
 */
const AddNextMenu = ({ x, y, onSelect, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        menuRef.current?.querySelector('button')?.focus();
        const onPointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) onClose();
        };
        window.addEventListener('pointerdown', onPointerDown, true);
        return () => window.removeEventListener('pointerdown', onPointerDown, true);
    }, [onClose]);

    const onKeyDown = (event) => {
        const buttons = [...menuRef.current.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next].focus();
        }
    };

    return (
        <div
            ref={menuRef}
            role="menu"
            aria-label="Folgeschritt anhängen"
            onKeyDown={onKeyDown}
            className="absolute z-30 min-w-44 rounded-md border border-[var(--color-vhs-blau-20)] bg-white py-1 shadow-lg"
            style={{ left: x, top: y }}
        >
            {NEXT_STEP_TYPES.map((type) => (
                <button
                    key={type}
                    type="button"
                    role="menuitem"
                    onClick={() => onSelect(type)}
                    className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-[var(--color-vhs-blau-10)] focus:bg-[var(--color-vhs-blau-10)] focus:outline-none"
                >
                    {NODE_TYPE_LABELS[type]}
                </button>
            ))}
        </div>
    );
};

export default AddNextMenu;
