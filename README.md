# vhs Workflow-Algorithm Editor

Lokal laufendes PWA-Tool (Progressive Web App) zur Erstellung algorithmischer Ablaufplaene, Flowcharts und Entscheidungsbaeume im vhs Corporate Design.

## Hauptfunktionen

- **KI-Diagramm-Generierung**: Erzeugt Diagramme direkt aus einer Prozessbeschreibung per Google Gemini API.
- **Visueller Editor**: Drag-and-drop-basierter Diagrammeditor mit JointJS.
- **vhs-Starter-Vorlagen**: Sofort nutzbare Vorlagen fuer typische vhs-Prozesse wie Kursplanung, Dozierenden-Onboarding, Beschwerdebearbeitung oder Raumbuchung.
- **Prozess-Check und Selbstbewertung**: Automatische Strukturpruefung plus schlanke Reflexion in fuenf OE-Feldern.
- **Massnahmen-Overlay**: Verbesserungsmassnahmen mit Bezug auf einzelne Prozessschritte direkt am Diagramm pflegen.
- **Workshop-Modus**: Schrittweise Moderationsansicht fuer Teamgespraeche und Prozessworkshops.
- **Speicherverwaltung**: Mehrere Diagramme lokal speichern, laden, umbenennen und loeschen.
- **Offline-faehig**: Editor, Laden, Speichern und Exporte funktionieren auch ohne Internet. Nur die KI-Funktion benoetigt Netzverbindung.
- **Lokale Datenhaltung**: Diagramme, Projektmetadaten und API-Key bleiben lokal im Browser gespeichert.

## Letzte Erweiterungen

- **Vorlagenbibliothek**: Neue Starter-Vorlagen erleichtern den Einstieg in typische Volkshochschulprozesse.
- **Qualitaetsleiste**: Rechte Seitenleiste mit Strukturpruefung, EFQM-naher Selbstbewertung und Massnahmenverwaltung.
- **Workshop-Modus**: Moderationsansicht mit Schritt-Navigation, Fokusmodus und Export einer Workshop-Zusammenfassung.
- **Erweiterte Exporte**: Projektdatei mit Metadaten, Massnahmenliste als CSV und Workshop-Notizen als TXT.
- **Manuelle Verbindungen**: Elemente besitzen Ports an den Raendern, von denen aus Verbindungen per Maus gezogen werden koennen.
- **Dynamisches Text-Sizing**: Elemente skalieren automatisch mit der Textmenge.
- **Reset-Funktion**: Ein dedizierter Button erlaubt das schnelle Leeren der Arbeitsflaeche.

## Erste Schritte / Installation

1. Stelle sicher, dass [Node.js](https://nodejs.org) installiert ist.
2. Fuehre die Datei `install.bat` per Doppelklick aus.
3. Starte das Tool kuenftig mit einem Klick auf `start.bat`.
4. Oeffne `http://localhost:5173` im Browser. Chrome oder Edge werden empfohlen.
5. Trage deinen Google-Gemini-API-Key in den Einstellungen ein.

## Lokale Nutzung und PWA

Da das Tool als Progressive Web App entwickelt wurde, kann es wie eine normale Desktop-Anwendung installiert werden:

1. In Chrome oder Edge in der Adresszeile auf "App installieren" klicken.
2. Die App erscheint danach mit eigenem Icon und ohne Browserleisten.
3. Alle Daten bleiben weiterhin lokal auf dem jeweiligen Geraet.

## Nutzung im Alltag

- **Elemente verbinden**: Mit der Maus ueber einen Knoten fahren, einen Port anklicken und die Verbindung zum Zielelement ziehen.
- **Text bearbeiten**: Doppelklick auf ein Element oder eine Verbindung, um den Text direkt anzupassen.
- **Speichern**: Ueber den Button "Speichern" wird das aktuelle Projekt lokal in IndexedDB gesichert.
- **Laden**: Ueber "Oeffnen" lassen sich gespeicherte Diagramme wieder aufrufen.

## Neue Funktionen nutzen

### 1. Mit Vorlagen starten

1. Im Header auf **"Vorlagen"** klicken.
2. Eine passende vhs-Starter-Vorlage auswaehlen.
3. Das Diagramm wird geladen und kann direkt angepasst oder mit KI weiterentwickelt werden.

Sinnvoll fuer:
- schnelle Einstiege in Workshops
- erste Prozessaufnahme ohne leeres Blatt
- Standardprozesse mit wenig Vorbereitungszeit

### 2. Prozess-Check verwenden

In der rechten Seitenleiste unter **"Prozess-Check"** gibt es zwei Ebenen:

- **Automatische Pruefung**:
  Erkennt typische Probleme wie fehlenden Start- oder Endknoten, isolierte Elemente, Sackgassen und unvollstaendige Entscheidungen.
- **Selbstbewertung**:
  Bewertet den Prozess mit `0` bis `3` Punkten in diesen fuenf Feldern:
  - Klarheit
  - Medienbruch
  - Risiko
  - Teilnehmendenorientierung
  - Verantwortlichkeit

Hinweis:
Ein Klick auf eine Meldung mit Knotenzug zeigt die betroffene Stelle direkt im Diagramm an.

### 3. Massnahmen dokumentieren

Unter **"Massnahmen"** in der rechten Seitenleiste lassen sich Verbesserungen strukturiert festhalten:

- Massnahme benennen
- Bezugsknoten auswaehlen
- Verantwortliche Person erfassen
- Prioritaet und Status pflegen
- Zieltermin setzen

Die Liste kann anschliessend als **CSV** exportiert werden, zum Beispiel fuer Excel oder andere Nachverfolgungslisten.

### 4. Workshop-Modus fuer Teamgespraeche

Der Button **"Workshop"** in der unteren Leiste aktiviert den Moderationsmodus.

Moeglichkeiten:
- Schrittweise Navigation durch den Prozess
- Fokus auf den jeweils aktuellen Prozessschritt
- Diskussionspunkte direkt pro Schritt dokumentieren
- Export einer kompakten Workshop-Zusammenfassung als `.txt`

Typischer Ablauf:
1. Diagramm oder Vorlage laden.
2. Workshop-Modus starten.
3. Schritt fuer Schritt durch den Prozess gehen.
4. Beobachtungen, Entscheidungen oder offene Fragen als Diskussionspunkte notieren.
5. Ergebnisse speichern oder als Workshop-Datei exportieren.

### 5. Erweiterte Exporte

Neben PNG, SVG und PDF stehen nun weitere Exporte zur Verfuegung:

- **Projekt-JSON**: Enthaeelt Diagramm plus Metadaten wie Bewertungen, Massnahmen und Workshop-Notizen.
- **Massnahmen-CSV**: Fuer Aufgabenlisten und Nachverfolgung.
- **Workshop-TXT**: Fuer Besprechungsdokumentation und Protokolle.

## Technologien

- Frontend: React 19 + Vite
- Styling: Tailwind CSS v4
- Diagramm-Engine: JointJS + Dagre.js
- Storage: IndexedDB
- Export: jsPDF, SVG, PNG, JSON, CSV, TXT

## Weitergabe und Hosting

Wenn du die Software an Kolleginnen und Kollegen weitergeben moechtest, gibt es drei praktikable Wege:

### 1. Als Web-App

1. Die Datei `build.bat` im Hauptverzeichnis ausfuehren.
2. Warten, bis der Build abgeschlossen ist.
3. Den Inhalt von `vhs-flowchart-editor/dist/` auf einen statischen Webserver hochladen.

Geeignet fuer Intranet, GitHub Pages oder allgemeinen Webspace.

### 2. Intranet-Hosting

1. `npm run build` ausfuehren.
2. Den Inhalt von `dist/` auf den internen Webserver kopieren.
3. Eine interne URL wie `workflow.vhs.local` auf diesen Server zeigen lassen.

### 3. Als ZIP-Archiv

- Den gesamten Projektordner als `.zip` weitergeben.
- Voraussetzung: Node.js ist auf dem Zielrechner installiert.
- Start ueber `start.bat`.

### Beispiel fuer Ubuntu/Nginx

1. Build lokal erstellen.
2. Inhalt von `dist/` nach `/var/www/workflow-editor` kopieren.
3. Nginx fuer den Ordner konfigurieren:

```nginx
server {
    listen 80;
    server_name workflow.vhs.local;
    root /var/www/workflow-editor;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

4. Site aktivieren und Nginx neu starten.

---
Erstellt fuer die vhs im Rahmen der Prozess-Digitalisierung 2026.
