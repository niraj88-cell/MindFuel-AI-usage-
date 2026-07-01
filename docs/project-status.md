# SatyaShift — Project Status (canonical implementation log)

Append-only. Every new session reads this first. Newest entry on top.
Related: `.agents/AGENTS.md` (project context + mentoring rules), `extension/CLAUDE.md` (extension rules).

---

## 2026-07-01 — Live debug + JITAI reconnect (auth, tracking seed, domain-only nudge)

Debugged the extension against the user's live browser (Chrome MCP + Supabase MCP). Findings and
fixes, in order:

1. **Auth "Not signed in" was NOT the code-verifier** (that cookie wasn't even present). Proved via
   the page that the `sb-<ref>-auth-token.0/.1` cookies were present, valid, ~55 min to expiry, and
   parsed fine — yet the SW's `chrome.cookies.getAll` returned nothing. `chrome.cookies` from an MV3
   worker is unreliable across Chrome permission/cookie-store states.
   **Fix:** hardened `fetchCookieSession` to query by url AND domain (union), and added a **content
   script `bridge.js`** (matches our own domains only) that reads the session from `document.cookie`
   in-page and forwards it to the SW via `SESSION_FROM_PAGE` → `setStoredSession`. This is now the
   reliable auth path; chrome.cookies is a fallback. Popup confirmed **"Connected"** live.

2. **Tracking never started on the already-open tab.** onActivated/onUpdated only fire on switch/
   navigation, so after a worker restart it sat at "Waiting for a focused tab" forever.
   **Fix:** `seedActiveTab()` queries the active tab and starts timing on install/startup/worker-wake
   and on popup GET_STATUS. Guarded so it never double-banks.

3. **JITAI was built but orphaned** (the real answer to "why track if nothing intervenes"). The
   `/intercept` friction UX, `/api/intercept/predict`, `agents/interceptor`, and push plumbing all
   exist, but: the extension was rebuilt passive + "never block navigation" (cut the trigger);
   `/api/intercept/predict` reads `mental_logs` not `domain_logs`; `/api/cron/predictive-push` sends a
   hardcoded simulated alert (real AI commented out). Two products coexist (interventionist JITAI vs
   passive accountability); the extension only served the latter.
   **Decision (user):** revive JITAI the domain-only way. New **nudge engine**: pure `nextNudge()` in
   core.js (5 sustained min on a distraction domain → nudge, 10-min cooldown), 1-min `NUDGE_ALARM`
   ticks it, fires a `chrome.notifications` nudge that deep-links to `/intercept?target=<domain>`
   ("Refocus"/"Keep scrolling"). Added `notifications` permission. Still domain-only, never blocks,
   never reads page content. manifest v2.3.0.

Tests: `node --test` 17/17 (added selectAuthCookie + nextNudge cases). Pending: user Load-unpacked
verify of tracking-lands-in-DB and the live nudge; wiring predict/predictive-push to real
`domain_logs`/AI is still open (not done this pass).

---

## 2026-07-01 — Extension bugfix: false "Not signed in" after OAuth login

Symptom: user was fully signed in on satyashift.vercel.app (Google/OAuth) but the popup showed
"Not signed in".

Root cause: `background.js:fetchCookieSession` selected the Supabase session cookie with a loose
`c.name.startsWith('sb-<ref>-auth-token')` + `localeCompare` sort. That prefix ALSO matches the
PKCE cookie `sb-<ref>-auth-token-code-verifier` left by an OAuth sign-in. Since `-` (0x2D) sorts
before `.` (0x2E), the verifier's value was joined ahead of the real chunks, corrupting the JSON so
`parseSupabaseSession` returned null. (Secondary latent bug: `localeCompare` orders `.10` before
`.2`, breaking any 10+ chunk session.)

Fix: new pure `selectAuthCookie(cookies, ref)` in `core.js` mirrors @supabase/ssr's `combineChunks`
— prefer exact `sb-<ref>-auth-token`, else join `.0`,`.1`,… in NUMERIC order, and match chunk names
exactly so siblings like `-code-verifier` are never swept in. `background.js` now calls it. Added 4
`core.test.js` cases (incl. the code-verifier regression). `node --test` → 13/13 pass.

User action: reload the unpacked extension (`chrome://extensions` → reload) and reopen the popup.
To confirm the diagnosis: DevTools on satyashift.vercel.app → Application → Cookies → look for
`sb-sztvvvphpawuxvvmuddm-auth-token-code-verifier` alongside the `-auth-token` chunks.

---

## 2026-07-01 — Product-experience elimination pass (audit → implemented)

Ran a full "does every element deserve to exist" audit across the whole product, then implemented
the high-value subtractions. Build green (`tsc` exit 0, `next build` OK, extension `node --test`
9/9). **DEPLOYED to prod 2026-07-01** — `dpl_SELJBzn3CTRi7wbsmH83XAmqpXhX` / `web-iij4yzzrz`,
aliased satyashift.vercel.app, READY (live: landing 200, gated routes 307→/login). Deploy =
`cd web && npx vercel --prod --yes`; rollback = Vercel dashboard promote a prior deploy. Extension
popup change needs a `chrome://extensions` reload to take effect (not part of the Vercel deploy).

Extension (scope of this doc):
- **Popup trimmed** (`popup.html`/`popup.js`): removed the `Environment` / `Queued events` /
  `Last sync` metric table and the manual **Sync now** button — engineer metrics that leaked
  plumbing and invited babysitting a background process (against "nothing to manage"). Kept the
  wired **Pause** toggle and the problem-only amber note (both earn their place). Metric table
  replaced by one soft, healthy-only line: "Synced <ago>". Background `FLUSH_NOW` handler left in
  place (harmless; no user path now).

Web UI (context; durable state in the design-direction memory):
- Retired the MindFuel-fossil **Reminders** page (it sold manual logging / "Log now"→`/log` and
  contradicted the ambient thesis on its own screen). Now one off-by-default push nudge + a quiet
  history; removed the fake localStorage reminder-time chips.
- Calmed the **Focus** running screen: 6xl ticking stopwatch → breathing presence + quiet
  minute-level elapsed. Fixed its stale amber "unverified" badge → neutral gray and "2:14" →
  "2h 14m" (consistency).
- **Session detail**: title by the human intention, not the bare domain; "abandoned" → "Short
  session"; dropped the "X% drift" self-judgment from the private Quality line.
- Removed premature **monetization** (sidebar "free plan" chip → user email; deleted the
  `/subscription` link in Settings) and the "Core loop"/"Support" nav section labels.

---

## 2026-07-01 — Extension production-hardening pass (COMPLETE, pending user load-unpacked verify)

### Why this matters
The Chrome extension is the heart of SatyaShift. The whole "focus you can prove" promise
reduces to one thing: `domain_logs` must be **accurate** and **reliably synced**. Every fix
below defends that.

### End-to-end flow (verified against code)
sign in on web (`@supabase/ssr` sets `sb-<ref>-auth-token` cookie) → extension times the
active tab's **bare domain** (pauses on blur/idle) → every 5 min flushes an idempotent batch
to `/api/ingest` with the Supabase JWT → server verifies JWT, rate-limits (`check_rate_limit`),
dedupes by `batch_id` (`processed_batches` PK), writes **domain-only** rows to `domain_logs`
→ `/api/focus/stop` reads those logs to compute verified duration + `distraction_pct`
(via `category === 'distraction'`) + `session_quality`. Squad sees verified TIME only, never the domain.

### Architecture state (after this pass)
- `extension/core.js` — NEW. Pure, side-effect-free logic (no `chrome.*`). Domain/category/
  cookie/token helpers. Imported by the service worker AND unit-tested with `node --test`.
- `extension/background.js` — module service worker. Segment-based timing with a BALANCED
  attention policy; single-flight flush with a real retry/quarantine policy; token refresh;
  Web Locks around all state mutations.
- `extension/popup.{html,js}` — status + manual sync + pause/resume + expired-session prompt.
- `extension/welcome.html` — NEW. First-run permission explanation (opens once on install).
- `extension/manifest.json` — v2.1.0; added `idle` permission, `"type":"module"`, icons.
- `extension/icon{16,32,48,128}.png` — NEW. Trishula + bindu mark on brand-dark tile.
- `extension/core.test.js` + `extension/package.json` — NEW. Runnable unit tests.

### Completed work (full audit backlog cleared)
- **C1 (integrity) — AFK/other-app time no longer counts as focus.** BALANCED policy:
  timing pauses on window blur (`windows.onFocusChanged === WINDOW_ID_NONE`) and on idle/lock
  (`chrome.idle`, 5-min threshold so reading without input isn't penalized). Segment timer
  (`accumulatedMs` + `segmentStart`) banks time only while focused + active + not user-paused.
- **C2 — flush alarm no longer resets on every worker wake.** `chrome.alarms.create` moved
  out of top level into `onInstalled`/`onStartup`, guarded by `chrome.alarms.get`. Periodic
  sync now actually fires for active users.
- **H1 — poison batch can't stall the queue forever.** Dwell is capped at enqueue
  (`capDuration`, 4h ≪ server's 86400 limit); on a 4xx that isn't 401/429 the batch is dropped
  (quarantined) so later events keep flowing. Transient (429/5xx/network) still retries.
- **H2 + M1 — concurrent-flush duplicates + queue over-trim fixed.** `LOCK_FLUSH` makes flush
  single-flight; `LOCK_STATE` serializes every queue/active read-modify-write. A second flush
  reuses the persisted `batch_id` → server dedupes. Queue trim removes from the front by
  `count`, so a concurrent enqueue (append) is preserved.
- **H3 — token expiry no longer stalls sync when the web app is closed.** `getAccessToken`
  checks `expires_at`, refreshes via Supabase `/auth/v1/token?grant_type=refresh_token` using
  the refresh token, and stores the refreshed session in `storage.local`. `LOCK_TOKEN`
  serializes refresh so a rotating refresh token is never double-spent. A truly dead session
  surfaces "sign in again" in the popup.
- **M2 — substring domain matching fixed.** `matchesDomain` = exact-or-subdomain suffix.
  `netflix.com` no longer matches `x.com`; `riverbank.com`/`menshealth.com` no longer dropped.
- **M3 — crash-during-flush duplicates fixed.** `pending_batch` moved from `storage.session`
  to `storage.local` so the same `batch_id` is reused across a browser restart (dedupe holds).
  (Deliberately NO destructive TTL — expiring to a new id would reintroduce the very duplicate
  it was meant to prevent. It clears only on success or poison-drop.)
- **M4 — error observability.** `last_error {kind,status,message,at}` + `last_sync` stored and
  shown in the popup (calm, human copy). Cleared on a successful flush.
- **L1 — real icons** (16/32/48/128) generated; no more default puzzle piece.
- **L2 — robust cookie parsing.** `parseSupabaseSession` handles URL-encoding, `base64-`
  prefix, base64url, and chunk-joining; malformed input returns null (no false "not signed in").
- **L3 — `categoryFor` now emits `productive`** for a small curated dev list (improves
  `distraction_pct`).
- **U1 — pause/off switch** in the popup (+ `OFF` toolbar badge). Trust affordance.
- **U2 — first-run permission explanation** (`welcome.html`) opened once on install, pairing
  with Chrome's scary "read your browsing history" prompt.
- **Tests** — `core.test.js` locks down every integrity bug above (9 tests, all pass).
- **Server telemetry** — `/api/ingest` now logs PII-free counts on ok/duplicate (no domains).

### Decisions made
- Attention policy = **BALANCED** (pause on blur + idle/lock, 5-min idle threshold).
- **No cookie write-back on refresh.** The extension keeps its own refreshed token in
  `storage.local` rather than rewriting the `@supabase/ssr` cookie. Rationale: replicating the
  exact chunked cookie format is fragile and un-verifiable from here; a bad write would break
  auth for BOTH surfaces. Tradeoff: if the extension refreshes while the web app is closed for
  >1h, the next web-app open may require one re-login (non-data-losing, self-healing — the
  extension prefers the cookie again once it's fresh). Reliability of the tracker > web-app
  convenience.
- **No destructive pending TTL** (see M3) — safer than the audit's original suggestion.
- Extension stays **dependency-free** and CSP-locked (no npm deps, no inline JS).

### Known risks / open items (none block the extension)
- **Cannot click-test from the harness.** Static validation + unit tests + scenario reasoning
  done; the user must Load-unpacked to confirm live behavior (see verification checklist below).
- **MAX_QUEUE front-trim vs in-flight batch** — only races if >2000 events are queued *while*
  a flush is mid-send with a valid token (practically impossible: an active session keeps the
  queue tiny; the queue only grows huge when logged out, and logged-out flush sends nothing).
  Accepted.
- **Backend latent bug (out of extension scope):** `/api/ingest` `EventSchema.jitai_outcome`
  enum is `['close','dismiss','ignore']` but the `domain_logs` CHECK expects
  `('closed_tab','dismissed','ignored','started_session')`. Dead today (the ambient path never
  sends `jitai_outcome`). Fix when the JITAI outcome path is wired.

### Next recommended task
User Load-unpacked verification (below). After that: publish to the Chrome Web Store and flip
the dashboard's `PUBLISHED`/`EXTENSION_STORE_URL` constants (see design memory).

### Current blockers
None. Awaiting user hardware verification (extension can't be exercised from the agent harness).

### Files modified/created
- Created: `extension/core.js`, `extension/core.test.js`, `extension/package.json`,
  `extension/welcome.html`, `extension/icon{16,32,48,128}.png`, `docs/project-status.md`,
  `extension/CLAUDE.md`.
- Rewrote: `extension/background.js`, `extension/popup.html`, `extension/popup.js`,
  `extension/manifest.json`.
- Edited: `web/app/api/ingest/route.ts` (PII-free telemetry only).

### Verification completed (in-harness)
- `node --test` in `extension/` → 9/9 pass (domain matching, category, cookie parse variants,
  duration cap, token expiry).
- `node --check` on `background.js` + `popup.js` → syntax OK.
- `manifest.json` → valid JSON; all referenced files exist.
- `import()` of `core.js` → all imported symbols exported.
- `npx tsc --noEmit` on `web/` → exit 0 (backend edit safe).

### Verification checklist for the user (Load-unpacked)
1. `chrome://extensions` → Developer mode ON → Load unpacked → `C:\MindFuel\extension`.
2. For local dev: open the service-worker console and run
   `chrome.storage.local.set({ satyashift_env: 'dev' })`, then `npm run dev` in `web/` and sign
   in at `localhost:3000`.
3. Reload the extension. Confirm: the trishula icon shows (not the puzzle piece); the SW console
   is clean; clicking the icon shows the popup with "Tracking / Timing <domain>".
4. Browse a few sites for >15s each, switch to another app for a bit, then click **Sync now**.
   Confirm "Last sync = just now", queued drops to 0, and `domain_logs` gains rows (check via
   the app or Supabase). Time spent in the other app should NOT be counted.
5. Click **Pause tracking** → badge shows `OFF`, popup says "Paused"; **Resume** restores it.
6. On a fresh install, confirm the welcome tab opens once and explains the domain-only boundary.
