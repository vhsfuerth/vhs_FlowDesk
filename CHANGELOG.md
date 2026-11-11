# Changelog

Alle nennenswerten Änderungen an vhs FlowDesk (früher „vhs Workflow-Algorithm Editor“). Die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [1.6.5] – 2026-11-11

### Geändert

- **FlowDesk-Logo statt vhs-Fürth-Logo:** vhs FlowDesk ist kein reines Projekt der vhs Fürth mehr. Das Logo der vhs Fürth ist aus der Kopfzeile und aus den Exporten entfernt, an seiner Stelle steht das FlowDesk-Logo.
  - Kopfzeile: FlowDesk-Logo links.
  - Bildexport (SVG, PNG, PDF): FlowDesk-Logo im Kopf neben dem Titel. Der Titel steht jetzt in der Hausschrift (Arial) statt in der nicht geladenen Schrift „Outfit“.
  - PDF-Qualitätsbericht: FlowDesk-Logo im blauen Kopf, mit blauem statt weißem Hintergrund an den abgerundeten Ecken. Kann es nicht geladen werden, steht dort „FlowDesk“ statt „vhs“. In der Fußzeile jeder Seite steht jetzt „vhs FlowDesk“ statt des alten Namens „vhs Flowchart-Editor“.
  - Die Bilddateien `Logo_HQ_pos.png` und `logo_HQ_neg.png` sind entfernt. Neu ist `flowdesk-logo-320.png` für scharfe Exporte, es ist auch offline verfügbar.
- **Programmname prominenter:** In der Kopfzeile steht „vhs FlowDesk“ jetzt groß neben dem Logo (Hauptüberschrift der Seite). Rechts davon, durch eine Linie getrennt, folgt das geöffnete Diagramm mit der kleinen Überschrift „Diagramm“. Bisher stand „FlowDesk“ nur klein und blass über dem Dateinamen. Das kleine Symbol vor „FlowDesk“ entfällt. Bei mittleren Bildschirmbreiten werden Programmname und Diagrammname kleiner bzw. früher gekürzt, damit das Menü rechts sichtbar bleibt.

### Behoben

- Fehlt das Logo für einen Export oder liefert der Server statt eines Bildes eine andere Seite, wird es weggelassen (bzw. durch „FlowDesk“ ersetzt). Bisher konnte der PDF-Qualitätsbericht in diesem Fall ganz scheitern.

## [1.6.4] – 2026-11-10

Punkt 3 aus `improvement.md`: `DiagramCanvas.jsx` verschlanken. Für Nutzende ändert sich nichts.

### Code

- `DiagramCanvas.jsx` von 791 auf 487 Zeilen. Die Komponente verdrahtet nur noch.
  - `diagram/canvas-editing.js`: Bearbeitungsbefehle über dem Graphen, ohne React. Folgeschritt anhängen, Löschen mit Überbrücken, Verschieben, Ausrichten, Teil-Layout, Kopieren und Einfügen.
  - `diagram/canvas-events.js`: Ereignisse der Fläche (Doppelklick, Rechtsklick, „+“-Griff, Teilprozess-Symbol, X am Element, Fokus, Scrollen). Sie werden jetzt beim Abbau auch abgemeldet.
  - `hooks/useInlineEdit.js`: Text direkt auf der Fläche bearbeiten.
  - `hooks/useCanvasViewport.js`: Zoom, Zentrieren, Alles einpassen, Springen zu einem Element, Präsentationsfokus, Navigation über die Übersichtskarte.
- Der Init-Effekt meldet nur noch Module an und ab (eine Liste von `detach`-Funktionen).
- Tests der neuen Module in `diagram/canvas-modules.test.js`: Paper-Attrappe für die Ereignisse, echter Graph für die Bearbeitungsbefehle.

## [1.6.3] – 2026-11-06

Punkt 2 aus `improvement.md`: `App.jsx` verschlanken, dazu Korrekturen aus Code-Reviews von `src/hooks`, `src/ai` und `src/storage`.

### Behoben

- Mehrfaches Strg+S kurz hintereinander (z. B. gedrückt gehaltene Taste nach einer Umbenennung) legte mehrere Speicherstände an. Es wird jetzt nur einmal gespeichert.
- Nach „Direkt erzeugen“ wurde 0,5 s später automatisch gespeichert. Hatte man inzwischen ein anderes Diagramm geöffnet, wurde dieses unter dem Namen „KI Generiertes Diagramm“ gespeichert. Das verzögerte Speichern wird jetzt abgebrochen, sobald ein anderes Diagramm geöffnet wird.
- Exportfehler ohne Fehlertext zeigen jetzt „Der Export ist fehlgeschlagen.“ statt still abzubrechen.
- Tastenereignisse ohne Taste (z. B. Autofill des Browsers) lösen keinen Fehler mehr aus.
- **Speicher und Sicherung:**
  - Beim Einspielen einer Sicherung werden die Autosave-Entwürfe der eingespielten Diagramme verworfen. Bisher konnte danach ein älterer Entwurf zur Wiederherstellung angeboten werden und den eingespielten Stand ersetzen.
  - Auch beim Einspielen bleiben höchstens 10 Versionen je Diagramm.
  - Eine Sicherungsdatei mit mehreren Diagrammen derselben ID wird abgelehnt, statt Diagramme still zu überschreiben.
  - Ein unlesbarer Datensatz (z. B. aus einer neueren App-Version) wird in Liste und Versionshistorie übersprungen, statt sie scheitern zu lassen. Die **Sicherung** bricht in diesem Fall dagegen weiter mit einer Fehlermeldung ab, damit nichts unbemerkt in ihr fehlt.
  - Schlägt das Schreiben einer Version oder einer Sicherung fehl, bleibt kein unbehandelter Fehler zurück.
  - Versionen ohne Inhalt erscheinen nicht mehr als leeres Diagramm in der Versionshistorie.
  - Verweigert der Browser die Schätzung des freien Speichers, kann trotzdem gespeichert werden.
- **KI „Direkt erzeugen“:**
  - Fehlt in der Antwort der Start, wird ein Ablaufschritt ohne Vorgänger zum Start, möglichst keine Entscheidung. Bisher wurde einfach das erste Element zum Start, auch eine Swimlane, die dann als riesiges Start-Oval erschien.
  - Doppelte Element-IDs in der Antwort ließen einen Schritt verschwinden. Jetzt bleibt das erste Element mit dieser ID erhalten.
  - Verbindungen von oder zu einer Swimlane werden verworfen.
- **KI-Copilot:**
  - Fehlt einem Entscheidungsausgang die Beschriftung, wird sie passend zur anderen ergänzt (zu „Nein“ kommt „Ja“). Bisher konnten zwei gleich beschriftete Ausgänge entstehen.
  - Ein Schritt mit der ID „ende“ oder „stop“ lässt sich wieder ansprechen. Bisher wurde der Verweis zum allgemeinen Ende.
  - Die Selbstkorrektur nach Rückfragen bekommt jetzt auch die Antworten mitgeliefert.
- **KI-Anbindung:**
  - Hängt ein Server nach den Kopfzeilen, greifen Zeitlimit und Abbrechen jetzt auch beim Lesen der Antwort.
  - Verbindungstest und Modellliste in den Einstellungen haben jetzt ein Zeitlimit statt endlos zu laden.
  - OpenAI-Reasoning-Modelle (gpt-5…, o-Modelle) werden mit niedrigem Denkaufwand angefragt (wie Claude), damit Antworten im Zeitlimit von 30 s bleiben. Andere OpenAI-Modelle bekommen den Parameter nicht und behalten damit das Antwortschema.
  - `http://[::1]` wird als Server-Adresse nicht mehr angenommen, weil die Sicherheitsrichtlinie (CSP) sie blockiert. Für lokale Server `http://localhost` oder `http://127.0.0.1` verwenden.

### Geändert

- **Elemente rasten mit ihrer Mitte im Raster ein** statt mit der linken oberen Ecke. Das gilt beim Ziehen, beim Einfügen per Klick oder Drag & Drop und beim Folgeschritt („+“). Untereinander gesetzte Elemente unterschiedlicher Breite liegen damit mittig übereinander, und Pfeile zwischen ihnen laufen gerade statt mit einem kleinen Haken. Alt schaltet weiterhin nur die Hilfslinien ab, nicht das Raster. Beim Ziehen einer Gruppe rastet das gezogene Element mit der Mitte ein, die übrigen wandern um dieselbe Korrektur mit.
  - Zurückstellen auf das alte Verhalten: `GRID_ANCHOR` in `src/diagram/grid-anchor.js` auf `'topLeft'` setzen.
- Export-Dateinamen umschreiben Umlaute und ß („Prüfung Übersicht“ → `pruefung_uebersicht`) statt sie durch Unterstriche zu ersetzen.
- Die Meldung beim Anordnen eines Swimlane-Diagramms ist an die beim Anordnen einer Auswahl angeglichen.

### Code

- `App.jsx` von 823 auf 241 Zeilen. Abläufe in eigenen Hooks:
  - `useDiagramDocument`: Laden, Speichern, Entwürfe, Nachfragen
  - `useKeyboardShortcuts`
  - `useDiagramExport`
  - `useCanvasCommands`: Anordnen, Einpassen, Löschen mit Überbrücken
  - `useSubprocess`
  - `useDiagramValidation`
  - `useNotification`
  - `usePanelResize`
- `LEGACY_SYSTEM_PROMPTS` enthält die Fassung 1.5.0 jetzt wörtlich statt aus dem aktuellen Prompt abgeleitet, damit spätere Prompt-Änderungen sie nicht verändern. Nie geworfene Fehlercodes in `ai-client.js` sind entfernt. Tests in `ai/review-fixes.test.js`.
- `saveVersion` speichert und räumt alte Versionen in einer Transaktion auf und liest dafür nur die Rohdaten statt alle Schnappschüsse zu migrieren.
- Der Struktur-Check liest für die Teilprozess-Prüfung nur noch die IDs der gespeicherten Diagramme (`indexeddb.getAllDiagramIds`) statt aller Inhalte.
- Neuer Verhaltenstest `App.test.jsx` mit einer Attrappe der Arbeitsfläche, vor und nach dem Umbau grün, dazu Tests der einzelnen Hooks (`hooks/appHooks.test.jsx`).

## [1.6.2] – 2026-11-06

Punkt 1 aus `improvement.md`: Leistung bei großen Diagrammen messen und verbessern.

### Geändert

- **Flüssigeres Ziehen in großen Diagrammen:** Während ein Element oder eine Verbindung gezogen wird, rechnen Struktur-Check, Autosave und „Ablauf als Text“ nicht mehr in jedem Bildschirmbild neu, sondern einmal beim Loslassen.
- **Flüssigeres Scrollen und Zoomen:** Die Übersichtskarte zeichnet sich selbst neu, ohne die ganze Arbeitsfläche samt Eigenschaftenleiste neu aufzubauen.
- **„Ablauf als Text“** wird nur berechnet, solange der Bereich aufgeklappt ist.
- **Schnelleres Laden:** Die Arbeitsfläche zeichnet beim Öffnen eines Diagramms erst, wenn alles eingelesen ist. Elemente und Verbindungen werden gesammelt eingefügt.

### Code

- Leistungsmessung mit `npm run bench` (`src/test/performance.bench.js`, Testdiagramme aus `src/test/large-diagram.js`). Die Messwerte stehen in `improvement.md`.
- Neues Modul `diagram/change-notifier.js`, neue Komponente `components/MinimapOverlay.jsx`, Speicher `createOverviewStore` in `diagram/overview-tracking.js`.
- Rückfallebene im Melder: Bleibt ein Batch oder ein Ziehvorgang versehentlich offen (Fehler, `pointercancel` bei Touch/Stift), wird spätestens 1 s nach der letzten Änderung trotzdem gemeldet. Autosave und die Markierung ungespeicherter Änderungen können so nicht dauerhaft ausfallen. Alle Batches laufen über `inBatch` (`diagram/batch.js`) und werden auch bei Fehlern geschlossen; das Ziehen eines Knickpunkts schließt seinen Batch auch bei `pointercancel`.
- Der Verlauf meldet seinen Zustand selbst nach dem entprellten Sichern (`onStateChange`), auch wenn sich nichts geändert hat. So bleiben „Rückgängig“ und „Wiederholen“ nicht fälschlich aktiv.
- Das Ein-/Ausblenden der Anschlusspunkte beim Überfahren gilt nicht als Änderung am Diagramm (löst keine Aktualisierung der App mehr aus).
- Die Übersichtskarte bestimmt die Umrisse der Elemente nur nach Änderungen am Diagramm neu, beim Scrollen nur den Ausschnitt. Das automatische Anpassen der Fläche hängt nach `pointercancel` nicht mehr.
- Ein-/Aus-Einstellungen im Browser-Speicher über eine gemeinsame Hilfe (`utils/stored-flag.js`).
- Auch Batches (Laden, Anordnen, Einfügen, Löschen) werden zu einer Meldung zusammengefasst. Der Zustand von Rückgängig/Wiederholen wird nur noch bei echten Änderungen an die App gemeldet.
- `fromJson` schließt den Import-Batch auch bei fehlerhaften Daten. Vorher konnten danach neue Elemente nicht mehr in Lanes aufgenommen werden.
- `HistoryManager.destroy()` meldet seinen Listener jetzt korrekt ab und wird beim Abbau der Arbeitsfläche aufgerufen. Der wirkungslose Filter auf `batch:layout` ist entfernt.
- Leistungs- und Verhaltenstests in `diagram/performance.test.js`.

## [1.6.1] – 2026-11-05

### Geändert

- **Neues Logo und Favicon für vhs FlowDesk** (Vorlagen in `pics/`). Das Favicon erscheint im Browser-Tab und als kleines App-Symbol in der Kopfzeile vor „FlowDesk“, das Logo im Kopf der Anleitung und als Symbol der installierbaren App (PWA, 192 und 512 px, Apple-Touch-Icon 180 px). Das vhs-Logo in der Kopfzeile und in den Exporten bleibt unverändert. Das Vite-Platzhaltersymbol entfällt.
- `improvement.md` neu aufgesetzt: Die Liste der Editor-Verbesserungen ist abgeschlossen, die verbliebenen Punkte 4.1 und 5.4 werden nicht umgesetzt. Die neue Liste enthält nur technische Pflege (Barrierefreiheit prüfen, `App.jsx` und `DiagramCanvas.jsx` verschlanken, Upgrade auf `@joint/core`, Leistung messen). Wichtige Hinweise aus der alten Liste stehen jetzt in `CLAUDE.md`.

## [1.6.0] – 2026-11-05

Punkte 3.4 (Übersichtskarte, Alles einpassen) und 3.5 (teilweise automatisch anordnen, ohne das Einordnen unverbundener Elemente) aus `improvement.md` sowie Umbenennung der App.

### Neu

- **Alles einpassen** (Schaltfläche neben „Zentrieren“ in der unteren Leiste, `Strg + Umschalt + 1`): stellt den Zoom so ein, dass das ganze Diagramm sichtbar ist, und zeigt es mittig. Vergrößert wird höchstens auf 100 %.
- **Übersichtskarte** unten links auf der Arbeitsfläche, sobald das Diagramm größer als der sichtbare Bereich ist. Sie zeigt alle Elemente und Swimlanes verkleinert, das orange Rechteck ist der sichtbare Ausschnitt. Klicken oder Ziehen auf der Karte verschiebt die Ansicht. Mit dem X lässt sie sich ausblenden (wird pro Browser gemerkt), über „Übersicht“ wieder einblenden.
- **Nur Auswahl anordnen** (Menü „Anordnen“, ab zwei ausgewählten Elementen, von oben nach unten oder von links nach rechts). Nur die ausgewählten Elemente werden neu angeordnet; das Ergebnis beginnt an der bisherigen linken oberen Ecke der Auswahl, alle anderen Elemente und ihre Handanpassungen bleiben erhalten. Ist eine Lane ausgewählt, zählt ihr Inhalt mit. In Swimlane-Diagrammen läuft der Ablauf von links nach rechts, jeder Schritt bleibt in seiner Lane und die Lane wächst bei Bedarf mit.
- Die Aktion lässt sich mit `Strg + Z` rückgängig machen. Knickpunkte und Anschlüsse werden nur bei den Verbindungen neu gesetzt, die ein verschobenes Element berühren.

### Geändert

- Die App heißt jetzt **vhs FlowDesk** (vorher Platzhalter „vhs Workflow-Algorithm Editor“ bzw. „Workflow Editor“). Neu benannt sind Kopfzeile, Fenstertitel, installierbare App (PWA), Anleitung, Prozessbeschreibung (Word/Text), Fehlermeldungen beim Import, KI-Prompts und Dokumentation.
- Standard-Dateinamen beim Export: `vhs-flowdesk.svg/png/pdf/json`.
- Unverändert bleiben die technischen Kennungen (Backup-Format, Zwischenablage-Format, Projektordner), damit vorhandene Backups und Dateien weiter importiert werden können.
- Die bisherige Standardfassung des KI-System-Prompts wird weiter als Standard erkannt (`LEGACY_SYSTEM_PROMPTS`).
- Der Hilfekasten „Verbindungen erstellen“ unten in der linken Leiste entfällt. Der Hinweis zum Umhängen von Verbindungen steht jetzt in der Anleitung.

## [1.5.0] – 2026-11-05

Stufe 3 aus `improvement.md`: neues Datenformat (Format 2) mit Swimlane-Zuordnung, Zusatzangaben und eigener Linienführung. Dazu die Punkte 2.2, 2.4, 2.6 und 4.2.

### Datenformat

- Format 2 (`schemaVersion` 2). Gespeicherte Diagramme, Versionen, Entwürfe und importierte Dateien werden beim Laden automatisch umgestellt. Dabei werden Elemente der Swimlane zugeordnet, in der sie liegen.
- Neu je Element: Swimlane-Zuordnung, Erläuterung, Zuständigkeit (ohne Swimlane), Dokument/Formular, IT-System, Dauer/Frist und bei Teilprozessen das verknüpfte Diagramm.
- Neu je Verbindung: Knickpunkte, Lage der Beschriftung und Linienführung (rechtwinklig oder gerade).
- Ältere Versionen des Editors können Diagramme im Format 2 nicht öffnen.

### Swimlanes

- Elemente, die in einer Swimlane abgelegt werden, gehören zu ihr: Sie wandern mit, wenn die Lane verschoben wird, und die Lane wächst mit ihrem Inhalt.
- Eine Lane lässt sich nicht mehr kleiner ziehen als ihr Inhalt. Beim Löschen einer Lane bleiben ihre Elemente erhalten.
- Lanes lassen sich in der Eigenschaften-Leiste nach oben oder unten umsortieren; beim Kopieren einer Lane wird ihr Inhalt mitkopiert.

### Bearbeiten

- Neue Eigenschaften-Leiste rechts für das ausgewählte Element bzw. die ausgewählte Verbindung. Sie zeigt je Elementtyp nur passende Felder (z. B. bei Warten/Frist die Dauer, aber keine Zuständigkeit), seltene Angaben unter „Weitere Angaben“. Sie ersetzt die Bearbeitungsdialoge; ein Doppelklick springt in ihr Textfeld. Ausblenden über das X, Einblenden über „Eigenschaften“; ein Rechtsklick auf ein Element blendet sie ein bzw. aus.
- „+“-Griffe am ausgewählten Element hängen einen verbundenen Folgeschritt an (rechts oder unten), der Pfeil daneben bietet weitere Typen an. Bei Entscheidungen wird der erste Ausgang „Ja“, der zweite „Nein“. Auch über die Eigenschaften-Leiste per Tastatur möglich.
- Knickpunkte: Ziehen auf der Linie einer bestehenden Verbindung setzt einen Knickpunkt, die Punkte der ausgewählten Verbindung lassen sich verschieben, ein Doppelklick entfernt sie. Neue Verbindungen und einfache Klicks erzeugen keine Knickpunkte.
- Beschriftungen von Verbindungen lassen sich entlang der Linie verschieben und wieder mittig setzen.
- Text direkt auf der Fläche bearbeiten: Doppelklick, `F2` oder `Enter` öffnet ein Textfeld über dem Element bzw. der Beschriftung (Enter übernimmt, Esc bricht ab). Lostippen ersetzt den Text des ausgewählten Elements.
- Hilfslinien beim Verschieben: Fluchtet ein Element mit Kante oder Mitte eines anderen, rastet es ein und eine orange Linie zeigt die Flucht. `Alt` gedrückt halten schaltet das ab.
- Beim Löschen eines Schritts mitten im Ablauf (Vorgänger und genau ein Nachfolger) fragt der Editor, ob Vorgänger und Nachfolger direkt verbunden werden sollen; die Beschriftung (z. B. „Ja“) bleibt erhalten. Gilt für Entf und das X am Element.
- Hinweis in der Elementleiste, wie Verbindungen umgehängt werden.
- Der Anfasser zum Verbreitern des Qualitätspanels ist nicht mehr in der Tab-Reihenfolge (war ein unbeschrifteter Button ohne Tastaturfunktion).

### Neue Elementtypen

- Dokument/Formular, IT-System, Warten/Frist und Teilprozess. Ein Teilprozess (weiß mit doppeltem Rahmen) wird mit einem gespeicherten Diagramm verknüpft. Ein Klick auf sein Symbol fragt, ob er hier angezeigt (schreibgeschützte Ansicht im aktuellen Diagramm) oder zu ihm gewechselt werden soll; beides gibt es auch in der Eigenschaften-Leiste.
- Struktur-Check: Hinweise auf Teilprozesse ohne Verknüpfung, mit gelöschtem Ziel oder mit Verweis auf sich selbst sowie auf Warten/Frist ohne Dauer. Dokumente und IT-Systeme dürfen als angehängte Ablage ohne Ausgang enden.

### Vorlagen und Anleitung

- Zwei neue Vorlagen mit den neuen Elementen: „Rechnungseingang (Swimlane)“ (Dokumente, IT-Systeme, Frist, Freigabe durch die Leitung) und „Kursanmeldung mit Warteliste“ (IT-System, Dokumente, Wartezeit, Zahlung als Teilprozess), jeweils mit Erläuterungen und Angaben.
- Die Anleitung lässt sich durchsuchen: Abschnitte und Tastenkürzel werden gefiltert, Treffer hervorgehoben; Esc leert die Suche.

### Barrierefreiheit

- Neu unter der Arbeitsfläche: „Ablauf als Text“, eine ausblendbare, nummerierte Textfassung des Diagramms mit Zuständigkeiten, Verzweigungen und Angaben. Ein Klick auf einen Schritt springt zum Element. Erreichbar auch über einen Sprunglink am Seitenanfang.

### KI

- Alle Prompts überarbeitet (KI-Copilot, „Direkt erzeugen“, Verbesserungsvorschläge): klarer Aufbau mit Kontext, Begründungen statt Großbuchstaben, Beispiel, Selbstprüfung und Ausgabeformat am Ende; Hinweise der Einrichtung werden abgegrenzt eingebettet.
- Der KI-Copilot kennt die neuen Elementtypen: Er legt Dokument-, IT-System- und Warte-Schritte an und füllt Erläuterung, Dokument, IT-System und Dauer/Frist, wenn die Beschreibung sie nennt. In der Prüfansicht lassen sich Art und Angaben ändern. Mit Swimlanes setzt er die feste Lane-Zuordnung, ohne Swimlanes steht die Rolle als Zuständigkeit am Schritt. Die Variante „Schulung“ schreibt Erläuterungen jetzt in das Erläuterungsfeld statt in Kommentare.
- „Direkt erzeugen“ kennt die neuen Elementtypen, Angaben und Swimlanes und schickt ein Antwortschema mit; die Antwort wird bereinigt (unbekannte Typen, ungültige Lane-Zuordnungen).
- Verbesserungsvorschläge berücksichtigen Dokumente, IT-Systeme, Fristen und Swimlanes (Medienbrüche, Wartezeiten, Übergaben).
- Behoben: Die Einstellungen speicherten beim Speichern auch den unveränderten Standard-Prompt als eigenen Prompt; neue Standardfassungen kamen dann nie an. Gespeicherte Standardtexte gelten jetzt als „kein eigener Prompt“, ein echter eigener Prompt bleibt erhalten und wird in den Einstellungen mit einem Hinweis auf „Zurücksetzen“ markiert.

### Prozessbeschreibung und Vergleich

- Die Prozessbeschreibung (Word/Markdown) enthält Erläuterung, Dokument, IT-System und Dauer/Frist je Schritt. Zuständigkeit kommt aus der Swimlane, sonst aus der Angabe am Schritt.
- Der Versionsvergleich meldet geänderte Angaben und Wechsel der Swimlane.

### Code

- Neues Feld `taskType` im Copilot-Prozessmodell (`process-model.js`), Antwortschema `DIAGRAM_SCHEMA` für „Direkt erzeugen“ (`ai/prompts.js`).
- Neue Module `diagram/lanes.js`, `lane-embedding.js`, `add-next.js`, `add-next-tool.js`, `vertex-drag.js`, `snaplines.js`, `snapline-drag.js`, `bridge.js`, Komponenten `PropertiesPanel.jsx`, `AddNextMenu.jsx`, `SubprocessDialog.jsx`, `InlineTextEditor.jsx` und `DiagramTextAlternative.jsx`. `EditTextModal` und `EditLaneModal` entfallen.
- 35 neue Tests (Format 2, Migration, Lanes, Folgeschritt, Knickpunkte, Eigenschaften-Leiste).

## [1.4.1] – 2026-11-04

Interner Umbau der Arbeitsfläche (Punkt 5.1 aus `improvement.md`) und eine Fehlerbehebung.

### Fehlerbehebung

- Der Griff zum Vergrößern und Verkleinern von Swimlanes ist wieder da. Seit 1.4.0 (Arbeitsfläche wächst mit dem Inhalt) wurde er neben der Lane gezeichnet und war meist nicht sichtbar. Bei Zoom ungleich 100 % saß er auch vorher schon falsch.

### Code-Qualität

- `DiagramCanvas.jsx` aufgeteilt (von rund 900 auf rund 470 Zeilen). Die Teile liegen jetzt als eigene, einzeln getestete Module in `src/diagram/`:
  - `paper.js`: Einrichtung der Arbeitsfläche, erlaubte Verbindungen, Anschlusspunkte beim Überfahren
  - `selection.js`: Auswahl per Klick, Strg/Umschalt + Klick, gemeinsames Verschieben, Auswahlrahmen
  - `pan-select.js`: Ansicht verschieben und Rahmenauswahl
  - `lane-resize-tool.js`: Griff zum Ändern der Swimlane-Größe
  - `text-editing.js`: Texte von Elementen, Verbindungen und Swimlanes ändern, Ja/Nein-Vorschläge
  - `viewport.js` (erweitert): Fläche an den Inhalt anpassen, Zoom mit dem Mausrad, Mausposition merken
- Die Suche liegt im Hook `hooks/useDiagramSearch.js`, das Anlegen neuer Elemente (`createNodeAt`) in `diagram/shapes.js`.
- 27 neue Tests für diese Module (`diagram/canvas-parts.test.js`).

## [1.4.0] – 2026-11-04

Bequemer arbeiten auf der Arbeitsfläche (Stufe „Nächstes Release“ aus `improvement.md`).

### Arbeitsfläche

- Die Arbeitsfläche wächst mit dem Inhalt in alle Richtungen, auch nach links und oben. Elemente können nicht mehr außerhalb des erreichbaren Bereichs verschwinden, auch nicht bei starkem Zoom.
- Zoomen mit Strg + Mausrad bzw. Touchpad-Geste erfolgt um die Mausposition und in feineren Stufen; Schaltflächen und Tastenkürzel zoomen um die Bildmitte. Der sichtbare Ausschnitt springt nicht mehr weg.
- „Zentrieren“ zeigt breite Diagramme ab dem linken Rand (Start und Lane-Titel bleiben sichtbar).
- Einfügen (Strg+V) setzt die Kopie mittig an die Mausposition, ist die Maus außerhalb, in die Bildmitte. Mehrfaches Einfügen an derselben Stelle versetzt die Kopien.

### Suche

- Neue Suche im Diagramm mit Strg+F oder über die Lupe in der unteren Leiste. Alle Treffer werden gelb markiert, der aktuelle orange; Enter bzw. Umschalt+Enter springt zum nächsten bzw. vorherigen Treffer, Esc schließt die Suche. Die Markierungen verändern das Diagramm nicht.

### Verbindungen

- Beim Beschriften eines Ausgangs einer Entscheidung bietet der Dialog „Ja“ und „Nein“ als Schnellauswahl an (noch nicht vergebene Antwort zuerst); ein Klick speichert.

### Struktur-Check

- Neue Prüfungen: vom Start aus nicht erreichbare Schritte, Schleifen ohne Weg zu einem Ende, Verbindungen aus einem Ende heraus, doppelt beschriftete Ausgänge einer Entscheidung und Schritte außerhalb aller Swimlanes (wenn Swimlanes verwendet werden).
- Ein Klick auf einen Befund springt zum Element und wählt es aus, sodass es direkt bearbeitet werden kann.

### Technik

- Neue Module `diagram/viewport.js` (Flächengröße, Zoom, Scrollen, Einfügeposition) und `diagram/search.js`, neue Komponente `DiagramSearch.jsx`.

## [1.3.1] – 2026-11-04

Fehlerbehebungen im Editor (Stufe „Sofort“ aus `improvement.md`).

### Behoben

- Markierungen im Struktur-Check und in der Simulation verändern das Diagramm nicht mehr: kein „ungespeicherter“ Stand und keine zusätzlichen Rückgängig-Schritte mehr durch bloßes Anklicken oder Durchspielen.
- „Rückgängig“ ist direkt nach dem Öffnen eines Diagramms nicht mehr fälschlich aktiv.
- Der Struktur-Check nennt den Elementtyp auf Deutsch (z. B. „Prozessschritt“ statt „process“).
- Die Größe von Swimlanes lässt sich auch mit Stift oder Touch ändern.

### Technik

- Neues Modul `diagram/highlight.js` für vorübergehende Hervorhebungen (JointJS-Highlighter statt Modelländerungen).
- Farben des Editors und die Lane-Farbpalette (`LANE_COLORS`) kommen zentral aus `utils/constants.js`.
- Ungenutzte Einstellungen (`getSettings`/`saveSettings`) entfernt.

## [1.3.0] – 2026-11-04

KI-Anbieter frei wählbar.

### KI-Anbindung

- In den Einstellungen lässt sich der KI-Anbieter wählen: Google Gemini, OpenAI, Mistral AI, Anthropic Claude oder ein eigener Server mit OpenAI-kompatibler Schnittstelle (z. B. Angebote des Trägers, deutsche Hoster oder ein lokales Ollama). Damit sind auch Modelle mit Verarbeitung in der EU oder selbst betriebene Modelle möglich. Getestet ist bisher nur Gemini; bei anderen Anbietern zeigen die Einstellungen einen roten Hinweis mit der Bitte um Bugreports.
- Je Anbieter ein eigener API-Key (beim eigenen Server optional); der bisherige Gemini-Key wird automatisch übernommen.
- Modelle sind je Anbieter voreingestellt und in den Einstellungen änderbar; mehrere Modelle (durch Komma getrennt) werden der Reihe nach probiert.
- „Status prüfen“ funktioniert für alle Anbieter; die Diagnose listet die verfügbaren Modelle, ein Klick übernimmt ein Modell.
- Verständliche Meldungen bei Verbindungsproblemen (z. B. wenn ein Server keine Aufrufe aus dem Browser erlaubt) und bei abgelehnten Anfragen.

### Datenschutz

- Der Datenschutzhinweis nennt den gewählten Anbieter und muss einmal neu bestätigt werden – außerdem nach jedem Anbieterwechsel.

### Technik

- Neue Anbieter-Schicht (`providers.js`, `adapters.js`); `gemini-client.js` heißt jetzt `ai-client.js`.
- Das Copilot-Antwortschema wird für OpenAI-kompatible Dienste und Claude in ein JSON-Schema umgewandelt. Lehnt eine Schnittstelle Schema oder Zusatzparameter ab, wird einmal ohne wiederholt; in Codeblöcke verpacktes JSON wird erkannt.
- Content-Security-Policy: Verbindungen zu HTTPS-Adressen und `http://localhost` erlaubt (nötig für frei eintragbare Server).

## [1.2.0] – 2026-11-03

Geführter KI-Copilot statt Einmal-Generierung.

### KI-Copilot

- Neuer Button „Mit KI-Copilot erstellen“: Die KI analysiert die Prozessbeschreibung zuerst, statt sofort ein Diagramm zu zeichnen.
- Rückfragen: Bei Lücken (fehlende Zweige, unklare Zuständigkeit, unklares Ende) stellt die KI bis zu fünf gezielte Fragen mit Antwortvorschlägen. Fragen können übersprungen werden; die KI nennt dann ihre Annahmen.
- Formulierungsvarianten: kompakt, fachlich präzise, bürgernah sowie Schulung & Dokumentation (mit kurzen Erläuterungen je Schritt).
- Prüfansicht „So habe ich den Prozess verstanden“: nummerierte Schritte mit Zuständigkeit, Entscheidungen mit ihren Zweigen, unsichere Schritte markiert, automatische Korrekturen und Annahmen ausgewiesen – daneben eine Live-Vorschau des Diagramms.
- Korrekturen vor der Übernahme: Beschriftungen, Zuständigkeiten und Ausgänge ändern, Schritte entfernen (der Ablauf bleibt dabei zusammenhängend).
- Zuständigkeiten werden auf Wunsch als Swimlanes dargestellt (automatisch an, sobald mindestens zwei Rollen erkannt werden); Hinweise der KI optional als Kommentare am Rand.
- Das Ergebnis öffnet als neues, noch ungespeichertes Diagramm, benannt nach dem erkannten Prozess.
- Laufende Anfragen lassen sich abbrechen; Fehler werden im Dialog angezeigt, die Eingaben bleiben erhalten.
- Neue Einstellung „Hinweise an den KI-Copilot“ (z. B. Hausbegriffe, feste Zuständigkeiten).
- „Direkt erzeugen“ bleibt für die schnelle Erzeugung ohne Rückfragen erhalten.

### Technik

- Die KI liefert ein Prozessmodell statt eines Diagramms; Start, Ende, Entscheidungszweige, Swimlanes und Layout erzeugt die App selbst. Gemini erhält dafür ein festes Antwortschema; lehnt ein Modell das Schema ab, wird ohne Schema wiederholt.
- Entscheidungen zuverlässiger: Im Antwortschema muss die KI für jeden Schritt ausdrücklich die Übergänge angeben (Pflichtfeld, feste Feldreihenfolge); der Prompt enthält ein vollständiges Beispiel mit Nein-Zweig und Rücksprung sowie Regeln zum Erkennen von Entscheidungen („wenn“, „falls“, „ob“, „sonst“).
- Fehlerhafte KI-Antworten werden tolerant repariert (unbekannte Typen und Verweise, doppelte IDs, zu viele Schritte). Als Frage formulierte Schritte bleiben Entscheidungen; ein fehlender Zweig wird mit dem Schritt verbunden, der sonst unverbunden bliebe (typischerweise der vergessene Nein-Weg), und als „Bitte prüfen“ markiert.
- Selbstkorrektur: Bleiben strukturelle Fehler (Entscheidungen mit nur einem Ausgang, unerreichbare Schritte), erhält die KI einmalig die konkrete Fehlerliste zur Korrektur; das Ergebnis wird nur übernommen, wenn es besser ist.
- Ist ein Gemini-Modell überlastet (HTTP 503), wird – wie bei nicht verfügbaren Modellen – automatisch das nächste Modell der Liste versucht.
- Sehr kurze Beschreibungen („Ablauf für ein BEM-Verfahren“) führen zu einem üblichen Musterablauf mit markierten Annahmen und gezielten Rückfragen.
- Datenschutzhinweis ergänzt (Antworten auf Rückfragen und Copilot-Hinweise werden ebenfalls übertragen); er muss daher einmal neu bestätigt werden.
- Neue Module `src/ai/copilot/` und `src/state/copilotState.js` (mit TypeScript-Prüfung) samt Unit- und Komponententests; Elementgrößen werden über `diagram/node-size.js` ohne JointJS berechnet.

## [1.1.0] – 2026-11-03

Mehr Komfort beim Bearbeiten, Prozessbeschreibung als Text und Versionsvergleich.

### Bearbeitungskomfort

- Mehrfachauswahl per Strg/Umschalt + Klick und per Rahmen (Umschalt + Ziehen auf freier Fläche); ausgewählte Elemente lassen sich gemeinsam verschieben und löschen.
- Kopieren, Einfügen und Duplizieren (`Strg + C`, `Strg + V`, `Strg + D`), auch zwischen verschiedenen Diagrammen; Verbindungen innerhalb der Auswahl werden mitkopiert. `Strg + A` wählt alles aus.
- Auswahl mit den Pfeiltasten verschieben (mit Umschalt in 1-Pixel-Schritten).
- Neues Menü „Anordnen“: automatisches Anordnen des ganzen Diagramms (von oben nach unten oder von links nach rechts) sowie Ausrichten und gleichmäßiges Verteilen der Auswahl.
- Automatisches Anordnen respektiert Swimlanes: Jeder Schritt bleibt in seiner Lane, die Lanes werden untereinander angeordnet und passend vergrößert. Das gilt auch für KI-generierte Diagramme.

### Prozessbeschreibung

- Neues Menü „Beschreibung“: Export einer Verfahrensanweisung als Word-Dokument (.docx) oder Markdown – nummerierte Schritte in Ablaufreihenfolge, Entscheidungen mit ihren Zweigen, Rücksprünge, Zuständigkeiten aus den Swimlanes, angebundene Kommentare als Hinweise, Rollenübersicht und Diagrammbild.
- Nicht verbundene Schritte und fehlende Startknoten werden in der Beschreibung als Hinweis ausgewiesen.

### Versionsvergleich

- Zwei Versionen oder eine Version und den aktuellen Stand vergleichen: Änderungen sind im Diagramm farbig markiert (neu, geändert, entfernt) und als Liste beschrieben. Der Vergleich ist rein lesend.
- Notiz je Version („Was wurde geändert?“), direkt in der Versionshistorie bearbeitbar.

### Fehlerbehebungen und Technik

- `Strg + Z` direkt nach einer Änderung (innerhalb von 0,3 s) hatte keine Wirkung.
- Nach einem Update der App konnte eine noch geöffnete alte Version beim Öffnen eines Dialogs abstürzen; die App lädt in diesem Fall jetzt einmalig neu (ungespeicherte Änderungen sind über den Autosave-Entwurf gesichert).
- Flüssigeres Verschieben: Aktualisierungen von Prüfung, Qualitätspanel und Autosave werden pro Bildschirmbild gebündelt.
- Word-Export wird erst bei Bedarf geladen; weitere Module mit TypeScript-Prüfung, darunter Konverter, IndexedDB-Zugriff (typisiertes Datenbankschema) und Prozess-Check.
- Komponententests mit Testing Library für Bestätigungsdialog, Diagrammliste (Öffnen, Löschen, Import, Backup), Versionshistorie (Wiederherstellen, Notizen, Löschen) und Autosave; die IndexedDB-Schicht wird gegen eine In-Memory-Datenbank (`fake-indexeddb`) getestet.
- `normalizeMetadata` akzeptiert auch `null` als Metadaten.

## [1.0.0] – 2026-11-03

Erste versionierte Ausgabe mit Schwerpunkt Professionalisierung.

### Datenschutz und KI

- API-Key wird im Header `x-goog-api-key` statt als URL-Parameter übertragen und landet so nicht mehr in Server- oder Proxy-Logs.
- Datenschutzhinweis vor der ersten KI-Nutzung (Free-Tier-Bedingungen von Google, keine personenbezogenen oder vertraulichen Daten). Bestätigung ist in den Einstellungen einsehbar und widerrufbar.
- Modellliste zentral in `src/ai/config.js`; abgeschaltete `gemini-1.5-*`-Modelle entfernt (neu: `gemini-2.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`).
- Doppelten Code für Diagramm- und Maßnahmen-Generierung zusammengeführt.

### Datensicherheit

- Autosave: Ungespeicherte Änderungen werden automatisch als Entwurf gesichert und beim nächsten Öffnen zur Wiederherstellung angeboten. Statusanzeige neben dem Speichern-Button, Warnung beim Schließen des Tabs.
- Rückfrage, bevor ungespeicherte Änderungen durch ein anderes Diagramm, eine Vorlage oder die KI ersetzt werden.
- Formatversion (`schemaVersion`) für alle Diagramme mit Migration beim Laden.
- Import von Projektdateien mit Strukturprüfung und verständlichen deutschen Fehlermeldungen.
- Backup aller Diagramme inkl. Versionen als Datei sowie Wiederherstellung aus einem Backup.
- Beim Löschen eines Diagramms werden auch dessen Versionen und Entwürfe entfernt.

### Bedienung und Barrierefreiheit

- Eigener Bestätigungsdialog im vhs-Design statt Browser-`confirm`.
- Alle Dialoge per Tastatur bedienbar: Fokusführung, `Tab` bleibt im Dialog, `Esc` schließt.
- Elemente lassen sich per Klick bzw. Tastatur hinzufügen (zusätzlich zu Drag & Drop).
- Beschriftungen für Icon-Buttons, Statusansagen für Screenreader, Sprunglink zur Arbeitsfläche.
- Kontraste verbessert (u. a. Erfolgsmeldungen, PDF-Button, Hinweistexte).
- Neue Tastenkombination `Strg + S` zum Speichern; Übersicht der Tastenkürzel in der Anleitung.

### Technik und Qualität

- Automatisierte Tests mit Vitest (Konverter, Layout, Undo/Redo, Prüfregeln, Datenformat, Autosave-Logik, KI-Client).
- GitHub-Actions-Pipeline (Lint, Typprüfung, Tests, Build); der Vercel-Build bricht bei Fehlern ab.
- Alle ESLint-Fehler behoben.
- Kleinere Ladezeit: Dialoge und jsPDF werden erst bei Bedarf geladen, Bibliotheken in eigene, gut cachebare Dateien aufgeteilt (Start-Bundle ca. −29 %).
- Content-Security-Policy verschärft: kein `unsafe-eval` und kein `unsafe-inline` mehr für Skripte.
- UI-Zustand der App in einem Reducer gebündelt; Typdefinitionen für das Diagrammformat (JSDoc, TypeScript-geprüft).

### Fehlerbehebungen

- Elemente mit Koordinate 0 wurden beim Laden auf Position 100 verschoben.
- Fehlerhafte Import-Daten werden gemeldet statt stillschweigend geleert.
- Abgebrochene Eingaben in den Einstellungen blieben beim erneuten Öffnen stehen, obwohl sie nicht gespeichert waren.
- Englische Fehlermeldungen beim Import durch deutsche ersetzt.

---

## 2026-03-13 – Wizard-Selbstbewertung + PDF-Qualitätsbericht

**Prozess-Check als geführter Wizard (5+1 Schritte)**

- Selbstbewertungs-Sektion im Prozess-Check vollständig umgebaut
- Pro Schritt (1 Kriterium): Leitfrage, 4 Klick-Buttons (0 kritisch / 1 schwach / 2 solide / 3 stark), optionales Notizfeld, Fortschrittsbalken, Vor-/Zurück-Navigation
- Schritt 6 = Zusammenfassung: alle Scores auf einen Blick, Hotspot-Markierung `(!)` bei Score ≤ 1, Klick auf Zeile springt zurück zum Kriterium
- Toggle „Alle auf einmal“ wechselt zur kompakten Dropdown-Ansicht
- Neue Datenstruktur `metadata.reviewNotes` (je Feld ein Notizfeld, persistent)
- TXT-Export enthält Notizen je Kriterium

**PDF-Qualitätsbericht im vhs-Layout**

- Seite 1 (Deckblatt): vhs-Kopfzeile mit Logo und Akzentstreifen, Diagrammtitel, Erstellungsdatum, Status-Badge, Durchschnitts-Scorebalken, vollständiges Flowchart-Bild
- Seite 2+ (Bericht): Automatische Prüfung, Selbstbewertung mit Notizen, Maßnahmen
- Blauer vhs-Footer mit Seitenzahl; automatischer Seitenumbruch
- Fehlerbehebungen: Latin-1-sicherer Textfilter, proportionale Logo-Skalierung, korrekter Zeilenumbruch

## 2026-03-13 – Anleitung + Umlaute

- Neuer Button „Anleitung“ im Header mit integriertem Hilfe-Dialog
- ASCII-Ersatzschreibweisen in UI-Texten durch echte Umlaute ersetzt

## 2025 – Vorlagen, Prozess-Check, Workshop-Modus

- Starter-Vorlagen für vhs-Prozesse
- Qualitätspanel mit automatischem Prozess-Check
- Workshop-/Simulationsmodus: Schritt-für-Schritt-Durchlauf des Prozesses
- Ein-/ausblendbare Seitenleisten, Breite des Qualitätspanels per Drag anpassbar

## 2025 – KI, Export, Einstellungen

- Gemini-KI-Integration zur Diagramm-Generierung aus Freitext
- Export als PNG, SVG, PDF (mit vhs-Logo und Diagrammtitel), JSON
- Maßnahmenliste mit CSV-Export
- Einstellungen: API-Key und KI-Prompt konfigurierbar, API-Diagnose
- Rückgängig/Wiederholen
- PWA: offline nutzbar, installierbar
