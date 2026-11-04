import React, { useId, useState } from 'react';
import {
  getApiKeys, setApiKey, getAiProviderSettings, setAiProviderSettings,
  getCustomPrompt, setCustomPrompt, getCopilotHints, setCopilotHints, getAiConsent, revokeAiConsent
} from '../storage/settings';
import { SYSTEM_PROMPT } from '../ai/prompts';
import { PROVIDERS, getProviderPreset, resolveProvider } from '../ai/providers';
import { Settings, X, Key, Sparkles, RotateCcw, Activity, Loader2, CheckCircle2, AlertCircle, Info, Scale, ShieldCheck, Server } from 'lucide-react';
import { checkApiStatus, listAvailableModels } from '../ai/ai-client';
import { useConfirm } from '../hooks/useConfirm';
import { useDialogA11y } from '../hooks/useDialogA11y';
import AiPrivacyNotice from './AiPrivacyNotice';

const inputClass = 'w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent';

// Wird nur gerendert, solange der Dialog offen ist – die Werte werden daher
// bei jedem Öffnen frisch aus dem Speicher gelesen.
const SettingsModal = ({ onClose }) => {
  const [savedProvider] = useState(getAiProviderSettings);
  const [providerId, setProviderId] = useState(savedProvider.providerId);
  const [baseUrl, setBaseUrl] = useState(savedProvider.baseUrl);
  const [models, setModels] = useState(savedProvider.models);
  const [keys, setKeys] = useState(getApiKeys);
  const [formError, setFormError] = useState(null);
  const [customPrompt, setCustomPromptValue] = useState(getCustomPrompt() || SYSTEM_PROMPT);
  const [copilotHints, setCopilotHintsValue] = useState(getCopilotHints());
  const [apiStatus, setApiStatus] = useState(null); // { status, message }
  const [isChecking, setIsChecking] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [aiConsent, setAiConsentState] = useState(getAiConsent());
  const confirm = useConfirm();
  const dialogRef = useDialogA11y(true, onClose);
  const titleId = useId();
  const providerSelectId = useId();
  const baseUrlId = useId();
  const apiKeyId = useId();
  const modelsId = useId();
  const promptId = useId();
  const hintsId = useId();

  const preset = getProviderPreset(providerId);
  const apiKey = String(keys[providerId] || '');
  const resolved = resolveProvider({ providerId, baseUrl, models });

  const resetCheck = () => {
    setApiStatus(null);
    setShowDiagnosis(false);
    setAvailableModels([]);
    setFormError(null);
  };

  const handleProviderChange = (id) => {
    setProviderId(id);
    // Modellnamen gelten nur für einen Anbieter – beim Wechsel die Voreinstellung nutzen
    setModels(id === savedProvider.providerId ? savedProvider.models : '');
    resetCheck();
  };

  const handleSave = () => {
    if (resolved.problem) {
      setFormError(resolved.problem);
      return;
    }
    setAiProviderSettings({ providerId, baseUrl, models });
    Object.entries(keys).forEach(([id, key]) => setApiKey(String(key || ''), id));
    setCustomPrompt(customPrompt);
    setCopilotHints(copilotHints.trim());
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
    resetCheck();
    try {
        const overrides = { providerId, baseUrl, models, apiKey };
        const result = await checkApiStatus(overrides);
        setApiStatus(result);

        if (result.status !== 'ok') {
            setAvailableModels(result.models || await listAvailableModels(overrides));
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
            <label htmlFor={providerSelectId} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Server className="w-4 h-4 mr-1" aria-hidden="true" />
              KI-Anbieter
            </label>
            <select
              id={providerSelectId}
              value={providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>

            {providerId !== 'gemini' && (
              <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 flex items-start" role="note">
                <AlertCircle className="w-4 h-4 mr-1 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Bisher ist nur Google Gemini im Praxiseinsatz getestet. Die Anbindung an {preset.label} ist noch
                  nicht getestet. Falls Fehler auftreten, bitte mit einem Bugreport beim Autor melden
                  (Tobias Götz, vhs Fürth) – mit Anbieter, Modell und der angezeigten Fehlermeldung.
                </span>
              </p>
            )}

            {!preset.baseUrl && (
              <div className="mt-3">
                <label htmlFor={baseUrlId} className="block text-sm font-medium text-gray-700 mb-1">
                  Server-Adresse (OpenAI-kompatibel)
                </label>
                <input
                  id={baseUrlId}
                  type="url"
                  value={baseUrl}
                  onChange={(e) => { setBaseUrl(e.target.value); resetCheck(); }}
                  placeholder="https://ki.example.de/v1"
                  autoComplete="off"
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Adresse bis einschließlich Versionspfad, z.&nbsp;B. <code>https://…/v1</code> oder für ein lokales Ollama <code>http://localhost:11434/v1</code>.
                  Der Server muss Aufrufe direkt aus dem Browser erlauben (CORS).
                </p>
              </div>
            )}

            <div className="mt-3">
              <label htmlFor={apiKeyId} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Key className="w-4 h-4 mr-1" aria-hidden="true" />
                API-Key {preset.label}{preset.keyRequired ? '' : ' (optional)'}
              </label>
              <input
                id={apiKeyId}
                type="password"
                value={apiKey}
                onChange={(e) => setKeys((current) => ({ ...current, [providerId]: e.target.value }))}
                placeholder={preset.keyPlaceholder}
                autoComplete="off"
                className={inputClass}
              />
              {preset.keyUrl && (
                <p className="text-xs text-gray-500 mt-1">
                  Key erstellen:{' '}
                  <a href={preset.keyUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-vhs-blau)] underline">
                    {preset.keyUrl.replace('https://', '')}
                  </a>
                </p>
              )}
            </div>

            <div className="mt-3">
              <label htmlFor={modelsId} className="block text-sm font-medium text-gray-700 mb-1">
                Modell(e)
              </label>
              <input
                id={modelsId}
                type="text"
                value={models}
                onChange={(e) => { setModels(e.target.value); setFormError(null); }}
                placeholder={preset.models.length > 0 ? preset.models.join(', ') : 'z. B. llama3.1:8b'}
                autoComplete="off"
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                {preset.models.length > 0 ? 'Leer lassen für die Voreinstellung. ' : 'Pflichtfeld beim eigenen Server. '}
                Mehrere Modelle durch Komma trennen – ist eines nicht verfügbar oder überlastet, wird das nächste versucht.
              </p>
            </div>

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
                    disabled={isChecking || (preset.keyRequired && !apiKey.trim())}
                    className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center shadow-sm"
                >
                    {isChecking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" /> : null}
                    Status prüfen
                </button>
            </div>

            {showDiagnosis && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-xs text-purple-800">
                    <div className="font-bold flex items-center mb-1">
                        <Info className="w-3 h-3 mr-1" aria-hidden="true" />
                        Diagnose: Verfügbare Modelle für diesen Key (anklicken zum Übernehmen):
                    </div>
                    {availableModels.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                            {availableModels.map((name) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => setModels(name)}
                                    className="bg-white/50 hover:bg-white px-1 rounded truncate text-left"
                                    title={name}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="italic">Keine Modelle gefunden. Stimmen Key und Adresse? Bei Google muss die „Generative Language API“ aktiviert sein.</p>
                    )}
                </div>
            )}

            {formError && (
                <p className="mt-2 text-sm text-red-700" role="alert">{formError}</p>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Der Key wird ausschließlich lokal in Ihrem Webbrowser gespeichert und nur an {preset.label}
              {resolved.baseUrl ? ` (${resolved.baseUrl})` : ''} übertragen.
              {resolved.models.length > 0 && ` Verwendete Modelle (in dieser Reihenfolge): ${resolved.models.join(', ')}.`}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1" aria-hidden="true" />
              Datenschutz bei KI-Nutzung
            </h3>
            <AiPrivacyNotice compact providerId={providerId} />
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
            <label htmlFor={hintsId} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Sparkles className="w-4 h-4 mr-1 text-[var(--color-vhs-orange)]" aria-hidden="true" />
              Hinweise an den KI-Copilot (optional)
            </label>
            <textarea
              id={hintsId}
              value={copilotHints}
              onChange={(e) => setCopilotHintsValue(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent resize-y"
              placeholder="z. B. „Wir sagen ‚Fachbereichsleitung‘ statt ‚Abteilungsleitung‘. Zahlungen laufen immer über die Kasse.“"
            />
            <p className="text-xs text-gray-500 mt-1">
              Werden bei jeder Copilot-Analyse mitgeschickt, etwa Hausbegriffe oder feste Zuständigkeiten. Keine personenbezogenen Daten eintragen.
            </p>
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
              Diese Anweisungen gelten für „Direkt erzeugen“ (nicht für den KI-Copilot). Änderungen können das Ergebnis stark beeinflussen.
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
