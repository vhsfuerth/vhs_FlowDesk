# vhs Workflow Editor – Entwicklung

Quellcode des vhs Workflow-Algorithm Editors. Funktionsübersicht und Bedienung: [README im Hauptverzeichnis](../README.md). Änderungen: [CHANGELOG.md](../CHANGELOG.md).

## Befehle

Voraussetzung: Node.js ≥ 20.

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # Entwicklungsserver
npm run lint         # ESLint
npm run typecheck    # TypeScript-Prüfung der JSDoc-typisierten Module
npm test             # Vitest (einmalig), npm run test:watch für den Watch-Modus
npm run check        # lint + typecheck + test (läuft auch in CI und im Vercel-Build)
npm run build        # Produktions-Build nach dist/
npm run preview      # Build lokal testen – mit den Sicherheits-Headern aus ../vercel.json
```

## Projektstruktur

```
src/
├── ai/            Gemini-Client, Modellkonfiguration (config.js), Prompts, copilot/ (KI-Copilot)
├── analysis/      Strukturprüfung, Selbstbewertung, Versionsvergleich
├── components/    React-Komponenten (Canvas, Leisten, Dialoge)
├── data/          Starter-Vorlagen
├── diagram/       JointJS-Shapes, JSON-Konverter, automatisches Anordnen, Zwischenablage, Ausrichten, Undo/Redo, Typen
├── export/        PNG/SVG/PDF/JSON/CSV-Export, Prozessbeschreibung (Markdown/Word; jsPDF und docx werden erst bei Bedarf geladen)
├── hooks/         useAutosave, useConfirm, useDialogA11y, useAiConsent
├── state/         UI-Zustand (Reducer für Dialoge und Seitenleisten)
├── storage/       IndexedDB, Einstellungen, Datenformat/Migration (schema.js), Import
└── test/          Test-Setup
```

Tests liegen neben dem getesteten Modul (`*.test.js`).

## Wichtige Konventionen

- **Datenformat:** Jedes Diagramm trägt `schemaVersion`. Bei Formatänderungen `CURRENT_SCHEMA_VERSION` in `src/storage/schema.js` erhöhen und eine Migration ergänzen – inklusive Test.
- **KI-Modelle:** Nur in `src/ai/config.js` pflegen. Der API-Key wird ausschließlich im Header `x-goog-api-key` gesendet.
- **Datenschutzhinweis:** Bei inhaltlichen Änderungen an `AiPrivacyNotice.jsx` die Konstante `AI_PRIVACY_NOTICE_VERSION` in `src/storage/settings.js` erhöhen, damit Nutzende erneut bestätigen.
- **Dialoge:** Keine `window.confirm`/`alert` – stattdessen `useConfirm()`. Neue Dialoge nutzen `useDialogA11y` (Fokus, Tab, Escape) und `role="dialog"` + `aria-modal="true"`.
- **Version:** In `package.json` nach SemVer pflegen; sie wird über `__APP_VERSION__` in der App angezeigt. Jede Änderung in `CHANGELOG.md` eintragen.
- **Tests:** Logiktests als `*.test.js`, Komponententests als `*.test.jsx` neben dem Modul. Komponenten mit `renderWithConfirm` aus `src/test/render.jsx` rendern; für IndexedDB vor jedem Test `resetDatabase()` aus `src/test/db.js` aufrufen. Bedienung über Rollen und Beschriftungen (`getByRole`) abfragen, nicht über CSS-Klassen.
- **Typisierung:** Schrittweise Einführung von TypeScript über JSDoc. Typgeprüfte Dateien sind in `jsconfig.json` unter `include` gelistet und beginnen mit `// @ts-check`.
