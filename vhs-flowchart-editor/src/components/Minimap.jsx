import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { MINIMAP_SIZE, fromMinimap, minimapFrame, toMinimap } from '../diagram/overview';

// Übersichtskarte: zeigt das ganze Diagramm verkleinert mit dem sichtbaren Ausschnitt.
// Klicken oder Ziehen auf der Karte verschiebt die Ansicht dorthin.
const Minimap = ({ overview, onNavigate, onClose }) => {
  const draggingRef = useRef(false);
  const { items, content, view } = overview;
  const frame = minimapFrame(content, view);
  const viewRect = toMinimap(frame, view);

  const navigate = (evt) => {
    const box = evt.currentTarget.getBoundingClientRect();
    onNavigate(fromMinimap(frame, { x: evt.clientX - box.left, y: evt.clientY - box.top }));
  };

  return (
    <div
      className="absolute left-3 bottom-5 z-10 rounded-md border border-[var(--color-vhs-blau-20)] bg-white/95 shadow-md"
      data-testid="minimap"
    >
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Übersicht</span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)]"
          title="Übersichtskarte ausblenden"
          aria-label="Übersichtskarte ausblenden"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
      {/* Reine Maushilfe: Per Tastatur scrollt man die Arbeitsfläche direkt */}
      <svg
        width={MINIMAP_SIZE.width}
        height={MINIMAP_SIZE.height}
        className="block cursor-pointer touch-none"
        data-testid="minimap-map"
        aria-hidden="true"
        onPointerDown={(evt) => {
          draggingRef.current = true;
          evt.currentTarget.setPointerCapture?.(evt.pointerId);
          navigate(evt);
        }}
        onPointerMove={(evt) => { if (draggingRef.current) navigate(evt); }}
        onPointerUp={() => { draggingRef.current = false; }}
        onPointerCancel={() => { draggingRef.current = false; }}
      >
        {items.filter((item) => item.lane).map((item) => {
          const r = toMinimap(frame, item);
          return <rect key={item.id} x={r.x} y={r.y} width={r.width} height={r.height} fill="var(--color-vhs-blau-10)" stroke="var(--color-vhs-blau-20)" strokeWidth="0.5" />;
        })}
        {items.filter((item) => !item.lane).map((item) => {
          const r = toMinimap(frame, item);
          return <rect key={item.id} x={r.x} y={r.y} width={Math.max(1, r.width)} height={Math.max(1, r.height)} rx="1" fill="var(--color-vhs-blau-60)" />;
        })}
        <rect
          x={viewRect.x}
          y={viewRect.y}
          width={viewRect.width}
          height={viewRect.height}
          fill="var(--color-vhs-orange-hell)"
          fillOpacity="0.15"
          stroke="var(--color-vhs-orange-b)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};

export default Minimap;
