import React, { useState, useSyncExternalStore } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { isFullyVisible } from '../diagram/overview';
import { readFlag, writeFlag } from '../utils/stored-flag';
import Minimap from './Minimap';

// Übersichtskarte samt Ein-/Ausblenden. Liest den Zustand aus einem eigenen kleinen Speicher,
// damit beim Scrollen nur diese Komponente neu gezeichnet wird, nicht die ganze Arbeitsfläche.

const HIDDEN_KEY = 'vhs-minimap-hidden';

const MinimapOverlay = ({ store, onNavigate }) => {
  const overview = useSyncExternalStore(store.subscribe, store.get);
  const [hidden, setHidden] = useState(() => readFlag(HIDDEN_KEY));

  const setHiddenStored = (value) => {
    setHidden(value);
    writeFlag(HIDDEN_KEY, value);
  };

  if (!overview || isFullyVisible(overview.content, overview.view)) return null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHiddenStored(false)}
        className="absolute left-3 bottom-5 z-10 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-vhs-blau-20)] bg-white px-2 py-1 text-xs font-bold text-[var(--color-vhs-blau)] shadow-md hover:bg-[var(--color-vhs-blau-10)] focus:outline-none focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)]"
        title="Übersichtskarte einblenden"
      >
        <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Übersicht
      </button>
    );
  }
  return <Minimap overview={overview} onNavigate={onNavigate} onClose={() => setHiddenStored(true)} />;
};

export default MinimapOverlay;
