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
