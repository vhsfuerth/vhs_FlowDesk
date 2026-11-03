import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Tastatur-Bedienbarkeit für modale Dialoge:
 * - Fokus wandert beim Öffnen in den Dialog (Element mit `data-autofocus` oder erstes fokussierbares)
 * - Tab / Umschalt+Tab bleiben innerhalb des Dialogs
 * - Escape schließt den Dialog
 * - Beim Schließen kehrt der Fokus zum auslösenden Element zurück
 *
 * Der zurückgegebene Ref gehört an das Element mit `aria-modal="true"`.
 * Bei mehreren offenen Dialogen reagiert nur der zuletzt geöffnete (oberste).
 */
export function useDialogA11y(isOpen, onClose) {
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        const dialog = dialogRef.current;

        const focusTimer = setTimeout(() => {
            if (!dialog || dialog.contains(document.activeElement)) return;
            const target = dialog.querySelector('[data-autofocus]') || dialog.querySelector(FOCUSABLE_SELECTOR);
            target?.focus();
        }, 0);

        const isTopmost = () => {
            const dialogs = document.querySelectorAll('[aria-modal="true"]');
            return dialogs[dialogs.length - 1] === dialog;
        };

        const handleKeyDown = (event) => {
            if (!dialog || !isTopmost()) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onCloseRef.current?.();
                return;
            }

            if (event.key === 'Tab') {
                const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [isOpen]);

    return dialogRef;
}
