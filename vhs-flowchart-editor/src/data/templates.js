export const STARTER_TEMPLATES = [
  {
    id: 'course-planning',
    name: 'Kursplanung',
    description: 'Von der Idee bis zur Freigabe eines neuen Angebots.',
    category: 'Programm',
    diagram: {
      nodes: [
        { id: 'n1', type: 'start', label: 'Idee entsteht', position: { x: 120, y: 60 }, size: { width: 150, height: 70 } },
        { id: 'n2', type: 'process', label: 'Bedarf und Zielgruppe prüfen', position: { x: 100, y: 180 }, size: { width: 190, height: 60 } },
        { id: 'n3', type: 'decision', label: 'Passt ins Programm?', position: { x: 95, y: 300 }, size: { width: 200, height: 110 } },
        { id: 'n4', type: 'process', label: 'Dozierende und Termin klären', position: { x: 25, y: 455 }, size: { width: 210, height: 60 } },
        { id: 'n5', type: 'process', label: 'Angebot im System anlegen', position: { x: 25, y: 575 }, size: { width: 210, height: 60 } },
        { id: 'n6', type: 'end', label: 'Veröffentlichung freigegeben', position: { x: 45, y: 695 }, size: { width: 190, height: 70 } },
        { id: 'n7', type: 'process', label: 'Idee überarbeiten oder verwerfen', position: { x: 335, y: 455 }, size: { width: 230, height: 60 } },
        { id: 'n8', type: 'annotation', label: 'Prüfkriterien: Nachfrage, Ressourcen, Strategie', position: { x: 330, y: 190 }, size: { width: 250, height: 90 } }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '' },
        { from: 'n2', to: 'n3', label: '' },
        { from: 'n3', to: 'n4', label: 'Ja' },
        { from: 'n3', to: 'n7', label: 'Nein' },
        { from: 'n4', to: 'n5', label: '' },
        { from: 'n5', to: 'n6', label: '' }
      ]
    }
  },
  {
    id: 'lecturer-onboarding',
    name: 'Dozierenden-Onboarding',
    description: 'Standardprozess für neue Kursleitende.',
    category: 'Personal',
    diagram: {
      nodes: [
        { id: 'n1', type: 'start', label: 'Neue Kursleitung gefunden', position: { x: 120, y: 60 }, size: { width: 190, height: 70 } },
        { id: 'n2', type: 'process', label: 'Unterlagen anfordern', position: { x: 120, y: 180 }, size: { width: 180, height: 60 } },
        { id: 'n3', type: 'decision', label: 'Unterlagen vollständig?', position: { x: 110, y: 300 }, size: { width: 200, height: 110 } },
        { id: 'n4', type: 'process', label: 'Zugang, Räume und Abläufe erklären', position: { x: 40, y: 455 }, size: { width: 240, height: 60 } },
        { id: 'n5', type: 'process', label: 'Erste Durchführung begleiten', position: { x: 40, y: 575 }, size: { width: 220, height: 60 } },
        { id: 'n6', type: 'end', label: 'Onboarding abgeschlossen', position: { x: 55, y: 695 }, size: { width: 210, height: 70 } },
        { id: 'n7', type: 'process', label: 'Nachforderung senden', position: { x: 360, y: 455 }, size: { width: 170, height: 60 } }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '' },
        { from: 'n2', to: 'n3', label: '' },
        { from: 'n3', to: 'n4', label: 'Ja' },
        { from: 'n3', to: 'n7', label: 'Nein' },
        { from: 'n4', to: 'n5', label: '' },
        { from: 'n5', to: 'n6', label: '' },
        { from: 'n7', to: 'n2', label: 'erneut' }
      ]
    }
  },
  {
    id: 'complaints',
    name: 'Beschwerdebearbeitung',
    description: 'Einfacher Ablauf für Rückmeldungen und Beschwerden.',
    category: 'Service',
    diagram: {
      nodes: [
        { id: 'n1', type: 'start', label: 'Beschwerde geht ein', position: { x: 140, y: 60 }, size: { width: 180, height: 70 } },
        { id: 'n2', type: 'process', label: 'Sachverhalt dokumentieren', position: { x: 125, y: 180 }, size: { width: 210, height: 60 } },
        { id: 'n3', type: 'decision', label: 'Sofort lösbar?', position: { x: 130, y: 300 }, size: { width: 190, height: 110 } },
        { id: 'n4', type: 'process', label: 'Lösung kommunizieren', position: { x: 60, y: 455 }, size: { width: 180, height: 60 } },
        { id: 'n5', type: 'process', label: 'An Fachbereich eskalieren', position: { x: 330, y: 455 }, size: { width: 190, height: 60 } },
        { id: 'n6', type: 'process', label: 'Rückmeldung vereinbaren', position: { x: 330, y: 575 }, size: { width: 190, height: 60 } },
        { id: 'n7', type: 'end', label: 'Fall abgeschlossen', position: { x: 175, y: 715 }, size: { width: 170, height: 70 } }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '' },
        { from: 'n2', to: 'n3', label: '' },
        { from: 'n3', to: 'n4', label: 'Ja' },
        { from: 'n3', to: 'n5', label: 'Nein' },
        { from: 'n4', to: 'n7', label: '' },
        { from: 'n5', to: 'n6', label: '' },
        { from: 'n6', to: 'n7', label: '' }
      ]
    }
  },
  {
    id: 'room-booking',
    name: 'Raumbuchung',
    description: 'Standardablauf für interne Raumabstimmung.',
    category: 'Verwaltung',
    diagram: {
      nodes: [
        { id: 'n1', type: 'start', label: 'Raumanfrage liegt vor', position: { x: 120, y: 60 }, size: { width: 190, height: 70 } },
        { id: 'n2', type: 'process', label: 'Termin und Anforderungen prüfen', position: { x: 100, y: 180 }, size: { width: 230, height: 60 } },
        { id: 'n3', type: 'decision', label: 'Raum verfügbar?', position: { x: 120, y: 300 }, size: { width: 190, height: 110 } },
        { id: 'n4', type: 'process', label: 'Raum reservieren und bestätigen', position: { x: 45, y: 455 }, size: { width: 240, height: 60 } },
        { id: 'n5', type: 'end', label: 'Buchung abgeschlossen', position: { x: 70, y: 575 }, size: { width: 200, height: 70 } },
        { id: 'n6', type: 'process', label: 'Alternative anbieten', position: { x: 350, y: 455 }, size: { width: 180, height: 60 } }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '' },
        { from: 'n2', to: 'n3', label: '' },
        { from: 'n3', to: 'n4', label: 'Ja' },
        { from: 'n3', to: 'n6', label: 'Nein' },
        { from: 'n4', to: 'n5', label: '' }
      ]
    }
  },
  {
    id: 'swimlane-anmeldung',
    name: 'Kursanmeldung (Swimlane)',
    description: 'Anmeldeprozess mit klarer Zuordnung: Interessierte und Service-Team.',
    category: 'Programm',
    diagram: {
      nodes: [
        { id: 'l1', type: 'lane', label: 'Interessierte', position: { x: 40, y: 40 }, size: { width: 1200, height: 150 }, laneColor: { header: '#1a8070', body: '#e8f5f3' } },
        { id: 'l2', type: 'lane', label: 'Service-Team', position: { x: 40, y: 200 }, size: { width: 1200, height: 165 }, laneColor: { header: '#4ba02d', body: '#f0f7eb' } },
        { id: 's1', type: 'start',    label: 'Kursangebot entdeckt',         position: { x: 80,  y: 95  }, size: { width: 180, height: 70  } },
        { id: 'n1', type: 'process',  label: 'Anmeldeformular ausfüllen',     position: { x: 330, y: 100 }, size: { width: 210, height: 60  } },
        { id: 'n2', type: 'process',  label: 'Anmeldung entgegennehmen',      position: { x: 600, y: 270 }, size: { width: 210, height: 60  } },
        { id: 'n3', type: 'decision', label: 'Kursplatz frei?',               position: { x: 840, y: 247 }, size: { width: 185, height: 110 } },
        { id: 'n4', type: 'process',  label: 'Bestätigung versenden',          position: { x: 840, y: 100 }, size: { width: 190, height: 60  } },
        { id: 'e1', type: 'end',      label: 'Erfolgreich angemeldet',         position: { x: 1055, y: 95 }, size: { width: 170, height: 70  } },
        { id: 'e2', type: 'end',      label: 'Wartelistenangebot erhalten',    position: { x: 1055, y: 260 }, size: { width: 180, height: 70 } }
      ],
      edges: [
        { from: 's1', to: 'n1', label: '' },
        { from: 'n1', to: 'n2', label: '' },
        { from: 'n2', to: 'n3', label: '' },
        { from: 'n3', to: 'n4', label: 'Ja' },
        { from: 'n3', to: 'e2', label: 'Nein' },
        { from: 'n4', to: 'e1', label: '' }
      ]
    }
  },
  {
    id: 'swimlane-kursentwicklung',
    name: 'Kursentwicklung (Swimlane)',
    description: 'Entwicklung und Durchführung eines Kurses – Verantwortlichkeiten von Programmplanung, Kursleitung und Marketing.',
    category: 'Programm',
    diagram: {
      nodes: [
        { id: 'l1', type: 'lane', label: 'Programmplanung', position: { x: 40, y: 40  }, size: { width: 1380, height: 140 }, laneColor: { header: '#00285a', body: '#EEF4F7' } },
        { id: 'l2', type: 'lane', label: 'Kursleitung',     position: { x: 40, y: 190 }, size: { width: 1380, height: 140 }, laneColor: { header: '#eb640f', body: '#fef3ea' } },
        { id: 'l3', type: 'lane', label: 'Marketing',       position: { x: 40, y: 340 }, size: { width: 1380, height: 140 }, laneColor: { header: '#8c0a23', body: '#fdeef0' } },
        { id: 's1', type: 'start',   label: 'Kursbedarf erkannt',                  position: { x: 80,   y: 90  }, size: { width: 175, height: 70 } },
        { id: 'n1', type: 'process', label: 'Konzept und Lernziele definieren',     position: { x: 320,  y: 95  }, size: { width: 215, height: 60 } },
        { id: 'n2', type: 'process', label: 'Inhalte und Materialien ausarbeiten',  position: { x: 600,  y: 240 }, size: { width: 225, height: 60 } },
        { id: 'n3', type: 'process', label: 'Kurs ausschreiben und bewerben',       position: { x: 850,  y: 388 }, size: { width: 225, height: 60 } },
        { id: 'n4', type: 'process', label: 'Kurs durchführen und begleiten',       position: { x: 1105, y: 240 }, size: { width: 220, height: 60 } },
        { id: 'e1', type: 'end',     label: 'Kurs ausgewertet',                     position: { x: 1105, y: 90  }, size: { width: 175, height: 70 } }
      ],
      edges: [
        { from: 's1', to: 'n1', label: '' },
        { from: 'n1', to: 'n2', label: '' },
        { from: 'n2', to: 'n3', label: '' },
        { from: 'n3', to: 'n4', label: '' },
        { from: 'n4', to: 'e1', label: '' }
      ]
    }
  },
  {
    id: 'cooperation-request',
    name: 'Kooperationsanfrage',
    description: 'Von der Anfrage bis zur Entscheidung über eine Kooperation.',
    category: 'Strategie',
    diagram: {
      nodes: [
        { id: 'n1', type: 'start', label: 'Anfrage eingehen lassen', position: { x: 120, y: 60 }, size: { width: 190, height: 70 } },
        { id: 'n2', type: 'process', label: 'Ziele und Ressourcen prüfen', position: { x: 115, y: 180 }, size: { width: 200, height: 60 } },
        { id: 'n3', type: 'decision', label: 'Strategisch passend?', position: { x: 110, y: 300 }, size: { width: 210, height: 110 } },
        { id: 'n4', type: 'process', label: 'Rahmenbedingungen abstimmen', position: { x: 45, y: 455 }, size: { width: 220, height: 60 } },
        { id: 'n5', type: 'process', label: 'Vereinbarung dokumentieren', position: { x: 45, y: 575 }, size: { width: 220, height: 60 } },
        { id: 'n6', type: 'end', label: 'Kooperation gestartet', position: { x: 60, y: 695 }, size: { width: 200, height: 70 } },
        { id: 'n7', type: 'process', label: 'Absage begründen', position: { x: 355, y: 455 }, size: { width: 170, height: 60 } },
        { id: 'n8', type: 'end', label: 'Kooperation abgelehnt', position: { x: 345, y: 575 }, size: { width: 190, height: 70 } }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '' },
        { from: 'n2', to: 'n3', label: '' },
        { from: 'n3', to: 'n4', label: 'Ja' },
        { from: 'n3', to: 'n7', label: 'Nein' },
        { from: 'n4', to: 'n5', label: '' },
        { from: 'n5', to: 'n6', label: '' },
        { from: 'n7', to: 'n8', label: '' }
      ]
    }
  }
];
