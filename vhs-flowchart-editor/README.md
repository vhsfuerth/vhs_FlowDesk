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
| **Export** | PNG, SVG, PDF (mit Logo + Titel), JSON |
| **Qualitätspanel** | Automatische Strukturprüfung + Selbstbewertung (EFQM-nah) + Maßnahmenliste (CSV-Export) |
| **Workshop-Modus** | Schritt-für-Schritt-Durchgang mit Diskussionspunkten |
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
