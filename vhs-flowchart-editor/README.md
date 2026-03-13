# vhs Workflow Editor

Ein browserbasierter Flussdiagramm-Editor für Volkshochschulen – mit KI-Unterstützung, Qualitätsprüfung und Workshop-Modus.

---

## Features

| Feature | Beschreibung |
|---|---|
| **KI-Generierung** | Prozess als Freitext beschreiben → Gemini erstellt automatisch ein Diagramm |
| **Drag & Drop** | Start, Ende, Prozess, Entscheidung, Kommentar aus der Seitenleiste ziehen |
| **Verbindungen** | Hover über Element zeigt Ports → zum Ziel ziehen |
| **Rückgängig/Wiederholen** | Strg+Z / Strg+Y oder Buttons in der unteren Leiste |
| **Speichern & Laden** | Lokal im Browser (IndexedDB), mehrere Diagramme verwaltbar |
| **Export** | PNG, SVG, PDF (Diagramm mit Logo + Titel), JSON |
| **Qualitätspanel** | Automatische Strukturprüfung + Maßnahmenliste (CSV-Export) |
| **Prozess-Check Wizard** | Geführte 5-Schritt-Selbstbewertung: Leitfrage + Score-Buttons + Notizfeld je Kriterium; Schritt 6 = Zusammenfassung mit Hotspot-Markierung; Kompakt-Toggle für schnelle Ansicht |
| **PDF-Qualitätsbericht** | Zweiseitiger Geschäftsbericht im vhs-Layout: Deckblatt mit Flowchart, Detailseite mit Befunden, Selbstbewertung (inkl. Notizen) und Maßnahmen |
| **Workshop-Modus** | Schritt-für-Schritt-Präsentation mit Diskussionspunkten |
| **Vorlagen** | Starter-Templates für häufige vhs-Prozesse |
| **Anleitung** | Integriertes Hilfe-Modal mit allen Funktionen erklärt |
| **PWA** | Installierbar, offline nutzbar |

---

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Build für Produktion:

```bash
npm run build
```

---

## Konfiguration

Der Gemini-API-Key wird über die **Einstellungen** (Zahnrad-Icon im Header) konfiguriert und lokal im Browser gespeichert. Der KI-Prompt ist ebenfalls dort anpassbar.

---

## Changelog

### 2026-03-13 – Wizard-Selbstbewertung + PDF-Qualitätsbericht

**Prozess-Check als geführter Wizard (5+1 Schritte)**
- Selbstbewertungs-Sektion im Prozess-Check vollständig umgebaut
- Pro Schritt (1 Kriterium): Leitfrage, 4 Klick-Buttons (0 kritisch / 1 schwach / 2 solide / 3 stark), optionales Notizfeld, Fortschrittsbalken, Vor-/Zurück-Navigation
- Schritt 6 = Zusammenfassung: alle Scores auf einen Blick, Hotspot-Markierung `(!)` bei Score ≤ 1, Klick auf Zeile springt zurück zum Kriterium
- Toggle „Alle auf einmal" wechselt zur kompakten Dropdown-Ansicht
- Neue Datenstruktur `metadata.reviewNotes` (je Feld ein Notizfeld, persistent)
- `REVIEW_SCORE_GUIDES` in `diagram-validation.js` exportiert (Leitfragen je Kriterium)
- TXT-Export enthält jetzt Notizen je Kriterium

**PDF-Qualitätsbericht im vhs-Layout**
- Neuer Button „PDF-Bericht" neben „TXT" in Wizard-Schritt 6 und Kompaktansicht
- **Seite 1 (Deckblatt):** vhs-Kopfzeile mit proportional skaliertem Logo + orangenem Akzentstreifen, Diagrammtitel, Erstellungsdatum, Status-Badge, Durchschnitts-Scorebalken, vollständiges Flowchart-Bild
- **Seite 2+ (Bericht):** Automatische Prüfung (farbige Badges + Befundliste), Selbstbewertung (Scorebalken + Notizen je Kriterium, Zusammenfassungs-Box), Maßnahmen (zebra-gestreift mit allen Metadaten)
- Blauer VHS-Footer mit Seitenzahl auf jeder Seite; automatischer Seitenumbruch mit Mini-Header
- Technisch: `exportQualityReportPDF` in `file-export.js`, `captureDiagramImage` in `DiagramCanvas` (gibt `{dataUrl, width, height}` zurück), `onGetDiagramImage`-Prop durch `App.jsx → QualityPanel`
- Bug-Fixes: Latin-1-sicherer `safe()`-Filter (keine Artefakte mehr), proportionale Logo-Skalierung, korrekter Zeilenumbruch via `splitTextToSize` nach Font-Setzung

---

### 2026-03-13 – Anleitung-Modal + Umlaute

**Neu: Anleitung-Modal**
- Neuer Button "Anleitung" im Header (zwischen Vorlagen und Diagramme)
- Öffnet `GuideModal.jsx` mit 11 Sektionen (Card-Layout mit Lucide-Icons):
  KI-Generierung, Drag & Drop, Arbeitsfläche, Verbindungen, Rückgängig/Wiederholen, Speichern & Laden, Export, Qualität & Maßnahmen, Workshop-Modus, Vorlagen, Einstellungen

**Korrigiert: Umlaute in UI-Texten** (ASCII-Ersatzschreibweisen → echte Umlaute)
- `ExportBar.jsx`: Oeffnen → Öffnen, Arbeitsflaeche → Arbeitsfläche
- `Toolbar.jsx`: Arbeitsflaeche → Arbeitsfläche, hinzufuegen → hinzufügen, naechsten → nächsten
- `QualityPanel.jsx`: Qualitaet → Qualität, Massnahmen → Maßnahmen, Pruefung → Prüfung, Pruefbedarf → Prüfbedarf, grundsaetzlich → grundsätzlich, Auffaelligkeiten → Auffälligkeiten, Medienbrueche → Medienbrüche, Zustaendigkeiten → Zuständigkeiten, Prioritaet → Priorität
- `WorkshopPanel.jsx`: Fuehrt Schritt fuer Schritt → Führt Schritt für Schritt
- `EditTextModal.jsx`: Schliessen → Schließen
- `indexeddb.js`: loeschen → löschen
- `file-export.js`: CSV-Header Massnahme → Maßnahme, Prioritaet → Priorität

---

### 2025-xx-xx – Vorlagen, Prozess-Check, Workshop-Modus, ein-/ausblendbare Seitenleisten

- Starter-Templates für vhs-Prozesse (TemplateModal)
- Qualitätspanel mit automatischem Prozess-Check (EFQM-nah)
- Workshop-Modus: Schritt-für-Schritt-Präsentation mit Diskussionspunkten
- Linke Toolbar und rechtes Qualitätspanel ein-/ausblendbar
- Breite des Qualitätspanels per Drag anpassbar

### 2025-xx-xx – KI, Export, Einstellungen

- Gemini-KI-Integration zur Diagramm-Generierung aus Freitext
- Export als PNG, SVG, PDF (mit vhs-Logo + Diagrammtitel), JSON
- Maßnahmenliste mit CSV-Export
- Einstellungen: API-Key + KI-Prompt konfigurierbar
- API-Diagnose-Funktion
- Rückgängig/Wiederholen (History)
- PWA: offline nutzbar, installierbar
