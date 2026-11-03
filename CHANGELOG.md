# Changelog

Alle nennenswerten Änderungen am vhs Workflow-Algorithm Editor. Die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

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
