
# specs.md
## Projekt: vhs Workflow-Algorithm Editor

### Ziel
Entwicklung eines **lokalen, browserbasierten Tools zur Erstellung algorithmischer Ablaufpläne** für organisatorische Prozesse. Nutze Tailwind CSS Als Design Framework!!

Die Anwendung soll:

- visuelle **Flowcharts / Entscheidungsalgorithmen** erstellen
- eine **KI-gestützte Generierung aus Freitext** ermöglichen
- vollständig **ohne eigenes Serverhosting** betrieben werden
- im **vhs Corporate Design** gestaltet sein
- **lokal-first** arbeiten


# 1 Systemüberblick

## 1.1 Hauptfunktion

Die Anwendung erlaubt zwei Wege zur Erstellung eines Ablaufplans:

1. **Manuell (Editor)**
2. **Automatisch über KI (Text → Diagramm)**

Beide Wege führen zu einem **JointJS Diagramm**, das anschließend bearbeitet und exportiert werden kann.


# 2 Architektur

## 2.1 Gesamtarchitektur

Typ:  
**Client-only Progressive Web App (PWA)**

Kein eigener Backend-Server.

```
Browser
│
├── UI Layer
│
├── Diagram Engine
│      JointJS
│
├── AI Integration
│      OpenAI API
│
├── Storage
│      IndexedDB
│      Local Files
│
└── Export Engine
       PNG
       SVG
       PDF
       JSON
```


## 2.2 Technologieentscheidungen

| Bereich | Technologie |
|---|---|
| UI Framework | Vanilla JS / optional React |
| Diagramm Engine | JointJS |
| Architektur | Progressive Web App |
| KI | OpenAI GPT-4 / GPT-4o |
| Datenspeicherung | IndexedDB + lokale Dateien |
| Export | Canvas / SVG / jsPDF |
| Styling | vhs Corporate Design |


# 3 Kernfunktionalitäten

## 3.1 Diagramm Editor

Die Anwendung enthält einen visuellen Editor basierend auf **JointJS**.

### Unterstützte Diagrammtypen

Primär:

- Flowcharts
- Entscheidungsalgorithmen
- Prozessdiagramme

### Standardelemente

| Element | Form |
|---|---|
| Start / Ende | Oval |
| Prozess | Rechteck |
| Entscheidung | Raute |
| Verbindung | Pfeil |
| Annotation | Kommentarbox |


### Editor Features

- Drag & Drop
- Knoten verbinden
- Text bearbeiten
- Zoom
- Undo / Redo
- Grid Layout
- Gruppierung
- Löschen / Duplizieren


# 4 KI-Integration

## 4.1 Zweck

Freitextbeschreibung eines Prozesses wird automatisch in ein Diagramm übersetzt.

Beispiel:

**Input**

```
Der Kunde stellt eine Anfrage.
Wenn die Anfrage vollständig ist, wird sie bearbeitet.
Sonst wird eine Rückfrage gestellt.
```

**Output**

Flowchart.


## 4.2 Modell

OpenAI

```
GPT-4
GPT-4o
```


## 4.3 API Nutzung

Kommunikation direkt vom Client zur OpenAI API.

Authentifizierung:

```
API Key
```

Der Key wird lokal im Browser gespeichert (optional Session).


## 4.4 Prompt Strategie

Der Prompt erzwingt eine strukturierte JSON Antwort.

### Beispiel

System Prompt:

```
Convert the following process description into a flowchart.

Return valid JSON using the schema:

{
  "nodes": [
     { "id": "string", "type": "process|decision|start|end", "label": "string"}
  ],
  "edges": [
     { "from": "id", "to": "id", "label": "optional"}
  ]
}
```


## 4.5 Datenfluss

```
User Text Input
        │
        ▼
OpenAI API
        │
        ▼
JSON Structure
        │
        ▼
JointJS Renderer
        │
        ▼
Editable Diagram
```


## 4.6 Fehlerfälle

| Fehler | Verhalten |
|---|---|
| API nicht erreichbar | KI-Funktion deaktiviert |
| ungültiges JSON | Retry + Fehlermeldung |
| Rate limit | UI Hinweis |


## 4.7 Offline Verhalten

Offline bedeutet:

| Funktion | Verhalten |
|---|---|
| Editor | funktioniert |
| Diagramme laden | funktioniert |
| Diagramme exportieren | funktioniert |
| KI Generierung | deaktiviert |


# 5 Datenspeicherung

## 5.1 Lokale Speicherung

Standard:

```
IndexedDB
```

Gespeicherte Inhalte:

- Diagrammstruktur
- Editorstatus
- Metadaten


## 5.2 Dateiformat

Primäres internes Format:

```
JSON
```

Beispiel:

```
{
  "nodes": [],
  "edges": [],
  "metadata": {}
}
```


# 6 Exportfunktionen

Unterstützte Exportformate:

| Format | Zweck |
|---|---|
| PNG | Präsentationen |
| SVG | Vektor |
| PDF | Dokumentation |
| JSON | Weiterbearbeitung |


## 6.1 Export Architektur

```
JointJS Graph
     │
     ├─ SVG Export
     ├─ Canvas Render
     │     └ PNG
     │
     └ jsPDF
           └ PDF
```


# 7 Corporate Design

Die UI muss dem **vhs Corporate Design** entsprechen.

## 7.1 Primärfarbe

```
vhs Blau
#00285A
```


## 7.2 Sekundärfarben

Beispiele:

```
Gelb    #FAB90F
Rot     #E1000F
Grün    #AFC805
Violett #7D5AA5
```


## 7.3 Typografie

Webfont:

```
Arial
Fallback:
Calibri
Helvetica
```

Empfohlene CSS Definition:

```
font-family: Arial, Calibri, Helvetica, sans-serif;
```


# 8 UI Struktur

## 8.1 Layout

```
+--------------------------------+
| Header                         |
+--------------------------------+
| Text Input (KI)                |
+--------------------------------+
| Toolbar                        |
+--------------------------------+
|                                |
|        Diagram Editor          |
|                                |
+--------------------------------+
| Export / Save                  |
+--------------------------------+
```


## 8.2 Hauptbereiche

### Text Input

Freitextfeld für Prozessbeschreibung.

Button:

```
Generate Diagram
```


### Editor Canvas

JointJS Canvas.


### Toolbox

Elemente:

- Prozess
- Entscheidung
- Start
- Ende
- Kommentar


### Export Menü

Buttons:

```
Export PNG
Export SVG
Export PDF
Export JSON
```


# 9 Sicherheit

## 9.1 API Keys

Optionen:

- Benutzer gibt Key ein
- Speicherung lokal im Browser

Empfohlen:

```
session storage
```


## 9.2 Datenschutz

- keine Speicherung externer Daten
- keine Serverpersistenz
- Daten verlassen Gerät nur bei KI-Aufruf


# 10 Performance

Erwartete Diagrammgröße:

```
20 – 200 Nodes
```

Ziel:

```
<100 ms Rendering
```


# 11 Nicht-Ziele

Die Anwendung ist **kein BPMN Tool**.

Nicht enthalten:

- Workflow Automation
- Multiuser Kollaboration
- Server Sync
- Versionierung


# 12 Erweiterungsmöglichkeiten (Future)

Mögliche Erweiterungen:

- Swimlanes
- Rollenebenen
- Versionshistorie
- Templatebibliothek
- Import von BPMN
- Mehrsprachigkeit


# 13 Deliverables

Das Entwicklerstudio liefert:

1. PWA Anwendung
2. vollständigen Quellcode
3. Dokumentation
4. Build Pipeline
5. Deployment Anleitung

