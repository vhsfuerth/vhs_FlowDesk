import React from 'react';
import {
  X, BookOpen, Sparkles, Square, Maximize, ArrowRight,
  Undo2, CheckSquare, Printer, AlertTriangle, Presentation,
  LayoutTemplate, Settings, ClipboardList, FileText, KeyRound
} from 'lucide-react';

const sections = [
  {
    icon: Sparkles,
    title: 'KI-Diagramm-Generierung',
    text: 'Beschreibe deinen Prozess als Freitext in der oberen Leiste. Die KI erstellt daraus automatisch ein Flussdiagramm mit passenden Elementen und Verbindungen.'
  },
  {
    icon: KeyRound,
    title: 'Google Gemini API-Key einrichten',
    steps: [
      'Gehe zu aistudio.google.com und melde dich mit einem Google-Konto an.',
      'Klicke oben links auf „API-Key erstellen" und wähle „In neuem Projekt erstellen".',
      'Kopiere den generierten Key (beginnt mit „AIza…").',
      'Öffne in der App die Einstellungen über das Zahnrad-Symbol im Header.',
      'Füge den Key in das Feld „Gemini API-Key" ein und klicke „Speichern".',
    ],
    note: 'Der kostenlose Free-Tier von Google AI Studio reicht für den normalen Alltagseinsatz aus. Der Key wird nur lokal in deinem Browser gespeichert.'
  },
  {
    icon: Square,
    title: 'Elemente verwalten',
    text: 'Ziehe Elemente aus der Seitenleiste auf die Arbeitsfläche. Wähle ein Element aus, um es zu verschieben oder drücke Entf / Backspace zum Löschen.'
  },
  {
    icon: Maximize,
    title: 'Ansicht & Zoom',
    text: 'Verschiebe die Ansicht per Klick und Ziehen auf den Hintergrund. Nutze Strg + Mausrad oder die Zoom-Buttons unten. Strg + 0 setzt den Zoom zurück.'
  },
  {
    icon: ArrowRight,
    title: 'Verbindungen erstellen',
    text: 'Fahre mit der Maus über ein Element, um die Verbindungspunkte (Ports) anzuzeigen. Klicke auf einen Port und ziehe die Verbindung zum Zielelement.'
  },
  {
    icon: Undo2,
    title: 'Rückgängig / Wiederholen',
    text: 'Mache Änderungen mit Strg+Z rückgängig oder stelle sie mit Strg+Y wieder her. Die Buttons dafür findest du auch in der unteren Leiste.'
  },
  {
    icon: CheckSquare,
    title: 'Speichern & Laden',
    text: 'Diagramme werden lokal im Browser gespeichert. Klicke auf „Speichern" in der unteren Leiste. Über „Öffnen" lädst du gespeicherte Diagramme.'
  },
  {
    icon: Printer,
    title: 'Export',
    text: 'Exportiere dein Diagramm als PNG, SVG, PDF oder JSON über die Buttons in der unteren Leiste. Den vollständigen Qualitätsbericht kannst du direkt im Prozess-Check als PDF herunterladen.'
  },
  {
    icon: AlertTriangle,
    title: 'Automatische Prüfung',
    text: 'Die rechte Sidebar prüft dein Diagramm automatisch auf Strukturfehler: fehlender Start- oder Endknoten, nicht verbundene Elemente, unbeschriftete Entscheidungsausgänge und mehr. Klicke auf einen Befund, um den betroffenen Knoten direkt anzuspringen.'
  },
  {
    icon: ClipboardList,
    title: 'Prozess-Check (Selbstbewertung)',
    text: 'Der geführte Wizard bewertet deinen Prozess in 5 Schritten: Klarheit, Medienbruch, Risiko, Teilnehmendenorientierung und Verantwortlichkeit. Pro Schritt gibt es eine Leitfrage, vier Score-Buttons (0–3) und ein Notizfeld. Schritt 6 zeigt die Zusammenfassung mit Hotspot-Markierung. Über „Alle auf einmal" wechselst du zur kompakten Ansicht.'
  },
  {
    icon: FileText,
    title: 'PDF-Qualitätsbericht',
    text: 'Im Prozess-Check kannst du einen professionellen Qualitätsbericht als PDF exportieren. Seite 1 enthält Deckblatt, Status, Durchschnittswert und das Flowchart. Seite 2 listet alle Befunde, Selbstbewertungs-Scores mit Notizen und die erfassten Maßnahmen im vhs-Layout.'
  },
  {
    icon: Presentation,
    title: 'Workshop-Modus',
    text: 'Gehe Schritt für Schritt durch das Diagramm und sammle Diskussionspunkte direkt an den einzelnen Prozessschritten. Ideal für Team-Workshops.'
  },
  {
    icon: LayoutTemplate,
    title: 'Vorlagen',
    text: 'Starte schneller mit vorgefertigten Templates für häufige vhs-Prozesse wie Kursplanung, Anmeldung oder Dozentenverwaltung.'
  },
  {
    icon: Settings,
    title: 'Einstellungen',
    text: 'Konfiguriere deinen Gemini-API-Key und passe den KI-Prompt an deine Bedürfnisse an. Die Einstellungen findest du über das Zahnrad-Symbol im Header.'
  }
];

const GuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold flex items-center text-[var(--color-vhs-blau)]">
              <BookOpen className="w-5 h-5 mr-2" />
              Anleitung
            </h2>
            <p className="text-sm text-gray-500 mt-1">So funktioniert der vhs Workflow Editor.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="border border-[var(--color-vhs-blau-20)] rounded-xl p-4 bg-white"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-[var(--color-vhs-blau-10)]">
                      <Icon className="w-5 h-5 text-[var(--color-vhs-blau)]" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--color-vhs-blau)]">{section.title}</h3>
                  </div>
                  {section.text && (
                    <p className="text-sm text-gray-600 leading-relaxed">{section.text}</p>
                  )}
                  {section.steps && (
                    <ol className="text-sm text-gray-600 leading-relaxed mt-1 space-y-1 list-decimal list-inside">
                      {section.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}
                  {section.note && (
                    <p className="text-xs text-gray-400 mt-2 italic">{section.note}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
