import React, { useState } from 'react';
import { generateFlowchartFromText } from '../ai/gemini-client';
import { getApiKey } from '../storage/settings';
import { Sparkles, Loader2 } from 'lucide-react';

const AiInputPanel = ({ onDiagramGenerated, onError }) => {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!text || text.trim().length < 20) {
      onError("Bitte beschreibe den Prozess detaillierter (min. 20 Zeichen).");
      return;
    }

    if (!getApiKey()) {
        onError("API-Key fehlt. Bitte in den Einstellungen hinterlegen.");
        return;
    }

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
       const msg = error.message || '';
       const ERROR_MAP = {
         API_KEY_INVALID: 'Der API-Key ist ungültig oder abgelaufen.',
         API_KEY_MISSING: 'API-Key fehlt. Bitte in den Einstellungen hinterlegen.',
         RATE_LIMIT: 'Anfragelimit bei Google Gemini erreicht. Bitte kurz warten.',
         INVALID_JSON_RESPONSE: 'Die KI-Antwort konnte nicht als Diagramm interpretiert werden.'
       };

       const matchedKey = Object.keys(ERROR_MAP).find((key) => msg.includes(key));
       onError(matchedKey ? ERROR_MAP[matchedKey] : msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white border-b border-[var(--color-vhs-blau-20)] py-1.5 px-4 shadow-sm flex flex-col md:flex-row md:items-center gap-2">
      <div className="flex-grow">
        <label htmlFor="ai-input" className="block text-xs font-bold text-[var(--color-vhs-blau)] mb-0.5">
          KI-Assistent: Prozessbeschreibung eingeben
        </label>
        <textarea
          id="ai-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='z.B. "Ein Antrag geht ein. Bei Erfolg genehmigen..."'
          className="w-full text-sm py-1 px-3 border border-[var(--color-vhs-blau-40)] rounded-md focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent min-h-[40px] max-h-[96px] resize-y"
          disabled={isGenerating}
        />
      </div>
      <div className="flex items-center shrink-0 self-end md:self-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || text.trim().length < 10}
          className="bg-[var(--color-vhs-blau)] text-white px-5 py-1.5 rounded-md font-bold hover:bg-[var(--color-vhs-blau-80)] transition-colors flex items-center justify-center min-w-[150px] disabled:bg-[var(--color-vhs-blau-40)] disabled:cursor-not-allowed group text-sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generiere...
            </>
          ) : (
            <>
               <Sparkles className="w-5 h-5 mr-2 text-[var(--color-vhs-gelb)] group-hover:scale-110 transition-transform" />
               Diagramm generieren
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AiInputPanel;
