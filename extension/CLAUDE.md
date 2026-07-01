# SatyaShift extension — durable rules

The extension is the product's core (ambient, domain-only attention tracker). Read
`docs/project-status.md` before changing anything here.

## Non-negotiable invariants
- **Domain-only, always.** Never read, store, or transmit page paths, full URLs, page content,
  or keystrokes. Only the bare hostname of the active tab. This is the product's core promise.
- **Zero manual input.** No buttons that ask the user to log anything. Tracking is passive.
- **No dependencies, no build step.** Vanilla JS only. Do NOT add npm packages to the extension.
- **No inline JS** in any HTML (MV3 default CSP). Scripts are external files only.
- **All state in `chrome.storage`**, never in module-scope memory — the service worker is
  killed at any time. `storage.local` for anything that must survive a browser restart (queue,
  pending batch, tokens, env, paused); `storage.session` for the live tab timer + gate.

## Architecture
- `core.js` — pure logic ONLY (no `chrome.*`). Everything testable lives here so `node --test`
  can prove it. If you add domain/category/token/cookie logic, put it here and test it.
- `background.js` — the module service worker: listeners (tabs/windows/idle/alarms/messages),
  the segment timer, flush, auth. Register all listeners synchronously at top level.
- `popup.*` / `welcome.html` — UI. Calm, trust-first, cream/green, no fear language.

## Concurrency
- The worker gets concurrent events. Guard every read-modify-write with Web Locks:
  `LOCK_STATE` (tab state + queue), `LOCK_FLUSH` (single-flight flush), `LOCK_TOKEN` (refresh).
  Lock order is `FLUSH ⊃ {STATE, TOKEN}`; STATE and TOKEN are leaves. Don't introduce a cycle.

## Sync / idempotency (must stay in step with `web/app/api/ingest/route.ts`)
- Batch shape: `{ batch_id: uuid, events: [{ domain, duration_s, category?, ... }] }`, ≤500 events.
- `duration_s` must be `0..86400`; we cap at 4h at enqueue so a batch is never rejected wholesale.
- `category` ∈ `distraction | productive | neutral` (server clamps unknowns to `neutral`).
- Reuse the persisted `batch_id` across retries so the server dedupes via `processed_batches`.
- Retry policy: `ok` → drop+clear; `401/403` → refresh + retry; `429/5xx/network` → retry;
  other `4xx` → drop the poison batch. Never loop forever on a permanently-rejected batch.

## Testing / verifying
- `cd extension && node --test` after any `core.js` change. Add a test for every bug you fix.
- The agent harness cannot click the extension. After changes, hand the user the Load-unpacked
  checklist in `docs/project-status.md` and update that doc.

## Attention policy (BALANCED — locked)
Timing pauses on window blur and on `chrome.idle` idle/lock, with a 5-minute idle threshold so
reading without keyboard input is not penalized. Don't switch to strict per-keystroke idle
(under-counts reading) or lenient lock-only (counts other-app time).
