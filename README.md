# vhs Workflow-Algorithm Editor

Lokal laufendes PWA-Tool (Progressive Web App) zur Erstellung algorithmischer Ablaufpläne (Flowcharts, Entscheidungsbäume) basierend auf dem vhs Corporate Design.

## Hauptfunktionen

- **Visueller Editor**: Drag & Drop Flowchart-Editor basierend auf JointJS.
- **KI-Diagramm-Generierung**: Erzeugt Diagramme direkt aus einer einfachen Prozessbeschreibung (Freitext) über die OpenAI API (GPT-4o).
- **Offline-fähig**: Der Editor, das Laden, Speichern und der Export (PNG, SVG, PDF, JSON) funktionieren auch ohne Internetverbindung vollständig offline. Lediglich das KI-Generator-Feature benötigt Internet.
- **Lokale Datenhaltung**: Alle Diagramme und der API-Key werden ausschließlich lokal im Browser (IndexedDB, localStorage) gespeichert. Keine Übertragung zu eigenen Servern!

## Erste Schritte / Installation

Das Projekt erfordert Node.js zur Installation, lässt sich danach aber via Skript sehr leicht im lokalen Netzwerk/Rechner betreiben.

1. Stelle sicher, dass [Node.js](https://nodejs.org) (LTS Version empfohlen) auf deinem Rechner installiert ist.
2. Führe die Datei `install.bat` per **Doppelklick** aus. Dies lädt alle benötigten Module aus dem Internet herunter (dieser Prozess kann etwas dauern).
3. Du bist startklar!

## Das Tool starten

Nach der einmaligen Installation oben kannst du das Tool zukünftig mit einem Klick auf die `start.bat` starten.

1. **Doppelklick auf `start.bat`** in diesem Verzeichnis.
2. In der Konsole siehst du eine Server-Adresse (in der Regel `http://localhost:5173`).
3. Öffne diese Adresse im Google Chrome oder Microsoft Edge Browser.

## Nutzung der KI-Generierung

Damit die KI funktioniert, musst du in den Einstellungen einmalig einen eigenen OpenAI API-Key hinterlegen.

1. Starte das Tool.
2. Klicke auf das Zahnrad-Symbol (Einstellungen) oben rechts in der Navigationsleiste.
3. Trage deinen gültigen OpenAI API-Key ein und drücke Speichern.
4. Du kannst nun das freie Textfeld ("Prozessbeschreibung für KI-Generierung") verwenden und auf "Diagramm generieren" klicken!

*Der Key wird anschließend lokal im PC gespeichert und verlässt deinen Rechner nur, um direkt mit OpenAI zu kommunizieren.*

## Technologien (Developer Info)
- Frontend Framework: React 19 + Vite
- Styling: Tailwind CSS v4
- Diagramming Engine: JointJS (Open Source Version)
- Auto-Layout Engine: Dagre.js
- Local Storage: IndexedDB (`idb` wrapper)
- PDF Export Engine: jsPDF
