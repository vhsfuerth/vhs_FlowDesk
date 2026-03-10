import React, { useEffect, useRef } from 'react';
import { Play, CircleStop, Square, Diamond, MessageSquareDashed, ArrowRight } from 'lucide-react';
import * as joint from 'jointjs';
import { createStartNode, createEndNode, createProcessNode, createDecisionNode, createAnnotationNode } from '../diagram/shapes';

const Toolbar = ({ onDragStart }) => {
  const tools = [
    { type: 'start', icon: Play, label: 'Start', color: 'text-[var(--color-vhs-gelb)]', createFn: createStartNode },
    { type: 'end', icon: CircleStop, label: 'Ende', color: 'text-[var(--color-vhs-orange)]', createFn: createEndNode },
    { type: 'process', icon: Square, label: 'Prozess', color: 'text-[var(--color-vhs-blau)]', createFn: createProcessNode },
    { type: 'decision', icon: Diamond, label: 'Entscheidung', color: 'text-[var(--color-vhs-orange-hell)]', createFn: createDecisionNode },
    { type: 'annotation', icon: MessageSquareDashed, label: 'Kommentar', color: 'text-[var(--color-vhs-blau-60)]', createFn: createAnnotationNode },
  ];

  const handleDragStart = (e, tool) => {
    // Generate an abstract representation of the node to be dropped
    const nodeData = {
      type: tool.type,
      label: tool.label
    };
    e.dataTransfer.setData('application/json', JSON.stringify(nodeData));
    e.dataTransfer.effectAllowed = 'copy';
    if (onDragStart) onDragStart(nodeData);
  };

  return (
    <div className="bg-white w-64 border-r border-[var(--color-vhs-blau-20)] flex flex-col shadow-sm">
      <div className="p-4 border-b border-[var(--color-vhs-blau-10)]">
        <h3 className="font-bold text-[var(--color-vhs-blau)] text-sm uppercase tracking-wider">
          Elemente
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Ziehe Elemente auf die Arbeitsfläche
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.type}
              draggable
              onDragStart={(e) => handleDragStart(e, tool)}
              className="flex items-center p-3 rounded-md border border-[var(--color-vhs-blau-20)] bg-white hover:bg-[var(--color-vhs-blau-10)] cursor-grab active:cursor-grabbing transition-colors group shadow-sm"
              title={`${tool.label} hinzufügen`}
            >
              <div className={`mr-3 p-2 rounded bg-gray-50 group-hover:bg-white transition-colors`}>
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
             <div className="p-1.5 bg-white border border-gray-300 rounded"><ArrowRight className="w-3 h-3 text-[var(--color-vhs-blau-60)]" /></div>
             <span className="leading-tight">Klicke und ziehe vom Rand eines Elements zum nächsten</span>
         </div>
      </div>
    </div>
  );
};

export default Toolbar;
