# Zukünftige Anpassungen

Geplante, noch nicht umgesetzte Erweiterungen. Umgesetzte Punkte stehen im [CHANGELOG](../CHANGELOG.md).

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
