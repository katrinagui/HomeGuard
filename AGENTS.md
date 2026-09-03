# AGENTS.md — HomeGuard

Notes for humans and coding agents working on this repository.

**HomeGuard** (*An Agent-Native Smart-Home Emergency Drill*) is an agent-native smart-home emergency-drill simulator built on WebMCP (`document.modelContext` / `navigator.modelContext`). Status: two random drill scenarios, bilingual UI (中文/EN), `#learn` agent-view page, 24 passing behavior tests.

## Repository layout

- `src/i18n/` — bilingual string dictionary, locale store, `t()`/`tMsg()` helpers
- `src/sim/` — house model + tick engine (`kitchen_leak` and `heater_runaway` scenarios, pure functions)
- `src/store.ts` — single Zustand store: UI and tool handlers share one set of actions
- `src/mcp/` — tool definitions (`tools.ts`), registration lifecycle (`register.ts`)
- `src/ui/` — dashboard, confirm card, event log, start poster, debrief report, `LearnPage.tsx` (`#learn` agent view)
- `tests/` — Vitest behavior suite (`npm test`)

## Key conventions

- **One code path for humans and agents**: UI buttons and tool handlers call the same store actions; `actor` marks the source in logs.
- **Language split**: the agent contract (tool descriptions, schemas, return values, store messages, device logs) is English; UI copy is bilingual via `src/i18n`; events carry `Msg` objects (key + params) localized at render time.
- **Strict parameter validation**: handlers never coerce (`Boolean()`/`Number()` are banned on tool input) — the WebMCP runtime does not validate JSON Schema for the page. Malformed calls throw corrective errors without touching state.
- **Destructive actions**: routed through the confirmation card (requestId + independent 30 s expiry). Phase gates (`idle`/`active`/`resolved`) and breaker semantics are enforced in the store — the final authority.
- Change the invariants in `tests/behavior.test.ts` deliberately; `npm test` must stay green alongside `npm run build`.

## Environment notes

- WebMCP is natively available in ChatGPT's in-app browser; Chrome needs `chrome://flags/#enable-webmcp-testing`.
- Browsers without native support fall back to `@mcp-b/webmcp-polyfill` (it does not pass execution options, and its `executeTool` expects a full RegisteredTool object — see its docs).
- Pages must be served with the `Origin-Agent-Cluster: ?1` header (already configured in `vite.config.ts`, `public/_headers`, `vercel.json`), otherwise `registerTool()` throws `SecurityError`.
