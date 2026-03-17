# vhs Corporate Design – Referenz für KI-Agenten

> Quelle: DVV Styleguide zum vhs-Markenpaket, Stand März 2023
> Zweck: Technische Referenz für die Erstellung von Software, Weboberflächen und digitalen Anwendungen im vhs-Corporate Design.

---

## 1. Farbsystem

### 1.1 Primärfarbe

| Name | HEX | RGB | CMYK | Pantone |
|------|-----|-----|------|---------|
| **vhs Blau** | `#00285A` | 0, 40, 90 | 100, 75, 10, 50 | 655 C |

### 1.2 Abstufungen der Primärfarbe

| Stufe | HEX | RGB | CMYK |
|-------|-----|-----|------|
| 80 % | `#375578` | 55, 85, 120 | 80, 60, 8, 40 |
| 60 % | `#69829B` | 105, 130, 155 | 60, 45, 5, 30 |
| 40 % | `#9BAABE` | 155, 170, 190 | 40, 30, 5, 20 |
| 20 % | `#CDD7DC` | 205, 215, 220 | 20, 15, 0, 10 |
| 10 % | `#E6EBF0` | 230, 235, 240 | 10, 7, 0, 5 |

### 1.3 Sekundärfarben

Jede Sekundärfarbe hat eine Hauptvariante (A) und einen Schattenfarbton (B) für Kreisüberschneidungen.

| Name | Themenfeld | A – HEX | A – RGB | B – HEX | B – RGB |
|------|------------|---------|---------|---------|---------|
| **vhs Gelb** | Grundbildung | `#FAB90F` | 250, 185, 15 | `#FF9100` | 225, 145, 0 |
| **vhs Orange hell** | Schulabschlüsse | `#F7A746` | 247, 167, 70 | `#A25C2E` | 162, 92, 46 |
| **vhs Rot** | Kultur | `#E1000F` | 225, 0, 15 | `#8C0A23` | 140, 10, 35 |
| **vhs Grün** | Gesundheit | `#AFC805` | 175, 200, 5 | `#4BA02D` | 75, 160, 45 |
| **vhs Violett** | Sprache | `#7D5AA5` | 125, 90, 165 | `#371964` | 55, 25, 100 |
| **vhs Hellblau** | Beruf | `#64B9E6` | 100, 185, 230 | `#1E73AF` | 30, 115, 175 |
| **vhs Orange** | Gesellschaft | `#EB640F` | 235, 100, 15 | `#B42D0F` | 180, 45, 15 |

### 1.4 Farbzuordnung Programmbereiche

| Programmbereich | Farbe |
|-----------------|-------|
| Grundbildung | vhs Gelb |
| Schulabschlüsse | vhs Orange hell |
| Kultur und Gestalten | vhs Rot |
| Gesundheit | vhs Grün |
| Sprachen | vhs Violett |
| Arbeit und Beruf | vhs Hellblau |
| Politik, Gesellschaft und Umwelt | vhs Orange |

---

## 2. Barrierefreiheit – Farbkontraste

### 2.1 Erlaubte Kombinationen (guter Kontrast)

- Weiß auf vhs Blau (`#FFFFFF` auf `#00285A`)
- vhs Gelb A auf vhs Blau (`#FAB90F` auf `#00285A`)
- vhs Grün A auf vhs Blau (`#AFC805` auf `#00285A`)
- Weiß auf vhs Violett A (`#FFFFFF` auf `#7D5AA5`)
- vhs Blau auf Weiß (`#00285A` auf `#FFFFFF`)
- vhs Violett A auf Weiß (`#7D5AA5` auf `#FFFFFF`)
- vhs Rot B auf Weiß (`#8C0A23` auf `#FFFFFF`)

### 2.2 Verbotene Kombinationen (ungenügender Kontrast)

- vhs Rot A auf vhs Blau
- vhs Hellblau B auf vhs Blau
- vhs Orange A auf vhs Blau
- Weiß auf vhs Gelb A
- Weiß auf vhs Grün A
- Weiß auf vhs Orange hell A
- vhs Hellblau A auf Weiß
- vhs Gelb A auf Weiß
- vhs Grün A auf Weiß

### 2.3 Generelle Regeln

- Rot-Grün-Kombinationen vermeiden (Rot-Grün-Blindheit).
- Keine Komplementärfarben-Kontraste (Flimmereffekt).
- Keine Bilder oder Farbverläufe als Texthintergrund.
- Sekundärfarben als Textfarbe: Mindestschriftgröße 7,5 pt.

---

## 3. Schriften

### 3.1 Hausschrift

| Priorität | Schriftart | Schnitte | Verfügbarkeit |
|-----------|------------|----------|---------------|
| 1 (Standard) | **Arial** | Regular, Bold | Systemschrift (Windows, Linux, macOS) |
| 2 (Alternative) | **Calibri** | Regular, Bold | Office-Systemschrift |
| 3 (Satzprogramme) | **Helvetica** | Regular, Bold | Lizenzpflichtig (auf macOS frei) |

### 3.2 Regeln

- Pro Medium **nur eine** der drei Schriften verwenden (keine Mischung im Innenteil).
- Auf dem Titel darf eine andere der drei Schriften gewählt werden als im Innenteil.
- Arial läuft bei gleicher Schriftgröße größer als Calibri – bei Schriftwechsel optisch anpassen.
- Für Web-Anwendungen: Arial oder system-ui als Fallback.

### 3.3 Empfehlung für digitale Anwendungen (CSS)

```css
font-family: Arial, Calibri, Helvetica, sans-serif;
```

---

## 4. Logo

### 4.1 Aufbau

Das vhs-Logo ist eine **Wort-Bild-Marke** bestehend aus:
- **Wort**: „vhs" in Kleinbuchstaben
- **Bild**: Offener Ring aus sich berührenden und überschneidenden farbigen Kreispunkten

Beide Elemente bilden zusammen das Logo und werden **immer gemeinsam** eingesetzt. Ausnahme: Favicon (nur Bild-Element).

### 4.2 Logovarianten

| Variante | Einsatzbereich |
|----------|---------------|
| Vierfarbig positiv (auf Weiß) | Standard |
| Vierfarbig negativ (auf vhs Blau) | Dunkle Hintergründe |
| Graustufen | 1-farbige Drucke |
| 1-farbig schwarz | Kleine Abbildungen 10–15 mm (Stempel, Stickereien) |
| 1-farbig negativ | Kleine Abbildungen 10–15 mm auf dunklem Grund |

### 4.3 Mindestgröße

- Standardlogo: **mindestens 15 mm Breite**
- Originalgröße: 100 mm bei 100 %

### 4.4 Schutzzone

- Abgeleitet aus der Breite des Buchstabens „v"
- Links: 1× Breite „v"
- Rechts: ½× Breite „v"
- Oben und unten: entsprechend
- **Keine Elemente innerhalb der Schutzzone platzieren.**

### 4.5 Verbote

- Logo nicht auf farbige Hintergründe setzen, wenn Kreise nicht sichtbar bleiben.
- Farben der Kreise **nicht verändern**.
- Logo-Dateien **nicht modifizieren**.

### 4.6 Verortung und Bezeichnung

Neben dem Logo wird der Name der Volkshochschule platziert:
- **Schriftart**: Arial
- **Farben positiv**: 100 % vhs Blau + 60 % vhs Blau
- **Farben negativ**: 100 % Weiß + 30 % vhs Blau
- Horizontal: rechts neben der Schutzzone
- Vertikal: unterhalb des Logos (greift in Schutzzone ein, Abstand = „v")

---

## 5. Kreise als Gestaltungselement

### 5.1 Größenstufung

Kreise werden in **15 %-Schritten** zueinander verkleinert, ausgehend vom größten Kreis (100 %):

100 % → 85 % → 70 % → 55 % → 40 % → 25 % → 10 %

### 5.2 Überlagerungsregel

- Kreise, die sich überschneiden, müssen sich **immer bis zur Hälfte** des kleineren Kreises überlagern.
- Reduzierter Einsatz: weniger Kreise = moderneres Erscheinungsbild.

---

## 6. Tonalität und Sprache

### 6.1 Kommunikationsstil

- Freundlich, authentisch, verbindlich, unkompliziert, natürlich, auf Augenhöhe
- Direkte Ansprache der Zielgruppe (Siezen)
- Aktivsätze bevorzugen
- Einfache Satzkonstruktionen, keine Bandwurmsätze
- Keine Fremdwörter oder Fachsprache ohne Erklärung

### 6.2 Schreibkonventionen

- Abkürzung immer in Kleinbuchstaben: **vhs** (nicht VHS)
- Gendergerechte Sprache: Gendersternchen möglich (z. B. Mitarbeiter\*innen), alternativ Doppelnennung oder genderneutrale Begriffe

### 6.3 Passende Adjektive für vhs-Texte

freundlich, offen, entspannt, konzentriert, unaufgeregt, kompetent, beratend, vielseitig, kreativ, interkulturell

---

## 7. Bildwelt

### 7.1 Bildtypen

| Typ | Einsatz | Charakter |
|-----|---------|-----------|
| **Imagebilder** | Cover, Kampagnen, Web | Emotional, ziehen Betrachter\*in hinein, zeigen Vielfalt und Miteinander |
| **Contentbilder** | Innenseiten, Kursbeschreibungen | Fokus auf Tätigkeit, reale Szenen |

### 7.2 Bildkriterien

- Warmes, helles Farbklima mit natürlichen Farbtönen
- Realistisch, nicht gestellt
- Handelnde Personen im Fokus
- Augenhöhe-Perspektive
- Verschiedene Altersgruppen, Herkünfte, Kulturen
- Natürliches Aussehen (kein übertriebenes Make-Up)
- Klare Bildaussage, Fokus durch Schärfe/Unschärfe

### 7.3 Don'ts

- Kein hartes Gegenlicht
- Keine grellen/künstlichen Farben
- Keine Fischaugenperspektiven
- Keine klischeehaften oder Studio-Motive
- Keine abgeschnittenen Köpfe
- Keine künstlichen Montagen
- Keine unfreundlich/gelangweilt wirkenden Personen

---

## 8. Gestaltungsvorlagen – Übersicht

### 8.1 PowerPoint

- Ruhige Inhaltsseiten, Inhalt im Vordergrund
- Sekundärfarben zur Hervorhebung nutzbar
- Fließtext: Arial Regular, 18 pt, Schwarz
- Überschriften: Arial Bold, 28 pt oder 18 pt
- Bullets erscheinen in vhs Blau
- Text-Ebenen: 1. Ebene 18 pt, 2. Ebene 16 pt, 3. Ebene 14 pt

### 8.2 Broschürentypen

| Typ | Zielgruppe | Covervarianten |
|-----|-----------|----------------|
| Programmhefte | Endkund\*innen | A, B, C |
| Imagebroschüren | Endkund\*innen, Stakeholder, Unternehmen | C |
| Dokumentationen/Leitfäden | Mitarbeitende, Fachpublikum | A, B |

### 8.3 Covervarianten

| Variante | Beschreibung |
|----------|-------------|
| **A** | Blaue oder weiße Farbfläche mit Kreiselementen |
| **B** | Vollflächiges Bild mit großem halbtransparentem Blau-Kreis |
| **C** | Vollflächiges Bild mit kleinem Kreis als Bulletpoint |

---

## 9. Digitale Anwendungen

### 9.1 Zoom-Hintergründe

- vhs Blau als Haupthintergrund
- Kreise in Blau-Abstufungen als Gestaltungselement
- Logo oben links

### 9.2 Newsletter

- Header mit Bild und Kreiselement
- Logo-Integration im Header-Bereich

---

## 10. Schnellreferenz für CSS/Web-Implementierung

```css
:root {
  /* Primärfarbe */
  --vhs-blau: #00285A;
  --vhs-blau-80: #375578;
  --vhs-blau-60: #69829B;
  --vhs-blau-40: #9BAABE;
  --vhs-blau-20: #CDD7DC;
  --vhs-blau-10: #E6EBF0;

  /* Sekundärfarben (A-Varianten) */
  --vhs-gelb: #FAB90F;
  --vhs-orange-hell: #F7A746;
  --vhs-rot: #E1000F;
  --vhs-gruen: #AFC805;
  --vhs-violett: #7D5AA5;
  --vhs-hellblau: #64B9E6;
  --vhs-orange: #EB640F;

  /* Sekundärfarben (B-Varianten / Schatten) */
  --vhs-gelb-b: #FF9100;
  --vhs-orange-hell-b: #A25C2E;
  --vhs-rot-b: #8C0A23;
  --vhs-gruen-b: #4BA02D;
  --vhs-violett-b: #371964;
  --vhs-hellblau-b: #1E73AF;
  --vhs-orange-b: #B42D0F;

  /* Schriften */
  --font-primary: Arial, Calibri, Helvetica, sans-serif;
}
```

---

## 11. Checkliste für KI-Agenten

- [ ] Primärfarbe `#00285A` als Hauptfarbe verwenden
- [ ] Schriftart Arial (Fallback: Calibri, Helvetica) einsetzen
- [ ] Schreibweise „vhs" immer in Kleinbuchstaben
- [ ] Gendersternchen verwenden (z. B. Teilnehmer\*innen)
- [ ] Farbkontraste gemäß Barrierefreiheitsregeln prüfen
- [ ] Kreise nur in 15 %-Schritten zueinander skalieren
- [ ] Kreisüberschneidungen immer bis zur Hälfte
- [ ] Logo-Schutzzone einhalten
- [ ] Keine Rot-Grün-Farbkombinationen
- [ ] Sekundärfarben themenbereichsbezogen einsetzen
