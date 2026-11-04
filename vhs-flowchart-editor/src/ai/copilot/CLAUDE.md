# KI-Copilot

- The AI returns a *process model* (steps/decisions/roles/questions; response schema in `prompts.js`), never a diagram. Start/end, decision branches, swimlanes and layout are built locally in `model-to-diagram.js` -- don't move that responsibility back to the AI.
- `process-model.js` normalizes any AI answer: every step has required `transitions`, all references become explicit (`END` sentinel), question-labelled steps stay decisions and get a missing branch wired to the otherwise unreachable step. It returns `warnings` (shown to users) and `issues` (fed back to the AI once for self-correction in `copilot-client.js`; the corrected answer is used only if it has fewer issues).
- Notes become margin annotations placed after layout, so they never cover edges.
- `variants.js` defines wording variants as data; they change wording only, never logic.
- UI lives in `components/copilot/` with the reducer `state/copilotState.js`; the result opens as a new unsaved diagram (`handleCopilotApply` in `App.jsx`).
- Copilot prompts are separate from the user-editable custom prompt in Settings (that one only drives "Direkt erzeugen"); copilot hints from Settings are appended, never replace the prompt.
