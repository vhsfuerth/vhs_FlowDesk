# Technische Pflege vhs FlowDesk

Erstellt nach Version 1.6.0 (2026-11-05). Diese Liste enthält ausschließlich **technische Pflege**: Barrierefreiheit, Codestruktur, Abhängigkeiten und Leistung. Neue Funktionen gehören nicht hierher. Am sichtbaren Verhalten der App soll sich durch diese Punkte nichts ändern, außer durch behobene Mängel.

Aufwand: **S** = bis ½ Tag, **M** = 1–2 Tage, **L** = mehrere Tage.
Status: ✅ erledigt (mit Version), 🔶 teilweise erledigt, offen = ohne Markierung.

## Umsetzungsstand

| Punkt | Thema | Aufwand | Status |
| --- | --- | --- | --- |
| 1 | Barrierefreiheit nach BITV 2.0 / WCAG 2.1 prüfen | M | offen |
| 2 | `App.jsx` verschlanken | M | offen |
| 3 | `DiagramCanvas.jsx` verschlanken | M | offen |
| 4 | JointJS 3.7 auf `@joint/core` 4 heben | L | offen |
| 5 | Leistung bei großen Diagrammen messen und verbessern | M | offen |

Empfohlene Reihenfolge: 5 (Messwerte als Grundlage) → 2 und 3 (kleinere Dateien erleichtern das Upgrade) → 4 → 1. Punkt 1 kann jederzeit dazwischen laufen. Am Ende sollte er aber noch einmal geprüft werden, weil 2–4 die Oberfläche berühren.

---

## 1. Barrierefreiheit nach BITV 2.0 / WCAG 2.1 prüfen — M

Für öffentliche Einrichtungen ist die BITV 2.0 (WCAG 2.1, Stufe AA) maßgeblich. Vieles ist schon umgesetzt: Dialoge mit Fokusführung, Beschriftungen für Screenreader, Statusmeldungen, Sprunglink, „Ablauf als Text“ und Tastenkürzel. Bisher fehlt aber eine systematische Prüfung.

- **Automatisch prüfen:** `axe-core` über Testing Library auf die wichtigsten Ansichten anwenden, also Hauptansicht, alle Dialoge, Eigenschaftenleiste und Qualitätspanel. Als Test einbinden, damit Rückschritte in `npm run check` auffallen.
- **Kontraste nachmessen:** vor allem graue Hilfstexte (`text-gray-400/500`), Platzhalter, deaktivierte Schaltflächen sowie Elementfarben und Lane-Tönungen gegen ihren Text. Die Farben stehen zentral in `utils/constants.js`.
- **Tastatur von Hand durchgehen:** Tab-Reihenfolge, sichtbarer Fokus auf allen Bedienelementen, keine Tastaturfallen, Esc schließt überall.
- **Screenreader-Stichprobe** mit NVDA unter Windows: Hauptablauf „Diagramm öffnen, Schritt hinzufügen, Text ändern, speichern“ und „Ablauf als Text“.
- **Zoom auf 200 %** im Browser bzw. Ansicht in 320 px Breite (WCAG 1.4.10): Bleiben Leisten und Dialoge bedienbar?
- **Ergebnis festhalten:** Liste der Abweichungen mit Begründung, z. B. „Verbinden nur mit der Maus, die Textfassung ist die Alternative“. Diese Liste ist auch die Grundlage für eine spätere Erklärung zur Barrierefreiheit.

## 2. `App.jsx` verschlanken — M

`App.jsx` hat rund 820 Zeilen und 27 Hooks. Sie bündelt Diagrammverwaltung, Tastenkürzel, Dialogsteuerung, Exporte, KI-Aufrufe und Benachrichtigungen. Das erschwert Änderungen und Tests.

- **Tastenkürzel** in einen eigenen Hook auslagern (`hooks/useKeyboardShortcuts.js`), samt der Regel „nur wenn der Fokus auf der Arbeitsfläche oder auf `body` liegt“. Testbar mit Testing Library.
- **Exporte** (PNG/SVG/PDF/JSON, Prozessbeschreibung, Bericht) in einen Hook `useDiagramExport` auslagern.
- **Löschen mit Überbrücken**, Teilprozess öffnen und Wechseln in eigene Funktionen bzw. einen Hook auslagern.
- **Anordnen-Handler** (`handleAutoLayout`, `handleAutoLayoutSelection`, `handleFitToView`) mit ihren Meldungstexten zusammenfassen.
- **Ziel:** `App.jsx` deutlich unter 500 Zeilen, nur noch Zusammenstecken und Layout. Verhalten unverändert, alle bestehenden Tests bleiben grün.

## 3. `DiagramCanvas.jsx` verschlanken — M

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

## 5. Leistung bei großen Diagrammen messen und verbessern — M

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
