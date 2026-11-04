# Changelog

Alle nennenswerten Änderungen am vhs Workflow-Algorithm Editor. Die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [1.4.1] – 2026-11-04

Interner Umbau der Arbeitsfläche (Punkt 5.1 aus `improvement.md`) und eine Fehlerbehebung.

### Fehlerbehebung

- Der Griff zum Vergrößern und Verkleinern von Swimlanes ist wieder da. Seit 1.4.0 (Arbeitsfläche wächst mit dem Inhalt) wurde er neben der Lane gezeichnet und war meist nicht sichtbar. Bei Zoom ungleich 100 % saß er auch vorher schon falsch.

### Code-Qualität

- `DiagramCanvas.jsx` aufgeteilt (von rund 900 auf rund 470 Zeilen). Die Teile liegen jetzt als eigene, einzeln getestete Module in `src/diagram/`:
  - `paper.js`: Einrichtung der Arbeitsfläche, erlaubte Verbindungen, Anschlusspunkte beim Überfahren
  - `selection.js`: Auswahl per Klick, Strg/Umschalt + Klick, gemeinsames Verschieben, Auswahlrahmen
  - `pan-select.js`: Ansicht verschieben und Rahmenauswahl
  - `lane-resize-tool.js`: Griff zum Ändern der Swimlane-Größe
  - `text-editing.js`: Texte von Elementen, Verbindungen und Swimlanes ändern, Ja/Nein-Vorschläge
  - `viewport.js` (erweitert): Fläche an den Inhalt anpassen, Zoom mit dem Mausrad, Mausposition merken
- Die Suche liegt im Hook `hooks/useDiagramSearch.js`, das Anlegen neuer Elemente (`createNodeAt`) in `diagram/shapes.js`.
- 27 neue Tests für diese Module (`diagram/canvas-parts.test.js`).

## [1.4.0] – 2026-11-04

Bequemer arbeiten auf der Arbeitsfläche (Stufe „Nächstes Release“ aus `improvement.md`).

### Arbeitsfläche

- Die Arbeitsfläche wächst mit dem Inhalt in alle Richtungen, auch nach links und oben. Elemente können nicht mehr außerhalb des erreichbaren Bereichs verschwinden, auch nicht bei starkem Zoom.
- Zoomen mit Strg + Mausrad bzw. Touchpad-Geste erfolgt um die Mausposition und in feineren Stufen; Schaltflächen und Tastenkürzel zoomen um die Bildmitte. Der sichtbare Ausschnitt springt nicht mehr weg.
- „Zentrieren“ zeigt breite Diagramme ab dem linken Rand (Start und Lane-Titel bleiben sichtbar).
- Einfügen (Strg+V) setzt die Kopie mittig an die Mausposition, ist die Maus außerhalb, in die Bildmitte. Mehrfaches Einfügen an derselben Stelle versetzt die Kopien.

### Suche

- Neue Suche im Diagramm mit Strg+F oder über die Lupe in der unteren Leiste. Alle Treffer werden gelb markiert, der aktuelle orange; Enter bzw. Umschalt+Enter springt zum nächsten bzw. vorherigen Treffer, Esc schließt die Suche. Die Markierungen verändern das Diagramm nicht.

### Verbindungen

- Beim Beschriften eines Ausgangs einer Entscheidung bietet der Dialog „Ja“ und „Nein“ als Schnellauswahl an (noch nicht vergebene Antwort zuerst); ein Klick speichert.

### Struktur-Check

- Neue Prüfungen: vom Start aus nicht erreichbare Schritte, Schleifen ohne Weg zu einem Ende, Verbindungen aus einem Ende heraus, doppelt beschriftete Ausgänge einer Entscheidung und Schritte außerhalb aller Swimlanes (wenn Swimlanes verwendet werden).
- Ein Klick auf einen Befund springt zum Element und wählt es aus, sodass es direkt bearbeitet werden kann.

### Technik

- Neue Module `diagram/viewport.js` (Flächengröße, Zoom, Scrollen, Einfügeposition) und `diagram/search.js`, neue Komponente `DiagramSearch.jsx`.

## [1.3.1] – 2026-11-04

Fehlerbehebungen im Editor (Stufe „Sofort“ aus `improvement.md`).

### Behoben

- Markierungen im Struktur-Check und in der Simulation verändern das Diagramm nicht mehr: kein „ungespeicherter“ Stand und keine zusätzlichen Rückgängig-Schritte mehr durch bloßes Anklicken oder Durchspielen.
- „Rückgängig“ ist direkt nach dem Öffnen eines Diagramms nicht mehr fälschlich aktiv.
- Der Struktur-Check nennt den Elementtyp auf Deutsch (z. B. „Prozessschritt“ statt „process“).
- Die Größe von Swimlanes lässt sich auch mit Stift oder Touch ändern.

### Technik

- Neues Modul `diagram/highlight.js` für vorübergehende Hervorhebungen (JointJS-Highlighter statt Modelländerungen).
- Farben des Editors und die Lane-Farbpalette (`LANE_COLORS`) kommen zentral aus `utils/constants.js`.
- Ungenutzte Einstellungen (`getSettings`/`saveSettings`) entfernt.

## [1.3.0] – 2026-11-04

KI-Anbieter frei wählbar.

### KI-Anbindung

- In den Einstellungen lässt sich der KI-Anbieter wählen: Google Gemini, OpenAI, Mistral AI, Anthropic Claude oder ein eigener Server mit OpenAI-kompatibler Schnittstelle (z. B. Angebote des Trägers, deutsche Hoster oder ein lokales Ollama). Damit sind auch Modelle mit Verarbeitung in der EU oder selbst betriebene Modelle möglich. Getestet ist bisher nur Gemini; bei anderen Anbietern zeigen die Einstellungen einen roten Hinweis mit der Bitte um Bugreports.
- Je Anbieter ein eigener API-Key (beim eigenen Server optional); der bisherige Gemini-Key wird automatisch übernommen.
- Modelle sind je Anbieter voreingestellt und in den Einstellungen änderbar; mehrere Modelle (durch Komma getrennt) werden der Reihe nach probiert.
- „Status prüfen“ funktioniert für alle Anbieter; die Diagnose listet die verfügbaren Modelle, ein Klick übernimmt ein Modell.
- Verständliche Meldungen bei Verbindungsproblemen (z. B. wenn ein Server keine Aufrufe aus dem Browser erlaubt) und bei abgelehnten Anfragen.

### Datenschutz

- Der Datenschutzhinweis nennt den gewählten Anbieter und muss einmal neu bestätigt werden – außerdem nach jedem Anbieterwechsel.

### Technik

- Neue Anbieter-Schicht (`providers.js`, `adapters.js`); `gemini-client.js` heißt jetzt `ai-client.js`.
- Das Copilot-Antwortschema wird für OpenAI-kompatible Dienste und Claude in ein JSON-Schema umgewandelt. Lehnt eine Schnittstelle Schema oder Zusatzparameter ab, wird einmal ohne wiederholt; in Codeblöcke verpacktes JSON wird erkannt.
- Content-Security-Policy: Verbindungen zu HTTPS-Adressen und `http://localhost` erlaubt (nötig für frei eintragbare Server).

## [1.2.0] – 2026-11-03

Geführter KI-Copilot statt Einmal-Generierung.

### KI-Copilot

- Neuer Button „Mit KI-Copilot erstellen“: Die KI analysiert die Prozessbeschreibung zuerst, statt sofort ein Diagramm zu zeichnen.
- Rückfragen: Bei Lücken (fehlende Zweige, unklare Zuständigkeit, unklares Ende) stellt die KI bis zu fünf gezielte Fragen mit Antwortvorschlägen. Fragen können übersprungen werden; die KI nennt dann ihre Annahmen.
- Formulierungsvarianten: kompakt, fachlich präzise, bürgernah sowie Schulung & Dokumentation (mit kurzen Erläuterungen je Schritt).
- Prüfansicht „So habe ich den Prozess verstanden“: nummerierte Schritte mit Zuständigkeit, Entscheidungen mit ihren Zweigen, unsichere Schritte markiert, automatische Korrekturen und Annahmen ausgewiesen – daneben eine Live-Vorschau des Diagramms.
- Korrekturen vor der Übernahme: Beschriftungen, Zuständigkeiten und Ausgänge ändern, Schritte entfernen (der Ablauf bleibt dabei zusammenhängend).
- Zuständigkeiten werden auf Wunsch als Swimlanes dargestellt (automatisch an, sobald mindestens zwei Rollen erkannt werden); Hinweise der KI optional als Kommentare am Rand.
- Das Ergebnis öffnet als neues, noch ungespeichertes Diagramm, benannt nach dem erkannten Prozess.
- Laufende Anfragen lassen sich abbrechen; Fehler werden im Dialog angezeigt, die Eingaben bleiben erhalten.
- Neue Einstellung „Hinweise an den KI-Copilot“ (z. B. Hausbegriffe, feste Zuständigkeiten).
- „Direkt erzeugen“ bleibt für die schnelle Erzeugung ohne Rückfragen erhalten.

### Technik

- Die KI liefert ein Prozessmodell statt eines Diagramms; Start, Ende, Entscheidungszweige, Swimlanes und Layout erzeugt die App selbst. Gemini erhält dafür ein festes Antwortschema; lehnt ein Modell das Schema ab, wird ohne Schema wiederholt.
- Entscheidungen zuverlässiger: Im Antwortschema muss die KI für jeden Schritt ausdrücklich die Übergänge angeben (Pflichtfeld, feste Feldreihenfolge); der Prompt enthält ein vollständiges Beispiel mit Nein-Zweig und Rücksprung sowie Regeln zum Erkennen von Entscheidungen („wenn“, „falls“, „ob“, „sonst“).
- Fehlerhafte KI-Antworten werden tolerant repariert (unbekannte Typen und Verweise, doppelte IDs, zu viele Schritte). Als Frage formulierte Schritte bleiben Entscheidungen; ein fehlender Zweig wird mit dem Schritt verbunden, der sonst unverbunden bliebe (typischerweise der vergessene Nein-Weg), und als „Bitte prüfen“ markiert.
- Selbstkorrektur: Bleiben strukturelle Fehler (Entscheidungen mit nur einem Ausgang, unerreichbare Schritte), erhält die KI einmalig die konkrete Fehlerliste zur Korrektur; das Ergebnis wird nur übernommen, wenn es besser ist.
- Ist ein Gemini-Modell überlastet (HTTP 503), wird – wie bei nicht verfügbaren Modellen – automatisch das nächste Modell der Liste versucht.
- Sehr kurze Beschreibungen („Ablauf für ein BEM-Verfahren“) führen zu einem üblichen Musterablauf mit markierten Annahmen und gezielten Rückfragen.
- Datenschutzhinweis ergänzt (Antworten auf Rückfragen und Copilot-Hinweise werden ebenfalls übertragen); er muss daher einmal neu bestätigt werden.
- Neue Module `src/ai/copilot/` und `src/state/copilotState.js` (mit TypeScript-Prüfung) samt Unit- und Komponententests; Elementgrößen werden über `diagram/node-size.js` ohne JointJS berechnet.

## [1.1.0] – 2026-11-03

Mehr Komfort beim Bearbeiten, Prozessbeschreibung als Text und Versionsvergleich.

### Bearbeitungskomfort

- Mehrfachauswahl per Strg/Umschalt + Klick und per Rahmen (Umschalt + Ziehen auf freier Fläche); ausgewählte Elemente lassen sich gemeinsam verschieben und löschen.
- Kopieren, Einfügen und Duplizieren (`Strg + C`, `Strg + V`, `Strg + D`), auch zwischen verschiedenen Diagrammen; Verbindungen innerhalb der Auswahl werden mitkopiert. `Strg + A` wählt alles aus.
- Auswahl mit den Pfeiltasten verschieben (mit Umschalt in 1-Pixel-Schritten).
- Neues Menü „Anordnen“: automatisches Anordnen des ganzen Diagramms (von oben nach unten oder von links nach rechts) sowie Ausrichten und gleichmäßiges Verteilen der Auswahl.
- Automatisches Anordnen respektiert Swimlanes: Jeder Schritt bleibt in seiner Lane, die Lanes werden untereinander angeordnet und passend vergrößert. Das gilt auch für KI-generierte Diagramme.

### Prozessbeschreibung

- Neues Menü „Beschreibung“: Export einer Verfahrensanweisung als Word-Dokument (.docx) oder Markdown – nummerierte Schritte in Ablaufreihenfolge, Entscheidungen mit ihren Zweigen, Rücksprünge, Zuständigkeiten aus den Swimlanes, angebundene Kommentare als Hinweise, Rollenübersicht und Diagrammbild.
- Nicht verbundene Schritte und fehlende Startknoten werden in der Beschreibung als Hinweis ausgewiesen.

### Versionsvergleich

- Zwei Versionen oder eine Version und den aktuellen Stand vergleichen: Änderungen sind im Diagramm farbig markiert (neu, geändert, entfernt) und als Liste beschrieben. Der Vergleich ist rein lesend.
- Notiz je Version („Was wurde geändert?“), direkt in der Versionshistorie bearbeitbar.

### Fehlerbehebungen und Technik

- `Strg + Z` direkt nach einer Änderung (innerhalb von 0,3 s) hatte keine Wirkung.
- Nach einem Update der App konnte eine noch geöffnete alte Version beim Öffnen eines Dialogs abstürzen; die App lädt in diesem Fall jetzt einmalig neu (ungespeicherte Änderungen sind über den Autosave-Entwurf gesichert).
- Flüssigeres Verschieben: Aktualisierungen von Prüfung, Qualitätspanel und Autosave werden pro Bildschirmbild gebündelt.
- Word-Export wird erst bei Bedarf geladen; weitere Module mit TypeScript-Prüfung, darunter Konverter, IndexedDB-Zugriff (typisiertes Datenbankschema) und Prozess-Check.
- Komponententests mit Testing Library für Bestätigungsdialog, Diagrammliste (Öffnen, Löschen, Import, Backup), Versionshistorie (Wiederherstellen, Notizen, Löschen) und Autosave; die IndexedDB-Schicht wird gegen eine In-Memory-Datenbank (`fake-indexeddb`) getestet.
- `normalizeMetadata` akzeptiert auch `null` als Metadaten.

## [1.0.0] – 2026-11-03

Erste versionierte Ausgabe mit Schwerpunkt Professionalisierung.

### Datenschutz und KI

- API-Key wird im Header `x-goog-api-key` statt als URL-Parameter übertragen und landet so nicht mehr in Server- oder Proxy-Logs.
- Datenschutzhinweis vor der ersten KI-Nutzung (Free-Tier-Bedingungen von Google, keine personenbezogenen oder vertraulichen Daten). Bestätigung ist in den Einstellungen einsehbar und widerrufbar.
- Modellliste zentral in `src/ai/config.js`; abgeschaltete `gemini-1.5-*`-Modelle entfernt (neu: `gemini-2.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`).
- Doppelten Code für Diagramm- und Maßnahmen-Generierung zusammengeführt.

### Datensicherheit

- Autosave: Ungespeicherte Änderungen werden automatisch als Entwurf gesichert und beim nächsten Öffnen zur Wiederherstellung angeboten. Statusanzeige neben dem Speichern-Button, Warnung beim Schließen des Tabs.
- Rückfrage, bevor ungespeicherte Änderungen durch ein anderes Diagramm, eine Vorlage oder die KI ersetzt werden.
- Formatversion (`schemaVersion`) für alle Diagramme mit Migration beim Laden.
- Import von Projektdateien mit Strukturprüfung und verständlichen deutschen Fehlermeldungen.
- Backup aller Diagramme inkl. Versionen als Datei sowie Wiederherstellung aus einem Backup.
- Beim Löschen eines Diagramms werden auch dessen Versionen und Entwürfe entfernt.

### Bedienung und Barrierefreiheit

- Eigener Bestätigungsdialog im vhs-Design statt Browser-`confirm`.
- Alle Dialoge per Tastatur bedienbar: Fokusführung, `Tab` bleibt im Dialog, `Esc` schließt.
- Elemente lassen sich per Klick bzw. Tastatur hinzufügen (zusätzlich zu Drag & Drop).
- Beschriftungen für Icon-Buttons, Statusansagen für Screenreader, Sprunglink zur Arbeitsfläche.
- Kontraste verbessert (u. a. Erfolgsmeldungen, PDF-Button, Hinweistexte).
- Neue Tastenkombination `Strg + S` zum Speichern; Übersicht der Tastenkürzel in der Anleitung.

### Technik und Qualität

- Automatisierte Tests mit Vitest (Konverter, Layout, Undo/Redo, Prüfregeln, Datenformat, Autosave-Logik, KI-Client).
- GitHub-Actions-Pipeline (Lint, Typprüfung, Tests, Build); der Vercel-Build bricht bei Fehlern ab.
- Alle ESLint-Fehler behoben.
- Kleinere Ladezeit: Dialoge und jsPDF werden erst bei Bedarf geladen, Bibliotheken in eigene, gut cachebare Dateien aufgeteilt (Start-Bundle ca. −29 %).
- Content-Security-Policy verschärft: kein `unsafe-eval` und kein `unsafe-inline` mehr für Skripte.
- UI-Zustand der App in einem Reducer gebündelt; Typdefinitionen für das Diagrammformat (JSDoc, TypeScript-geprüft).

### Fehlerbehebungen

- Elemente mit Koordinate 0 wurden beim Laden auf Position 100 verschoben.
- Fehlerhafte Import-Daten werden gemeldet statt stillschweigend geleert.
- Abgebrochene Eingaben in den Einstellungen blieben beim erneuten Öffnen stehen, obwohl sie nicht gespeichert waren.
- Englische Fehlermeldungen beim Import durch deutsche ersetzt.

---

## 2026-03-13 – Wizard-Selbstbewertung + PDF-Qualitätsbericht

**Prozess-Check als geführter Wizard (5+1 Schritte)**

- Selbstbewertungs-Sektion im Prozess-Check vollständig umgebaut
- Pro Schritt (1 Kriterium): Leitfrage, 4 Klick-Buttons (0 kritisch / 1 schwach / 2 solide / 3 stark), optionales Notizfeld, Fortschrittsbalken, Vor-/Zurück-Navigation
- Schritt 6 = Zusammenfassung: alle Scores auf einen Blick, Hotspot-Markierung `(!)` bei Score ≤ 1, Klick auf Zeile springt zurück zum Kriterium
- Toggle „Alle auf einmal“ wechselt zur kompakten Dropdown-Ansicht
- Neue Datenstruktur `metadata.reviewNotes` (je Feld ein Notizfeld, persistent)
- TXT-Export enthält Notizen je Kriterium

**PDF-Qualitätsbericht im vhs-Layout**

- Seite 1 (Deckblatt): vhs-Kopfzeile mit Logo und Akzentstreifen, Diagrammtitel, Erstellungsdatum, Status-Badge, Durchschnitts-Scorebalken, vollständiges Flowchart-Bild
- Seite 2+ (Bericht): Automatische Prüfung, Selbstbewertung mit Notizen, Maßnahmen
- Blauer vhs-Footer mit Seitenzahl; automatischer Seitenumbruch
- Fehlerbehebungen: Latin-1-sicherer Textfilter, proportionale Logo-Skalierung, korrekter Zeilenumbruch

## 2026-03-13 – Anleitung + Umlaute

- Neuer Button „Anleitung“ im Header mit integriertem Hilfe-Dialog
- ASCII-Ersatzschreibweisen in UI-Texten durch echte Umlaute ersetzt

## 2025 – Vorlagen, Prozess-Check, Workshop-Modus

- Starter-Vorlagen für vhs-Prozesse
- Qualitätspanel mit automatischem Prozess-Check
- Workshop-/Simulationsmodus: Schritt-für-Schritt-Durchlauf des Prozesses
- Ein-/ausblendbare Seitenleisten, Breite des Qualitätspanels per Drag anpassbar

## 2025 – KI, Export, Einstellungen

- Gemini-KI-Integration zur Diagramm-Generierung aus Freitext
- Export als PNG, SVG, PDF (mit vhs-Logo und Diagrammtitel), JSON
- Maßnahmenliste mit CSV-Export
- Einstellungen: API-Key und KI-Prompt konfigurierbar, API-Diagnose
- Rückgängig/Wiederholen
- PWA: offline nutzbar, installierbar
