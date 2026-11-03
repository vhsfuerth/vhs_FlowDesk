import React from 'react';

// Datenschutzhinweis zur KI-Funktion. Bei inhaltlichen Änderungen
// AI_PRIVACY_NOTICE_VERSION in storage/settings.js erhöhen.
const AiPrivacyNotice = ({ compact = false }) => (
  <div className={`space-y-2 whitespace-normal ${compact ? 'text-xs text-gray-600' : 'text-sm text-gray-700'}`}>
    <p>
      Bei Nutzung der KI-Funktionen wird Ihre Prozessbeschreibung bzw. das aktuelle Diagramm
      (inkl. Bewertungen) an die <strong>Google Gemini API</strong> übertragen. Beim KI-Copilot sind das
      zusätzlich Ihre Antworten auf Rückfragen und die Hinweise aus den Einstellungen. Alle übrigen Daten
      bleiben lokal in diesem Browser.
    </p>
    <p>
      Im <strong>kostenlosen Kontingent</strong> von Google AI Studio darf Google Eingaben und Antworten
      zur Verbesserung seiner Dienste verwenden; dabei können auch Menschen Inhalte einsehen.
    </p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Keine personenbezogenen Daten eingeben (z.&nbsp;B. Namen von Teilnehmenden oder Mitarbeitenden, Kontaktdaten).</li>
      <li>Keine vertraulichen internen Informationen eingeben.</li>
      <li>Für vertrauliche Inhalte ein kostenpflichtiges Kontingent nutzen und vorher mit der bzw. dem Datenschutzbeauftragten abstimmen.</li>
    </ul>
  </div>
);

export default AiPrivacyNotice;
