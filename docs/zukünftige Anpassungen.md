# Zukünftige Anpassungen

Geplante, noch nicht umgesetzte Erweiterungen. Umgesetzte Punkte stehen im [CHANGELOG](../CHANGELOG.md).

## Offene Punkte aus den Versionen 1.0.0 und 1.1.0

- **Zentraler KI-Zugang:** Kleine Proxy-Funktion (z. B. Vercel Function) mit einem zentralen vhs-API-Key. Nutzende bräuchten keinen eigenen Key mehr, Kosten und Missbrauch wären steuerbar. Voraussetzung: kostenpflichtiges Gemini-Kontingent mit Auftragsverarbeitungsvertrag; Abstimmung mit der bzw. dem Datenschutzbeauftragten. Danach `connect-src` in der CSP auf die eigene Domain beschränken.
- **TypeScript ausweiten:** Weitere Module mit `// @ts-check` versehen und in `vhs-flowchart-editor/jsconfig.json` aufnehmen – als Nächstes `diagram/layout.js`, `diagram/history.js` und `export/process-export.js`.
- **Barrierefreiheitserklärung:** Für eine öffentlich erreichbare Instanz eine formale Erklärung nach BITV 2.0 erstellen (benötigt Kontaktdaten und Feedback-Mechanismus der Einrichtung). Die technische Grundlage ist in `docs/Technische_Spezifikationen.md` (Abschnitt Barrierefreiheit) beschrieben.
- **KI-Glättung der Prozessbeschreibung:** Optional die Schritttexte der exportierten Verfahrensanweisung sprachlich glätten lassen, ohne den Ablauf zu verändern (nur nach Datenschutzhinweis). Bewusst nicht in 1.1.0 umgesetzt, da der Export ohne KI vollständig funktioniert.
- **End-to-End-Tests:** Komponententests für Speichern, Wiederherstellen und Import gibt es seit 1.1.0. Ergänzend könnten Browser-Tests (z. B. Playwright) den kompletten Ablauf im Editor prüfen, inklusive Zeichenfläche (JointJS lässt sich in jsdom nicht vollständig rendern).

## Funktionale Erweiterungen

Bearbeitungskomfort, Prozessbeschreibung und Versionsvergleich sind mit Version 1.1.0 umgesetzt (siehe [CHANGELOG](../CHANGELOG.md)).

### 1. Teilprozesse und Prozesslandkarte

**Ist-Zustand:** Jedes Diagramm steht für sich. Größere Abläufe (z. B. „Kursdurchführung“ mit Anmeldung, Abrechnung, Evaluation) werden entweder unübersichtlich groß oder in getrennte Diagramme ohne Verbindung zerlegt.

**Funktionsumfang:**

- Neuer Elementtyp **„Teilprozess“** (Rechteck mit Doppelrand), der auf ein anderes gespeichertes Diagramm verweist.
- Doppelklick bzw. Button öffnet das verknüpfte Diagramm; eine Brotkrümelnavigation führt zurück.
- Übersicht **„Prozesslandkarte“**: alle Diagramme und ihre Verknüpfungen als Grafik, gruppiert nach Kategorie (z. B. Führung, Kernprozesse, Unterstützung).
- Prozess-Check meldet Teilprozesse, deren Ziel-Diagramm gelöscht wurde.

**Hinweise zur Umsetzung:** Neuer Shape `vhs.Subprocess` in `shapes.js`, Feld `targetDiagramId` im Knoten. Erfordert `schemaVersion` 2 mit Migration; Backup und Import müssen Verweise beim Neuvergeben von IDs umschreiben.

**Akzeptanzkriterien:** Navigation hin und zurück ohne Datenverlust (ungespeicherte Änderungen werden abgefragt); Verweise bleiben nach Backup/Wiederherstellung gültig.

### 2. Freigabe und Pflege von Prozessen (QM-Dokumentenlenkung)

**Ist-Zustand:** Diagramme haben nur Name und Änderungsdatum. Für den Einsatz im Qualitätsmanagement (z. B. LQW, EFQM, ISO 29990) fehlen Status, Verantwortlichkeit und Überprüfungszyklen. Die Diagrammliste lässt sich weder durchsuchen noch ordnen.

**Funktionsumfang:**

- Prozess-Steckbrief je Diagramm: Status (**Entwurf / In Prüfung / Freigegeben / Archiviert**), Prozessverantwortliche Person, Gültig ab, nächste Überprüfung, Kategorie, Schlagworte, Kurzbeschreibung.
- Freigabe mit Name und Datum; Änderung an einem freigegebenen Prozess setzt den Status automatisch auf „Entwurf“ (die freigegebene Fassung bleibt als Version erhalten).
- Diagrammliste mit **Suche**, Filter nach Status/Kategorie/Schlagwort und Sortierung.
- Hinweis auf **fällige Überprüfungen** beim Start der App.
- Steckbrief erscheint im PDF-Export und im Qualitätsbericht (Kopf- bzw. Fußzeile mit Status und Version).

**Hinweise zur Umsetzung:** Felder in `metadata` ergänzen (`normalizeMetadata` erweitern, Migration nicht zwingend nötig). Fortlaufende Fassungsnummer aus der Versionshistorie ableiten.

**Akzeptanzkriterien:** Ein freigegebenes Diagramm ist im Export eindeutig als solches erkennbar; Suche findet Diagramme über Name, Schlagwort und Knotentexte.

## KI-Copilot statt Einmal-Generierung (Prompt)

Analysiere die bestehende KI-Integration in `vhs-flowchart-editor` und entwickle daraus einen geführten KI-Copilot für die Diagrammerstellung.

Ziel:
Die KI soll nicht mehr nur direkt aus Freitext ein Diagramm erzeugen, sondern den Nutzer schrittweise unterstützen: Prozess verstehen, Unklarheiten benennen, optional Rückfragen stellen und erst danach ein Diagramm erzeugen.

Funktionsidee:

- Zweistufiger Ablauf:
  1. Analyse der Prozessbeschreibung
  2. Generierung des Diagramms
- Die KI soll bei unklaren oder lückenhaften Beschreibungen gezielt Rückfragen oder Unsicherheiten ausgeben.
- Der Nutzer soll zwischen Varianten wählen können, z. B.:
  - kompakt
  - fachlich präzise
  - bürgernah formuliert
  - für Schulung/Dokumentation
- Nach der Analyse soll die finale Diagrammgenerierung auf einer verbesserten, expliziten Prozessbeschreibung basieren.
- Optional sinnvoll:
  - Vorschau der erkannten Schritte/Entscheidungen vor dem eigentlichen Rendern
  - Bestätigungsschritt vor Übernahme ins Diagramm

Anforderungen:

- Nutze die bestehende Gemini-Integration als Basis.
- Trenne Prompts, Datenmodelle und UI für Analyse und Generierung sauber.
- Definiere ein strukturiertes Antwortformat für die Analysephase, z. B. mit:
  - erkannte Schritte
  - erkannte Entscheidungen
  - offene Fragen
  - Unsicherheiten
  - empfohlene Darstellungsvariante
- Die Lösung soll robust gegen unvollständige oder fehlerhafte KI-Antworten sein.
- Behalte die bestehende lokale-first-Architektur bei.
- Die UX soll für Nicht-Techniker verständlich bleiben.

Erwartetes Ergebnis:

- Überarbeitete KI-UX statt nur einem simplen Textfeld mit Generate-Button
- Klare Trennung von Analyse und Diagrammerzeugung
- Saubere Fehlerbehandlung
- Gute Erweiterbarkeit für spätere Prompt-Varianten oder weitere Modelle

Prüfe nach der Umsetzung:

- vollständiger Fluss bei guter Eingabe
- sinnvolle Rückfragen bei unklarer Eingabe
- stabile Diagrammerzeugung nach Bestätigung
- verständliche Nutzerführung ohne technische Überforderung
