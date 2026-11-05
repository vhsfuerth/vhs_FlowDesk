import React, { useId, useMemo, useState } from 'react';
import {
  X, BookOpen, Sparkles, Square, Maximize, ArrowRight,
  Undo2, CheckSquare, Printer, AlertTriangle,
  LayoutTemplate, Settings, ClipboardList, FileText, KeyRound, Rows3, Clock,
  ShieldCheck, Keyboard, HardDriveDownload, LayoutGrid, GitCompare, PanelRight, Search
} from 'lucide-react';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { matchesQuery, splitMatches } from '../utils/text-search';

const SHORTCUTS = [
  ['Strg + S', 'Speichern'],
  ['Strg + Z', 'Rückgängig'],
  ['Strg + Y / Strg + Umschalt + Z', 'Wiederholen'],
  ['Entf / Rücktaste', 'Auswahl löschen'],
  ['Strg + Klick / Umschalt + Klick', 'Element zur Auswahl hinzufügen oder entfernen'],
  ['Umschalt + Ziehen (freie Fläche)', 'Mehrere Elemente mit einem Rahmen auswählen'],
  ['Strg + A', 'Alle Elemente auswählen'],
  ['Strg + C / Strg + V', 'Auswahl kopieren / einfügen (auch in ein anderes Diagramm)'],
  ['Strg + D', 'Auswahl duplizieren'],
  ['Pfeiltasten', 'Auswahl verschieben (mit Umschalt: in kleinen Schritten)'],
  ['Strg + Mausrad', 'Zoom'],
  ['Strg + + / Strg + -', 'Zoom rein / raus'],
  ['Strg + 0', 'Zoom zurücksetzen'],
  ['Doppelklick / F2 / Enter', 'Text direkt auf der Fläche bearbeiten (Enter übernimmt, Esc bricht ab)'],
  ['Lostippen (Element ausgewählt)', 'Text des Elements ersetzen'],
  ['Rechtsklick auf ein Element', 'Eigenschaften ein- bzw. ausblenden'],
  ['Alt beim Ziehen', 'Hilfslinien und Einrasten abschalten'],
  ['Esc', 'Dialog schließen bzw. Auswahl aufheben'],
  ['Tab / Umschalt + Tab', 'Zwischen Bedienelementen wechseln']
];

const sections = [
  {
    icon: Sparkles,
    title: 'KI-Copilot: Diagramm aus einer Beschreibung',
    text: 'Beschreibe deinen Prozess in der oberen Leiste und klicke „Mit KI-Copilot erstellen“. Der Copilot führt dich in drei Schritten zum Diagramm:',
    steps: [
      'Beschreiben: Ablauf in eigenen Worten oder Stichpunkten, dazu die Formulierung wählen (kompakt, fachlich präzise, bürgernah oder für Schulungen).',
      'Rückfragen: Bei Lücken stellt die KI gezielte Fragen. Du kannst sie beantworten oder überspringen – dann trifft die KI eine Annahme.',
      'Prüfen: Liste der erkannten Schritte mit Vorschau. Texte, Zuständigkeiten und Ausgänge lassen sich korrigieren, Schritte entfernen. Zuständigkeiten werden auf Wunsch als Swimlanes dargestellt.',
      '„Diagramm übernehmen“ öffnet das Ergebnis als neues, noch ungespeichertes Diagramm.'
    ],
    note: '„Direkt erzeugen“ erstellt wie bisher ohne Rückfragen und Vorschau sofort ein Diagramm. Hausbegriffe oder feste Zuständigkeiten kannst du in den Einstellungen unter „Hinweise an den KI-Copilot“ hinterlegen.'
  },
  {
    icon: KeyRound,
    title: 'KI-Anbieter und API-Key einrichten',
    steps: [
      'Öffne die Einstellungen über das Zahnrad-Symbol im Header und wähle unter „KI-Anbieter“ Google Gemini, OpenAI, Mistral AI, Anthropic Claude oder einen eigenen Server.',
      'Erstelle beim Anbieter einen API-Key (der passende Link steht unter dem Key-Feld), z. B. bei Google über aistudio.google.com → „API-Key erstellen“.',
      'Füge den Key ein. Beim eigenen Server (z. B. einem Angebot eures Trägers oder einem lokalen Ollama) zusätzlich Server-Adresse und Modellnamen eintragen.',
      'Mit „Status prüfen“ testest du die Verbindung, dann „Speichern“.'
    ],
    note: 'Der kostenlose Free-Tier von Google AI Studio reicht für den Alltag aus. Datenschutzfreundlicher sind Anbieter mit Verarbeitung in der EU oder selbst betriebene Modelle. Getestet ist bisher nur Google Gemini; Fehler mit anderen Anbietern bitte per Bugreport beim Autor melden. Der Key wird nur lokal in deinem Browser gespeichert.'
  },
  {
    icon: ShieldCheck,
    title: 'Datenschutz bei KI-Nutzung',
    text: 'Für die KI-Funktionen werden Prozessbeschreibung bzw. Diagramm an den gewählten KI-Anbieter übertragen. Manche Anbieter (z. B. Google im kostenlosen Kontingent) dürfen diese Inhalte zur Verbesserung ihrer Dienste nutzen. Gib deshalb keine personenbezogenen Daten (z. B. Namen von Teilnehmenden) und keine vertraulichen Informationen ein.',
    note: 'Vor der ersten KI-Nutzung erscheint ein Hinweis, den du bestätigen musst. Die Bestätigung kannst du in den Einstellungen zurücknehmen.'
  },
  {
    icon: Square,
    title: 'Elemente verwalten',
    text: 'Ziehe Elemente aus der Seitenleiste auf die Arbeitsfläche oder klicke sie an – dann erscheinen sie in der Mitte der Ansicht. Mit Strg + Klick oder einem Rahmen (Umschalt + Ziehen auf freier Fläche) wählst du mehrere Elemente aus und verschiebst, kopierst oder löschst sie gemeinsam.'
  },
  {
    icon: LayoutGrid,
    title: 'Anordnen & Ausrichten',
    text: 'Über „Anordnen" in der unteren Leiste räumst du das ganze Diagramm automatisch auf – von oben nach unten oder von links nach rechts. Bei Swimlanes bleibt jeder Schritt in seiner Lane, die Lanes werden passend vergrößert. Für mehrere ausgewählte Elemente gibt es dort außerdem Ausrichten und gleichmäßiges Verteilen.',
    note: 'Alle Aktionen lassen sich mit Strg + Z rückgängig machen.'
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
    text: 'Diagramme werden lokal im Browser gespeichert. Klicke auf „Speichern" in der unteren Leiste oder drücke Strg + S. Über „Öffnen" lädst du gespeicherte Diagramme.',
    note: 'Ungespeicherte Änderungen werden automatisch als Entwurf gesichert. Nach einem Absturz oder Neuladen bietet die App an, den Entwurf wiederherzustellen. Der Status steht neben dem Speichern-Button.'
  },
  {
    icon: HardDriveDownload,
    title: 'Import & Backup',
    text: 'Im Dialog „Öffnen" kannst du Projektdateien (.json) importieren und mit „Backup erstellen" alle Diagramme samt Versionen in eine Datei sichern. Über „Importieren" spielst du ein Backup wieder ein.',
    note: 'Wichtig: Werden die Browserdaten gelöscht, sind auch alle Diagramme weg. Erstelle daher regelmäßig ein Backup.'
  },
  {
    icon: Clock,
    title: 'Versionsverlauf',
    text: 'Bei jedem Speichern wird automatisch ein Versions-Snapshot angelegt. Über den Button „Versionen" in der unteren Leiste kannst du frühere Zustände wiederherstellen und zu jeder Version eine Notiz hinterlegen („Was wurde geändert?").'
  },
  {
    icon: GitCompare,
    title: 'Versionen vergleichen',
    steps: [
      'Öffne „Versionen" in der unteren Leiste.',
      'Klicke bei einer Version auf das Vergleichssymbol, um sie mit dem aktuellen Stand zu vergleichen – oder kreuze zwei Versionen an und wähle „Auswahl vergleichen".',
      'Im Diagramm sind Änderungen farbig markiert: grün = neu, gelb = geändert, rot gestrichelt = entfernt. Rechts steht die Liste aller Änderungen.'
    ],
    note: 'Der Vergleich ist rein lesend und verändert nichts.'
  },
  {
    icon: Printer,
    title: 'Export',
    text: 'Exportiere dein Diagramm als PNG, SVG, PDF oder JSON über die Buttons in der unteren Leiste. Den vollständigen Qualitätsbericht kannst du direkt im Prozess-Check als PDF herunterladen.'
  },
  {
    icon: FileText,
    title: 'Prozessbeschreibung (Verfahrensanweisung)',
    text: 'Über „Beschreibung" in der unteren Leiste wird aus dem Diagramm automatisch eine Textfassung als Word-Dokument oder Markdown erstellt: nummerierte Schritte in Ablaufreihenfolge, Entscheidungen mit ihren Zweigen („Wenn Ja … / Wenn Nein …"), Zuständigkeiten aus den Swimlanes und angebundene Kommentare als Hinweise.',
    note: 'Ideal für Handbuch, Einarbeitung oder Intranet. Das Word-Dokument enthält zusätzlich ein Bild des Diagramms.'
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
    icon: PanelRight,
    title: 'Elemente bearbeiten',
    steps: [
      'Ein ausgewähltes Element zeigt rechts die Eigenschaften-Leiste: Text, Erläuterung, Zuständigkeit, Dokument/Formular, IT-System und Dauer/Frist. Diese Angaben erscheinen in der Prozessbeschreibung.',
      'Die „+“-Griffe rechts und unten am ausgewählten Element hängen direkt einen verbundenen Prozessschritt an. Der kleine Pfeil daneben bietet weitere Typen an. Bei Entscheidungen wird der erste Ausgang „Ja“, der zweite „Nein“.',
      'Weitere Elementtypen: Dokument/Formular, IT-System, Warten/Frist und Teilprozess. Ein Teilprozess wird in der Eigenschaften-Leiste mit einem gespeicherten Diagramm verknüpft. Das Symbol im Element zeigt ihn hier an oder wechselt zu ihm.',
      'Verbindungen: Auf der Linie ziehen setzt Knickpunkte (Doppelklick auf einen Knickpunkt entfernt ihn). Beschriftungen lassen sich entlang der Linie verschieben. Zum Umhängen die Verbindung anklicken und ihr Ende auf ein anderes Element ziehen.',
      'Beim Verschieben zeigen orange Hilfslinien, wann ein Element mit Kante oder Mitte eines anderen fluchtet; es rastet dort ein.',
      'Beim Löschen eines Schritts mitten im Ablauf fragt der Editor, ob Vorgänger und Nachfolger direkt verbunden werden sollen.',
      'Unter der Arbeitsfläche zeigt „Ablauf als Text“ das Diagramm als nummerierte Liste – auch für Screenreader.'
    ],
    note: 'Über das X blendest du die Eigenschaften-Leiste aus, über „Eigenschaften“ oder einen Rechtsklick auf das Element wieder ein.'
  },
  {
    icon: Rows3,
    title: 'Swimlanes (Verantwortungsbereiche)',
    steps: [
      'Ziehe „Swimlane" aus der Elementleiste auf die Arbeitsfläche.',
      'In der Eigenschaften-Leiste legst du Bezeichnung und Farbe fest und sortierst Lanes nach oben oder unten.',
      'Elemente, die du in einer Lane ablegst, gehören zu ihr: Sie wandern mit, wenn du die Lane verschiebst, und die Lane wächst mit ihrem Inhalt.',
      'Der Griff (▪) unten rechts an einer ausgewählten Lane ändert Breite und Höhe – kleiner als ihr Inhalt geht nicht.',
      'Beim Löschen einer Lane bleiben ihre Elemente erhalten.',
      'Verbindungen, die eine Lanegrenze kreuzen, zeigen Übergaben und Schnittstellen zwischen Rollen.',
    ],
    note: 'Swimlanes werden beim Export wie alle anderen Elemente dargestellt. Fertige Swimlane-Vorlagen findest du unter „Vorlagen".'
  },
  {
    icon: LayoutTemplate,
    title: 'Vorlagen',
    text: 'Starte schneller mit vorgefertigten Templates für häufige vhs-Prozesse wie Kursplanung, Anmeldung oder Dozentenverwaltung. Mehrere Vorlagen zeigen Swimlanes; „Rechnungseingang“ und „Kursanmeldung mit Warteliste“ zeigen außerdem Dokumente, IT-Systeme, Fristen und Teilprozesse samt Erläuterungen.'
  },
  {
    icon: Settings,
    title: 'Einstellungen',
    text: 'Wähle deinen KI-Anbieter, hinterlege den API-Key und passe den KI-Prompt an deine Bedürfnisse an. Die Einstellungen findest du über das Zahnrad-Symbol im Header.'
  }
];

// Hebt die Suchbegriffe in einem Text hervor
const Highlight = ({ text, query }) => splitMatches(text, query).map((part, i) => (part.match
  ? <mark key={i} className="bg-[var(--color-vhs-gelb)]/40 text-inherit rounded-sm">{part.text}</mark>
  : <React.Fragment key={i}>{part.text}</React.Fragment>));

const sectionTexts = (section) => [section.title, section.text, section.note, ...(section.steps || [])];

// Wird nur gerendert, solange der Dialog offen ist
const GuideModal = ({ onClose }) => {
  const dialogRef = useDialogA11y(true, onClose);
  const titleId = useId();
  const searchId = useId();
  const [query, setQuery] = useState('');

  const visibleSections = useMemo(() => sections.filter((section) => matchesQuery(sectionTexts(section), query)), [query]);
  const visibleShortcuts = useMemo(
    () => (matchesQuery(['Tastenkürzel'], query) ? SHORTCUTS : SHORTCUTS.filter((row) => matchesQuery(row, query))),
    [query]
  );
  const resultCount = visibleSections.length + (visibleShortcuts.length ? 1 : 0);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div>
            <h2 id={titleId} className="text-xl font-bold flex items-center text-[var(--color-vhs-blau)]">
              <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
              Anleitung
            </h2>
            <p className="text-sm text-gray-500 mt-1">So funktioniert der vhs Workflow Editor.</p>
          </div>
          <div role="search" className="ml-auto mr-3 flex items-center gap-2 rounded-md border border-[var(--color-vhs-blau-20)] bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-[var(--color-vhs-orange-hell)]">
            <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
            <label htmlFor={searchId} className="sr-only">Anleitung durchsuchen</label>
            <input
              id={searchId}
              data-autofocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Esc leert zuerst die Suche, erst danach schließt es den Dialog
                if (e.key === 'Escape' && query) {
                  e.stopPropagation();
                  setQuery('');
                }
              }}
              placeholder="Anleitung durchsuchen …"
              className="w-40 sm:w-56 text-sm outline-none"
            />
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-colors" aria-label="Anleitung schließen">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="sr-only" role="status" aria-live="polite">
            {query ? (resultCount ? `${resultCount} ${resultCount === 1 ? 'Abschnitt' : 'Abschnitte'} gefunden` : 'Keine Treffer') : ''}
          </p>
          {query && resultCount === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              Keine Treffer für „{query}“. Versuche einen anderen Begriff, z. B. „Swimlane“, „Teilprozess“ oder „Export“.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="border border-[var(--color-vhs-blau-20)] rounded-xl p-4 bg-white"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-[var(--color-vhs-blau-10)]" aria-hidden="true">
                      <Icon className="w-5 h-5 text-[var(--color-vhs-blau)]" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--color-vhs-blau)]"><Highlight text={section.title} query={query} /></h3>
                  </div>
                  {section.text && (
                    <p className="text-sm text-gray-600 leading-relaxed"><Highlight text={section.text} query={query} /></p>
                  )}
                  {section.steps && (
                    <ol className="text-sm text-gray-600 leading-relaxed mt-1 space-y-1 list-decimal list-inside">
                      {section.steps.map((step, i) => (
                        <li key={i}><Highlight text={step} query={query} /></li>
                      ))}
                    </ol>
                  )}
                  {section.note && (
                    <p className="text-xs text-gray-500 mt-2 italic"><Highlight text={section.note} query={query} /></p>
                  )}
                </div>
              );
            })}
            {visibleShortcuts.length > 0 && (
            <div className="border border-[var(--color-vhs-blau-20)] rounded-xl p-4 bg-white md:col-span-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[var(--color-vhs-blau-10)]" aria-hidden="true">
                  <Keyboard className="w-5 h-5 text-[var(--color-vhs-blau)]" />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-vhs-blau)]">Tastenkürzel</h3>
              </div>
              <table className="w-full text-sm text-gray-600">
                <caption className="sr-only">Tastenkürzel und ihre Funktion</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th scope="col" className="py-1 pr-4 font-bold">Taste</th>
                    <th scope="col" className="py-1 font-bold">Funktion</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleShortcuts.map(([keys, action]) => (
                    <tr key={keys} className="border-t border-gray-100">
                      <td className="py-1 pr-4"><kbd className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5"><Highlight text={keys} query={query} /></kbd></td>
                      <td className="py-1"><Highlight text={action} query={query} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2 italic">
                Hinweis: Das Verbinden von Elementen auf der Arbeitsfläche ist nur mit der Maus möglich.
              </p>
            </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-between items-center">
          <span className="text-xs text-gray-500">vhs Workflow Editor · Version {__APP_VERSION__}</span>
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
