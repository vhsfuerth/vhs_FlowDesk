import React, { useId, useState } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../hooks/useDialogA11y';

// Wird nur gerendert, solange der Dialog offen ist
const EditTextModal = ({ title, initialValue, onSave, onCancel }) => {
  const [value, setValue] = useState(initialValue || '');
  const dialogRef = useDialogA11y(true, onCancel);
  const titleId = useId();

  const handleSave = () => {
    onSave(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 id={titleId} className="text-sm font-bold text-[var(--color-vhs-blau)]">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Schließen"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            data-autofocus
            aria-labelledby={titleId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-sm py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent min-h-[60px] max-h-[200px] resize-y"
            rows={2}
          />
          <p className="text-xs text-gray-500 mt-1">Enter = Speichern, Esc = Abbrechen</p>
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

export default EditTextModal;
