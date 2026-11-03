# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**vhs Workflow-Algorithm Editor** -- a client-only Progressive Web App (PWA) for creating algorithmic flowcharts for organizational processes at German adult education centers (Volkshochschulen). Built with React + Vite + JointJS. All data stays local (IndexedDB); the only external call is to the Gemini API for AI-powered diagram generation from free text.

## Development Commands

All commands run from `vhs-flowchart-editor/`:

```bash
cd vhs-flowchart-editor
npm install        # install dependencies
npm run dev        # start Vite dev server
npm run build      # production build to dist/
npm run lint       # ESLint (flat config, JS/JSX only)
npm run typecheck  # tsc over the JSDoc-typed modules listed in jsconfig.json
npm test           # Vitest (jsdom); tests live next to modules as *.test.js
npm run check      # lint + typecheck + test (also run by CI and the Vercel build)
npm run preview    # preview production build with the security headers from ../vercel.json
```

CI runs in `.github/workflows/ci.yml`. Version follows SemVer in `package.json` (shown in the app via `__APP_VERSION__`); record every change in `CHANGELOG.md` at the repo root.

## Architecture

### Data Flow

User text input -> Gemini API -> JSON `{nodes, edges}` -> JointJS graph -> visual editor -> IndexedDB persistence

The canonical diagram format is `{ nodes: [...], edges: [...] }` where nodes have `{id, type, label, position, size}` and edges have `{id, from, to, label, sourcePort, targetPort}`. Typedefs are in `src/diagram/types.js`. Stored records carry `schemaVersion`; bump `CURRENT_SCHEMA_VERSION` and add a migration in `src/storage/schema.js` when the format changes.

### Key Modules

- **`src/App.jsx`** -- Root component, holds the document state (current diagram, metadata, live data, notifications). UI state (open modal, panels) is a reducer in `src/state/uiState.js`. Modals are lazy-loaded and only mounted while open. Child components communicate via callbacks.
- **`src/diagram/shapes.js`** -- Custom JointJS element definitions under the `vhs.*` namespace (`vhs.Start`, `vhs.End`, `vhs.Process`, `vhs.Decision`, `vhs.Annotation`, `vhs.Lane`). Registers them on `joint.shapes.vhs`. All shape styling uses constants from `utils/constants.js`.
- **`src/diagram/converter.js`** -- `JSONConverter` class: bidirectional conversion between the app's JSON format and JointJS graph cells.
- **`src/diagram/layout.js`** -- `DiagramLayout` applies the pure `computeAutoLayout` from `src/diagram/auto-layout.js` (dagre; with swimlanes: left-to-right flow, nodes kept inside their lane, lanes stacked and resized).
- **`src/diagram/clipboard.js` / `src/diagram/arrange.js`** -- Pure helpers for copy/paste fragments (new IDs, localStorage clipboard) and align/distribute. Multi-selection lives in `DiagramCanvas` (`selectionRef`); App handles the shortcuts (Ctrl+C/V/D/A, arrows).
- **`src/diagram/history.js`** -- Undo/redo stack for diagram state (debounced snapshots; undo/redo flush a pending snapshot first).
- **`src/ai/gemini-client.js`** -- Gemini API client. API key goes in the `x-goog-api-key` header, never the URL. Falls back to the next model on HTTP 404. Also handles improvement suggestion generation.
- **`src/ai/config.js`** -- Model list and API settings (single place to update when Google retires models).
- **`src/hooks/useAiConsent.jsx`** -- Shows the privacy notice (`components/AiPrivacyNotice.jsx`) before the first AI call; bump `AI_PRIVACY_NOTICE_VERSION` in `storage/settings.js` when the notice text changes.
- **`src/ai/prompts.js`** -- System prompts for AI generation.
- **`src/storage/indexeddb.js`** -- IndexedDB wrapper (DB: `vhs-flowcharts-db` v3, stores: `diagrams`, `diagram-versions`, `drafts`). Max 10 versions per diagram. Records are migrated on read.
- **`src/storage/schema.js`** -- Format version, migrations, import validation (German error messages), backup format.
- **`src/hooks/useAutosave.js`** -- Compares current content with the last saved snapshot and writes debounced drafts to the `drafts` store.
- **`src/storage/settings.js`** -- localStorage-based settings (API key, custom prompt, last diagram ID, AI privacy consent).
- **`src/hooks/useConfirm.js` + `components/ConfirmDialog.jsx`** -- Promise-based confirm dialog; never use `window.confirm`/`alert`. New modals use `hooks/useDialogA11y.js` (focus, Tab trap, Escape) with `role="dialog"` and `aria-modal="true"`.
- **`src/export/file-export.js`** -- Export to PNG, SVG, PDF (via jsPDF, dynamically imported on first use), JSON, CSV.
- **`src/export/process-description.js` + `process-export.js`** -- Process description (numbered steps, branches, roles from lanes) as Markdown and .docx (`docx` library, dynamically imported).
- **`src/analysis/diagram-diff.js` + `components/VersionCompareModal.jsx`** -- Read-only version comparison; `DiagramPreview.jsx` renders it with its own JointJS graph so the editor is never touched.
- **`src/components/DiagramCanvas.jsx`** -- Core canvas component wrapping JointJS Paper. Exposed via `ref` with imperative methods (`loadDiagram`, `exportAsPNG`, `undo`, `redo`, etc.).
- **`src/components/QualityPanel.jsx`** -- Right-side panel for quality review scores and improvement items.
- **`src/analysis/diagram-validation.js`** -- Validates diagram structure (orphan nodes, missing start/end, etc.).

### Vite Configuration

JointJS is aliased to its CJS build (`joint.js` instead of `joint.mjs`) because the ESM build creates a frozen module namespace that breaks `Object.assign(joint.shapes, ...)`. See `vite.config.js`.

## Corporate Design (vhs)

The app follows the vhs corporate design (detailed in `docs/Styleguide_für_KI_Agenten.md`):

- **Primary color**: `#00285A` (vhs Blau) -- all color constants are in `src/utils/constants.js`
- **Font**: `Arial, Calibri, Helvetica, sans-serif`
- **Styling framework**: Tailwind CSS v4
- **"vhs" is always written in lowercase**

## Language

The UI is in **German**. All user-facing strings, notifications, and labels should be in German.
