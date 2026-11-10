// @ts-check
// Meldet Änderungen am Graphen an die App (Struktur-Check, Autosave, Textfassung).
// Während ein Element oder eine Verbindung gezogen wird und während eines Batches
// (Laden, Anordnen, Einfügen …) werden Zwischenstände nicht gemeldet; es folgt eine
// Meldung, sobald die Maus losgelassen bzw. der letzte Batch beendet ist. Mit ihr
// wird auch der Zustand von Rückgängig/Wiederholen gemeldet.
// Rückfallebene: Bleibt ein Batch oder Ziehen versehentlich offen (Fehler, pointercancel),
// wird spätestens FALLBACK_MS nach der letzten Änderung trotzdem gemeldet. So gehen
// Änderungen nie verloren (Autosave, Markierung „ungespeichert“).

export const FALLBACK_MS = 1000;

// Nur Darstellung: Anschlusspunkte werden beim Überfahren ein-/ausgeblendet (paper.js, attachPortHover)
const VIEW_ONLY_CHANGES = new Set(['change:ports']);

/** @param {string} eventName */
const isContentChange = (eventName) => eventName === 'add' || eventName === 'remove'
    || eventName === 'reset' || (eventName.includes('change:') && !VIEW_ONLY_CHANGES.has(eventName));

/**
 * @param {{ graph: any, paper: any, onGraphChange: () => void, onHistoryChange: () => void }} options
 * @returns {() => void} Abmelden
 */
export function attachChangeNotifier({ graph, paper, onGraphChange, onHistoryChange }) {
    let dragging = false;
    let pending = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let releaseTimer = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let fallbackTimer = null;

    const report = () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        fallbackTimer = null;
        pending = false;
        onHistoryChange();
        onGraphChange();
    };
    const flush = () => {
        if (!pending) return;
        if (dragging || graph.hasActiveBatch()) {
            // Neu starten: Während laufender Änderungen (Ziehen) greift die Rückfallebene nicht
            if (fallbackTimer) clearTimeout(fallbackTimer);
            fallbackTimer = setTimeout(report, FALLBACK_MS);
            return;
        }
        report();
    };

    /** @param {string} eventName */
    const onAll = (eventName) => {
        if (eventName === 'batch:stop') {
            flush();
            return;
        }
        if (!isContentChange(eventName)) return;
        pending = true;
        flush();
    };
    const onPointerDown = () => { dragging = true; };
    // JointJS beendet das Ziehen erst im mouseup/touchend nach dem pointerup und ordnet dort
    // z. B. die Lane zu. Deshalb erst nach diesem Ereignis melden (nächster Task).
    const onPointerUp = () => {
        if (!dragging || releaseTimer) return;
        releaseTimer = setTimeout(() => {
            releaseTimer = null;
            dragging = false;
            flush();
        }, 0);
    };

    graph.on('all', onAll);
    paper.on('cell:pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onPointerUp);

    return () => {
        if (releaseTimer) clearTimeout(releaseTimer);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        graph.off('all', onAll);
        paper.off('cell:pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('blur', onPointerUp);
    };
}
