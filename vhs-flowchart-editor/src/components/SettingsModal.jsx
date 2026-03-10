import React, { useState } from 'react';
import { Settings, X, Key } from 'lucide-react';
import { getApiKey, setApiKey } from '../storage/settings';

const SettingsModal = ({ isOpen, onClose }) => {
  const [apiKey, setKeyValue] = useState(getApiKey());

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(apiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center text-[var(--color-vhs-blau)]">
            <Settings className="w-5 h-5 mr-2" />
            Einstellungen
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Key className="w-4 h-4 mr-1" />
              OpenAI API-Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="sk-..."
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Wird zur KI-Generierung von Diagrammen benötigt. Wird ausschließlich lokal in Ihrem Webbrowser gespeichert.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 bg-white"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--color-vhs-blau)] text-white rounded-md hover:bg-[var(--color-vhs-blau-80)]"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
