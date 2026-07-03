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
- `stopSession` MUST flush before POSTing `/api/focus/stop`: the server computes the
  session's quality + behavioral signals from `domain_logs` at that moment, and the queue
  holds up to 5 minutes of dwell. Order is asserted by a background.test.js test.
- Queue order IS the attention timeline: `/api/ingest` persists the batch index as
  `domain_logs.seq`. Never reorder, coalesce, or parallel-split a batch's events.

## Testing / verifying
- `cd extension && node --test` after any `core.js` change. Add a test for every bug you fix.
- The agent harness cannot click the extension. After changes, hand the user the Load-unpacked
  checklist in `docs/project-status.md` and update that doc.

## Attention policy (BALANCED + media exemption — locked)
Timing pauses on window blur and on `chrome.idle` idle/lock, with a 5-minute idle threshold so
reading without keyboard input is not penalized. Don't switch to strict per-keystroke idle
(under-counts reading) or lenient lock-only (counts other-app time).

Media exemption (v2.6.0): `chrome.idle` reports 'idle' after 5 min without input, but watching
a video IS attention without input — so an ACTIVE tab that is `audible` keeps counting through
'idle'. It never counts through 'locked' (gone) or blur (audible tab behind another app is
background music, not attention). Known limitation: a MUTED video during idle still pauses —
indistinguishable from reading, accepted. The exact policy is the pure `gateAllowsCounting()`
in core.js; change it only there, with tests.

## Nudge policy (distraction BLOCK, category-scoped — locked)
`nextNudge()` in core.js, ticked by a 1-min alarm, watches a distraction BLOCK: attention that
stays inside the distraction CATEGORY for `NUDGE_AFTER_MIN` (5) counted minutes → one gentle
notification, `NUDGE_COOLDOWN_MIN` (10) cooldown. The block is category-scoped, NOT domain-scoped:
switching between distraction domains (youtube → instagram → reddit → x…) CONTINUES the same
block. Do not re-key the streak to a single domain — that was the fragmentation miss (a
channel-surfer never sat on one site for 5 min and was never nudged; proven, then fixed, with a
minute-by-minute trace). The block survives a SHORT detour off distraction (a blur, an idle blip,
or a brief work/neutral glance) for `NUDGE_GRACE_TICKS` (2) ticks, then a sustained return is
treated as real recovery and resets. State carries `{ domain, minutes, gap, domains[], switches,
lastNudgeAt }`; `nextNudge` returns a `decision` tag (`building|fire|cooldown|grace|reset|idle`)
plus `distinctDomains`/`switches` for observability. `nudgeCopy` names one site when the block sat
on one, and names the pattern ("a few different places") when it scattered (≥3 distinct domains) —
never over-claim a single domain it barely visited. Firing stays strictly deterministic on the
5-minute block; fragmentation signals are recorded/observable but do NOT lower the threshold (keep
it high-confidence — adaptive threshold-lowering is a deliberate future layer, not a silent one).

## Nudge reliability + observability (2026-07-02 hardening — keep all three)
The pipeline must never fail silently. Three invariants:
- **Alarm self-heal:** `ensureAlarm()` runs at worker top level on EVERY wake (it checks
  existence first, so it never resets a live countdown — the C2 regression). Don't move it
  back to onInstalled/onStartup only; a lost alarm would kill nudges + flush until restart.
- **Delivery is checked, not assumed:** `fireNudge` consults
  `chrome.notifications.getPermissionLevel()`; 'denied' (user muted the extension) is
  recorded and the popup says "Gentle check-ins are muted" via `status.nudgesMuted`.
- **Liveness + decision proof:** every tick writes `nudge_diag` to storage.local
  ({ tickAt, counting, domain, category, streak, threshold, distinctDomains, switches, decision,
  permission, lastFire }). Field debugging: `chrome.storage.local.get('nudge_diag')` in the SW
  console answers "did it tick / was it counting / how big is the block vs the threshold / how
  fragmented / what did the policy DECIDE and why / did the last fire render". Tick errors land in
  `nudge_diag.lastFire` too.
Whole-pipeline behavior is covered by `background.test.js` (chrome-stub integration tests
that run the real background.js: threshold, cooldown, grace, media exemption, SW/browser
restarts, lost alarms, muted delivery, click-through). `node --test` runs them with the
unit tests. What tests can't see: the OS layer. If nudges are silent with a 'granted'
permission and a healthy diag, check Windows Settings → Notifications → Chrome, and
Focus Assist / Do Not Disturb; verify with a manual `chrome.notifications.create` in the
SW console.
