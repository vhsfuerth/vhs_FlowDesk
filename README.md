# vhs FlowDesk

Browserbasiertes PWA-Tool (Progressive Web App) zur Erstellung algorithmischer Ablaufpläne, Flowcharts und Entscheidungsbäume im vhs Corporate Design. Alle Diagramme bleiben lokal im Browser; nur für die KI-Funktionen werden Daten an den gewählten KI-Anbieter übertragen (Google Gemini, OpenAI, Mistral AI, Anthropic Claude oder ein eigener OpenAI-kompatibler Server).

Aktuelle Version und Änderungen: siehe [CHANGELOG.md](CHANGELOG.md).

## Hauptfunktionen

- **KI-Copilot**: Analysiert eine Prozessbeschreibung per KI (Anbieter frei wählbar), stellt bei Lücken Rückfragen und zeigt das Ergebnis mit Vorschau zur Prüfung, bevor das Diagramm (auf Wunsch mit Swimlanes) entsteht. Alternativ „Direkt erzeugen“ ohne Rückfragen.
- **Visueller Editor**: Diagrammeditor mit JointJS – Elemente per Drag & Drop oder Klick hinzufügen, Mehrfachauswahl, Kopieren/Einfügen, automatisches Anordnen, Ausrichten und Verteilen.
- **Swimlanes (Verantwortungsbereiche)**: Visuelle Abgrenzung von Rollen und Zuständigkeiten direkt im Diagramm.
- **vhs-Starter-Vorlagen**: Sofort nutzbare Vorlagen für typische vhs-Prozesse wie Kursplanung, Dozierenden-Onboarding, Beschwerdebearbeitung oder Raumbuchung.
- **Prozess-Check und Selbstbewertung**: Automatische Strukturprüfung und geleiteter Bewertungs-Wizard (5 Kriterien, 0–3 Punkte).
- **Maßnahmen-Tracking**: Verbesserungsmaßnahmen mit Priorität, Status, Zuständigkeit und Termin.
- **PDF-Qualitätsbericht**: 2-seitiger vhs-Bericht mit Deckblatt, Befunden und Scores.
- **Autosave**: Ungespeicherte Änderungen werden automatisch als Entwurf gesichert und nach einem Absturz oder Neuladen zur Wiederherstellung angeboten.
- **Versionsverlauf und -vergleich**: Automatische Snapshots bei jedem Speichern, Notizen je Version, farbig markierter Vergleich zweier Fassungen und Wiederherstellung.
- **Prozessbeschreibung**: Automatisch erzeugte Verfahrensanweisung als Word-Dokument oder Markdown.
- **Import & Backup**: Projektdateien importieren, alle Diagramme in einer Sicherungsdatei sichern und wieder einspielen.
- **Exporte**: PNG, SVG, PDF (mit vhs-Branding), Projekt-JSON und Maßnahmen-CSV.

---

## Benutzung

### 1. Mit Vorlagen starten

1. Im Header auf **„Vorlagen“** klicken.
2. Eine passende vhs-Starter-Vorlage auswählen.
3. Das Diagramm wird geladen und kann direkt angepasst oder mit KI weiterentwickelt werden.

Sinnvoll für:

- schnelle Einstiege in Workshops
- erste Prozessaufnahme ohne leeres Blatt
- Standardprozesse mit wenig Vorbereitungszeit

### 2. KI-Generierung und Datenschutz

1. In den **Einstellungen** (Zahnrad im Header) den KI-Anbieter wählen und den API-Key hinterlegen. Beim eigenen Server (z. B. ein Angebot des Trägers, ein deutscher Hoster oder ein lokales Ollama) Server-Adresse und Modellnamen eintragen; der Server muss Aufrufe direkt aus dem Browser erlauben (CORS). **Getestet ist bisher nur Google Gemini**; Fehler mit anderen Anbietern bitte per Bugreport beim Autor melden (Anbieter, Modell, Fehlermeldung).
2. Prozess im Feld „KI-Assistent“ beschreiben und **„Mit KI-Copilot erstellen“** klicken.
3. Formulierung wählen (kompakt, fachlich präzise, bürgernah, Schulung) und **„Prozess analysieren“**.
4. Rückfragen beantworten oder überspringen, dann die erkannten Schritte prüfen und bei Bedarf korrigieren.
5. **„Diagramm übernehmen“** öffnet das Ergebnis als neues Diagramm, das anschließend gespeichert wird.
6. Vor der ersten Nutzung erscheint ein **Datenschutzhinweis**, der bestätigt werden muss.

**„Direkt erzeugen“** erstellt wie bisher ohne Rückfragen sofort ein Diagramm.

> **Wichtig:** Was ein Anbieter mit den Daten tun darf, regeln dessen Nutzungsbedingungen. Im kostenlosen Kontingent von Google AI Studio darf Google Eingaben und Antworten zur Verbesserung seiner Dienste verwenden. Keine personenbezogenen Daten (z. B. Namen von Teilnehmenden) und keine vertraulichen Informationen eingeben. Datenschutzfreundlicher sind Anbieter mit Verarbeitung in der EU oder selbst betriebene Modelle. Für vertrauliche Inhalte einen geeigneten Anbieter bzw. ein kostenpflichtiges Kontingent nutzen und vorher mit der bzw. dem Datenschutzbeauftragten abstimmen.

Der API-Key wird nur lokal im Browser gespeichert und ausschließlich im Request-Header an den gewählten Anbieter übertragen. Anbieter und voreingestellte Modelle sind in `vhs-flowchart-editor/src/ai/providers.js` konfiguriert; die Modelle lassen sich in den Einstellungen ändern.

### 3. Bearbeiten, Anordnen und Ausrichten

- **Mehrere Elemente auswählen**: `Strg` oder `Umschalt` gedrückt halten und Elemente anklicken – oder auf freier Fläche mit gedrückter `Umschalt`-Taste einen Rahmen ziehen. Ausgewählte Elemente werden gemeinsam verschoben, kopiert oder gelöscht.
- **Kopieren & Einfügen**: `Strg + C` / `Strg + V` (funktioniert auch zwischen zwei Diagrammen), `Strg + D` dupliziert die Auswahl. Verbindungen zwischen den ausgewählten Elementen werden mitkopiert.
- **Menü „Anordnen“** in der unteren Leiste:
  - *Automatisch anordnen* räumt das ganze Diagramm auf (von oben nach unten oder von links nach rechts). Bei Swimlanes bleibt jeder Schritt in seiner Lane.
  - *Nur Auswahl anordnen* ab zwei ausgewählten Elementen: ordnet nur diese neu, Handanpassungen im übrigen Diagramm bleiben erhalten.
  - *Ausrichten* (links, mittig, rechts, oben, unten) ab zwei ausgewählten Elementen.
  - *Gleichmäßig verteilen* ab drei ausgewählten Elementen.

Alle Aktionen lassen sich mit `Strg + Z` rückgängig machen.

### 4. Swimlanes (Verantwortungsbereiche)

Swimlanes gliedern das Diagramm in Zuständigkeitsbereiche verschiedener Rollen oder Abteilungen.

1. Element **„Swimlane“** aus der Seitenleiste auf die Arbeitsfläche ziehen.
2. In der Eigenschaften-Leiste (rechts, sobald die Lane ausgewählt ist) Bezeichnung und Farbe festlegen sowie die Reihenfolge der Lanes ändern.
   Elemente, die in einer Lane abgelegt werden, gehören zu ihr und wandern beim Verschieben mit; die Lane wächst mit ihrem Inhalt.
3. Mehrere Lanes untereinander anordnen – jede Lane steht für einen Verantwortungsbereich.
4. Prozessschritte innerhalb der zuständigen Lane ablegen und wie gewohnt verbinden.
5. Verbindungen, die eine Lanegrenze kreuzen, zeigen Übergaben zwischen Rollen.

Hinweis: Zwei fertige Swimlane-Vorlagen sind direkt über **„Vorlagen“** abrufbar.

### 5. Prozess-Check verwenden

In der rechten Seitenleiste unter **„Prozess-Check“** gibt es zwei Ebenen:

- **Automatische Prüfung**: Erkennt typische Probleme wie fehlenden Start- oder Endknoten, isolierte Elemente, Sackgassen und unvollständige Entscheidungen.
- **Selbstbewertung**: Bewertet den Prozess mit `0` bis `3` Punkten in den Feldern Klarheit, Medienbruch, Risiko, Teilnehmendenorientierung und Verantwortlichkeit.

Ein Klick auf eine Meldung mit Knotenbezug zeigt die betroffene Stelle direkt im Diagramm an.

### 6. Maßnahmen dokumentieren

Unter **„Maßnahmen“** in der rechten Seitenleiste lassen sich Verbesserungen strukturiert festhalten (Bezugsknoten, Verantwortliche, Priorität, Status, Zieltermin). Die Liste kann als **CSV** exportiert werden, z. B. für Excel.

### 7. Speichern, Autosave und Versionen

- **Speichern** über den Button in der unteren Leiste oder mit `Strg + S`.
- Neben dem Button zeigt ein **Status** an, ob alle Änderungen gespeichert sind oder nur als Entwurf gesichert wurden.
- Ungespeicherte Änderungen werden nach kurzer Zeit automatisch als **Entwurf** gesichert. Beim nächsten Öffnen bietet die App an, den Entwurf wiederherzustellen.
- Bei jedem Speichern entsteht automatisch eine **Version** (max. 10 pro Diagramm), abrufbar über **„Versionen“**. Zu jeder Version lässt sich eine Notiz hinterlegen.
- **Versionen vergleichen**: In der Versionshistorie eine Version mit dem aktuellen Stand vergleichen (Vergleichssymbol) oder zwei Versionen ankreuzen und „Auswahl vergleichen“ wählen. Neue Elemente sind grün, geänderte gelb und entfernte rot gestrichelt markiert; rechts steht die Liste der Änderungen.

### 8. Import & Backup

Alle Diagramme liegen nur im Browser. **Werden die Browserdaten gelöscht, sind auch die Diagramme weg.** Deshalb:

- **„Öffnen“ → „Backup erstellen“** sichert alle Diagramme samt Versionen in eine JSON-Datei.
- **„Öffnen“ → „Importieren“** liest eine Projektdatei (einzelnes Diagramm) oder ein Backup ein. Dateien werden vor dem Import geprüft; fehlerhafte Dateien werden mit einer verständlichen Meldung abgelehnt.

### 9. Exporte

Über die Buttons in der unteren Leiste:

- **PNG / SVG**: Bilddatei des Diagramms mit vhs-Branding.
- **PDF**: Druckoptimiertes Diagramm als PDF.
- **JSON (Projektdatei)**: Vollständiges Diagramm inkl. Metadaten, Bewertungen und Maßnahmen.
- **Beschreibung (Word / Markdown)**: Verfahrensanweisung mit nummerierten Schritten, Entscheidungszweigen, Zuständigkeiten aus den Swimlanes, Hinweisen aus Kommentaren und Rollenübersicht – für Handbuch, Einarbeitung oder Intranet.
- **PDF-Qualitätsbericht** (aus dem Prozess-Check): 2-seitiger vhs-Bericht.
- **Maßnahmen-CSV** (aus dem Prozess-Check): Für Aufgabenlisten und Nachverfolgung.

### 10. Tastenkombinationen

| Tastenkombination | Funktion |
|---|---|
| `Strg + S` | Speichern |
| `Strg + Z` | Rückgängig |
| `Strg + Y` / `Strg + Umschalt + Z` | Wiederholen |
| `Entf` / `Rücktaste` | Auswahl löschen |
| `Strg` / `Umschalt` + Klick | Element zur Auswahl hinzufügen oder entfernen |
| `Umschalt` + Ziehen (freie Fläche) | Rahmenauswahl |
| `Strg + A` | Alles auswählen |
| `Strg + C` / `Strg + V` | Kopieren / Einfügen |
| `Strg + D` | Duplizieren |
| Pfeiltasten | Auswahl verschieben (mit `Umschalt` in kleinen Schritten) |
| `Strg + Mausrad` | Zoom |
| `Strg + +` / `Strg + -` | Zoom rein / raus |
| `Strg + 0` | Zoom zurücksetzen |
| `Strg + Umschalt + 1` | Alles einpassen (ganzes Diagramm sichtbar) |
| `Esc` | Dialog schließen bzw. Auswahl aufheben |
| Doppelklick / `F2` / `Enter` | Text direkt auf der Fläche bearbeiten |
| Lostippen | Text des ausgewählten Elements ersetzen |
| Rechtsklick auf ein Element | Eigenschaften ein-/ausblenden |
| `Alt` beim Ziehen | Hilfslinien/Einrasten abschalten |

### Barrierefreiheit

Dialoge, Menüs und die Elementleiste sind per Tastatur bedienbar (Fokusführung, `Esc`, `Tab`), Icon-Buttons haben Beschriftungen für Screenreader, und Statusmeldungen werden angesagt. Elemente lassen sich per Tastatur einfügen, auswählen (`Strg + A`), verschieben (Pfeiltasten), kopieren und anordnen. Das Verbinden von Elementen erfordert weiterhin eine Maus – das ist bei grafischen Diagrammeditoren technisch bedingt.

---

## Technologien

- Frontend: React 19 + Vite
- Styling: Tailwind CSS v4
- Diagramm-Engine: JointJS + Dagre.js
- Storage: IndexedDB (Diagramme, Versionen, Autosave-Entwürfe)
- Export: jsPDF und docx (bei Bedarf nachgeladen), SVG, PNG, JSON, CSV, Markdown
- Qualitätssicherung: Vitest, ESLint, TypeScript-Prüfung (JSDoc), GitHub Actions

## Entwicklung

Alle Befehle im Ordner `vhs-flowchart-editor/` (Node.js ≥ 20):

```bash
npm install        # Abhängigkeiten installieren
npm run dev        # Entwicklungsserver
npm run check      # Lint + Typprüfung + Tests
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal testen (mit denselben Sicherheits-Headern wie auf Vercel)
```

Details zu Architektur und Datenformat: [docs/Technische_Spezifikationen.md](docs/Technische_Spezifikationen.md).

**Versionierung:** Die Versionsnummer folgt [Semantic Versioning](https://semver.org/lang/de/) und steht in `vhs-flowchart-editor/package.json`. Sie wird in den Einstellungen und in der Anleitung angezeigt. Jede Änderung wird in [CHANGELOG.md](CHANGELOG.md) dokumentiert.

**Prüfungen vor dem Deploy:** Der Vercel-Build führt Lint, Typprüfung, Tests und Build aus (`npm run check`) – schlägt ein Test fehl, wird nicht deployt. Lokal lässt sich dasselbe mit `npm run check` prüfen.

---

## Weitergabe und Hosting

### 1. Als Web-App

1. Die Datei `build.bat` im Hauptverzeichnis ausführen.
2. Warten, bis der Build abgeschlossen ist.
3. Den Inhalt von `vhs-flowchart-editor/dist/` auf einen statischen Webserver hochladen.

Geeignet für Intranet, GitHub Pages oder allgemeinen Webspace.

### 2. Intranet-Hosting

1. `npm run build` ausführen.
2. Den Inhalt von `dist/` auf den internen Webserver kopieren.
3. Eine interne URL wie `workflow.vhs.local` auf diesen Server zeigen lassen.

### 3. Hosting auf Vercel (öffentlich, kostenlos)

Vercel eignet sich besonders, weil es keine Server-Komponente gibt. Der Build läuft automatisch bei jedem Git-Push.

**Voraussetzungen:**

- Projekt liegt auf GitHub (oder GitLab / Bitbucket)
- Kostenloses Vercel-Konto unter [vercel.com](https://vercel.com)

**Einmalige Einrichtung:**

1. Auf [vercel.com/new](https://vercel.com/new) einloggen und „Import Git Repository“ wählen.
2. Das GitHub-Repo auswählen und auf **Deploy** klicken.
3. Vercel erkennt `vercel.json` automatisch – kein manuelles Konfigurieren nötig.
4. Nach wenigen Sekunden ist die App unter einer `*.vercel.app`-URL erreichbar.

**Alternativ per CLI:**

```bash
npx vercel --prod
```

Jeder `git push` auf den `master`-Branch löst einen neuen Build aus. Der Build bricht ab, wenn Lint, Typprüfung oder Tests fehlschlagen.

**Enthaltene Sicherheits-Header (via `vercel.json`):**

| Header | Schutz gegen |
|---|---|
| Content-Security-Policy | XSS, unerlaubte externe Ressourcen (Skripte nur von der eigenen Domain, kein `eval`) |
| X-Frame-Options: DENY | Clickjacking |
| X-Content-Type-Options: nosniff | MIME-Sniffing |
| Referrer-Policy | Datenlecks über Referer-Header |
| Permissions-Policy | Kamera, Mikrofon, Geolocation gesperrt |

> **Hinweis zum API-Key:** Der API-Key wird lokal im Browser gespeichert und nur an den gewählten KI-Anbieter übertragen, nicht an Vercel oder andere Server. Damit eigene Server erreichbar sind, erlaubt die CSP Verbindungen zu beliebigen HTTPS-Adressen sowie zu `http://localhost`.

### 4. Als ZIP-Archiv

- Den gesamten Projektordner als `.zip` weitergeben.
- Voraussetzung: Node.js ist auf dem Zielrechner installiert.
- Einmalig `install.bat`, danach Start über `start.bat` (im Ordner `vhs-flowchart-editor`).

### Beispiel für Ubuntu/Nginx

1. Build lokal erstellen.
2. Inhalt von `dist/` nach `/var/www/flowdesk` kopieren.
3. Nginx für den Ordner konfigurieren:

```nginx
server {
    listen 80;
    server_name workflow.vhs.local;
    root /var/www/flowdesk;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

4. Site aktivieren und Nginx neu starten.

Bei eigenem Hosting die Sicherheits-Header aus `vercel.json` (insbesondere die Content-Security-Policy) ebenfalls im Webserver setzen.

## Lizenz

MIT License – siehe [LICENSE](LICENSE).

---
Erstellt für die vhs im Rahmen der Prozess-Digitalisierung 2026. Die Software ist mithilfe von [Claude Code](https://claude.com/claude-code), dem KI-Programmierassistenten von Anthropic, entstanden.
