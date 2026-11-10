# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**vhs FlowDesk** -- a client-only PWA (React + Vite + JointJS) for creating algorithmic flowcharts for organizational processes at German adult education centers (Volkshochschulen). All data stays local (IndexedDB); the only external calls go to the AI provider the user picks in Settings.

## Commands

The app lives in `vhs-flowchart-editor/`; run npm scripts from there.

- `npm run check` = lint + typecheck + test. CI (`.github/workflows/ci.yml`) and the Vercel build run it; it must pass before merging.
- `npm run typecheck` only covers the JSDoc-typed modules listed in `jsconfig.json` (files start with `// @ts-check`); add new pure modules there.
- `npm run preview` serves the production build with the security headers (CSP) from `../vercel.json`.
- Tests sit next to modules (`*.test.js`, component tests `*.test.jsx` with Testing Library + fake-indexeddb; helpers in `src/test/`). In tests, unmount (`cleanup()`) before `vi.restoreAllMocks()` -- hooks like `useAutosave` write on unmount, which otherwise hits real IndexedDB after teardown (fails only on CI).

Version follows SemVer in `package.json` (shown in the app via `__APP_VERSION__`); record every change in `CHANGELOG.md` at the repo root. Work on a `release/x.y.z` branch, merge to `master` via PR, then tag `vx.y.z`.

Maintenance roadmap: `improvement.md` (repo root) lists technical maintenance tasks only (accessibility audit, refactoring, dependency upgrades, performance) -- no new features. Read it before such work and update its status table afterwards.

## Rules and gotchas

- **App is wiring only**: `App.jsx` composes hooks from `src/hooks/` (`useDiagramDocument` = open/save/drafts/confirm-leave, `useKeyboardShortcuts`, `useDiagramExport`, `useCanvasCommands`, `useSubprocess`, `useDiagramValidation`). Put new flows into a hook, not into `App.jsx`. `App.test.jsx` mocks `DiagramCanvas` with the same imperative API -- extend the fake API there when the canvas API grows.
- **Highlights never touch the model**: temporary markings (focus, simulation dimming, search hits) go through `src/diagram/highlight.js` (JointJS highlighters), never `cell.attr(...)` -- otherwise they create undo steps and mark the diagram unsaved.
- **Viewport**: the paper resizes to its content and its origin can be non-zero, so never compute scroll positions as `position * zoom`. Use `src/diagram/viewport.js` (`scrollToLocalRect`, `zoomAroundPoint`, `visibleCenterLocal`). Changes to the init effect in `DiagramCanvas.jsx` need a full page reload to test (hot reload skips it via `initializedRef`).

- **Canvas modules**: `components/DiagramCanvas.jsx` only wires things up (keep it under ~500 lines). Interactions live in `src/diagram/` (`paper.js`, `selection.js`, `pan-select.js`, `lane-resize-tool.js`, `text-editing.js`, `viewport.js`, `canvas-events.js`), editing commands over the graph in `diagram/canvas-editing.js`, view and inline editing in `hooks/useCanvasViewport.js` and `hooks/useInlineEdit.js`. Each returns a `detach`/unsubscribe function that the init effect calls on cleanup. Add new interactions as a module of the same kind, tested with a fake paper (`diagram/canvas-parts.test.js`).

- **Swimlanes are JointJS embeds** (`laneId` in JSON = parent cell, see `diagram/lane-embedding.js`). In JointJS 3.7 `position(x, y)` moves only the cell; use `{ deep: true }` (or `translate`) when a lane's content should move along. Node details (description, role …) live in the cell attribute `details`.

- **Canvas events (found in browser tests)**: the paper calls `preventDefault` on pointerdown, so clicks don't move focus -- `DiagramCanvas` focuses the canvas itself, and `InlineTextEditor` commits on an outside click via its own window `pointerdown` listener (not just `onBlur`). Dragging a new link from a port also fires `link:pointerdown`; vertices are therefore added only by `diagram/vertex-drag.js` (after 5 px, on the line of a connected link), and JointJS `vertexAdd`/`vertexAdding` stay off. App shortcuts (F2/Enter/typing) only act when focus is on `#vhs-canvas-scroll` or `body`.

- **Graph changes reach the App via `diagram/change-notifier.js`**: while a cell is dragged (`cell:pointerdown` … `pointerup`), intermediate changes are not reported; one `onGraphChange` follows on release. Batches also defer reports; a fallback reports anyway 1 s after the last change, so a batch left open can't stop autosave. Wrap batches in `inBatch(graph, name, fn)` (`diagram/batch.js`) so they close on errors. Don't call `onGraphChange` from the graph's `all` event elsewhere. Measure with `npm run bench` (`src/test/performance.bench.js`).

- **Batches**: `attachLaneEmbedding` ignores changes inside the batches `import`, `layout` and `move-lane`; code that moves cells in those batches must call `assignLane`/`growLaneToFit` itself (see `applyPartialLayout`). `vhs.Lane.remove()` unembeds its content first, otherwise JointJS deletes it too.

- **Shapes**: `createNode(type, …)` in `shapes.js` is the central factory. JointJS `calc()` works only in `d`, `x`, `y` etc., not in `refX`/`refY` (use `refX2`/`refY2`). New node detail fields go into `NODE_DETAIL_FIELDS` (`types.js`) and `NODE_FIELDS` (`PropertiesPanel.jsx`).

- **Grid snapping by center**: elements snap to the grid by their center (`GRID_ANCHOR` in `diagram/grid-anchor.js`, applied in `snapline-drag.js` after JointJS's own top-left snap, in `createNodeAt` and `placeNextNode`). Set `GRID_ANCHOR = 'topLeft'` to restore the pre-1.6.3 behavior. Use `snapToGridAnchor`/`GRID_SIZE` instead of rounding positions yourself.

- **Tool positions**: custom `ToolView`s render inside the transformed layer, so position them from `model.getBBox()` (local coordinates), never `view.getBBox()` (paper coordinates incl. translate/zoom).

- **Data format**: `{ nodes, edges }` (typedefs in `src/diagram/types.js`). Stored records carry `schemaVersion`; when the format changes, bump `CURRENT_SCHEMA_VERSION` and add a migration in `src/storage/schema.js`.
- **AI providers**: Gemini, OpenAI-compatible (OpenAI, Mistral, custom server) and Anthropic, called directly from the browser. Presets and default models live only in `src/ai/providers.js`; request/response formats per API in `src/ai/adapters.js`; `src/ai/ai-client.js` falls back to the next model on HTTP 404/503/529 and retries once without schema/extra params on 400. API keys go in headers, never the URL. Prompts live in `src/ai/prompts.js` (direct generation, improvements) and `src/ai/copilot/prompts.js`; when `SYSTEM_PROMPT` changes, append the previous version as a literal string (never derived from `SYSTEM_PROMPT`) to `LEGACY_SYSTEM_PROMPTS` so stored copies of old defaults are not treated as custom prompts. Custom server URLs must be `https://` or `http://localhost` (the CSP in `vercel.json` allows exactly that).
- **Privacy notice**: when the text of `components/AiPrivacyNotice.jsx` changes, bump `AI_PRIVACY_NOTICE_VERSION` in `storage/settings.js` so users confirm again.
- **Dialogs**: never use `window.confirm`/`alert` -- use `useConfirm()`. New modals use `hooks/useDialogA11y.js` with `role="dialog"` and `aria-modal="true"`; modals are lazy-loaded and only mounted while open.
- **Previews never touch the editor**: read-only renderings (`DiagramPreview.jsx`) use their own JointJS graph.
- **JointJS alias**: `vite.config.js` aliases `jointjs` to its CJS build because the ESM build's frozen module namespace breaks `Object.assign(joint.shapes, ...)`.

## Corporate Design (vhs)

Follow `docs/Styleguide_für_KI_Agenten.md`: primary color `#00285A` (vhs Blau), all colors from `src/utils/constants.js`, font `Arial, Calibri, Helvetica, sans-serif`, Tailwind CSS v4. **"vhs" is always written in lowercase.**

## Language

The UI is in **German**. All user-facing strings, notifications, and labels must be German.
