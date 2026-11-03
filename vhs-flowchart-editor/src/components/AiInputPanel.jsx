import React, { useState } from 'react';
import { describeAiError, generateFlowchartFromText } from '../ai/gemini-client';
import { getApiKey } from '../storage/settings';
import { useAiConsent } from '../hooks/useAiConsent';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';

const AiInputPanel = ({ onOpenCopilot, onBeforeGenerate, onDiagramGenerated, onError }) => {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const ensureAiConsent = useAiConsent();

  const handleGenerate = async () => {
    if (!text || text.trim().length < 20) {
      onError("Bitte beschreibe den Prozess detaillierter (min. 20 Zeichen).");
      return;
    }

    if (!getApiKey()) {
        onError("API-Key fehlt. Bitte in den Einstellungen hinterlegen.");
        return;
    }

    if (!(await ensureAiConsent())) return;
    if (onBeforeGenerate && !(await onBeforeGenerate())) return;

    setIsGenerating(true);
    try {
      const generatedGraphData = await generateFlowchartFromText(text);
      if (generatedGraphData) {
         onDiagramGenerated(generatedGraphData);
         setText('');
      } else {
        onError("Es konnte kein valides Diagramm generiert werden.");
      }
    } catch (error) {
       console.error(error);
       onError(describeAiError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white border-b border-[var(--color-vhs-blau-20)] shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors text-left"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
        aria-controls="ai-input-panel"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-vhs-orange)]" />
          <span className="text-xs font-bold text-[var(--color-vhs-blau)] uppercase tracking-wider">
            KI-Assistent
          </span>
          {isCollapsed && text.trim() && (
            <span className="text-[10px] text-gray-400 truncate max-w-[200px] font-normal italic">
              - {text.substring(0, 40)}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {!isCollapsed && (
        <div id="ai-input-panel" className="px-4 pb-3 pt-1 flex flex-col md:flex-row md:items-center gap-3 border-t border-gray-50">
          <div className="flex-grow">
            <label htmlFor="ai-input" className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Prozessbeschreibung
            </label>
            <textarea
              id="ai-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='z.B. "Ein Antrag geht ein. Bei Erfolg genehmigen..."'
              className="w-full text-sm py-2 px-3 border border-[var(--color-vhs-blau-20)] rounded-md focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent min-h-[44px] max-h-[120px] resize-y"
              disabled={isGenerating}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2 shrink-0 self-end md:self-center pt-4 md:pt-0">
            <button
              onClick={() => onOpenCopilot?.(text)}
              disabled={isGenerating}
              title="Geführt: Die KI analysiert die Beschreibung, stellt bei Lücken Rückfragen und zeigt das Ergebnis vor der Übernahme."
              className="bg-[var(--color-vhs-blau)] text-white px-5 py-2 rounded-md font-bold hover:bg-[var(--color-vhs-blau-80)] transition-colors flex items-center justify-center min-w-[200px] shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed group text-sm"
            >
              <Sparkles className="w-4 h-4 mr-2 text-[var(--color-vhs-gelb)] group-hover:scale-110 transition-transform" aria-hidden="true" />
              Mit KI-Copilot erstellen
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || text.trim().length < 10}
              title="Ohne Rückfragen und Vorschau direkt ein Diagramm erzeugen"
              className="bg-white text-[var(--color-vhs-blau)] border border-[var(--color-vhs-blau)] px-4 py-2 rounded-md font-medium hover:bg-[var(--color-vhs-blau-10)] transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Generiere...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Direkt erzeugen
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiInputPanel;
