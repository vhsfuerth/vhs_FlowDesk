# Technische Spezifikationen – vhs Workflow-Algorithm Editor

---

## 1. Projektübersicht

### Ziel

Ein **browserbasiertes PWA-Tool** zur Erstellung algorithmischer Ablaufpläne (Flowcharts, Entscheidungsbäume, Prozessdiagramme) für organisatorische Prozesse an Volkshochschulen – im vhs Corporate Design, ohne eigenes Serverhosting und **lokal-first**: Diagramme werden manuell oder KI-gestützt aus einer Prozessbeschreibung erstellt.

### Nicht-Ziele

Die Anwendung ist **kein BPMN-Tool**. Nicht enthalten sind Workflow-Automatisierung, Mehrbenutzer-Kollaboration und Server-Synchronisation.

### Aktueller Status

Version 1.1.0 (siehe [CHANGELOG.md](../CHANGELOG.md)). Editor mit Mehrfachauswahl und automatischem Anordnen, KI-Integration via Google Gemini, lokale Speicherung mit Autosave, Versionen und Versionsvergleich, Import/Backup sowie Exporte inkl. Prozessbeschreibung sind umgesetzt und durch automatisierte Tests abgesichert.

---

## 2. Kernfunktionen

| Funktion | Technische Umsetzung |
|----------|----------------------|
| **Visueller Editor** | JointJS mit vhs-spezifischen Shapes (`vhs.Start`, `vhs.End`, `vhs.Process`, `vhs.Decision`, `vhs.Annotation`, `vhs.Lane`). |
| **KI-Generierung** | Freitext → Google Gemini API → strukturiertes JSON → Dagre-Layout → JointJS-Diagramm. |
| **Manueller Modus** | Drag & Drop oder Klick in der Elementleiste, Verbindung via Ports (sichtbar bei Hover). |
| **Bearbeiten** | Mehrfachauswahl (Strg/Umschalt + Klick, Rahmen), gemeinsames Verschieben, Kopieren/Einfügen/Duplizieren, Pfeiltasten, automatisches Anordnen (Swimlane-bewusst), Ausrichten und Verteilen. |
| **Text-Bearbeitung** | Doppelklick auf Elemente oder Linien; automatische Größenanpassung. |
| **Speicherung** | IndexedDB für Diagramme, Versionen und Autosave-Entwürfe; localStorage für Einstellungen. |
| **Import / Backup** | Projektdatei oder Gesamt-Backup (JSON) mit Strukturprüfung und Formatmigration. |
| **Export** | PNG, SVG, PDF und JSON mit vhs-Logo und Diagrammtitel; Qualitätsbericht als PDF; Maßnahmen als CSV; Prozessbeschreibung als Word (.docx) oder Markdown. |
| **Versionsvergleich** | Zwei Fassungen bzw. Fassung und aktueller Stand, farbig markiert und als Änderungsliste; Notizen je Version. |
| **PWA & Offline** | Service Worker (Vite PWA Plugin); Offline-Betrieb außer KI; installierbar als Desktop-App. |

---

## 3. Technische Architektur

### 3.1 Technologie-Stack

- **Basis**: React 19 + Vite
- **Styling**: Tailwind CSS v4 (vhs Design-Tokens in `src/index.css` und `src/utils/constants.js`)
- **Diagramm-Engine**: JointJS + Dagre.js (Auto-Layout)
- **KI**: Google Gemini API (direkt aus dem Browser)
- **Export**: jsPDF und docx (werden erst beim ersten PDF- bzw. Word-Export nachgeladen), Canvas API (PNG), SVG
- **Qualitätssicherung**: Vitest + jsdom, ESLint, TypeScript-Prüfung über JSDoc, GitHub Actions

### 3.2 Datenfluss

```
Prozessbeschreibung ─► Gemini API ─► { nodes, edges } ─► Dagre-Layout ─► JointJS-Graph
                                                                              │
                         IndexedDB ◄─ Speichern / Autosave ◄─ JSONConverter ◄─┘
```

`App.jsx` hält den Dokumentzustand (aktuelles Diagramm, Metadaten, Live-Daten); der UI-Zustand (Dialoge, Seitenleisten) liegt in einem Reducer (`src/state/uiState.js`). Die Arbeitsfläche (`DiagramCanvas`) wird über eine imperative Ref-API gesteuert.

### 3.3 Datenformat

Kanonisches Diagrammformat (Typen in `src/diagram/types.js`):

```json
{
  "id": "uuid",
  "name": "Kursplanung",
  "schemaVersion": 1,
  "createdAt": "2026-11-03T08:00:00.000Z",
  "updatedAt": "2026-11-03T08:10:00.000Z",
  "diagram": {
    "nodes": [{ "id": "n1", "type": "start", "label": "Start", "position": { "x": 0, "y": 0 }, "size": { "width": 140, "height": 70 } }],
    "edges": [{ "id": "e1", "from": "n1", "to": "n2", "label": "Ja", "sourcePort": "port-bottom", "targetPort": "port-top" }]
  },
  "metadata": { "templateId": null, "improvementItems": [], "reviewScores": {}, "reviewNotes": {} }
}
```

- **Formatversion**: `schemaVersion` wird beim Speichern gesetzt. Beim Laden hebt `migrateDiagramRecord` ältere Datensätze schrittweise auf das aktuelle Format (`src/storage/schema.js`). Daten aus einer neueren App-Version werden abgelehnt.
- **Import**: `parseImportFile` erkennt Projektdatei, reines `{ nodes, edges }` und Backup (`format: "vhs-flowchart-backup"`), prüft Struktur, IDs, Typen und Verbindungen und meldet Fehler auf Deutsch. Importierte Einzeldiagramme erhalten immer eine neue ID.

### 3.4 Speicherung (IndexedDB `vhs-flowcharts-db`, Version 3)

| Store | Schlüssel | Inhalt |
|---|---|---|
| `diagrams` | `id` | Gespeicherte Diagramme |
| `diagram-versions` | `id` (Index `diagramId`) | Snapshot bei jedem Speichern, max. 10 pro Diagramm |
| `drafts` | `diagramId` | Autosave-Entwurf, max. einer pro Diagramm |

**Autosave** (`src/hooks/useAutosave.js`): Der bearbeitbare Inhalt (Name, Diagramm, Metadaten) wird mit dem zuletzt gespeicherten Stand verglichen. Bei Abweichung wird nach 1,5 s ein Entwurf geschrieben; das gespeicherte Diagramm bleibt unverändert. Beim Öffnen wird ein Entwurf angeboten, wenn er neuer als der gespeicherte Stand ist. Speichern oder Verwerfen löscht den Entwurf.

### 3.5 KI-Integration (Gemini)

- **Modelle**: zentral in `src/ai/config.js`. Bei HTTP 404 (Modell nicht verfügbar) wird das nächste Modell probiert, andere Fehler brechen mit deutscher Meldung ab.
- **API-Key**: lokal im Browser gespeichert; Übertragung ausschließlich im Header `x-goog-api-key`.
- **Datenschutz**: Vor der ersten KI-Nutzung muss ein Hinweis bestätigt werden (`AiPrivacyNotice.jsx`). Im kostenlosen Kontingent darf Google Ein- und Ausgaben zur Verbesserung seiner Dienste nutzen; personenbezogene und vertrauliche Daten dürfen daher nicht eingegeben werden.
- **Robustheit**: Zeitlimit 30 s pro Anfrage; KI-Antworten werden geprüft (fehlender Start wird ergänzt, ungültige Verbindungen entfernt).

### 3.6 Bearbeiten und automatisches Anordnen

- **Auswahl** (`DiagramCanvas.jsx`): Liste ausgewählter Zellen; Einzelauswahl zeigt Werkzeuge (Löschen, Lane-Größe), Mehrfachauswahl nur Rahmen. Rahmenauswahl über `graph.findModelsInArea(…, { strict: true })` – nur vollständig umschlossene Elemente.
- **Zwischenablage** (`src/diagram/clipboard.js`): Ausschnitt = ausgewählte Knoten plus Verbindungen zwischen ihnen; beim Einfügen neue IDs und Versatz. Ablage im localStorage, daher auch zwischen Diagrammen und Tabs nutzbar.
- **Automatisches Anordnen** (`src/diagram/auto-layout.js`, reine Funktion): ohne Swimlanes dagre-Layout in der gewählten Richtung; mit Swimlanes Ablauf von links nach rechts, Zuordnung Knoten → Lane über den Mittelpunkt (sonst nächstgelegene Lane), Zeilen innerhalb der Lane gegen Überlappung, Lanes werden gestapelt und auf gleiche Breite gebracht. Anschlüsse werden nach Lage gewählt (Entscheidung: „Ja“ in Flussrichtung, „Nein“ zur Seite, Rücksprünge über die Seite).
- **Ausrichten/Verteilen** (`src/diagram/arrange.js`): reine Funktionen auf Begrenzungsrahmen.
- Alle Aktionen laufen als JointJS-Batch und sind über `Strg + Z` rückgängig zu machen.

### 3.7 Prozessbeschreibung

`src/export/process-description.js` (reine Funktion) erzeugt aus dem Diagramm eine strukturierte Beschreibung: Nummerierung per Tiefensuche ab dem Start („Ja“-Zweig vor „Nein“), Übergänge als „weiter mit“ bzw. „zurück zu“ Schritt X, Zuständigkeit aus der kleinsten umschließenden Swimlane, angebundene Kommentare als Hinweise, nicht erreichbare Schritte am Ende mit Warnung. `toMarkdown` erzeugt Markdown, `src/export/process-export.js` das Word-Dokument (Bibliothek `docx`, inkl. Diagrammbild und Rollentabelle).

### 3.8 Versionsvergleich

`src/analysis/diagram-diff.js` vergleicht zwei Fassungen über Knoten- und Verbindungs-IDs (neu, geändert: Text/Typ/Lane-Farbe bzw. Ziel/Beschriftung, entfernt, verschoben) und formuliert eine Änderungsliste. `buildComparisonView` kombiniert die neuere Fassung mit den entfernten Elementen; `DiagramPreview.jsx` zeigt sie mit eigenem, schreibgeschütztem JointJS-Graphen an – der Editor bleibt unberührt.

### 3.9 Export-Pipeline

Wegen Browser-Sicherheitsbeschränkungen (Tainted Canvas) wird das vhs-Logo vor dem PNG/PDF-Export als **Base64** direkt in das SVG eingebettet. So erscheint das Branding in allen Exportformaten.

### 3.10 Sicherheit

- Content-Security-Policy (`vercel.json`): Skripte nur von der eigenen Domain, kein `eval`, Netzwerkzugriffe nur zur eigenen Domain und zur Gemini API.
- `npm run preview` verwendet dieselben Header, sodass der Produktions-Build lokal unter Produktionsbedingungen getestet werden kann.

### 3.11 Barrierefreiheit

Orientierung an WCAG 2.1 AA, soweit mit einem grafischen Editor sinnvoll: Dialoge mit Fokusführung und Tastaturbedienung (`useDialogA11y`), beschriftete Icon-Buttons, Statusansagen (`role="status"`), ausreichende Kontraste, Menüs mit Pfeiltasten, Elemente per Klick/Tastatur einfügbar sowie per Tastatur auswählbar, verschiebbar, kopierbar und anordenbar. Das Verbinden von Elementen erfordert weiterhin eine Maus.

---

## 4. Projektstruktur

```
202601_vhs_Flowcharts/
├── .github/workflows/ci.yml     # CI: Lint, Typprüfung, Tests, Build
├── build.bat                    # Erstellt den Produktions-Build
├── vercel.json                  # Hosting, Build-Befehl und Sicherheits-Header
├── docs/                        # Spezifikation, Styleguide, geplante Erweiterungen
└── vhs-flowchart-editor/
    ├── install.bat / start.bat  # Installation und lokaler Start
    └── src/
        ├── ai/                  # Gemini-Client, Modellkonfiguration, Prompts
        ├── analysis/            # Strukturprüfung und Selbstbewertung
        ├── components/          # React-UI (Canvas, Leisten, Dialoge)
        ├── data/                # Starter-Vorlagen
        ├── diagram/             # Shapes, Konverter, Layout, Zwischenablage, Ausrichten, Undo/Redo, Typen
        ├── export/              # Export-Engines, Prozessbeschreibung
        ├── hooks/               # Autosave, Bestätigungsdialog, Dialog-Bedienbarkeit, KI-Hinweis
        ├── state/               # UI-Reducer
        └── storage/             # IndexedDB, Einstellungen, Datenformat, Import
```

---

## 5. Qualitätssicherung

- **Tests** (`npm test`): Konverter (verlustfreie Hin- und Rückumwandlung, alle Vorlagen), automatisches Anordnen (inkl. Swimlanes), Zwischenablage, Ausrichten/Verteilen, Undo/Redo, Prozessbeschreibung (Reihenfolge, Verzweigungen, Schleifen, Lanes, Word-Datei), Versionsvergleich, Prüfregeln, Datenformat und Migration, Import/Backup, Autosave-Logik, KI-Client (Header statt URL-Parameter, Modell-Fallback, Fehlermeldungen).
- **Typprüfung** (`npm run typecheck`): JSDoc-typisierte Module, schrittweise erweiterbar über `jsconfig.json`.
- **CI**: GitHub Actions bei jedem Push und Pull Request; der Vercel-Build führt `npm run check` aus und bricht bei Fehlern ab.
- **Versionierung**: SemVer in `package.json`, Änderungen in `CHANGELOG.md`.

---

## 6. Deployment & Verteilung

### Lokaler Betrieb

Nutzer können den Ordner lokal nutzen und über `start.bat` starten (erfordert Node.js ≥ 20).

### Intranet-Hosting (vhs.local)

1. `npm run build` (oder `build.bat`) ausführen.
2. Inhalt des `dist/`-Ordners auf den Server kopieren.
3. Sicherheits-Header aus `vercel.json` im Webserver übernehmen.
4. Nutzer erreichen das Tool über eine interne URL (z. B. `http://workflow.vhs.local`).

### Vercel

Siehe [README](../README.md#3-hosting-auf-vercel-öffentlich-kostenlos).

---
*Dokumentationsstand: November 2026*
