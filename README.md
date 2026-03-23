# vhs Workflow-Algorithm Editor

Lokal laufendes PWA-Tool (Progressive Web App) zur Erstellung algorithmischer Ablaufplaene, Flowcharts und Entscheidungsbaeume im vhs Corporate Design.

## Hauptfunktionen

- **KI-Diagramm-Generierung**: Erzeugt Diagramme direkt aus einer Prozessbeschreibung per Google Gemini API.
- **Visueller Editor**: Drag-and-drop-basierter Diagrammeditor mit JointJS.
- **Swimlanes (Verantwortungsbereiche)**: Visuelle Abgrenzung von Rollen und Zust\u00e4ndigkeiten direkt im Diagramm.
- **vhs-Starter-Vorlagen**: Sofort nutzbare Vorlagen fuer typische vhs-Prozesse wie Kursplanung, Dozierenden-Onboarding, Beschwerdebearbeitung oder Raumbuchung.
- **Prozess-Check und Selbstbewertung**: Automatische Strukturpr\u00fcfung und geleiteter Bewertungs-Wizard (5 Kriterien, 0\u20133 Punkte).
- **Ma\u00dfnahmen-Tracking**: Verbesserungsma\u00dfnahmen mit Priorit\u00e4t, Status, Zust\u00e4ndigkeit und Termin.
- **PDF-Qualit\u00e4tsbericht**: Professioneller 2-seitiger vhs-Bericht mit Deckblatt, Befunden und Scores.
- **Versionsverlauf**: Automatische Snapshots bei jedem Speichern mit M\u00f6glichkeit zur Wiederherstellung.
- **Exporte**: PNG, SVG, PDF (mit vhs-Branding), Projekt-JSON und Ma\u00dfnahmen-CSV.

---

## Benutzung

### 1. Mit Vorlagen starten

1. Im Header auf **"Vorlagen"** klicken.
2. Eine passende vhs-Starter-Vorlage auswaehlen.
3. Das Diagramm wird geladen und kann direkt angepasst oder mit KI weiterentwickelt werden.

Sinnvoll fuer:
- schnelle Einstiege in Workshops
- erste Prozessaufnahme ohne leeres Blatt
- Standardprozesse mit wenig Vorbereitungszeit

### 2. Swimlanes (Verantwortungsbereiche)

Swimlanes gliedern das Diagramm in Zust\u00e4ndigkeitsbereiche verschiedener Rollen oder Abteilungen.

1. Element **„Swimlane"** aus der Seitenleiste auf die Arbeitsfl\u00e4che ziehen.
2. Doppelklick \u00f6ffnet den Bearbeitungsdialog: Bezeichnung und Farbakzent frei w\u00e4hlbar.
3. Mehrere Lanes untereinander anordnen \u2013 jede Lane steht f\u00fcr einen Verantwortungsbereich.
4. Prozessschritte innerhalb der zust\u00e4ndigen Lane ablegen und wie gewohnt verbinden.
5. Verbindungen, die eine Lanegrenze kreuzen, zeigen \u00dcbergaben zwischen Rollen.

Hinweis: Zwei fertige Swimlane-Vorlagen sind direkt \u00fcber **„Vorlagen"** abrufbar.

### 3. Prozess-Check verwenden

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

Hinweis: Ein Klick auf eine Meldung mit Knotenzug zeigt die betroffene Stelle direkt im Diagramm an.

### 4. Massnahmen dokumentieren

Unter **"Massnahmen"** in der rechten Seitenleiste lassen sich Verbesserungen strukturiert festhalten:

- Massnahme benennen
- Bezugsknoten auswaehlen
- Verantwortliche Person erfassen
- Prioritaet und Status pflegen
- Zieltermin setzen

Die Liste kann anschliessend als **CSV** exportiert werden, zum Beispiel fuer Excel oder andere Nachverfolgungslisten.

### 5. Versionsverlauf

Bei jedem Speichern wird automatisch ein Snapshot des Diagramms angelegt.

- Button **„Versionen"** in der unteren Leiste \u00f6ffnet die Versionshistorie.
- Fr\u00fchere Zust\u00e4nde k\u00f6nnen angezeigt und wiederhergestellt werden.
- Verf\u00fcgbar sobald ein Diagramm gespeichert wurde.

### 6. Exporte

\u00dcber die Buttons in der unteren Leiste stehen folgende Exporte bereit:

- **PNG / SVG**: Bilddatei des Diagramms mit vhs-Branding.
- **PDF**: Druckoptimiertes Diagramm als PDF.
- **JSON (Projektdatei)**: Vollst\u00e4ndiges Diagramm inkl. Metadaten, Bewertungen und Ma\u00dfnahmen.
- **PDF-Qualit\u00e4tsbericht** (aus dem Prozess-Check): 2-seitiger vhs-Bericht mit Deckblatt, Befunden, Scores und Ma\u00dfnahmen.
- **Ma\u00dfnahmen-CSV** (aus dem Prozess-Check): F\u00fcr Aufgabenlisten und Nachverfolgung.

### 7. Tastenkombinationen

| Tastenkombination | Funktion |
|---|---|
| `Strg + Z` | R\u00fckg\u00e4ngig |
| `Strg + Y` / `Strg + Umschalt + Z` | Wiederholen |
| `Entf` / `Backspace` | Ausgew\u00e4hltes Element l\u00f6schen |
| `Strg + Mausrad` | Zoom |
| `Strg + +` / `Strg + -` | Zoom rein / raus |
| `Strg + 0` | Zoom zur\u00fccksetzen |
| Doppelklick | Text bearbeiten |

---

## Technologien

- Frontend: React 19 + Vite
- Styling: Tailwind CSS v4
- Diagramm-Engine: JointJS + Dagre.js
- Storage: IndexedDB (Diagramme + Versionen)
- Export: jsPDF, SVG, PNG, JSON, CSV

---

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

## Lizenz

MIT License – siehe [LICENSE](LICENSE).

---
Erstellt fuer die vhs im Rahmen der Prozess-Digitalisierung 2026.
