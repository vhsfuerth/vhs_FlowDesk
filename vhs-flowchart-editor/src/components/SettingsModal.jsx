import React, { useId, useState } from 'react';
import { getApiKey, setApiKey, getCustomPrompt, setCustomPrompt, getAiConsent, revokeAiConsent } from '../storage/settings';
import { SYSTEM_PROMPT } from '../ai/prompts';
import { GEMINI_MODELS } from '../ai/config';
import { Settings, X, Key, Sparkles, RotateCcw, Activity, Loader2, CheckCircle2, AlertCircle, Info, Scale, ShieldCheck } from 'lucide-react';
import { checkApiStatus, listAvailableModels } from '../ai/gemini-client';
import { useConfirm } from '../hooks/useConfirm';
import { useDialogA11y } from '../hooks/useDialogA11y';
import AiPrivacyNotice from './AiPrivacyNotice';

// Wird nur gerendert, solange der Dialog offen ist – die Werte werden daher
// bei jedem Öffnen frisch aus dem Speicher gelesen.
const SettingsModal = ({ onClose }) => {
  const [apiKey, setKeyValue] = useState(getApiKey());
  const [customPrompt, setCustomPromptValue] = useState(getCustomPrompt() || SYSTEM_PROMPT);
  const [apiStatus, setApiStatus] = useState(null); // { status, message }
  const [isChecking, setIsChecking] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [aiConsent, setAiConsentState] = useState(getAiConsent());
  const confirm = useConfirm();
  const dialogRef = useDialogA11y(true, onClose);
  const titleId = useId();
  const apiKeyId = useId();
  const promptId = useId();

  const handleSave = () => {
    setApiKey(apiKey);
    setCustomPrompt(customPrompt);
    onClose();
  };

  const handleResetPrompt = async () => {
    const confirmed = await confirm({
      title: 'KI-Prompt zurücksetzen',
      message: 'Möchten Sie den KI-Prompt wirklich auf die Standardeinstellung zurücksetzen?',
      confirmLabel: 'Zurücksetzen',
      tone: 'danger'
    });
    if (confirmed) setCustomPromptValue(SYSTEM_PROMPT);
  };

  const handleRevokeConsent = () => {
    revokeAiConsent();
    setAiConsentState(null);
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setApiStatus(null);
    setShowDiagnosis(false);
    try {
        const result = await checkApiStatus(apiKey);
        setApiStatus(result);

        if (result.status !== 'ok') {
            const models = await listAvailableModels(apiKey);
            setAvailableModels(models);
            setShowDiagnosis(true);
        }
    } catch {
        setApiStatus({ status: 'error', message: 'Unbekannter Fehler beim Testen.' });
    } finally {
        setIsChecking(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 id={titleId} className="text-xl font-bold flex items-center text-[var(--color-vhs-blau)]">
            <Settings className="w-5 h-5 mr-2" aria-hidden="true" />
            Einstellungen
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Einstellungen schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={apiKeyId} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Key className="w-4 h-4 mr-1" aria-hidden="true" />
              Google Gemini API-Key
            </label>
            <input
              id={apiKeyId}
              type="password"
              value={apiKey}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="AIzaSy..."
              autoComplete="off"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent"
            />

            <div className="mt-3 flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                <div className="flex items-center text-sm" role="status">
                    <Activity className="w-4 h-4 mr-2 text-gray-500" aria-hidden="true" />
                    <span className="font-medium text-gray-700">Status:</span>
                    {apiStatus ? (
                        <div className={`ml-2 flex items-center font-bold ${
                            apiStatus.status === 'ok' ? 'text-green-700' :
                            apiStatus.status === 'limit' ? 'text-red-600' : 'text-purple-700'
                        }`}>
                            {apiStatus.status === 'ok' ? <CheckCircle2 className="w-4 h-4 mr-1" aria-hidden="true" /> : <AlertCircle className="w-4 h-4 mr-1" aria-hidden="true" />}
                            {apiStatus.message}
                        </div>
                    ) : (
                        <span className="ml-2 text-gray-500 italic">Nicht geprüft</span>
                    )}
                </div>
                <button
                    onClick={handleCheckStatus}
                    disabled={isChecking || !apiKey}
                    className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center shadow-sm"
                >
                    {isChecking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" /> : null}
                    Status prüfen
                </button>
            </div>

            {showDiagnosis && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-[10px] text-purple-800">
                    <div className="font-bold flex items-center mb-1">
                        <Info className="w-3 h-3 mr-1" aria-hidden="true" />
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
              Wird zur KI-Generierung von Diagrammen benötigt. Wird ausschließlich lokal in Ihrem Webbrowser gespeichert
              und nur an die Google Gemini API übertragen. Verwendete Modelle (in dieser Reihenfolge): {GEMINI_MODELS.join(', ')}.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1" aria-hidden="true" />
              Datenschutz bei KI-Nutzung
            </h3>
            <AiPrivacyNotice compact />
            <div className="mt-2 flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded-md p-2">
              <span className="text-gray-600">
                {aiConsent
                  ? `Hinweis bestätigt am ${new Date(aiConsent.acceptedAt).toLocaleString('de-DE')}`
                  : 'Hinweis noch nicht bestätigt – er wird vor der nächsten KI-Nutzung angezeigt.'}
              </span>
              {aiConsent && (
                <button onClick={handleRevokeConsent} className="text-[var(--color-vhs-orange-b)] hover:underline font-medium">
                  Bestätigung zurücknehmen
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-1">
                <label htmlFor={promptId} className="block text-sm font-medium text-gray-700 flex items-center">
                <Sparkles className="w-4 h-4 mr-1 text-[var(--color-vhs-gelb)]" aria-hidden="true" />
                KI-System-Prompt (Fortgeschritten)
                </label>
                <button
                    onClick={handleResetPrompt}
                    className="text-xs text-[var(--color-vhs-orange-b)] hover:underline flex items-center"
                >
                    <RotateCcw className="w-3 h-3 mr-1" aria-hidden="true" />
                    Zurücksetzen
                </button>
            </div>
            <textarea
              id={promptId}
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

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Scale className="w-4 h-4 mr-1" aria-hidden="true" />
              Version, Lizenz &amp; Urheber
            </h3>
            <p className="text-xs text-gray-600">
              Version {__APP_VERSION__} · MIT License
            </p>
            <p className="text-xs text-gray-500 mt-1">
              &copy; 2026 Tobias Götz, vhs Fürth gGmbH
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
