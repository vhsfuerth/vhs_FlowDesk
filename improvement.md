# Verbesserungsvorschläge Flowchart-Editor

Erstellt für Version 1.3.0 (2026-11-04), fortgeschrieben bei jeder Umsetzung. Betrachtet wird ausschließlich der Editor, also Arbeitsfläche, Elemente, Verbindungen, Swimlanes, Auswahl, Rückgängig und Struktur-Check. KI-Funktionen, Speicherung und Exporte sind nicht Teil dieser Liste. Geplante KI-Themen stehen in [docs/zukünftige Anpassungen.md](docs/zukünftige%20Anpassungen.md).

Aufwand: **S** = bis ½ Tag, **M** = 1–2 Tage, **L** = mehrere Tage.
Status: ✅ erledigt (mit Version), 🔶 teilweise erledigt, offen = ohne Markierung.

## Umsetzungsstand

| Stufe | Punkte | Status |
| --- | --- | --- |
| 1. Sofort | 1.1, 1.6, 5.3 | ✅ 1.3.1 (Branch `release/1.3.1`) |
| 2. Nächstes Release | 1.2, 1.3, 2.3, 2.5, 3.3, 3.6 | ✅ 1.4.0 (2.3 ohne verschiebbare Beschriftungen; Browsertest teilweise offen) |
| 3. Mit `schemaVersion` 2 | 1.4, 1.5, 2.1, 3.1, 3.2 + verschiebbare Beschriftungen aus 2.3 | ✅ 1.5.0 (Browsertest offen) |
| Zusätzlich in 1.5.0 | 2.2, 2.4, 2.6, 4.2 | ✅ 1.5.0 (Browsertest offen) |
| Zusätzlich in 1.6.0 | 3.4, 3.5 | ✅ 1.6.0 (Browsertest offen) |
| 4. Laufend | 4.1, 5.4 | offen (5.3 in 1.3.1, 5.1 in 1.4.1, 4.2 in 1.5.0 erledigt; 4.3 und 5.2 gestrichen) |

### Was sich mit 1.6.0 geändert hat (Wissen für Folgeschritte)

- **Übersichtskarte und Alles einpassen:** Geometrie in `diagram/overview.js` (`fitZoom` höchstens 100 %, `isFullyVisible`, `minimapFrame`/`toMinimap`/`fromMinimap`; Tests in `overview.test.js`). `diagram/overview-tracking.js` meldet `{ items, content, view }` höchstens einmal pro Frame (Graph-Änderungen, Scrollen, Zoom, Größe). `components/Minimap.jsx` ist eine eigene SVG-Zeichnung (kein zweites JointJS-Paper) und erscheint nur, wenn nicht alles sichtbar ist; ausgeblendet über `localStorage` `vhs-minimap-hidden`. `fitToView` in `DiagramCanvas.jsx` setzt den Zoom über `onZoomSet` und scrollt danach im Zoom-Effekt mittig (`fitAfterZoomRef`).
- **Teilweises Anordnen** in `diagram/partial-layout.js` (ohne JointJS, Tests in `partial-layout.test.js`): `layoutSelection` (dagre nur für die Auswahl, verankert an deren linker oberer Ecke; mit Swimlanes nur waagerecht, y bleibt). Es liefert nur die betroffenen Positionen und die Anschlüsse der berührten Verbindungen.
- Angewendet von `applyPartialLayout` in `DiagramCanvas.jsx` im Batch `layout`: Elemente mit Eltern-Lane bleiben eingebettet (`growLaneToFit`), freie Elemente laufen durch `assignLane`.

### Was sich mit 1.5.0 geändert hat (Wissen für Folgeschritte)

- **Format 2** (`CURRENT_SCHEMA_VERSION = 2`, Migration 1 → 2 in `storage/schema.js`). Felder in `diagram/types.js`; Listen `NODE_TYPES`, `NODE_DETAIL_FIELDS`, `NODE_TYPE_LABELS` (zentral, auch für Struktur-Check und Eigenschaften-Leiste).
  - Zusatzangaben liegen im JointJS-Modell als Attribut `details` (Objekt, nur nicht leere Texte). Zugriff über `getNodeDetails`/`setNodeDetail` in `diagram/converter.js`. Im JSON stehen sie flach am Knoten.
  - Verbindungen: `vertices`, `labelPosition` (Lage des ersten Labels), `routing` (`straight` = JointJS-Router `normal`, Standard `manhattan`, siehe `ROUTERS`).
  - Der Verlauf (`history.js`) beobachtet zusätzlich `change:details`, `change:router`, `change:parent`, `change:embeds`.
- **Swimlanes = JointJS-Einbettung.** `laneId` im JSON entspricht der Elternzelle. Der Konverter bettet nach `laneId` ein, sonst nach Lage (`diagram/lanes.js`, ohne JointJS, auch für Migration, Prozessbeschreibung, Auto-Layout).
  - `diagram/lane-embedding.js`: `assignLane` (nach Ablegen, Pfeiltasten, Ausrichten, Einfügen, Auto-Layout), `growLaneToFit` (wächst nur), `minLaneSize` (Griff), `moveLane` (Tauschen), `attachLaneEmbedding` (Ereignisse; nicht in den Batches `import`, `layout`, `move-lane`).
  - **Wichtig (JointJS 3.7):** `position(x, y)` bewegt nur die Zelle selbst, `position(x, y, { deep: true })` und `translate()` auch eingebettete Zellen. Das Ziehen auf der Fläche nutzt `deep`. Gemeinsames Verschieben und Ausrichten nutzen deshalb `deep: true`, `growLaneToFit` bewusst nicht.
  - `vhs.Lane.remove()` löst vor dem Löschen die Einbettung, sonst würde JointJS den Inhalt mitlöschen.
  - Elemente in einer mit ausgewählten Lane werden beim gemeinsamen Verschieben und mit Pfeiltasten nicht zusätzlich bewegt (`hasSelectedAncestor` in `selection.js`).
- **Eigenschaften-Leiste** `components/PropertiesPanel.jsx`: schreibt direkt ins Modell, bei jeder Eingabe; der Verlauf fasst Tippen über seine Entprellung zusammen. Sie hört selbst auf `change` der Zelle. Der Doppelklick fokussiert das Textfeld über `focusToken`. `EditTextModal`/`EditLaneModal` sind entfernt.
- **Folgeschritt:** `diagram/add-next.js` (Lage, Anschlüsse, Ja/Nein, ohne JointJS), `add-next-tool.js` (Griffe; löst die Paper-Ereignisse `element:add-next` und `element:add-next-menu` aus), `components/AddNextMenu.jsx`. Das Anlegen übernimmt `addNextStep` in `DiagramCanvas.jsx`; der neue Schritt kommt in die Lane der Quelle.
- **Knickpunkte:** `diagram/vertex-drag.js` legt erst nach 5 px Ziehweg einen Knickpunkt an, und nur beim Ziehen auf der Linie (`joint-selector` `line`/`wrapper`) einer Verbindung mit Start und Ziel. JointJS meldet auch beim Aufziehen einer neuen Verbindung vom Anschlusspunkt `link:pointerdown`; das hatte zunächst an jeder neuen Verbindung einen Knickpunkt erzeugt (im Browsertest gefunden). JointJS' `vertexAdd` bzw. `vertexAdding` würde schon beim Anklicken einen anlegen und ist deshalb aus. `linkTools.Vertices` dient nur zum Verschieben und Entfernen.
- **Neue Typen:** `vhs.Document`, `vhs.System`, `vhs.Subprocess`, `vhs.Wait` in `shapes.js`; `createNode(type, …)` und `NODE_DEFAULTS` sind die zentrale Fabrik. `calc()` funktioniert in JointJS nur in `d`, `x`, `y` usw., nicht in `refX`/`refY` (dort `refX2`/`refY2` als Versatz). Das Öffnen eines Teilprozesses läuft über das Paper-Ereignis `element:subprocess:open` (Attribut `event` am Symbol) bzw. `onOpenSubprocess(id, mode)` → `App.handleOpenSubprocess`; `mode` ist `ask` (Abfrage), `preview` (schreibgeschützt hier anzeigen, `SubprocessDialog.jsx`) oder `switch`.
- **Eigenschaften je Typ:** `NODE_FIELDS` in `PropertiesPanel.jsx` legt fest, welche Angaben ein Typ zeigt (`main`, `more`). Neue Felder dort und in `NODE_DETAIL_FIELDS` ergänzen.
- **Struktur-Check:** `validateDiagram(diagram, items, { diagramIds, currentDiagramId })`. Die App reicht die IDs der gespeicherten Diagramme herein (für `subprocess_missing`/`subprocess_self`), das Qualitätspanel bekommt das Ergebnis als Prop. Weitere neue Codes: `wait_without_duration`; `document`/`system` mit Eingang, aber ohne Ausgang gelten als Ablage (kein `dead_end`).
- **Text auf der Fläche (2.2):** `components/InlineTextEditor.jsx`, gesteuert von `inlineEdit` in `DiagramCanvas.jsx` (`startInlineEdit`, Lage über `paper.localToClientRect`). Beim Scrollen und Zoomen wird übernommen (`commitOpenInlineEditor`, Erkennung über `data-inline-editor`). Tasten in `App.jsx` (F2/Enter, Lostippen) greifen nur, wenn der Fokus auf der Arbeitsfläche (`#vhs-canvas-scroll`) oder auf `body` liegt, damit Enter auf Bedienelementen normal funktioniert. `Tab` legt bewusst keinen Folgeschritt an (auf Wunsch entfernt: nicht intuitiv, kollidiert mit der Tab-Reihenfolge). Rechtsklick auf Element/Verbindung (`element:contextmenu`/`link:contextmenu`) blendet die Eigenschaften-Leiste ein bzw. aus. Der Doppelklick fokussiert nicht mehr die Eigenschaften-Leiste.
  - **Wichtig (JointJS):** Das Paper verhindert beim Klicken den Fokuswechsel (`preventDefault`). Deshalb holt `DiagramCanvas` den Fokus bei `pointerdown` selbst auf die Fläche, und `InlineTextEditor` übernimmt bei einem Klick daneben über einen eigenen `pointerdown`-Listener, nicht nur über `onBlur` (beides im Browsertest gefunden).
  - Der Anfasser des Qualitätspanels ist nur noch mit der Maus bedienbar und nicht mehr in der Tab-Reihenfolge (vorher ein unbeschrifteter Button).
- **Hilfslinien (2.4):** `diagram/snaplines.js` (`computeSnap`, ohne JointJS) und `snapline-drag.js` (bei `element:pointermove`, zeichnet in die Ebene `front`). Nicht bei Lanes, Mehrfachauswahl oder gedrückter Alt-Taste.
- **Ablauf erhalten (2.6):** `diagram/bridge.js` (`bridgeEdges`: Vorgänger → einziger Nachfolger, Beschriftung/Startanschluss von der eingehenden Verbindung). `App.handleDeleteSelection` fragt nach (`useConfirm`; Esc bzw. „Nur entfernen“ löscht ohne Verbinden, beides mit Strg+Z rückgängig). Das X am Element löst `element:remove-request` aus und läuft über denselben Weg (`onDeleteRequest`).
- **Textfassung (4.2):** `components/DiagramTextAlternative.jsx` unter der Arbeitsfläche, nutzt `buildProcessDescription`; Zustand auf/zu im `localStorage`.
- **KI:** Copilot und „Direkt erzeugen“ kennen die neuen Typen und Angaben (Copilot: `kind` document/system/wait → intern `kind: 'task'` mit `taskType`; Angaben `description`, `document`, `system`, `duration`). Prompts nach aktuellem Muster (Kontext, Regeln mit Begründung, Beispiel in Tags, Selbstprüfung, Ausgabe am Ende). Gespeicherte Standard-Prompts gelten nicht als eigener Prompt (`isDefaultPrompt`, `LEGACY_SYSTEM_PROMPTS` in `ai/prompts.js`; neue frühere Fassungen dort ergänzen, wenn `SYSTEM_PROMPT` sich ändert).
- **Offen:** Ein Browsertest der ganzen Stufe steht aus.

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

### 1.4 ✅ Eigene Linienführung geht verloren bzw. ist nicht möglich — M

> **Erledigt in 1.5.0:** Knickpunkte durch Ziehen (`vertex-drag.js`), gespeichert als `vertices`; Linienführung rechtwinklig/gerade in der Eigenschaften-Leiste.

Verbindungen nutzen den Router `manhattan`. Knickpunkte lassen sich nicht hinzufügen (`vertexAdd: false`), und der Konverter speichert `vertices` nicht (`diagram/converter.js`, `DiagramEdge` in `diagram/types.js`). Liegt eine Linie ungünstig, etwa quer durch einen Knoten, kann man sie nicht korrigieren.

**Vorschlag:** Knickpunkte per Doppelklick bzw. Ziehen auf der Linie erlauben und als `vertices` im Datenformat speichern. Das erfordert `schemaVersion` 2 mit Migration (siehe `storage/schema.js`). Optional pro Verbindung den Router umschaltbar machen (gerade/rechtwinklig).

### 1.5 ✅ Swimlanes halten ihre Elemente nicht fest — M

> **Erledigt in 1.5.0:** Einbettung, Mitwachsen, Mindestgröße, Umsortieren (Eigenschaften-Leiste) und `laneId` im Format. Das Umsortieren per Ziehen ist nicht umgesetzt, nur über die Schaltflächen.

Lanes sind nur Hintergrundrechtecke (`z: -10`), ohne Einbettung. Beim Verschieben einer Lane bleiben ihre Knoten liegen. Beim Verkleinern ragen Knoten heraus, und die Zuordnung ergibt sich nur aus der Lage (`auto-layout.js`).

**Vorschlag:** Knoten beim Ablegen in eine Lane einbetten (`lane.embed(node)`), beim Herausziehen wieder lösen. Lanes wachsen automatisch mit ihrem Inhalt, und Lanes untereinander lassen sich als Block verschieben bzw. umsortieren. Die Zuordnung sollte zusätzlich im Datenformat stehen (`laneId`), damit Prozessbeschreibung und Copilot sie nicht erraten müssen.

### 1.6 ✅ Kleinere Fehler — S

- ✅ **1.3.1** – **Interner Typname in Meldung:** Der Struktur-Check zeigt jetzt deutsche Typbezeichnungen statt `„process“`.
- ✅ **1.3.1** – **Ungenutzte Einstellungen:** `gridVisible`/`autoLayout` samt `getSettings`/`saveSettings` sind entfernt.
- ✅ **1.3.1** – **Lane-Werkzeug nur für Maus:** jetzt Pointer Events, aber noch nicht im Browser getestet.
- ✅ **1.3.1** (neu gefunden) – **„Rückgängig“ nach dem Öffnen aktiv**, siehe Umsetzungsstand.
- entfällt – **Speicherbedarf des Verlaufs:** Der `HistoryManager` speichert weiter das komplette Diagramm als JSON (50 Stufen). Die Umstellung auf Befehle (ehemals 5.2) ist auf Wunsch gestrichen.

---

## 2. Schnelleres Arbeiten (hoher Nutzen, geringer Aufwand)

### 2.1 ✅ Folgeschritt direkt anhängen — M

> **Erledigt in 1.5.0:** „+“-Griffe rechts/unten, Menü für weitere Typen, Ja/Nein bei Entscheidungen, Tastaturweg über die Eigenschaften-Leiste.

Heute braucht ein neuer, verbundener Schritt drei Handgriffe: Element ziehen, ablegen, Verbindung ziehen.

**Vorschlag:** Am ausgewählten Knoten erscheinen kleine „+“-Griffe (rechts/unten). Ein Klick legt einen Prozessschritt in passendem Abstand an und verbindet ihn. Ein Menü am Griff bietet zusätzlich Entscheidung, Ende usw. an. Bei Entscheidungen erhält der erste neue Ausgang automatisch „Ja“, der zweite „Nein“. Das beschleunigt das Erstellen am stärksten.

### 2.2 ✅ Text direkt auf der Fläche bearbeiten — M

> **Erledigt in 1.5.0:** Textfeld über Element bzw. Beschriftung (Doppelklick, F2, Enter), Lostippen ersetzt den Text. „Tab legt den nächsten Schritt an“ wurde ausprobiert und wieder entfernt.

Bearbeiten geht nur per Doppelklick und Dialog (`EditTextModal`).

**Vorschlag:** Direkt auf der Fläche bearbeiten (Textfeld über dem Knoten), außerdem Tastenkürzel:

- **F2 oder Enter:** Text des ausgewählten Elements bearbeiten.
- **Tippen bei ausgewähltem Knoten:** ersetzt den Text, wie in gängigen Diagramm-Werkzeugen.
- **Tab:** legt den nächsten Schritt an (mit 2.1 kombinierbar).

### 2.3 ✅ Verbindungsbeschriftung schneller und frei platzierbar — S

> **Rest erledigt in 1.5.0:** Beschriftungen lassen sich verschieben (`labelMove`), die Lage wird als `labelPosition` gespeichert.

> **Teilweise erledigt in 1.4.0:** Die Ja/Nein-Schnellauswahl ist umgesetzt. **Offen:** verschiebbare Beschriftungen. Dafür muss sich das Datenformat ändern (Position der Beschriftung), deshalb bewusst in Stufe 3 zusammen mit `schemaVersion` 2.

- Bei Ausgängen von Entscheidungen „Ja“ / „Nein“ als Schnellauswahl im Bearbeitungsdialog.
- Beschriftungen entlang der Linie verschiebbar machen (`labelMove: true`, Position im Datenformat speichern). Heute überdecken sich Beschriftungen bei engen Verzweigungen.

### 2.4 ✅ Hilfslinien beim Verschieben — M

> **Erledigt in 1.5.0:** Einrasten an Kanten und Mitten mit oranger Hilfslinie; Alt schaltet ab.

Beim Ziehen eines Elements Hilfslinien einblenden, wenn es mit Mitte oder Kante eines anderen Elements fluchtet, und dort einrasten. Das ergänzt die vorhandenen Befehle „Ausrichten/Verteilen“, die erst eine Mehrfachauswahl brauchen.

### 2.5 ✅ Einfügen an der Mausposition — S

> **Erledigt in 1.4.0:** `pasteOffset` in `diagram/viewport.js`. Duplizieren (Strg+D) versetzt weiterhin um 30 px.

`paste` versetzt die Kopie um 30 px gegenüber dem Original (`PASTE_OFFSET`). Besser ist es, an der letzten Mausposition auf der Fläche einzufügen, bzw. in der Bildmitte, falls die Maus außerhalb ist.

### 2.6 ✅ Verbindung umhängen, ohne sie neu zu ziehen — S

> **Erledigt in 1.5.0:** Hinweis in der Elementleiste und Abfrage „Entfernen und Ablauf verbinden“ beim Löschen.

Verbindungen lassen sich per Pfeilspitze umhängen (`arrowheadMove`), das ist aber kaum auffindbar. Einen kurzen Hinweis in der Elementleiste unten ergänzen. Zusätzlich beim Löschen eines Knotens zwischen zwei anderen anbieten, Vorgänger und Nachfolger direkt zu verbinden („Schritt entfernen, Ablauf erhalten“). Der Copilot kann das in der Prüfansicht bereits.

---

## 3. Größere Funktionen

### 3.1 ✅ Eigenschaften-Bereich für Elemente — L

> **Erledigt in 1.5.0:** `PropertiesPanel.jsx`. Die Angaben erscheinen in der Prozessbeschreibung. Der Punkt „Schritt-Erläuterungen als eigenes Feld“ aus `docs/zukünftige Anpassungen.md` ist damit ebenfalls umgesetzt.

Rechts eine Seitenleiste für das ausgewählte Element: Text, Zuständigkeit (Rolle/Lane), Beschreibung bzw. Erläuterung, beteiligtes Dokument oder IT-System, Dauer bzw. Frist. Ersetzt die Doppelklick-Dialoge und macht die Prozessbeschreibung (Word/Markdown) deutlich reichhaltiger. Das hängt mit „Schritt-Erläuterungen als eigenes Feld“ in `docs/zukünftige Anpassungen.md` zusammen; beides zusammen umsetzen (gemeinsame `schemaVersion`-Erhöhung).

### 3.2 ✅ Weitere Elementtypen für Verwaltungsprozesse — M

> **Erledigt in 1.5.0:** Dokument/Formular, IT-System, Teilprozess (mit Verknüpfung und Öffnen), Warten/Frist.

Typische Bausteine in vhs-Abläufen, die heute als Prozessschritt plus Kommentar nachgebildet werden:

- **Dokument/Formular:** z. B. Anmeldeformular, Vertrag.
- **IT-System/Datenablage:** z. B. Verwaltungssoftware, E-Mail-Postfach. Damit wird ein Medienbruch sichtbar, was zum Bewertungskriterium „Medienbruch“ passt.
- **Teilprozess:** ein Verweis auf ein anderes gespeichertes Diagramm, das per Klick geöffnet wird. Damit lassen sich große Prozesse aufteilen.
- **Warten/Frist:** z. B. „14 Tage auf Rückmeldung warten“.

Formen und Farben nach Styleguide (`docs/Styleguide_für_KI_Agenten.md`), Farben nur aus `utils/constants.js`; neue Typen in `NODE_TYPE_LABELS` (`analysis/diagram-validation.js`) ergänzen.

### 3.3 ✅ Suchen im Diagramm — S

> **Erledigt in 1.4.0:** Strg+F bzw. die Lupe in der unteren Leiste. Durchsucht werden die Texte aller Elemente, nicht die Verbindungsbeschriftungen.

Strg+F öffnet ein Suchfeld. Treffer werden nacheinander angesprungen und hervorgehoben; dafür `diagram/highlight.js` nutzen, also ohne Modelländerung. Hilfreich bei großen Diagrammen und in Workshops.

### 3.4 ✅ Übersichtskarte und „Alles einpassen“ — M (1.6.0)

- **Übersichtskarte (Minimap):** unten rechts für große Diagramme, mit verschiebbarem Sichtfenster.
- **„Alles einpassen“:** stellt den Zoom so ein, dass das ganze Diagramm sichtbar ist (`paper.scaleContentToFit`), z. B. per Strg+Umschalt+1. „Zentrieren“ gibt es bereits, es passt aber den Zoom nicht an.

### 3.5 ✅ Teilweise automatisch anordnen — M (1.6.0)

„Automatisch anordnen“ ordnet heute immer das ganze Diagramm neu und verwirft alle Handanpassungen. Gewünscht:

- nur die Auswahl anordnen,
- ~~neue, noch unverbundene Elemente einordnen, ohne den Rest zu verschieben~~ (in 1.6.0 umgesetzt und auf Wunsch wieder entfernt).

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

### 4.2 ✅ Textalternative zum Diagramm — S

> **Erledigt in 1.5.0:** „Ablauf als Text“ unter der Arbeitsfläche, mit Sprunglink.

Unter der Arbeitsfläche eine ausblendbare, strukturierte Textfassung des Ablaufs (Liste der Schritte mit Verzweigungen). Für Screenreader ist das die wichtigste Verbesserung. Die Logik dafür existiert bereits in `export/process-description.js`.

---

## 5. Code-Qualität im Editor

### 5.1 ✅ `DiagramCanvas.jsx` aufteilen — M

> **Erledigt in 1.4.1:** Die Datei hat jetzt rund 470 statt 908 Zeilen. Die Module sind im Umsetzungsstand beschrieben. Abweichend vom Vorschlag liegt die Auswahl nicht in einem Hook, sondern als Controller in `diagram/selection.js`, weil sie fast nur JointJS-Ereignisse betrifft.

Die Datei hat rund 800 Zeilen, davon ein einziger großer `useEffect` mit allen Ereignissen. Vorschlag:

- `LaneResizeTool` in eine eigene Datei auslagern.
- Auswahl, Ansichtsverschiebung/Rahmenauswahl sowie Zoom/Scrollen jeweils als eigenes Modul bzw. eigenen Hook (z. B. `diagram/selection.js`, `diagram/viewport.js`). Vorbild ist `diagram/highlight.js` (1.3.1).

Damit werden die Teile einzeln testbar; heute sind sie es nur über `diagram/editing.test.js`.

### 5.3 ✅ Farben zentral beziehen — S

> **Erledigt in 1.3.1:** `DiagramCanvas.jsx` nutzt `COLORS`, die Lane-Palette liegt als `LANE_COLORS` in `utils/constants.js`. Offen außerhalb des Editors: `QualityPanel.jsx` und `data/templates.js`.

### 5.4 Tests für Interaktionen — M

Die reinen Funktionen (Anordnen, Ablage, Layout, Konverter, seit 1.3.1 auch Hervorhebungen) sind gut getestet. Für Auswahl, Gruppenverschieben, Einfügen und Rückgängig fehlen Tests. Nach 5.1 lassen sie sich ohne vollständiges JointJS-Rendering schreiben. Muster: Paper-Stellvertreter mit `findViewByModel` und Spies auf die JointJS-Highlighter (`highlight.test.js`).

---

## Empfohlene Reihenfolge

1. ✅ **Sofort (1.3.1):** 1.1 (Hervorhebung), 1.6 (kleine Fehler), 5.3 (Farben).
2. ✅ **Nächstes Release (1.4.0):** 1.2 (Fläche anpassen), 1.3 (Zoom zur Maus), 2.3 (Ja/Nein), 2.5 (Einfügen), 3.3 (Suche), 3.6 (Struktur-Check).
3. ✅ **Mit `schemaVersion` 2 (1.5.0):** 1.4 (Knickpunkte), 1.5 (Lanes einbetten), 2.1 (Folgeschritt), 3.1 (Eigenschaften), 3.2 (Elementtypen), verschiebbare Beschriftungen (Rest von 2.3).
4. **Laufend:** 4.1, 4.2 (Barrierefreiheit) und 5.4 (Tests); 5.1 ist erledigt (1.4.1). 4.3 (Touch und Stift) und 5.2 (Verlauf auf Befehle) sind gestrichen.
