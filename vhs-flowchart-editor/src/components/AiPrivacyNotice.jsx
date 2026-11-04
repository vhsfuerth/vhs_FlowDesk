import React from 'react';
import { getAiProviderSettings } from '../storage/settings';
import { getProviderPreset } from '../ai/providers';

// Datenschutzhinweis zur KI-Funktion. Bei inhaltlichen Änderungen
// AI_PRIVACY_NOTICE_VERSION in storage/settings.js erhöhen.
const AiPrivacyNotice = ({ compact = false, providerId }) => {
  const preset = getProviderPreset(providerId || getAiProviderSettings().providerId);
  return (
    <div className={`space-y-2 whitespace-normal ${compact ? 'text-xs text-gray-600' : 'text-sm text-gray-700'}`}>
      <p>
        Bei Nutzung der KI-Funktionen wird Ihre Prozessbeschreibung bzw. das aktuelle Diagramm
        (inkl. Bewertungen) an den in den Einstellungen gewählten KI-Anbieter übertragen
        (derzeit: <strong>{preset.label}</strong>). Beim KI-Copilot sind das zusätzlich Ihre Antworten
        auf Rückfragen und die Hinweise aus den Einstellungen. Alle übrigen Daten bleiben lokal in diesem Browser.
      </p>
      <p>
        Was der Anbieter mit den Daten tun darf, regeln dessen Nutzungsbedingungen. Beispiel: Im
        <strong> kostenlosen Kontingent</strong> von Google AI Studio darf Google Eingaben und Antworten
        zur Verbesserung seiner Dienste verwenden; dabei können auch Menschen Inhalte einsehen.
        Anbieter mit Verarbeitung in der EU oder ein selbst betriebenes Modell sind datenschutzfreundlicher.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Keine personenbezogenen Daten eingeben (z.&nbsp;B. Namen von Teilnehmenden oder Mitarbeitenden, Kontaktdaten).</li>
        <li>Keine vertraulichen internen Informationen eingeben.</li>
        <li>Für vertrauliche Inhalte einen geeigneten Anbieter bzw. ein kostenpflichtiges Kontingent nutzen und vorher mit der bzw. dem Datenschutzbeauftragten abstimmen.</li>
      </ul>
    </div>
  );
};

export default AiPrivacyNotice;
