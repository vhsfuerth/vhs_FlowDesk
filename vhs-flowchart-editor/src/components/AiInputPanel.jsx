import React, { useState } from 'react';
import { generateFlowchartFromText } from '../ai/openai-client';
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
       let errorMsg = "Beim Verbinden mit OpenAI ist ein Fehler aufgetreten.";
       if (error.message === 'API_KEY_INVALID') errorMsg = "Der API-Key ist ungültig.";
       if (error.message === 'RATE_LIMIT') errorMsg = "Anfragelimit bei OpenAI erreicht.";
       if (error.message === 'INVALID_JSON_RESPONSE') errorMsg = "Die KI-Antwort konnte nicht interpretiert werden.";

       onError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white border-b border-[var(--color-vhs-blau-20)] p-4 shadow-sm flex flex-col md:flex-row md:items-start gap-4">
      <div className="flex-grow">
        <label htmlFor="ai-input" className="block text-sm font-bold text-[var(--color-vhs-blau)] mb-1">
          Prozessbeschreibung für KI-Generierung
        </label>
        <textarea
          id="ai-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Beispiel: "Der Kunde stellt eine Anfrage. Wenn die Anfrage vollständig ist, wird sie bearbeitet. Sonst wird eine Rückfrage gestellt."'
          className="w-full text-sm p-3 border border-[var(--color-vhs-blau-40)] rounded-md focus:ring-2 focus:ring-[var(--color-vhs-orange-hell)] focus:border-transparent min-h-[80px] resize-y"
          disabled={isGenerating}
        />
      </div>
      <div className="flex items-end h-full pt-6 md:pt-0 shrink-0 self-end md:self-stretch">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || text.trim().length < 10}
          className="h-full bg-[var(--color-vhs-blau)] text-white px-6 py-3 rounded-md font-bold hover:bg-[var(--color-vhs-blau-80)] transition-colors flex items-center justify-center min-w-[180px] disabled:bg-[var(--color-vhs-blau-40)] disabled:cursor-not-allowed group"
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
