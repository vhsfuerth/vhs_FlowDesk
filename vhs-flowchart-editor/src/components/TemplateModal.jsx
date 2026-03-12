import React from 'react';
import { X, Sparkles, LayoutTemplate } from 'lucide-react';

const TemplateModal = ({ isOpen, onClose, templates, onApply }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold flex items-center text-[var(--color-vhs-blau)]">
              <LayoutTemplate className="w-5 h-5 mr-2" />
              vhs-Starter-Vorlagen
            </h2>
            <p className="text-sm text-gray-500 mt-1">Schneller Einstieg für häufige Prozesse in Volkshochschulen.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onApply(template)}
                className="text-left border border-[var(--color-vhs-blau-20)] rounded-xl p-4 bg-white hover:border-[var(--color-vhs-blau)] hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-vhs-orange)]">
                    {template.category}
                  </span>
                  <Sparkles className="w-4 h-4 text-[var(--color-vhs-gelb)]" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-[var(--color-vhs-blau)]">{template.name}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{template.description}</p>
                <div className="mt-4 text-xs text-gray-400">
                  {template.diagram.nodes.length} Knoten, {template.diagram.edges.length} Verbindungen
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
