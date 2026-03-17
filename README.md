# vhs Workflow-Algorithm Editor

Lokal laufendes PWA-Tool (Progressive Web App) zur Erstellung algorithmischer Ablaufplaene, Flowcharts und Entscheidungsbaeume im vhs Corporate Design.

## Hauptfunktionen

- **KI-Diagramm-Generierung**: Erzeugt Diagramme direkt aus einer Prozessbeschreibung per Google Gemini API.
- **Visueller Editor**: Drag-and-drop-basierter Diagrammeditor mit JointJS.
- **vhs-Starter-Vorlagen**: Sofort nutzbare Vorlagen fuer typische vhs-Prozesse wie Kursplanung, Dozierenden-Onboarding, Beschwerdebearbeitung oder Raumbuchung.
- **Prozess-Check und Selbstbewertung**: AutomatisFol

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

### 3. Hosting auf Vercel (öffentlich, kostenlos)

Vercel ist ein kostenloser Hosting-Dienst, der sich für dieses Projekt besonders eignet, weil es keine Server-Komponente gibt. Der Build läuft automatisch bei jedem Git-Push.

**Voraussetzungen:**
- Projekt liegt auf GitHub (oder GitLab / Bitbucket)
- Kostenloses Vercel-Konto unter [vercel.com](https://vercel.com)

**Einmalige Einrichtung:**

1. Auf [vercel.com/new](https://vercel.com/new) einloggen und „Import Git Repository" wählen.
2. Das GitHub-Repo auswählen und auf **Deploy** klicken.
3. Vercel erkennt `vercel.json` automatisch – kein manuelles Konfigurieren nötig.
4. Nach wenigen Sekunden ist die App unter einer `*.vercel.app`-URL erreichbar.

**Alternativ per CLI:**

```bash
npx vercel --prod
```

**Automatische Updates:**

Ab sofort löst jeder `git push` auf den `master`-Branch automatisch einen neuen Build und Deploy auf Vercel aus.

**Enthaltene Sicherheits-Header (via `vercel.json`):**

| Header | Schutz gegen |
|---|---|
| Content-Security-Policy | XSS, unerlaubte externe Ressourcen |
| X-Frame-Options: DENY | Clickjacking |
| X-Content-Type-Options: nosniff | MIME-Sniffing |
| Referrer-Policy | Datenlecks über Referer-Header |
| Permissions-Policy | Kamera, Mikrofon, Geolocation gesperrt |

> **Hinweis zum API-Key:** Der Google-Gemini-API-Key wird weiterhin lokal im Browser gespeichert und nicht an Vercel oder andere Server übertragen.

### 4. Als ZIP-Archiv

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
