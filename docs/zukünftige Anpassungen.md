# Zukünftige Anpassungen

## Prompt 1: Autosave + Wiederherstellung

Analysiere die bestehende React/Vite-Anwendung `vhs-flowchart-editor` und implementiere ein robustes Autosave- und Wiederherstellungssystem für den Diagrammeditor.

Ziel:
Die Anwendung soll Nutzer vor Datenverlust schützen. Änderungen am Diagramm sollen automatisch lokal als Entwurf gespeichert werden, auch wenn nicht manuell auf „Speichern“ geklickt wurde. Beim erneuten Öffnen der App soll ein nicht final gespeicherter Entwurf erkannt und zur Wiederherstellung angeboten oder automatisch geladen werden.

Anforderungen:
- Nutze die bestehende Architektur mit React, JointJS, IndexedDB und `localStorage`.
- Ergänze einen klaren Unterschied zwischen:
  - manuell gespeicherten Diagrammen
  - automatisch gespeicherten Entwürfen
- Speichere bei Änderungen am Diagramm in sinnvollen Intervallen automatisch einen lokalen Entwurf.
- Zeige im UI den Status an, z. B. „Alle Änderungen gespeichert“, „Ungespeicherte Änderungen“, „Entwurf wiederhergestellt“.
- Beim Start der App:
  - Prüfe, ob ein neuerer Autosave-Entwurf als die zuletzt manuell gespeicherte Version existiert.
  - Falls ja, biete Wiederherstellung an oder lade ihn nach klarer Regel automatisch.
- Beim manuellen Speichern soll der Entwurfsstatus sauber aktualisiert werden.
- Berücksichtige auch leere neue Diagramme, gelöschte Diagramme und App-Neustarts.
- Implementiere keine Server-Synchronisation, nur lokale Speicherung.
- Halte die UX einfach und verlässlich.

Erwartetes Ergebnis:
- Vollständig integrierte Funktion mit UI-Feedback
- Saubere Datenstruktur für Autosave/Recovery
- Sinnvolle Fehlersicherheit
- Falls nötig: kleine Refactorings in `App.jsx`, Storage-Modulen und Editor-Events

Prüfe nach der Umsetzung:
- Autosave nach Diagrammänderungen
- Wiederherstellung nach Reload
- Kein Überschreiben falscher Diagramme
- Korrektes Verhalten nach manuellem Speichern

## Prompt 3: Flowchart-Check / Diagrammvalidierung

Analysiere die bestehende Anwendung `vhs-flowchart-editor` und erweitere sie um eine intelligente Diagrammvalidierung, die die Qualität und Vollständigkeit eines Flowcharts prüft.

Ziel:
Die App soll nicht nur Diagramme zeichnen, sondern auch fachliche und strukturelle Probleme im Diagramm erkennen und dem Nutzer verständlich anzeigen.

Zu prüfende Regeln:
- fehlender Startknoten
- mehrere Startknoten
- fehlender Endknoten
- isolierte Knoten ohne Verbindungen
- Sackgassen ohne sinnvollen Abschluss
- Entscheidungs-Knoten mit weniger als zwei ausgehenden Verbindungen
- Entscheidungs-Ausgänge ohne Beschriftung
- optionale Hinweise für ungewöhnliche Strukturen, z. B. sehr lange lineare Ketten oder unverbundene Annotationen

Anforderungen:
- Nutze das vorhandene JSON-/Graph-Modell des Editors.
- Implementiere eine Validierungslogik, die aus dem aktuellen Diagramm strukturierte Findings erzeugt.
- Integriere eine UI-Komponente, die Warnungen und Fehler übersichtlich anzeigt.
- Jede Meldung soll möglichst verständlich formuliert sein.
- Wenn sinnvoll, soll ein Klick auf eine Meldung das betroffene Element im Canvas fokussieren oder hervorheben.
- Die Validierung soll lokal und ohne KI funktionieren.
- Sie soll performant genug für typische Diagrammgrößen bleiben.
- Bevorzuge eine Lösung, die erweiterbar ist, damit später weitere Regeln ergänzt werden können.

Erwartetes Ergebnis:
- Validierungsmodul mit klarer Regelstruktur
- UI für Fehler/Warnungen/Hinweise
- Integration in den bestehenden Editor-Workflow
- Gute Nutzbarkeit für fachliche Anwender, nicht nur Entwickler

Prüfe nach der Umsetzung:
- Fehlererkennung bei absichtlich fehlerhaften Diagrammen
- keine Fehlalarme bei einfachen korrekten Diagrammen
- sinnvolle Reaktion beim Fokussieren betroffener Knoten

## Prompt 4: KI-Copilot statt Einmal-Generierung

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
