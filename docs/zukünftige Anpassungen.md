# Zukünftige Anpassungen

Geplante, noch nicht umgesetzte Erweiterungen. Umgesetzte Punkte stehen im [CHANGELOG](../CHANGELOG.md).

## KI-Copilot – nächste Ausbaustufen

Der geführte KI-Copilot ist mit Version 1.2.0 umgesetzt (siehe [CHANGELOG](../CHANGELOG.md) und `docs/Technische_Spezifikationen.md`, Abschnitt 3.5). Bewusst noch offen:

- **Umformulieren ohne neue Analyse:** Beim Wechsel der Variante in der Prüfansicht nur die Beschriftungen neu formulieren lassen (IDs bleiben, Struktur unverändert). Heute: zurück zur Beschreibung und erneut analysieren.
- **Copilot für bestehende Diagramme:** Aktuelles Diagramm in ein Prozessmodell zurückübersetzen, um Lücken finden oder den Prozess erweitern zu lassen.
- ✅ **Schritt-Erläuterungen als eigenes Feld** (umgesetzt in 1.5.0, Eigenschaften-Leiste): Erläuterung, Dokument, IT-System und Dauer/Frist je Schritt erscheinen in der Prozessbeschreibung. Seit 1.5.0 füllt auch der KI-Copilot diese Felder.
- **Schritte in der Prüfansicht ergänzen und umsortieren** (heute: ändern und entfernen).
- **Prompt-Prüfung mit echten Beschreibungen:** Eine feste Sammlung typischer vhs-Prozessbeschreibungen (gut, lückenhaft, sehr lang, Stichpunkte, mit/ohne Rollen) gegen die aktuellen Modelle der unterstützten Anbieter laufen lassen und die Ergebnisse festhalten, bevor Prompts geändert werden.
