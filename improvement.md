# Technische Pflege vhs FlowDesk

Erstellt nach Version 1.6.0 (2026-11-05). Diese Liste enthält ausschließlich **technische Pflege**: Barrierefreiheit, Codestruktur, Abhängigkeiten und Leistung. Neue Funktionen gehören nicht hierher. Am sichtbaren Verhalten der App soll sich durch diese Punkte nichts ändern, außer durch behobene Mängel.

Aufwand: **S** = bis ½ Tag, **M** = 1–2 Tage, **L** = mehrere Tage.
Status: ✅ erledigt (mit Version), 🔶 teilweise erledigt, offen = ohne Markierung.

## Umsetzungsstand

| Punkt | Thema | Aufwand | Status |
| --- | --- | --- | --- |
| 1 | Leistung bei großen Diagrammen messen und verbessern | M | ✅ 1.6.2 |
| 2 | `App.jsx` verschlanken | M | ✅ 1.6.3 |
| 3 | `DiagramCanvas.jsx` verschlanken | M | ✅ 1.6.4 |
| 4 | JointJS 3.7 auf `@joint/core` 4 heben | L | offen |
| 5 | Barrierefreiheit nach BITV 2.0 / WCAG 2.1 prüfen | M | offen |

Die Punkte sind in der empfohlenen Reihenfolge nummeriert und werden von 1 bis 5 abgearbeitet:

- **1 – Leistung messen:** liefert Messwerte als Grundlage für alles Weitere.
- **2 und 3 – Verschlanken:** Kleinere Dateien erleichtern das Upgrade.
- **4 – Upgrade** auf `@joint/core`.
- **5 – Barrierefreiheit** zum Schluss, weil 2 bis 4 die Oberfläche berühren und sonst doppelt geprüft werden müsste.

---

## 1. ✅ Leistung bei großen Diagrammen messen und verbessern — M (1.6.2)

### Ergebnis 1.6.2

**Messung der reinen Funktionen** mit `npm run bench` (`src/test/performance.bench.js`), Testdiagramme aus `src/test/large-diagram.js` mit 4 Swimlanes. Gemessen in jsdom unter Node, im Browser sind die Werte anders, die Verhältnisse aber ähnlich. Mittelwerte in ms je Aufruf:

| Schritt | wann | 50 | 150 | 300 |
| --- | --- | --- | --- | --- |
| `toJson` | jede Änderung | 0,14 | 0,42 | 0,82 |
| `validateDiagram` | jede Änderung | 0,05 | 0,18 | 0,40 |
| `createSnapshot` (Autosave) | jede Änderung | 0,04 | 0,11 | 0,21 |
| `buildProcessDescription` | jede Änderung (vorher) | 0,11 | 0,35 | 0,73 |
| Hilfslinien (Umrisse + `computeSnap`) | jede Mausbewegung | 0,02 | 0,05 | 0,08 |
| Verlaufsschritt (`JSON.stringify(graph.toJSON())`) | entprellt, 300 ms | 1,8 | 5,4 | 10,7 |
| `computeAutoLayout` | auf Klick | 11 | 36 | 73 |
| `fromJson` (Laden, Modell) | einmalig | 9,9 → 9,0 | 32 → 28 | 79 → 67 |

**Bewertung:**
- Die reinen Berechnungen sind unkritisch. Selbst bei 300 Elementen kosten alle Schritte zusammen, die pro Änderung laufen, gut 2 ms von 16 ms pro Bildschirmbild.
- Die Verdachtsstelle `computeSnap` ist entlastet.
- Teuer war vor allem, *wie oft* gerechnet und neu gezeichnet wurde.

**Umgesetzt:**
- **Ziehen und Batches:** Zwischenstände gehen nicht mehr an die App (`diagram/change-notifier.js`). Das gilt beim Ziehen von Elementen und Verbindungen und während Batches (Laden, Anordnen, Einfügen, Löschen).
  - Struktur-Check, Autosave, Textfassung, der Zustand von Rückgängig/Wiederholen und das Neuzeichnen von `App` laufen einmal nach dem Loslassen bzw. nach dem letzten Batch.
  - Die Meldung nach dem Loslassen kommt im nächsten Task, weil JointJS das Ablegen erst im `mouseup` nach dem `pointerup` abschließt (z. B. Lane-Zuordnung). So gibt es genau eine Meldung, die das Ablegen einschließt.
  - Tastatur, Eigenschaftenleiste und alle anderen Einzeländerungen melden weiterhin sofort.
  - `App` übernimmt den Zustand von Rückgängig/Wiederholen nur, wenn er sich wirklich ändert.
  - Nicht zusammengefasst wird das Ziehen am Lane-Griff, weil es ein eigenes Werkzeug ist. Es meldet weiter pro Bildschirmbild, zusammengefasst über `requestAnimationFrame` in der App.
- **Übersichtskarte:** Ihr Zustand liegt in einem eigenen Speicher (`createOverviewStore`, `components/MinimapOverlay.jsx`). Beim Scrollen und Zoomen zeichnet nur noch die Karte neu, nicht mehr die ganze `DiagramCanvas` samt Eigenschaftenleiste.
- **„Ablauf als Text“** wird nur noch berechnet, solange der Bereich aufgeklappt ist. Zugeklappt wird nur die Zahl der Schritte gezählt.
- **Laden:** Das Paper ist während des Einlesens eingefroren (`freeze`/`unfreeze`), damit es einmal zeichnet statt nach jedem Element. `fromJson` fügt alle Elemente und Verbindungen gesammelt ein (`addCells`).
- **Verlauf:** `destroy()` meldet den Listener jetzt wirklich ab (vorher war es ein anderer, neu gebundener Handler), setzt den Timer zurück und wird beim Abbau der Arbeitsfläche aufgerufen. Der wirkungslose Filter auf `batch:layout` ist entfernt. Anordnen bleibt bewusst rückgängig machbar.
- **Laden robuster:** `fromJson` schließt den Batch `import` auch bei fehlerhaften Daten (`try`/`finally`). Sonst blieben Lane-Zuordnung und Mitwachsen bis zum Neuladen aus.
- **Code-Review (2026-11-10):** Die Befunde zu diesen Änderungen sind behoben. Wichtigste Folge aus dem Review von `src/components`: Der Melder hat eine Rückfallebene (Meldung spätestens 1 s nach der letzten Änderung), und alle Batches laufen über `inBatch`, damit ein offener Batch Autosave und die Markierung „ungespeichert“ nie dauerhaft blockiert. Bewusst offen: Nach einem Fast Refresh von `DiagramCanvas.jsx` im Entwicklungsmodus sind die Module abgemeldet und werden wegen `initializedRef` nicht neu angemeldet. Das galt schon vorher für alle anderen Module (siehe Hinweis „Viewport“ in `CLAUDE.md`: volles Neuladen nötig), betrifft nur die Entwicklung und nicht die ausgelieferte App. Die Zeitgrenzen im Leistungstest sind auf mindestens das Hundertfache der Messwerte gelockert, damit CI nicht zufällig scheitert. Die Tests des Notifiers liegen in `canvas-parts.test.js`.
- **Absicherung:** `diagram/performance.test.js` prüft mit großzügigen Grenzen (300 Elemente), dass `toJson`, Struktur-Check, Textfassung und Hilfslinien schnell bleiben. Außerdem prüft er das Verhalten des Notifiers und das Laden ohne Verlust.

**Bewusst nicht geändert:**
- Der Verlauf speichert weiter ganze Zustände. Bei 300 Elementen sind das rund 11 ms je Schritt, entprellt, also nur in Pausen.
- Autosave bleibt, wie es ist. Es schreibt entprellt nach 1,5 s.

**Browsertest (2026-11-06):** Ein importiertes Testdiagramm mit 300 Elementen und 4 Swimlanes läuft flüssig: Laden, Ziehen, Scrollen, Zoomen und Tippen in der Eigenschaftenleiste funktionieren ohne spürbare Verzögerung. Weitere Schritte wie `paper.options.async` sind derzeit nicht nötig.

### Ursprüngliche Aufgabe

Bisher gibt es keine Messwerte. Verwaltungsabläufe mit Swimlanes können leicht 100–200 Elemente erreichen.

- **Testdiagramme erzeugen:** 50, 150 und 300 Elemente, mit und ohne Swimlanes, als Skript oder Fixture in `src/test/`.
- **Messen** mit dem Chrome-Performance-Profil:
  - Laden
  - Ziehen eines Elements (Hilfslinien!)
  - Gruppen-Verschieben
  - Zoomen und Scrollen (Übersichtskarte)
  - Tippen in der Eigenschaftenleiste
  - Struktur-Check und Autosave
- **Bekannte Verdachtsstellen:**
  - `computeSnap` prüft beim Ziehen gegen alle Elemente.
  - Die Übersichtskarte rendert bei jedem Scroll-Frame `DiagramCanvas` neu. Sie könnte als eigene Komponente mit eigenem Zustand laufen.
  - `validateDiagram` und `toJson` laufen bei jeder Änderung.
  - Der Verlauf speichert ganze Zustände.
  - Autosave schreibt in IndexedDB.
- **Gezielt verbessern**, nur wo die Messung es zeigt:
  - Entprellen
  - Speichern teurer Ergebnisse (Memoisierung)
  - Zustand der Übersichtskarte vom Canvas lösen
  - bei Bedarf `paper.options.async`/`frozen` beim Import
- **Ziel:** Zahlen dokumentiert. Ziehen und Tippen bleiben bei 150 Elementen flüssig, also ohne spürbare Verzögerung. Ein einfacher Leistungstest für die reinen Funktionen (z. B. `computeSnap`, `validateDiagram` mit 300 Elementen) sichert das ab.

## 2. ✅ `App.jsx` verschlanken — M (1.6.3)

### Ergebnis 1.6.3

`App.jsx` ist von 823 auf 241 Zeilen geschrumpft. Sie legt nur noch Zustand für Zoom, Auswahl, Verlauf und Dialoge an, verdrahtet die Hooks und baut das Layout auf. Die Abläufe stecken in Hooks unter `src/hooks/`:

| Hook | Aufgabe |
| --- | --- |
| `useDiagramDocument` | geöffnetes Diagramm: Laden beim Start, Entwurf wiederherstellen, Nachfrage bei ungespeicherten Änderungen, Speichern samt Version, Öffnen, Neu, Umbenennen, Leeren, Vorlage/Copilot/Version als neues Diagramm, „Direkt erzeugen“, Änderungen der Arbeitsfläche |
| `useKeyboardShortcuts` | alle Tastenkürzel samt Fokusregeln; der Listener wird nur einmal angemeldet und nutzt immer die neuesten Handler |
| `useDiagramExport` | Bild, Projektdatei, Maßnahmenliste, Prozessbeschreibung; `cleanFilename` |
| `useCanvasCommands` | Anordnen, Auswahl anordnen, Alles einpassen, Löschen mit Überbrücken, jeweils mit Meldungstexten |
| `useSubprocess` | Teilprozess nachfragen, anzeigen oder wechseln |
| `useDiagramValidation` | Struktur-Check samt nachgeladener Diagramm-IDs |
| `useNotification`, `usePanelResize` | Statusmeldung, Breite des Qualitätspanels |

**Absicherung:**
- `src/App.test.jsx` ersetzt die Arbeitsfläche durch eine Attrappe mit derselben Imperative-API. Er hält Laden, Speichern mit Version, Tastenkürzel samt Fokusregeln, Kopieren und Einfügen, Löschen mit Überbrücken, Anordnen, Alles einpassen, Exporte und Leeren fest. Er lief vor dem Umbau grün und danach unverändert.
- `src/hooks/appHooks.test.jsx` prüft die kleineren Hooks einzeln.

Das Verhalten ist unverändert.

### Ursprüngliche Aufgabe

`App.jsx` hat rund 820 Zeilen und 27 Hooks. Sie bündelt Diagrammverwaltung, Tastenkürzel, Dialogsteuerung, Exporte, KI-Aufrufe und Benachrichtigungen. Das erschwert Änderungen und Tests.

- **Tastenkürzel** in einen eigenen Hook auslagern (`hooks/useKeyboardShortcuts.js`), samt der Regel „nur wenn der Fokus auf der Arbeitsfläche oder auf `body` liegt“. Testbar mit Testing Library.
- **Exporte** (PNG/SVG/PDF/JSON, Prozessbeschreibung, Bericht) in einen Hook `useDiagramExport` auslagern.
- **Löschen mit Überbrücken**, Teilprozess öffnen und Wechseln in eigene Funktionen bzw. einen Hook auslagern.
- **Anordnen-Handler** (`handleAutoLayout`, `handleAutoLayoutSelection`, `handleFitToView`) mit ihren Meldungstexten zusammenfassen.
- **Ziel:** `App.jsx` deutlich unter 500 Zeilen, nur noch Zusammenstecken und Layout. Verhalten unverändert, alle bestehenden Tests bleiben grün.

## 3. ✅ `DiagramCanvas.jsx` verschlanken — M (1.6.4)

### Ergebnis 1.6.4

`DiagramCanvas.jsx` ist von 791 auf 487 Zeilen geschrumpft. Sie legt Graph, Paper und Verlauf an, meldet die Module an und ab, stellt die Imperative-API zusammen (gegliedert in Laden/Verlauf, Bearbeiten, Anordnen, Ansicht, Export) und rendert die Overlays.

| Modul | Aufgabe |
| --- | --- |
| `diagram/canvas-editing.js` | Bearbeitungsbefehle als Funktionen über Graph und Konverter: `addNextStep`, `deleteCells`, `bridgeInfo`, `moveElements`, `applyPositions`, `applyPartialLayout`, `fragmentOf`, `insertFragment`, `reassignLanes`. Die Auswahl setzt die Komponente. |
| `diagram/canvas-events.js` | Paper- und Container-Ereignisse; ruft über `getHandlers()` immer die aktuellen Funktionen der Komponente. Neu: Die Ereignisse werden beim Abbau abgemeldet. |
| `hooks/useInlineEdit.js` | Zustand und Ablauf der Textbearbeitung auf der Fläche |
| `hooks/useCanvasViewport.js` | Zoom-Effekt, `fitPaper`, `centerContent`, `showStart`, `fitToView`, `navigateTo`, `focusNode`, `setPresentationFocus` |

**Abweichung vom Plan:** „Folgeschritt anlegen“ liegt nicht in `diagram/add-next.js`, sondern in `canvas-editing.js`. `add-next.js` bleibt ohne JointJS (reine Geometrie, `@ts-check`).

**Absicherung:** `diagram/canvas-modules.test.js`, dazu die bestehenden Tests, auch `App.test.jsx`. Das Verhalten ist unverändert.

### Ursprüngliche Aufgabe

`DiagramCanvas.jsx` ist mit rund 820 Zeilen wieder gewachsen, obwohl sie laut Architektur „nur verdrahten“ soll (siehe `CLAUDE.md`, „Canvas modules“).

- **Inline-Bearbeitung** (`startInlineEdit`, `commitInlineEdit`, `commitOpenInlineEditor`, `refocusCanvas`) in einen Hook `useInlineEdit` auslagern.
- **Folgeschritt anlegen** (`addNextStep`) als Funktion nach `diagram/add-next.js` verschieben. Sie braucht nur Graph und Quelle.
- **Imperative API** (`useImperativeHandle`) gruppieren: Bearbeiten, Ansicht, Anordnen, Export. Oder Teile davon in kleine Module verlagern, die die API zusammensetzt.
- **Ansicht** (Zoom-Effekt, `fitToView`, `centerContent`, Übersichtskarte) in einen Hook `useCanvasViewport` auslagern.
- **Testen:** neue Module mit der Paper-Attrappe aus `diagram/canvas-parts.test.js`.
- **Ziel:** unter 500 Zeilen. Der Init-Effekt meldet nur noch Module an und ab.

## 4. JointJS 3.7 auf `@joint/core` 4 heben — L

Das Paket `jointjs` 3.7 wird nicht mehr weiterentwickelt. Der Nachfolger ist `@joint/core`, aktuell 4.x. Je länger das Upgrade wartet, desto größer wird der Abstand. 16 Dateien importieren `jointjs`.

- **Vorab** die Release Notes und den Migrationsleitfaden von JointJS 4 lesen. Bekannte Themen sind ESM-Build, geänderte Typen und die Werkzeuge (`linkTools`, `elementTools`).
- **Den Alias in `vite.config.js` prüfen.** Heute zeigt er auf den CJS-Build, weil `Object.assign(joint.shapes, …)` am eingefrorenen ESM-Namensraum scheitert. Mit `@joint/core` die eigenen Formen besser über einen eigenen `cellNamespace` registrieren (`{ ...shapes, vhs: { … } }`) statt `joint.shapes` zu verändern. Dann entfällt der Alias.
- **Besonders prüfen:**
  - `embed`/`position({ deep })` (Swimlanes)
  - `calc()` und `refX2`/`refY2` (Formen in `shapes.js`)
  - Ports
  - Router `manhattan`/`normal`
  - eigene `ToolView`s (`lane-resize-tool.js`, `add-next-tool.js`)
  - `vertex-drag.js`
  - `fitToContent`, `getContentArea`, `localToPaperRect`
  - Highlighter
  - SVG/PNG/PDF-Export
- **Vorgehen:** eigener Branch, zuerst Tests grün, dann ein vollständiger Browsertest anhand einer Checkliste. Der Datenformat-Export (`toJson`) darf sich nicht ändern. Abgleich über `format-v2.test.js` und die Vorlagen-Tests.
- **Ziel:** `@joint/core` 4.x und kein Alias mehr. `CLAUDE.md` ist angepasst, Abschnitte „JointJS alias“ und „JointJS 3.7“.

## 5. Barrierefreiheit nach BITV 2.0 / WCAG 2.1 prüfen — M

Für öffentliche Einrichtungen ist die BITV 2.0 (WCAG 2.1, Stufe AA) maßgeblich. Vieles ist schon umgesetzt: Dialoge mit Fokusführung, Beschriftungen für Screenreader, Statusmeldungen, Sprunglink, „Ablauf als Text“ und Tastenkürzel. Bisher fehlt aber eine systematische Prüfung.

- **Automatisch prüfen:** `axe-core` über Testing Library auf die wichtigsten Ansichten anwenden, also Hauptansicht, alle Dialoge, Eigenschaftenleiste und Qualitätspanel. Als Test einbinden, damit Rückschritte in `npm run check` auffallen.
- **Kontraste nachmessen:** vor allem graue Hilfstexte (`text-gray-400/500`), Platzhalter, deaktivierte Schaltflächen sowie Elementfarben und Lane-Tönungen gegen ihren Text. Die Farben stehen zentral in `utils/constants.js`.
- **Tastatur von Hand durchgehen:** Tab-Reihenfolge, sichtbarer Fokus auf allen Bedienelementen, keine Tastaturfallen, Esc schließt überall.
- **Screenreader-Stichprobe** mit NVDA unter Windows: Hauptablauf „Diagramm öffnen, Schritt hinzufügen, Text ändern, speichern“ und „Ablauf als Text“.
- **Zoom auf 200 %** im Browser bzw. Ansicht in 320 px Breite (WCAG 1.4.10): Bleiben Leisten und Dialoge bedienbar?
- **Ergebnis festhalten:** Liste der Abweichungen mit Begründung, z. B. „Verbinden nur mit der Maus, die Textfassung ist die Alternative“. Diese Liste ist auch die Grundlage für eine spätere Erklärung zur Barrierefreiheit.
