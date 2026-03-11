# Technische Spezifikationen – vhs Workflow-Algorithm Editor

---

## 1. Projektübersicht

### Ziel
Ein **lokales, browserbasiertes PWA-Tool** zur Erstellung algorithmischer Ablaufpläne (Flowcharts, Entscheidungsbäume, Prozessdiagramme) im vhs Corporate Design. Das Tool ermöglicht sowohl die manuelle Erstellung als auch die KI-gestützte Generierung aus Prozessbeschreibungen.

### Aktueller Status
Das Projekt ist vollständig umgesetzt und einsatzbereit. Es umfasst den Editor, die KI-Integration via Google Gemini, lokale Speicherung in der IndexedDB sowie vielfältige Exportmöglichkeiten.

---

## 2. Kernfunktionen

| Funktion | Technische Umsetzung |
|----------|----------------------|
| **Visueller Editor** | JointJS (Open Source) mit vhs-spezifischen Shapes. |
| **KI-Generierung** | Freitext → Google Gemini API (`gemini-2.5-flash`) → strukturiertes JSON → JointJS-Diagramm. |
| **Manueller Modus** | Drag & Drop aus der Toolbar, Verbindung via Ports/Magnets (sichtbar bei Hover), Re-Coupling von Pfeilen. |
| **Text-Bearbeitung** | Doppelklick auf Elemente oder Linien ermöglicht händische Korrekturen; automatische Größenanpassung (Auto-Sizing). |
| **Export** | PNG, SVG, PDF und JSON. Alle visuellen Exporte enthalten das vhs-Logo und den Diagrammtitel. |
| **PWA & Offline** | Service Worker (Vite PWA Plugin) ermöglicht Offline-Betrieb (außer KI). Installation als Desktop-App möglich. |
| **Speicherung** | Lokale IndexedDB für Diagramme und Projekte; localStorage für API-Keys und Einstellungen. |

---

## 3. Technische Architektur

### 3.1 Technologie-Stack
- **Basis**: React 19 + Vite.
- **Styling**: Tailwind CSS v4 (vhs Design System Integration).
- **Diagramm-Engine**: JointJS + Dagre.js (Auto-Layout).
- **KI**: Google Gemini API (Client-only Kommunikation).
- **Export**: jsPDF (PDF), Canvas API (PNG), Direct SVG Injection (Logo/Titel).
- **PWA**: Workbox für Service Worker Management.

### 3.2 KI-Integration (Gemini)
Die Anwendung kommuniziert direkt aus dem Browser mit der Google Gemini API.
- **Modell**: `gemini-2.5-flash` für hohe Geschwindigkeit und Präzision.
- **Sicherheitskonzept**: API-Key wird nur lokal im Browser des Nutzers gespeichert.
- **Workflow**:
  1. Nutzer gibt Prozessbeschreibung ein.
  2. System-Prompt definiert Struktur (Start, Entscheidung, Prozess, Ende, Annotation).
  3. Gemini liefert JSON-Objekt zurück.
  4. Dagre-Algorithmus berechnet Top-Down-Layout.

### 3.3 Export-Pipeline
Besonderheit: Aufgrund von Browser-Sicherheitsbeschränkungen (Tainted Canvas) wird das vhs-Logo vor dem PNG/PDF-Export in einen **Base64-String** umgewandelt und direkt in das SVG injiziert. Dies garantiert, dass das Branding in allen Exportformaten erscheint.

---

## 4. Projektstruktur

```
vhs-flowchart-editor/
├── build.bat                    # Erstellt den Produktions-Build (für Webserver)
├── install.bat                  # Installiert alle Abhängigkeiten (einmalig)
├── start.bat                    # Startet den lokalen Entwickler-Modus
├── src/
│   ├── ai/                      # Gemini-Client & Prompts
│   ├── components/              # React UI (Canvas, Toolbar, ExportBar, etc.)
│   ├── diagram/                 # JointJS Logik, Custom Shapes & Layout
│   ├── export/                  # Export-Engines (SVG, PNG, PDF, JSON)
│   ├── storage/                 # IndexedDB & Settings Management
│   └── styles/                  # Tailwind v4 & vhs Design Tokens
```

---

## 5. Deployment & Verteilung

### Lokaler Betrieb
Nutzer können den Ordner lokal nutzen und über `start.bat` starten (erfordert Node.js).

### Intranet-Hosting (vhs.local)
Die App kann als statische Web-App auf jedem internen Server (Apache/Nginx) gehostet werden:
1. `npm run build` (oder `build.bat`) ausführen.
2. Inhalt des `dist/`-Ordners auf den Server kopieren.
3. Nutzer erreichen das Tool über eine interne URL (z. B. `http://workflow.vhs.local`).

---
*Dokumentationsstand: März 2026*
