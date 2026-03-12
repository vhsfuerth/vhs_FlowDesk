import React from 'react';
import { Play, CircleStop, Square, Diamond, MessageSquareDashed, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const Toolbar = ({ onDragStart, isCollapsed, onToggleCollapsed }) => {
  const tools = [
    { type: 'start', icon: Play, label: 'Start', color: 'text-[var(--color-vhs-gelb)]' },
    { type: 'end', icon: CircleStop, label: 'Ende', color: 'text-[var(--color-vhs-orange)]' },
    { type: 'process', icon: Square, label: 'Prozess', color: 'text-[var(--color-vhs-blau)]' },
    { type: 'decision', icon: Diamond, label: 'Entscheidung', color: 'text-[var(--color-vhs-orange-hell)]' },
    { type: 'annotation', icon: MessageSquareDashed, label: 'Kommentar', color: 'text-[var(--color-vhs-blau-60)]' }
  ];

  const handleDragStart = (event, tool) => {
    const nodeData = {
      type: tool.type,
      label: tool.label
    };
    event.dataTransfer.setData('application/json', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'copy';
    if (onDragStart) onDragStart(nodeData);
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-r border-[var(--color-vhs-blau-20)] flex flex-col items-center shadow-sm shrink-0">
        <button
          onClick={onToggleCollapsed}
          className="mt-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
          title="Elementleiste einblenden"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-6 [writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          Elemente
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white w-72 border-r border-[var(--color-vhs-blau-20)] flex flex-col shadow-sm shrink-0">
      <div className="p-4 border-b border-[var(--color-vhs-blau-10)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-[var(--color-vhs-blau)] text-sm uppercase tracking-wider">
              Elemente
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Ziehe Elemente auf die Arbeitsflaeche
            </p>
          </div>
          <button
            onClick={onToggleCollapsed}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)] shrink-0"
            title="Elementleiste ausblenden"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.type}
              draggable
              onDragStart={(event) => handleDragStart(event, tool)}
              className="flex items-center p-3 rounded-md border border-[var(--color-vhs-blau-20)] bg-white hover:bg-[var(--color-vhs-blau-10)] cursor-grab active:cursor-grabbing transition-colors group shadow-sm"
              title={`${tool.label} hinzufuegen`}
            >
              <div className="mr-3 p-2 rounded bg-gray-50 group-hover:bg-white transition-colors">
                <Icon className={`w-5 h-5 ${tool.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-700 select-none">
                {tool.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-[var(--color-vhs-blau-10)] bg-gray-50">
        <div className="text-xs text-gray-600 font-medium mb-2">Verbindungen erstellen</div>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="p-1.5 bg-white border border-gray-300 rounded">
            <ArrowRight className="w-3 h-3 text-[var(--color-vhs-blau-60)]" />
          </div>
          <span className="leading-tight">Klicke und ziehe vom Rand eines Elements zum naechsten</span>
        </div>
      </div>
    </aside>
  );
};

export default Toolbar;
