# Verbesserungsvorschläge Flowchart-Editor

Erstellt für Version 1.3.0 (2026-11-04), fortgeschrieben bei jeder Umsetzung. Betrachtet wird ausschließlich der Editor, also Arbeitsfläche, Elemente, Verbindungen, Swimlanes, Auswahl, Rückgängig und Struktur-Check. KI-Funktionen, Speicherung und Exporte sind nicht Teil dieser Liste. Geplante KI-Themen stehen in [docs/zukünftige Anpassungen.md](docs/zukünftige%20Anpassungen.md).

Aufwand: **S** = bis ½ Tag, **M** = 1–2 Tage, **L** = mehrere Tage.
Status: ✅ erledigt (mit Version), 🔶 teilweise erledigt, offen = ohne Markierung.

## Umsetzungsstand

| Stufe | Punkte | Status |
| --- | --- | --- |
| 1. Sofort | 1.1, 1.6, 5.3 | ✅ 1.3.1 (Branch `release/1.3.1`) |
| 2. Nächstes Release | 1.2, 1.3, 2.3, 2.5, 3.3, 3.6 | ✅ 1.4.0 (2.3 ohne verschiebbare Beschriftungen; Browsertest teilweise offen) |
| 3. Mit `schemaVersion` 2 | 1.4, 1.5, 2.1, 3.1, 3.2 + verschiebbare Beschriftungen aus 2.3 | offen |
| 4. Laufend | 4.x, 5.x | offen (5.3 in 1.3.1, 5.1 in 1.4.1 erledigt) |

### Was sich mit 1.4.1 geändert hat (Wissen für Folgeschritte)

- **`DiagramCanvas.jsx` ist nur noch die React-Hülle:** Sie legt Graph, Paper und Verlauf an, meldet die Teilmodule im Init-Effekt an (jedes liefert eine Abmeldefunktion bzw. `detach`) und stellt die Imperative-API und die Dialoge bereit. Neue Interaktionen gehören als eigenes Modul nach `src/diagram/`, nicht in den Init-Effekt.
- **Module und ihre Aufgaben:**
  - `paper.js`: `createPaper`, `validateConnection`, `attachPortHover`
  - `selection.js`: `createSelectionController({ graph, paper, onChange, render })` mit `get`/`set`/`detach`. Hört selbst auf `remove`/`reset` des Graphen. Reine Hilfen: `toggleSelection`, `startGroupDrag`, `applyGroupDrag`, `isAdditiveEvent`. `render` ist austauschbar (Standard `renderSelectionTools`), damit die Auswahl ohne SVG testbar ist.
  - `pan-select.js`: `attachPanAndRubberBand`, `rectBetween`
  - `lane-resize-tool.js`: `LaneResizeTool`, `laneSizeForDrag` (Mindestgröße 200 × 60)
  - `text-editing.js`: `setNodeText`, `setLinkLabelText`, `getLinkLabelText`, `setLaneLabelAndColor`, `decisionLabelSuggestions`
  - `viewport.js`, neu: `createAutoFit({ paper, graph, container })` mit `fit`/`schedule`/`detach`, außerdem `attachWheelZoom` und `trackPointer`
  - `shapes.js`, neu: `createNodeAt(type, x, y)`
  - `hooks/useDiagramSearch.js`: Zustand und Ablauf der Suche
- **Fehler aus 1.4.0 behoben (Lane-Griff):** Werkzeuge (`ToolView`) liegen in der transformierten Ebene des Papers. Ihre Position muss deshalb aus der Modellgeometrie in Diagrammkoordinaten kommen (`model.getBBox()`), nie aus `view.getBBox()`, das Paper-Koordinaten mit Verschiebung und Zoom liefert. Seit das Paper einen Ursprung ungleich 0 hat (1.2), fällt dieser Unterschied sofort auf.
- **Doppelklick-Bearbeitung:** Der Init-Effekt ruft die Dialog-Funktionen über `editorsRef` auf, damit sie immer den aktuellen Stand der Komponente nutzen.
- **Tests:** `diagram/canvas-parts.test.js` prüft die Module mit einer Paper-Attrappe (nur `on`/`off`/`trigger`) und einem echten JointJS-Graphen. Dieses Muster eignet sich auch für 5.4.
- **Browsertest (von Hand):** Auswahl, Verschieben, Zoom, Doppelklick und Suche funktionieren. Der Lane-Griff fehlte, das ist jetzt behoben (siehe oben). Die Korrektur ist noch nicht im Browser bestätigt.

### Was sich mit 1.4.0 geändert hat (Wissen für Folgeschritte)

- **Neues Modul `src/diagram/viewport.js`:** zentrale Stelle für die Ansicht.
  - `fitPaperToContent` passt die Paper-Größe an den Inhalt an (`allowNewOrigin: 'any'`, Rand `FIT_PADDING` = 400 px) und gleicht die Scrollposition aus, wenn sich der Ursprung verschiebt.
  - `zoomAroundPoint` hält beim Zoomen einen Bildschirmpunkt fest; `clampZoom` und `wheelZoomFactor` regeln Bereich (10–200 %) und Mausrad-Stufen.
  - `scrollToLocalRect` scrollt zu Diagrammkoordinaten. Bereiche, die nicht in den Ausschnitt passen, werden am Anfang ausgerichtet.
  - `pasteOffset` und `fragmentBounds` bestimmen die Einfügeposition (mittig auf das Ziel, Raster 10 px, Versatz bei Wiederholung).
  - **Regel:** Scrollpositionen nie mehr selbst aus `position * zoom` berechnen, weil das Paper jetzt einen Ursprung ungleich 0 haben kann. Immer `scrollToLocalRect` bzw. `paper.localToPaperRect` und `clientToLocalPoint` nutzen.
- **`DiagramCanvas.jsx`:**
  - Die Fläche wird nach `add`/`remove`/`reset`/`change:position`/`change:size` per `requestAnimationFrame` angepasst, **nicht während eines Ziehvorgangs** (erst bei `pointerup`). Zusätzlich reagiert ein `ResizeObserver` auf Größenänderungen des Containers.
  - Neue Prop `onZoomSet` (App: `handleZoomSet`) ersetzt `onZoomIn`/`onZoomOut`. Das Mausrad setzt `zoomAnchorRef`, der Zoom-Effekt nutzt ihn genau einmal.
  - Das Scroll-Element ist jetzt ein inneres `div` (`canvasRef.current.parentNode`), außen liegt ein nicht scrollender Wrapper für Overlays wie die Suchleiste.
  - Neue Imperative-API: `openSearch`, `closeSearch`, `revealNode(id)` (springen, markieren, auswählen). Der Struktur-Check nutzt `revealNode`.
  - **Hinweis:** Nach Hot-Reload greift die Initialisierung der Arbeitsfläche (`initializedRef`) nicht erneut. Änderungen im Init-Effekt deshalb immer mit vollem Neuladen der Seite testen.
- **Suche:** `diagram/search.js` (`findMatches`, `normalizeSearchText`; Treffer in Leserichtung). Die Markierung läuft über `setSearchHighlights`/`clearSearchHighlights` in `highlight.js`, die Oberfläche ist `components/DiagramSearch.jsx`. Strg+F wird in `App.jsx` vor der Eingabefeld-Prüfung abgefangen, damit es auch aus dem Suchfeld heraus funktioniert.
- **Ja/Nein-Schnellauswahl:** `EditTextModal` hat die Prop `suggestions`. Die Vorschläge berechnet `decisionLabelSuggestions` in `DiagramCanvas.jsx` (nur bei Ausgängen von `vhs.Decision`).
- **Struktur-Check:** `checkFlow` und `checkLanes` in `analysis/diagram-validation.js`, mit den neuen Codes `unreachable_node`, `endless_loop`, `end_has_outgoing`, `decision_label_duplicate` und `outside_lane`. Kommentare und ihre Verbindungen zählen nicht zum Ablauf. Die mitgelieferten Vorlagen erzeugen keine neuen Befunde.
- **Im Browser geprüft:** Flächengröße, Ausrichten beim Zentrieren (Swimlane-Vorlage).
- **Noch nicht im Browser geprüft:** Zoom um die Mausposition, Einfügen an der Mausposition, Suche, Ja/Nein-Schnellauswahl, „Befund anklicken wählt aus“. Grund: Der Browser-Testlauf brach wegen Verbindungsproblemen zum Dev-Server ab. Die Logik ist durch Unit- und Komponententests abgedeckt (`viewport.test.js`, `EditTextModal.test.jsx`, `diagram-validation.test.js`).

### Was sich mit 1.3.1 geändert hat

- **Neues Modul `src/diagram/highlight.js`:** Alle vorübergehenden Markierungen laufen hierüber.
  - `addFocusHighlight` bzw. `clearFocusHighlight` erzeugen die rote Umrandung per JointJS-Mask-Highlighter.
  - `setPresentationDim` blendet in der Simulation ab, über die CSS-Klassen `vhs-dimmed` und `vhs-dimmed-link` (definiert in `index.css`).
  - Neue Hervorhebungen, z. B. Suchtreffer (3.3) oder ausgewählte Befunde (3.6), bitte hier ergänzen und **nie** über `cell.attr(...)` lösen.
  - Getestet in `highlight.test.js`: Das Modell bleibt unverändert, es entstehen keine Rückgängig-Schritte.
- **Rückgängig-Anzeige:** `DiagramCanvas.jsx` hat jetzt `notifyHistory()`. Es wird nach Laden, Leeren und `resetHistory` aufgerufen.
  - Behobener Fehler: „Rückgängig“ war direkt nach dem Öffnen eines Diagramms aktiv. Ursache war, dass `canUndo()` während des Ladens wegen der Entprellung `true` meldete und der Zustand danach nicht aktualisiert wurde.
- **Farben:** `src/utils/constants.js` enthält jetzt `LANE_COLORS` (Lane-Farbpalette). `EditLaneModal.jsx` und `shapes.js` nutzen sie; in `DiagramCanvas.jsx` stehen keine Hex-Werte mehr.
  - „Türkis“ (`#1a8070`) ist keine Styleguide-Farbe und bleibt nur für bestehende Diagramme erhalten.
  - **Noch nicht zentral (außerhalb des Editors):** `QualityPanel.jsx` (eigene Farbliste) und `data/templates.js` (Lane-Farben als Daten).
- **Struktur-Check:** Meldungen nennen deutsche Typbezeichnungen (`NODE_TYPE_LABELS` in `analysis/diagram-validation.js`) und haben korrekte deutsche Anführungszeichen.
- **Einstellungen:** Die ungenutzten `getSettings`/`saveSettings` (`gridVisible`, `autoLayout`) sind entfernt. Ein alter Eintrag `vhs-settings` kann noch im localStorage der Nutzer liegen; er ist harmlos. Ein Raster-Schalter müsste neu angelegt werden.
- **Lane-Größe:** `LaneResizeTool` nutzt Pointer Events (Maus, Stift, Touch). **Im Browser nicht getestet**; das Testdiagramm hatte keine Swimlane.

---

## 1. Fehler und Risiken (zuerst beheben)

### 1.1 ✅ Hervorhebungen verändern das Diagramm selbst — S

> **Erledigt in 1.3.1:** über `diagram/highlight.js`, siehe oben. Im Browser geprüft: In der Simulation bleiben „Rückgängig“ deaktiviert und „Alle Änderungen gespeichert“ stehen; Markierung und Abblendung erscheinen und verschwinden wieder.

Früher färbten `focusNode` und `setPresentationFocus` (`components/DiagramCanvas.jsx`) Knoten über `node.attr(...)` rot bzw. blendeten sie über die Deckkraft aus. Das waren echte Modelländerungen. Sie erzeugten Rückgängig-Schritte und einen „ungespeicherten“ Stand.

### 1.2 ✅ Arbeitsfläche hat eine feste Größe — M

> **Erledigt in 1.4.0:** `fitPaperToContent` in `diagram/viewport.js`, siehe Umsetzungsstand.

Die Arbeitsfläche ist fest 5000 × 5000 px groß, und der Zoom skaliert nur den Inhalt (`paper.scale`). Bitte prüfen:

- Bei Zoom > 100 % sind Elemente im rechten bzw. unteren Bereich vermutlich nicht mehr erreichbar.
- Elemente mit negativen Koordinaten (z. B. nach dem Einfügen oder durch Ziehen über den Rand) liegen außerhalb des sichtbaren Bereichs.

**Vorschlag:** Die Fläche nach jeder Änderung und nach jedem Zoom mit `paper.fitToContent({ padding, minWidth, minHeight, allowNewOrigin: 'any' })` an den Inhalt anpassen. Negative Bereiche sind dann ebenfalls erreichbar.

### 1.3 ✅ Zoom springt von der Arbeitsposition weg — S

> **Erledigt in 1.4.0:** `zoomAroundPoint`, Mausrad mit Faktor statt fester +0,1-Schritte. Die Schaltflächen und Strg +/− behalten ihre 10-%-Schritte, zoomen aber um die Bildmitte.

Strg + Mausrad und Strg +/− skalieren um den Nullpunkt. Der sichtbare Ausschnitt springt dabei, und man verliert die Stelle, an der man gearbeitet hat.

**Vorschlag:** Zoom um die Mausposition bzw. die Bildmitte: Scrollposition vor und nach dem Skalieren umrechnen. Dazu feinere Stufen beim Mausrad (z. B. ×1,1 statt +0,1).

### 1.4 Eigene Linienführung geht verloren bzw. ist nicht möglich — M

Verbindungen nutzen den Router `manhattan`. Knickpunkte lassen sich nicht hinzufügen (`vertexAdd: false`), und der Konverter speichert `vertices` nicht (`diagram/converter.js`, `DiagramEdge` in `diagram/types.js`). Liegt eine Linie ungünstig, etwa quer durch einen Knoten, kann man sie nicht korrigieren.

**Vorschlag:** Knickpunkte per Doppelklick bzw. Ziehen auf der Linie erlauben und als `vertices` im Datenformat speichern. Das erfordert `schemaVersion` 2 mit Migration (siehe `storage/schema.js`). Optional pro Verbindung den Router umschaltbar machen (gerade/rechtwinklig).

### 1.5 Swimlanes halten ihre Elemente nicht fest — M

Lanes sind nur Hintergrundrechtecke (`z: -10`), ohne Einbettung. Beim Verschieben einer Lane bleiben ihre Knoten liegen. Beim Verkleinern ragen Knoten heraus, und die Zuordnung ergibt sich nur aus der Lage (`auto-layout.js`).

**Vorschlag:** Knoten beim Ablegen in eine Lane einbetten (`lane.embed(node)`), beim Herausziehen wieder lösen. Lanes wachsen automatisch mit ihrem Inhalt, und Lanes untereinander lassen sich als Block verschieben bzw. umsortieren. Die Zuordnung sollte zusätzlich im Datenformat stehen (`laneId`), damit Prozessbeschreibung und Copilot sie nicht erraten müssen.

### 1.6 🔶 Kleinere Fehler — S

- ✅ **1.3.1** – **Interner Typname in Meldung:** Der Struktur-Check zeigt jetzt deutsche Typbezeichnungen statt `„process“`.
- ✅ **1.3.1** – **Ungenutzte Einstellungen:** `gridVisible`/`autoLayout` samt `getSettings`/`saveSettings` sind entfernt.
- ✅ **1.3.1** – **Lane-Werkzeug nur für Maus:** jetzt Pointer Events, aber noch nicht im Browser getestet.
- ✅ **1.3.1** (neu gefunden) – **„Rückgängig“ nach dem Öffnen aktiv**, siehe Umsetzungsstand.
- offen → **5.2** – **Speicherbedarf des Verlaufs:** Der `HistoryManager` speichert bei jeder Änderung das komplette Diagramm als JSON (50 Stufen).

---

## 2. Schnelleres Arbeiten (hoher Nutzen, geringer Aufwand)

### 2.1 Folgeschritt direkt anhängen — M

Heute braucht ein neuer, verbundener Schritt drei Handgriffe: Element ziehen, ablegen, Verbindung ziehen.

**Vorschlag:** Am ausgewählten Knoten erscheinen kleine „+“-Griffe (rechts/unten). Ein Klick legt einen Prozessschritt in passendem Abstand an und verbindet ihn. Ein Menü am Griff bietet zusätzlich Entscheidung, Ende usw. an. Bei Entscheidungen erhält der erste neue Ausgang automatisch „Ja“, der zweite „Nein“. Das beschleunigt das Erstellen am stärksten.

### 2.2 Text direkt auf der Fläche bearbeiten — M

Bearbeiten geht nur per Doppelklick und Dialog (`EditTextModal`).

**Vorschlag:** Direkt auf der Fläche bearbeiten (Textfeld über dem Knoten), außerdem Tastenkürzel:

- **F2 oder Enter:** Text des ausgewählten Elements bearbeiten.
- **Tippen bei ausgewähltem Knoten:** ersetzt den Text, wie in gängigen Diagramm-Werkzeugen.
- **Tab:** legt den nächsten Schritt an (mit 2.1 kombinierbar).

### 2.3 🔶 Verbindungsbeschriftung schneller und frei platzierbar — S

> **Teilweise erledigt in 1.4.0:** Die Ja/Nein-Schnellauswahl ist umgesetzt. **Offen:** verschiebbare Beschriftungen. Dafür muss sich das Datenformat ändern (Position der Beschriftung), deshalb bewusst in Stufe 3 zusammen mit `schemaVersion` 2.

- Bei Ausgängen von Entscheidungen „Ja“ / „Nein“ als Schnellauswahl im Bearbeitungsdialog.
- Beschriftungen entlang der Linie verschiebbar machen (`labelMove: true`, Position im Datenformat speichern). Heute überdecken sich Beschriftungen bei engen Verzweigungen.

### 2.4 Hilfslinien beim Verschieben — M

Beim Ziehen eines Elements Hilfslinien einblenden, wenn es mit Mitte oder Kante eines anderen Elements fluchtet, und dort einrasten. Das ergänzt die vorhandenen Befehle „Ausrichten/Verteilen“, die erst eine Mehrfachauswahl brauchen.

### 2.5 ✅ Einfügen an der Mausposition — S

> **Erledigt in 1.4.0:** `pasteOffset` in `diagram/viewport.js`. Duplizieren (Strg+D) versetzt weiterhin um 30 px.

`paste` versetzt die Kopie um 30 px gegenüber dem Original (`PASTE_OFFSET`). Besser ist es, an der letzten Mausposition auf der Fläche einzufügen, bzw. in der Bildmitte, falls die Maus außerhalb ist.

### 2.6 Verbindung umhängen, ohne sie neu zu ziehen — S

Verbindungen lassen sich per Pfeilspitze umhängen (`arrowheadMove`), das ist aber kaum auffindbar. Einen kurzen Hinweis in der Elementleiste unten ergänzen. Zusätzlich beim Löschen eines Knotens zwischen zwei anderen anbieten, Vorgänger und Nachfolger direkt zu verbinden („Schritt entfernen, Ablauf erhalten“). Der Copilot kann das in der Prüfansicht bereits.

---

## 3. Größere Funktionen

### 3.1 Eigenschaften-Bereich für Elemente — L

Rechts eine Seitenleiste für das ausgewählte Element: Text, Zuständigkeit (Rolle/Lane), Beschreibung bzw. Erläuterung, beteiligtes Dokument oder IT-System, Dauer bzw. Frist. Ersetzt die Doppelklick-Dialoge und macht die Prozessbeschreibung (Word/Markdown) deutlich reichhaltiger. Das hängt mit „Schritt-Erläuterungen als eigenes Feld“ in `docs/zukünftige Anpassungen.md` zusammen; beides zusammen umsetzen (gemeinsame `schemaVersion`-Erhöhung).

### 3.2 Weitere Elementtypen für Verwaltungsprozesse — M

Typische Bausteine in vhs-Abläufen, die heute als Prozessschritt plus Kommentar nachgebildet werden:

- **Dokument/Formular:** z. B. Anmeldeformular, Vertrag.
- **IT-System/Datenablage:** z. B. Verwaltungssoftware, E-Mail-Postfach. Damit wird ein Medienbruch sichtbar, was zum Bewertungskriterium „Medienbruch“ passt.
- **Teilprozess:** ein Verweis auf ein anderes gespeichertes Diagramm, das per Klick geöffnet wird. Damit lassen sich große Prozesse aufteilen.
- **Warten/Frist:** z. B. „14 Tage auf Rückmeldung warten“.

Formen und Farben nach Styleguide (`docs/Styleguide_für_KI_Agenten.md`), Farben nur aus `utils/constants.js`; neue Typen in `NODE_TYPE_LABELS` (`analysis/diagram-validation.js`) ergänzen.

### 3.3 ✅ Suchen im Diagramm — S

> **Erledigt in 1.4.0:** Strg+F bzw. die Lupe in der unteren Leiste. Durchsucht werden die Texte aller Elemente, nicht die Verbindungsbeschriftungen.

Strg+F öffnet ein Suchfeld. Treffer werden nacheinander angesprungen und hervorgehoben; dafür `diagram/highlight.js` nutzen, also ohne Modelländerung. Hilfreich bei großen Diagrammen und in Workshops.

### 3.4 Übersichtskarte und „Alles einpassen“ — M

- **Übersichtskarte (Minimap):** unten rechts für große Diagramme, mit verschiebbarem Sichtfenster.
- **„Alles einpassen“:** stellt den Zoom so ein, dass das ganze Diagramm sichtbar ist (`paper.scaleContentToFit`), z. B. per Strg+Umschalt+1. „Zentrieren“ gibt es bereits, es passt aber den Zoom nicht an.

### 3.5 Teilweise automatisch anordnen — M

„Automatisch anordnen“ ordnet heute immer das ganze Diagramm neu und verwirft alle Handanpassungen. Gewünscht:

- nur die Auswahl anordnen,
- neue, noch unverbundene Elemente einordnen, ohne den Rest zu verschieben.

### 3.6 ✅ Struktur-Check erweitern — S

> **Erledigt in 1.4.0:** alle fünf Prüfungen, außerdem wählt ein Klick auf einen Befund das Element aus (`revealNode`).

Zusätzliche Prüfungen in `analysis/diagram-validation.js`:

- **Unerreichbare Knoten:** Knoten, die vom Start aus nicht erreichbar sind (heute nur „nicht verbunden“).
- **Endlosschleifen:** Schleifen ohne Ausgang.
- **Verbindungen am Ende:** Verbindungen, die von einem Endknoten weggehen.
- **Doppelte Ausgänge:** Entscheidungen mit doppelten Ausgangsbeschriftungen (zweimal „Ja“).
- **Lane-Fehler:** Knoten außerhalb jeder Swimlane, obwohl Lanes verwendet werden.

Außerdem: Ein Klick auf einen Befund wählt das Element aus (über `setSelectionRef` in `DiagramCanvas.jsx`), statt es nur kurz rot aufblinken zu lassen. So kann man es direkt bearbeiten.

---

## 4. Barrierefreiheit und Geräte

### 4.1 Mit der Tastatur durch das Diagramm — M

Elemente lassen sich nur mit der Maus auswählen. Vorschlag:

- Tab bzw. Pfeiltasten (mit Modifikator) springen von Knoten zu Knoten entlang der Verbindungen.
- Die Auswahl wird über eine `aria-live`-Region angesagt („Prozessschritt ‚Antrag prüfen‘, 2 Ausgänge“).
- Pfeiltasten verschieben die Auswahl bereits, das ist ein guter Anfang.

### 4.2 Textalternative zum Diagramm — S

Unter der Arbeitsfläche eine ausblendbare, strukturierte Textfassung des Ablaufs (Liste der Schritte mit Verzweigungen). Für Screenreader ist das die wichtigste Verbesserung. Die Logik dafür existiert bereits in `export/process-description.js`.

### 4.3 🔶 Touch und Stift — M

Verschieben der Ansicht und Rahmenauswahl nutzen noch `mousemove`/`mouseup` am Fenster. Auf Tablets und Convertibles (z. B. in Workshops) funktioniert das nicht. Umstellen auf Pointer Events, dazu Zwei-Finger-Zoom. Das Lane-Größenwerkzeug ist seit 1.3.1 umgestellt (Muster in `LaneResizeTool`).

---

## 5. Code-Qualität im Editor

### 5.1 ✅ `DiagramCanvas.jsx` aufteilen — M

> **Erledigt in 1.4.1:** Die Datei hat jetzt rund 470 statt 908 Zeilen. Die Module sind im Umsetzungsstand beschrieben. Abweichend vom Vorschlag liegt die Auswahl nicht in einem Hook, sondern als Controller in `diagram/selection.js`, weil sie fast nur JointJS-Ereignisse betrifft.

Die Datei hat rund 800 Zeilen, davon ein einziger großer `useEffect` mit allen Ereignissen. Vorschlag:

- `LaneResizeTool` in eine eigene Datei auslagern.
- Auswahl, Ansichtsverschiebung/Rahmenauswahl sowie Zoom/Scrollen jeweils als eigenes Modul bzw. eigenen Hook (z. B. `diagram/selection.js`, `diagram/viewport.js`). Vorbild ist `diagram/highlight.js` (1.3.1).

Damit werden die Teile einzeln testbar; heute sind sie es nur über `diagram/editing.test.js`.

### 5.2 Verlauf auf Befehle umstellen — L

Statt kompletter JSON-Stände nur die Änderungen je Schritt speichern, z. B. mit JointJS `CommandManager` oder einer eigenen Lösung auf Basis von `startBatch`/`stopBatch`. Vorteile:

- deutlich weniger Speicher,
- klare Schritte („Text geändert“, „3 Elemente verschoben“), die man auch im Menü anzeigen kann,
- beim Rückgängigmachen bleibt die Auswahl erhalten (heute leert `graph.fromJSON` sie).

Bei der Umstellung `notifyHistory()` in `DiagramCanvas.jsx` beibehalten (siehe 1.3.1).

### 5.3 ✅ Farben zentral beziehen — S

> **Erledigt in 1.3.1:** `DiagramCanvas.jsx` nutzt `COLORS`, die Lane-Palette liegt als `LANE_COLORS` in `utils/constants.js`. Offen außerhalb des Editors: `QualityPanel.jsx` und `data/templates.js`.

### 5.4 Tests für Interaktionen — M

Die reinen Funktionen (Anordnen, Ablage, Layout, Konverter, seit 1.3.1 auch Hervorhebungen) sind gut getestet. Für Auswahl, Gruppenverschieben, Einfügen und Rückgängig fehlen Tests. Nach 5.1 lassen sie sich ohne vollständiges JointJS-Rendering schreiben. Muster: Paper-Stellvertreter mit `findViewByModel` und Spies auf die JointJS-Highlighter (`highlight.test.js`).

---

## Empfohlene Reihenfolge

1. ✅ **Sofort (1.3.1):** 1.1 (Hervorhebung), 1.6 (kleine Fehler), 5.3 (Farben).
2. ✅ **Nächstes Release (1.4.0):** 1.2 (Fläche anpassen), 1.3 (Zoom zur Maus), 2.3 (Ja/Nein), 2.5 (Einfügen), 3.3 (Suche), 3.6 (Struktur-Check).
3. **Danach, mit einer gemeinsamen `schemaVersion`-Erhöhung:** 1.4 (Knickpunkte), 1.5 (Lanes einbetten), 2.1 (Folgeschritt), 3.1 (Eigenschaften), 3.2 (Elementtypen), verschiebbare Beschriftungen (Rest von 2.3).
4. **Laufend:** 4.x (Barrierefreiheit) und 5.x (Code-Qualität); 5.1 ist erledigt (1.4.1).
