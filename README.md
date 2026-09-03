# HomeGuard — An Agent-Native Smart-Home Emergency Drill

[中文说明](README.zh-CN.md)

A smart home that breaks on purpose. **HomeGuard** is a training simulator built on the open [WebMCP](https://github.com/webmachinelearning/webmcp) standard (`document.modelContext`): when a kitchen pipe bursts, a ChatGPT agent diagnoses the fault through structured tools registered on the page — while every destructive action (shutting the main valve, killing the breaker) is suspended until the human explicitly approves it on a visible confirmation card.

> **Live Demo**: <https://katrinagui.github.io/HomeGuard/> · **Demo Video**: _TBD_ · **License**: MIT

## Why

When a pipe bursts, a homeowner faces a wall of device panels and cryptic logs and must make irreversible decisions under time pressure. DOM scraping cannot express device semantics, dangerous side effects, or confirmation boundaries. WebMCP lets the page itself declare its capabilities, so an in-browser agent can *diagnose* like a professional property manager while the page enforces the rules of engagement:

- **The agent diagnoses and proposes** — it reads live sensor state and device logs through typed tools instead of scraping the DOM.
- **The human approves irreversible actions** — destructive tools suspend mid-call and resolve only when the user decides. Rejecting returns a respectful message to the agent.
- **Honest boundaries** — this is a local simulation; it demonstrates the protocol, it does not touch real homes.

## The six registered tools

| Tool | Annotation | Purpose |
|---|---|---|
| `get_house_status` | `readOnlyHint` | Per-room sensors, device states, active faults, damage score |
| `get_device_log` | `readOnlyHint` | One device's event log — the diagnosis clues live here |
| `set_device_power` | — | Set a device's power state; **idempotent** by contract |
| `set_thermostat` | — | Set the target temperature (16–30 °C, corrective errors) |
| `shut_off_main_valve` | destructive* | Stops the water; requires user confirmation |
| `kill_main_breaker` | destructive* | Cuts all power; fridge penalty (+120); requires confirmation |

\* The current draft spec's `annotations` only support `readOnlyHint` / `untrustedContentHint`, so destructive intent is declared in the tool `title`/`description` and enforced by the visible confirmation flow.

## Two scenarios, one tool set

Every drill randomly draws one of two household faults:

- **Kitchen pipe burst** — water rises, shut the main valve (destructive, confirmed).
- **Heater runaway** — the thermostat relay welds closed and room temperature climbs; power the thermostat down with the *same* generic `set_device_power` tool.

No new tools per script: the tool set models the home, not a storyline — which is exactly the composability WebMCP is meant to enable.

### Agent view (#learn)

Open **`/#learn`** (also linked from the start poster and the dashboard footer) to see the page the way an agent does: the six registered tools with their descriptions and read-only annotations, plus a live `get_house_status` JSON payload. The start poster also offers a one-click **starter prompt** to paste into ChatGPT.

## Safety model

- **Confirmation queue**: a destructive tool's `execute()` returns a promise resolved by the on-page confirmation card; the agent's abort signal clears the card if the call is cancelled. An independent 20-second expiry (with a request id shown on the card) guarantees the card can never stay actionable after the caller's channel dies.
- **Strict parameter validation**: handlers never coerce — `on` must be a real boolean and `targetC` a real number, or the tool returns a corrective error without touching state (the current WebMCP runtime does not validate JSON Schema for the page).
- **Phase gating** enforced in the store (the final authority, since agents bypass buttons): `idle` rejects all mutations, `active` allows everything, `resolved` is read-only for review.
- **Atomic state**: pulling the breaker shuts down every mains device and applies the fridge penalty exactly once, in the same update that resolves the tool.
- **One code path for humans and agents**: UI buttons and tool handlers call the same store actions; the debrief timeline tags every entry with its actor.

## Quick start

```bash
npm install
npm run dev        # dev server, http://localhost:5173
npm test           # Vitest behavior suite (24 tests)
npm run build      # production build to dist/
npm run preview    # serve the production build
```

> **Note:** the app must be served over HTTP — opening `index.html` directly from disk (file://) cannot run ES-module bundles and will show a static fallback notice instead.

### Letting an agent see the tools

- **ChatGPT's in-app browser**: native WebMCP support — just open the deployed URL.
- **Chrome preview**: enable `chrome://flags/#enable-webmcp-testing`.
- **Other browsers**: the app falls back to the `@mcp-b/webmcp-polyfill` demo mode. The polyfill verifies the in-page flow (registration, schemas, handlers, confirmation card) but *not* cross-page agent discovery or native cancellation propagation.
- In-page test handle: `window.__homeguard.executeTool('get_house_status', {})`.

### Languages

The UI is bilingual (中文 / English) via the toggle in the header — persisted to `localStorage`, defaulted from the browser language. The agent-facing contract (tool descriptions, schemas, return values, store messages, device logs) is English-only by design: tool routing needs a stable language, and the UI language is a presentation concern.

## Architecture

```
src/
├── i18n/        # string dictionary, locale store, t()/tMsg() helpers
├── sim/         # house model + tick engine (two scenarios, pure functions)
├── store.ts     # single Zustand store — UI and tools share one set of actions
├── mcp/
│   ├── tools.ts     # tool definitions, destructive guard, confirmation-queue bridge
│   └── register.ts  # document → navigator → polyfill fallback + lifecycle cleanup
└── ui/          # dashboard, confirm card, event log, start poster, debrief, #learn
tests/           # Vitest behavior suite
```

## Deployment notes

WebMCP requires the page to run in an **origin agent cluster**, otherwise `registerTool()` throws `SecurityError`. This repo ships the header in three places:

- `public/_headers` — Netlify / Cloudflare Pages
- `vercel.json` — Vercel
- `vite.config.ts` — local dev & preview servers

Self-hosting: make sure your server sends `Origin-Agent-Cluster: ?1`.

The GitHub Pages deployment (the Live Demo above) cannot send custom headers, so whether the page connects natively depends on the browser — ChatGPT's in-app browser accepts it natively, while other environments fall back to polyfill demo mode. For a guaranteed native path on every browser, host on a header-supporting platform (Netlify/Cloudflare/Vercel). To (re)deploy Pages:

```bash
npm run deploy:pages     # builds with --base=/HomeGuard/ and pushes dist/ to gh-pages
```

## License

[MIT](LICENSE)
