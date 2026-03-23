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
npm run preview    # preview production build
```

There are no tests configured.

## Architecture

### Data Flow

User text input -> Gemini API -> JSON `{nodes, edges}` -> JointJS graph -> visual editor -> IndexedDB persistence

The canonical diagram format is `{ nodes: [...], edges: [...] }` where nodes have `{id, type, label, position, size}` and edges have `{id, from, to, label, sourcePort, targetPort}`.

### Key Modules

- **`src/App.jsx`** -- Root component, manages all app state (current diagram, metadata, notifications, modals). State is lifted here; child components communicate via callbacks.
- **`src/diagram/shapes.js`** -- Custom JointJS element definitions under the `vhs.*` namespace (`vhs.Start`, `vhs.End`, `vhs.Process`, `vhs.Decision`, `vhs.Annotation`, `vhs.Lane`). Registers them on `joint.shapes.vhs`. All shape styling uses constants from `utils/constants.js`.
- **`src/diagram/graph.js`** -- Creates JointJS `Graph` and `Paper` instances with project defaults (manhattan routing, rounded connectors, snap-to-port).
- **`src/diagram/converter.js`** -- `JSONConverter` class: bidirectional conversion between the app's JSON format and JointJS graph cells.
- **`src/diagram/layout.js`** -- `DiagramLayout` using dagre for automatic node arrangement. Excludes `vhs.Lane` elements from layout.
- **`src/diagram/history.js`** -- Undo/redo stack for diagram state.
- **`src/ai/gemini-client.js`** -- Gemini API client with model fallback chain (`gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash` -> `gemini-1.5-flash-latest`). Also handles improvement suggestion generation.
- **`src/ai/prompts.js`** -- System prompts for AI generation.
- **`src/storage/indexeddb.js`** -- IndexedDB wrapper (DB: `vhs-flowcharts-db`, stores: `diagrams`, `diagram-versions`). Max 10 versions per diagram.
- **`src/storage/settings.js`** -- localStorage-based settings (API key, custom prompt, last diagram ID).
- **`src/export/file-export.js`** -- Export to PNG, SVG, PDF (via jsPDF), JSON, CSV.
- **`src/components/DiagramCanvas.jsx`** -- Core canvas component wrapping JointJS Paper. Exposed via `ref` with imperative methods (`loadDiagram`, `exportAsPNG`, `undo`, `redo`, etc.).
- **`src/components/QualityPanel.jsx`** -- Right-side panel for quality review scores and improvement items.
- **`src/analysis/diagram-validation.js`** -- Validates diagram structure (orphan nodes, missing start/end, etc.).

### Vite Configuration

JointJS is aliased to its CJS build (`joint.js` instead of `joint.mjs`) because the ESM build creates a frozen module namespace that breaks `Object.assign(joint.shapes, ...)`. See `vite.config.js`.

## Corporate Design (vhs)

The app follows the vhs corporate design (detailed in `docs/Styleguide_fuer_KI_Agenten.md`):

- **Primary color**: `#00285A` (vhs Blau) -- all color constants are in `src/utils/constants.js`
- **Font**: `Arial, Calibri, Helvetica, sans-serif`
- **Styling framework**: Tailwind CSS v4
- **"vhs" is always written in lowercase**

## Language

The UI is in **German**. All user-facing strings, notifications, and labels should be in German.
