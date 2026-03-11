# vhs Workflow-Algorithm Editor

Lokal laufendes PWA-Tool (Progressive Web App) zur Erstellung algorithmischer Ablaufpläne (Flowcharts, Entscheidungsbäume) basierend auf dem vhs Corporate Design.

## ✨ Hauptfunktionen

- **KI-Diagramm-Generierung**: Erzeugt Diagramme direkt aus einer einfachen Prozessbeschreibung (Freitext) über die Google Gemini API.
- **Visueller Editor**: Drag & Drop Editor basierend auf JointJS im vhs Design.
- **Dynamisches Sizing**: Automatische Anpassung der Element-Größe an den Textinhalt (inkl. Zeilenumbruch).
- **Speicherverwaltung**: Mehrere Diagramme lokal speichern, laden, benennen und löschen (IndexedDB).
- **Offline-fähig**: Der Editor, das Laden, Speichern und der Export (PNG, SVG, PDF, JSON) funktionieren auch ohne Internetverbindung. Lediglich das KI-Generator-Feature benötigt Internet.
- **Lokale Datenhaltung**: Alle Diagramme und der API-Key werden ausschließlich lokal im Browser gespeichert.

## 🛠️ Letzte Fixes & Updates

- **Text-Overflow gelöst**: Elemente nutzen nun `textWrap` und skalieren automatisch mit der Textmenge.
- **Manuelle Verbindungen**: Elemente besitzen nun "Ports" an den Rändern, von denen aus Verbindungen per Maus gezogen werden können (sichtbar bei Hover).
- **Separates Ende-Element**: Das orangefarbene Ende-Oval ist jetzt separat in der Toolbar verfügbar.
- **Speicher-Stabilität**: "Floating Links" (unfertige Verbindungen) wurden abgefangen und führen nicht mehr zu Fehlern beim Speichern.
- **Echtzeit-Renaming**: Diagramm-Namen können direkt im Header per Klick editiert werden.
- **Reset-Funktion**: Ein dedizierter "Leeren"-Button erlaubt das schnelle Zurücksetzen der Arbeitsfläche.

## 🚀 Erste Schritte / Installation

1. Stelle sicher, dass [Node.js](https://nodejs.org) installiert ist.
2. Führe die Datei `install.bat` per Doppelklick aus.
3. Starte das Tool zukünftig mit einem Klick auf die `start.bat`.
4. Öffne die Adresse `http://localhost:5173` im Browser (Chrome/Edge empfohlen).
5. Trage deinen Google Gemini API-Key in den Einstellungen (Zahnrad) ein.

## 📱 Lokale Nutzung & PWA (Installation als App)

Da das Tool als **Progressive Web App (PWA)** entwickelt wurde, kannst du es wie eine normale Desktop-Anwendung installieren:

1. **In Chrome/Edge**: Klicke oben rechts in der Adresszeile auf das kleine Icon "App installieren" (oder über das Drei-Punkte-Menü -> "App installieren").
2. **Vorteil**: Du hast dann ein eigenes Programm-Icon auf deinem Desktop und die App öffnet sich in einem eigenen Fenster ohne Browser-Leisten.
3. **Daten**: Alle Diagramme bleiben weiterhin ausschließlich auf deinem Rechner gespeichert und werden nicht in eine Cloud geladen.

## 📖 Nutzungshintergrund

- **Gekennzeichnete Ports**: Fahre mit der Maus über den Rand eines Elements, klicke auf einen der erscheinenden gelben Punkte und ziehe die Linie zum Zielelement.
- **Text bearbeiten**: Mache einen **Doppelklick** auf ein Element oder eine Verbindungslinie, um den Text manuell zu ändern. Die Box-Größe passt sich automatisch an.
- **Speichern**: Nutze den "Speichern"-Button unten links. Deine Diagramme werden sicher in deinem Browser (IndexedDB) abgelegt.
- **Laden**: Über den "Laden"-Button kannst du auf die Liste deiner gespeicherten Projekte zugreifen.

## 💻 Technologien (Developer Info)
- Frontend: React 19 + Vite
- Styling: Tailwind CSS v4 (vhs Design System)
- Engine: JointJS + Dagre.js (Auto-Layout)
- Storage: IndexedDB
- Export: jsPDF, SVG & PNG

## 📦 Weitergabe & Web-Hosting

Wenn du die Software an Kolleg*innen weitergeben möchtest, gibt es drei ideale Wege:

### 1. Als Web-App (Empfohlen)
Bevor du die Dateien hochlädst, musst du die Produktions-Dateien generieren:
1. Führe die Datei **`build.bat`** im Hauptverzeichnis per Doppelklick aus.
2. Warte, bis das Fenster meldet: "[ERFOLG] Der Build wurde erstellt!".
3. Es ist nun ein neuer Ordner namens `vhs-flowchart-editor/dist/` entstanden. **Nur dieser Ordner** wird für den Webserver benötigt.
Lade den Inhalt des Ordners `vhs-flowchart-editor/dist/` auf einen statischen Webserver (z. B. vhs-Intranet, GitHub Pages oder einen beliebigen Webspace) hoch. 

### 2. Intranet-Hosting (Lokale Domain)
Wenn ihr bereits Systeme wie Bookstack unter `bookstack.vhs.local` habt, funktioniert das hier exakt genauso:
1. **Build**: Erstelle den `dist/`-Ordner mit `npm run build`.
2. **Server**: Kopiere den Inhalt auf euren internen Webserver (Apache, Nginx oder IIS).
3. **DNS**: Erstellt einen DNS-Eintrag (A-Record) für `workflow.vhs.local`, der auf die IP dieses Servers zeigt.
4. **Fertig**: Die Software ist nun für alle Kolleg*innen im Netzwerk unter der Adresse erreichbar.

### 4. Hosting auf einem Ubuntu-Server (Expert)
Für den Betrieb auf einem Linux-Server (z.B. mit Nginx) folge diesen Schritten:

1. **Build lokal**: Erstelle den `dist/`-Ordner mit der `build.bat` auf deinem Rechner.
2. **Transfer**: Kopiere den Inhalt des `dist/`-Ordners auf den Server nach `/var/www/workflow-editor`.
3. **Nginx Konfiguration**: Erstelle eine Config-Datei unter `/etc/nginx/sites-available/workflow-editor`:
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
4. **Aktivieren**: `sudo ln -s /etc/nginx/sites-available/workflow-editor /etc/nginx/sites-enabled/` und Nginx neu starten: `sudo systemctl restart nginx`.

### 3. Als ZIP-Archiv (Lokal)
Du kannst den gesamten Projektordner als `.zip` verschicken. 
- **Voraussetzung**: Der Empfänger muss [Node.js](https://nodejs.org) installiert haben.
- **Start**: Der Empfänger entpackt das ZIP und startet die Software einfach über die `start.bat`.

---
*Erstellt für die vhs im Rahmen der Prozess-Digitalisierung 2026.*
