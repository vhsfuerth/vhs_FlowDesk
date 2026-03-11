import React, { useState } from 'react';
import { getApiKey, setApiKey, getCustomPrompt, setCustomPrompt } from '../storage/settings';
import { SYSTEM_PROMPT } from '../ai/prompts';
import { Settings, X, Key, Sparkles, RotateCcw, Activity, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { checkApiStatus, listAvailableModels } from '../ai/gemini-client';

const SettingsModal = ({ isOpen, onClose }) => {
  const [apiKey, setKeyValue] = useState(getApiKey());
  const [customPrompt, setCustomPromptValue] = useState(getCustomPrompt() || SYSTEM_PROMPT);
  const [apiStatus, setApiStatus] = useState(null); // { status, message }
  const [isChecking, setIsChecking] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [showDiagnosis, setShowDiagnosis] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(apiKey);
    setCustomPrompt(customPrompt);
    onClose();
  };

  const handleResetPrompt = () => {
    if (window.confirm('Möchten Sie den KI-Prompt wirklich auf die Standardeinstellung zurücksetzen?')) {
        setCustomPromptValue(SYSTEM_PROMPT);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setApiStatus(null);
    setShowDiagnosis(false);
    try {
        const result = await checkApiStatus();
        setApiStatus(result);
        
        if (result.status !== 'ok') {
            const models = await listAvailableModels();
            setAvailableModels(models);
            setShowDiagnosis(true);
        }
    } catch (e) {
        setApiStatus({ status: 'error', message: 'Unbekannter Fehler beim Testen.' });
    } finally {
        setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
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
              Google Gemini API-Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent"
            />
            
            <div className="mt-3 flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                <div className="flex items-center text-sm">
                    <Activity className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium text-gray-700">Status:</span>
                    {apiStatus ? (
                        <div className={`ml-2 flex items-center font-bold ${
                            apiStatus.status === 'ok' ? 'text-green-600' : 
                            apiStatus.status === 'limit' ? 'text-red-600' : 'text-purple-600'
                        }`}>
                            {apiStatus.status === 'ok' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <AlertCircle className="w-4 h-4 mr-1" />}
                            {apiStatus.message}
                        </div>
                    ) : (
                        <span className="ml-2 text-gray-400 italic">Nicht geprüft</span>
                    )}
                </div>
                <button 
                    onClick={handleCheckStatus}
                    disabled={isChecking || !apiKey}
                    className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center shadow-sm"
                >
                    {isChecking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                    Status prüfen
                </button>
            </div>

            {showDiagnosis && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-[10px] text-purple-800">
                    <div className="font-bold flex items-center mb-1">
                        <Info className="w-3 h-3 mr-1" />
                        Diagnose: Verfügbare Modelle für diesen Key:
                    </div>
                    {availableModels.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 uppercase">
                            {availableModels.map(m => (
                                <div key={m.name} className="bg-white/50 px-1 rounded truncate" title={m.name}>
                                    {m.name.split('/').pop()}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="italic">Keine Modelle gefunden. Ist die "Generative Language API" aktiviert?</p>
                    )}
                </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Wird zur KI-Generierung von Diagrammen benötigt. Wird ausschließlich lokal in Ihrem Webbrowser gespeichert.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Sparkles className="w-4 h-4 mr-1 text-[var(--color-vhs-gelb)]" />
                KI-System-Prompt (Fortgeschritten)
                </label>
                <button 
                    onClick={handleResetPrompt}
                    className="text-xs text-[var(--color-vhs-orange)] hover:underline flex items-center"
                >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Zurücksetzen
                </button>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPromptValue(e.target.value)}
              rows={12}
              className="w-full border border-gray-300 rounded-md p-2 text-xs font-mono focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent resize-y"
              placeholder="Systemanweisungen für die KI..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Diese Anweisungen steuern, wie die KI Diagramme generiert. Änderungen können das Ergebnis stark beeinflussen.
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
