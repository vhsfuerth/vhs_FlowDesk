# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**vhs Workflow-Algorithm Editor** -- a client-only PWA (React + Vite + JointJS) for creating algorithmic flowcharts for organizational processes at German adult education centers (Volkshochschulen). All data stays local (IndexedDB); the only external calls go to the AI provider the user picks in Settings.

## Commands

The app lives in `vhs-flowchart-editor/`; run npm scripts from there.

- `npm run check` = lint + typecheck + test. CI (`.github/workflows/ci.yml`) and the Vercel build run it; it must pass before merging.
- `npm run typecheck` only covers the JSDoc-typed modules listed in `jsconfig.json` (files start with `// @ts-check`); add new pure modules there.
- `npm run preview` serves the production build with the security headers (CSP) from `../vercel.json`.
- Tests sit next to modules (`*.test.js`, component tests `*.test.jsx` with Testing Library + fake-indexeddb; helpers in `src/test/`). In tests, unmount (`cleanup()`) before `vi.restoreAllMocks()` -- hooks like `useAutosave` write on unmount, which otherwise hits real IndexedDB after teardown (fails only on CI).

Version follows SemVer in `package.json` (shown in the app via `__APP_VERSION__`); record every change in `CHANGELOG.md` at the repo root. Work on a `release/x.y.z` branch, merge to `master` via PR, then tag `vx.y.z`.

Editor roadmap: `improvement.md` (repo root) lists open editor improvements and records what each release implemented. Read it before editor work and update its status section afterwards.

## Rules and gotchas

- **Highlights never touch the model**: temporary markings (focus, simulation dimming, search hits) go through `src/diagram/highlight.js` (JointJS highlighters), never `cell.attr(...)` -- otherwise they create undo steps and mark the diagram unsaved.
- **Viewport**: the paper resizes to its content and its origin can be non-zero, so never compute scroll positions as `position * zoom`. Use `src/diagram/viewport.js` (`scrollToLocalRect`, `zoomAroundPoint`, `visibleCenterLocal`). Changes to the init effect in `DiagramCanvas.jsx` need a full page reload to test (hot reload skips it via `initializedRef`).

- **Canvas modules**: `components/DiagramCanvas.jsx` only wires things up. Interactions live in `src/diagram/` (`paper.js`, `selection.js`, `pan-select.js`, `lane-resize-tool.js`, `text-editing.js`, `viewport.js`). Each returns a `detach`/unsubscribe function that the init effect calls on cleanup. Add new interactions as a module of the same kind, tested with a fake paper (`diagram/canvas-parts.test.js`).

- **Tool positions**: custom `ToolView`s render inside the transformed layer, so position them from `model.getBBox()` (local coordinates), never `view.getBBox()` (paper coordinates incl. translate/zoom).

- **Data format**: `{ nodes, edges }` (typedefs in `src/diagram/types.js`). Stored records carry `schemaVersion`; when the format changes, bump `CURRENT_SCHEMA_VERSION` and add a migration in `src/storage/schema.js`.
- **AI providers**: Gemini, OpenAI-compatible (OpenAI, Mistral, custom server) and Anthropic, called directly from the browser. Presets and default models live only in `src/ai/providers.js`; request/response formats per API in `src/ai/adapters.js`; `src/ai/ai-client.js` falls back to the next model on HTTP 404/503/529 and retries once without schema/extra params on 400. API keys go in headers, never the URL. Custom server URLs must be `https://` or `http://localhost` (the CSP in `vercel.json` allows exactly that).
- **Privacy notice**: when the text of `components/AiPrivacyNotice.jsx` changes, bump `AI_PRIVACY_NOTICE_VERSION` in `storage/settings.js` so users confirm again.
- **Dialogs**: never use `window.confirm`/`alert` -- use `useConfirm()`. New modals use `hooks/useDialogA11y.js` with `role="dialog"` and `aria-modal="true"`; modals are lazy-loaded and only mounted while open.
- **Previews never touch the editor**: read-only renderings (`DiagramPreview.jsx`) use their own JointJS graph.
- **JointJS alias**: `vite.config.js` aliases `jointjs` to its CJS build because the ESM build's frozen module namespace breaks `Object.assign(joint.shapes, ...)`.

## Corporate Design (vhs)

Follow `docs/Styleguide_für_KI_Agenten.md`: primary color `#00285A` (vhs Blau), all colors from `src/utils/constants.js`, font `Arial, Calibri, Helvetica, sans-serif`, Tailwind CSS v4. **"vhs" is always written in lowercase.**

## Language

The UI is in **German**. All user-facing strings, notifications, and labels must be German.
