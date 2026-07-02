# SatyaShift — Project Status (canonical implementation log)

Append-only. Every new session reads this first. Newest entry on top.
Related: `.agents/AGENTS.md` (project context + mentoring rules), `extension/CLAUDE.md` (extension rules).

---

## 2026-07-02 — Behavior redesign pass: media-aware tracking, nudge grace, session lifecycle, ping delivery, focus audio (ext v2.6.0 + web DEPLOYED)

Full product-behavior audit against the pipeline (session → tracking → detection → nudge →
squad → history). Verified live first: ingest healthy (40 domain_logs/48h, 14 batches), squad
start-notifications real (5 rows), focus/stop verdicts correct. Root-caused the "nudge never
fires" complaint to two architecture bugs, plus found a session-lifecycle hole in prod.

**Extension v2.6.0** (background.js, core.js, tests 21/21):
- **Media exemption (root cause 1 of the dead nudge + silent data loss).** `chrome.idle`
  fires 'idle' after 5 input-less minutes — exactly what watching a video is. Tracking paused
  and the nudge streak reset at the 5-minute mark, so passive YouTube was undercounted and
  could never nudge. Now the gate distinguishes 'idle' vs 'locked' and an ACTIVE + `audible`
  tab keeps counting through 'idle' (never through lock/blur). Active state tracks `audible`
  via `tabs.onUpdated`; policy is pure `gateAllowsCounting()` in core.js, tested.
- **Nudge streak grace (root cause 2).** One non-counting tick (alt-tab, idle blip) erased a
  4-minute streak; in real browsing the threshold was near-unreachable. `nextNudge` now holds
  the streak through ≤ `NUDGE_GRACE_TICKS` (2) non-counting ticks; resets only when the gap
  outlasts grace or attention lands elsewhere.
- **Session auto-expiry.** A forgotten "Start deep session" no longer shows "In deep work"
  forever: past the server's 4h cap the worker auto-calls stop (reconcileSession on
  GET_STATUS + the 5-min alarm).

**Web (deployed `web-fdkuycayi`, alias verified 200):**
- `/api/focus/start`: an active session older than 4h is closed as abandoned (was: "resumed"
  forever — found a real squadmate session stuck active for 34.8h; also fixed that row in
  prod by the same rule).
- `/api/squads/[id]/radar`: "approximate" location jitter was `Math.random()` per request —
  refetch-and-average recovers the true location. Now seeded deterministically by checkin id.
- `/api/squads/[id]/pings`: zod validation (uuid + curated ping_type enum), rate limit
  (`check_rate_limit`, 30/h), and the ping now lands as a `notifications` row for the
  recipient (bell) — encouragement that only lived in an unopened feed wasn't support.
- **Focus audio (new, `components/focus/FocusAudio.tsx` on the running screen):** WebAudio-
  GENERATED brown/pink noise. No files, no streaming, no third-party requests, preference in
  localStorage only. Two options + off (deliberately no fake rain/café: honesty > imitation).
  Off by default; starts only from a click (autoplay-safe); fades in/out.
- `NotificationType` union widened to `squad_focus_start` | `squad_ping` (was stale).

**DB (Supabase, live):** migration `revoke_anon_membership_fns` — revoked `anon` EXECUTE on
`is_squad_member`/`is_squad_admin` (advisor WARN; anon has no RLS path to squads, so the RPCs
were pure probe surface). Security advisors now: remaining WARNs are known/accepted (vector
ext in public, public waitlist INSERT, `get_squad_by_invite` for authenticated = intended,
leaked-password protection needs a dashboard toggle — user action).

**Still needs the user (harness cannot do it):** (1) load-unpacked reload to v2.6.0;
(2) if nudges still silent, the SW-console `chrome.notifications.create` test isolates
OS-notification blocking (Windows Focus Assist) from policy; (3) optionally enable leaked-
password protection in Supabase Auth settings; (4) optionally rotate the service-role key.

**Known deliberate limits:** muted passive video still pauses on idle (indistinguishable from
absence); squad UI (SquadDashboard/CuratedInteractionMenu) is dark-themed while the app is
cream — visual-consistency pass deferred, behavior was the priority.

---

## 2026-07-01 — Free-AI pass + squad-notify COMMITTED + DEPLOYED

Converted the last paid AI paths to free tier, committed scoped, and deployed to prod.
- `lib/agents/MentalCoachAgent.ts` (used by `/api/daily-coach` cron): Gemini → Groq
  (`llama-3.3-70b-versatile`) via a small `invokeModel()` adapter that maps LangChain messages to
  Groq chat format and returns an `AIMessage`, so the LangGraph nodes are unchanged. Per-node
  deterministic fallback when `GROQ_API_KEY` is unset (no crash, no cost). GROQ_API_KEY is set in
  prod, so it runs free.
- `lib/ai/memory.ts`: OpenAI embeddings (the only paid dep; Groq has no embeddings API) gated behind
  `embeddingsEnabled()` — no real `OPENAI_API_KEY` ⇒ `storeMemory` no-ops, `searchMemory` returns [].
- Deleted unused `lib/agents/tools/recipeGenerator.ts` (dead code; last `@ai-sdk/google` ref).
- Also committed the earlier squad session-start notify wiring.
Commits (branch backend-hardening): `b73a2ff` (free-AI) + `96f9712` (squad notify). `tsc` exit 0.
Deployed `dpl_C4V8iL24TAdtZU5pgKVQTa9P61J5` → satyashift.vercel.app READY. Post-deploy verified:
landing 200, real authenticated `/api/ingest` → `{"success":true,"inserted":1}` (env carried over,
no regression). Test rows cleaned. AI stack is now entirely free (Groq generation + heuristic/local;
embeddings gated off).

---

## 2026-07-02 — Popup deep-session launcher + gentler nudge (manifest v2.5.0)

Product decision (discussed): the popup is the primary place to START a deep session (lowest
friction, always present, where squad accountability will live); the web /focus page stays as the
setup/history "home base". Popup is a MODE switch, not a pile of buttons, to keep it calm.

Phase 1 shipped (extension only — the /api/focus/start + /stop endpoints were already live, so no
web deploy needed):
- `background.js`: `SESSION_KEY` in storage.local + `getSession/startSession/stopSession`. Start POSTs
  `/api/focus/start` (empty body ⇒ notify ALL squads via the helper), stores `{id, startedAt}`; stop
  POSTs `/api/focus/stop` (finds the active session server-side) and clears local even if the network
  call fails (UI never stuck). Bearer-authed ⇒ exempt from the `proxy.ts` CSRF origin gate. Added
  `START_SESSION`/`STOP_SESSION` messages; `buildStatus` now returns `session`. Verification is free:
  the passive `domain_logs` we already flush are what `/api/focus/stop` reads for quality.
- `popup.{html,js}`: mode switch. Idle → "Start deep session" (primary) + tracking status. In-session
  → status shows "In deep work" with calm minute-level elapsed (ticks every 20s), button becomes
  "End session" (ghost), Pause is hidden (pausing would undercut the session it's verifying). "Open
  SatyaShift" demoted to a ghost secondary. Start/end errors surface in the amber note.
- Nudge polish: gentler, non-judgmental copy in a pure, tested `nudgeCopy()` (rotates 3 phrasings,
  title "A quiet check-in", no shame words), buttons "Return to focus" / "Stay, on purpose" (was
  "Refocus" / "Keep scrolling"). Principle: name what's real, zero blame, hand back the choice.
- Tests: `node --test` 18/18 (added a nudgeCopy tone guard). Phase 2 (live squad presence in the
  popup) not started. Needs user Load-unpacked reload of v2.5.0 to take effect.

---

## 2026-07-01 — Extension popup-focus fix (manifest v2.4.0)

Fixed the "Timing youtube.com → Waiting for a focused tab" flip users saw when opening the popup.
Cause: on Windows, opening the action popup fires `windows.onFocusChanged(WINDOW_ID_NONE)`, which the
worker treated as "left the browser" and paused the segment — so *checking* the popup paused it.
Fix (extension, no core.js change so unit tests unaffected, 17/17 still pass):
- Popup opens a long-lived `chrome.runtime.connect({name:'popup'})` port; worker stores
  `POPUP_OPEN_KEY` in `storage.session` while connected.
- `handleFocusChange` ignores a `WINDOW_ID_NONE` blur while the popup port is open.
- `GET_STATUS` clears any popup-induced blur + resumes before replying, so the popup shows "Tracking"
  immediately. On port disconnect (popup closed) `reconcileFocus()` re-derives the real focus via
  `windows.getLastFocused({windowTypes:['normal']})`.
- `seedActiveTab` hardened with fallbacks (`currentWindow`, then any active http(s) tab) for when
  `lastFocusedWindow` returns nothing because the popup holds focus.
Needs user Load-unpacked reload of v2.4.0 to take effect (harness can't drive the extension).

---

## 2026-07-01 — LIVE backend diagnosis: two real prod bugs found (RLS fixed; key = user)

User reported (with screenshots) that the extension popup flips "Timing youtube.com" → "Waiting
for a focused tab" across tabs and suspected tracking/JITAI/squad were fundamentally broken. Ran a
live backend investigation (Supabase MCP: SQL + api/postgres logs + advisors). Findings:

- **Popup tab-switch display = red herring (Windows popup-focus quirk).** Opening the action popup
  on Windows fires `windows.onFocusChanged(WINDOW_ID_NONE)` → the tracker treats it as "left the
  browser" → pauses the segment → popup shows "Waiting for a focused tab." So *checking* the popup
  is what makes it look paused. Not the cause of data loss. (Fix still TODO — see below.)

- **BUG 1 (master, DATA LOSS) — FIXED + VERIFIED.** `domain_logs` = 0 rows/24h, `processed_batches`
  = 0 EVER; API logs every ~5 min: `GET /auth/v1/user 200` then `POST rpc/check_rate_limit 401`.
  Root cause pinned exactly: `SUPABASE_SERVICE_ROLE_KEY` in Vercel Production was set to an EMPTY
  string `""` (a botched `vercel env add` also left junk vars named `Key`/`Value`). Empty key →
  PostgREST 401 on every `createAdminClient()` call → `/api/ingest` 500 (popup amber) → nothing
  ingested, no JITAI signal, squad-notify no-op. FIX: user supplied a valid `sb_secret_...` key
  (validated 200 vs PostgREST); set it via the Vercel REST API `POST /v10/projects/{id}/env?upsert=true`
  (CLI `env add` stdin piping does not feed the value under Git Bash), removed the junk vars, and
  `vercel redeploy`ed the latest prod deployment (kept code, picked up the new env). VERIFIED
  end-to-end: real authenticated POST to prod `/api/ingest` → `{"success":true,"inserted":1}`, then
  the user's extension drained its whole stuck backlog (real youtube.com/facebook.com rows landed
  17:51:47). Secret is now in that session's chat history — rotate in Supabase if desired.

- **BUG 2 (FIXED this session): squad_members RLS infinite recursion.** Postgres logs flooded with
  `infinite recursion detected in policy for relation "squad_members"`. The SELECT/DELETE policies
  queried squad_members inside a policy ON squad_members. Applied migration
  `fix_squad_members_rls_recursion`: added `is_squad_admin(uuid)` SECURITY DEFINER (mirrors the
  pre-existing `is_squad_member(uuid)`), rewrote `squad_members_select` → `is_squad_member(squad_id)`
  and `squad_members_delete` → `user_id = auth.uid() OR is_squad_admin(squad_id)`. Verified live by
  impersonating user 8ff85973 (authenticated role + jwt claim): SELECT returns 7 rows, no recursion.
  Live immediately (no deploy). This restores squad dashboard/radar/sync reads.

Remaining: (1) user sets the Vercel service-role key → then verify ingest lands rows + squad notify
fires; (2) optional: fix the Windows popup-focus display quirk in the extension; (3) Groq/free-AI
TODOs still open. Other advisors (WARN): `vector` ext in public, waitlist INSERT `WITH CHECK true`,
SECURITY DEFINER fns callable by authenticated (is_squad_member/is_squad_admin — intended),
leaked-password protection off.

---

## 2026-07-01 — "Critical recovery" audit + squad-notify wiring

Given a full "extension is fundamentally broken" recovery brief (tracking dies with the popup,
"Waiting for connection" on tab switch, login doesn't sync, squad notifications dead). Read the
entire extension surface (`manifest.json`, `background.js`, `core.js`, `popup.js`, `bridge.js`) and
the focus/squad backend before touching anything.

**Root-cause finding:** the reported symptoms describe the PRE-hardening architecture, not the
committed one. v2.3.0 already satisfies the whole recovery spec — tracking lives in the SW with all
state in `chrome.storage` (popup is read-only via `GET_STATUS`), the flush alarm is created once in
`onInstalled`/`onStartup` (C2), `seedActiveTab()` starts the already-open tab on install/startup/
wake/popup-open, auth syncs via `bridge.js` (`SESSION_FROM_PAGE`) + `chrome.cookies` fallback +
token refresh, Web Locks serialize state, poison batches quarantine, nudge engine wired. The most
likely cause of the user's live symptoms is running an OLD unpacked build → fix is a
`chrome://extensions` reload of v2.3.0 (harness cannot drive the browser to do this).

**Real gap fixed (backend, this pass):** squad session-start notifications were unwired.
`web/lib/squad/notifySessionStart.ts` existed but `/api/focus/start` never called it. Wired
`notifySquadOnSessionStart({ admin, actorId, squadId, sessionId })` after the fresh-session insert
(NOT the resumed branch); helper is fully guarded + de-duped 1/hour so it can't break start. With
`squad_id` absent (the focus page doesn't send one today) it notifies ALL the actor's squads, which
is the intended default. Recipients see it: both `app/(app)/notifications/page.tsx` and the layout
bell read the `notifications` table.

Verification: `npx tsc --noEmit` (web) → exit 0; `node --test` (extension) → 17/17.

**Remaining risks / open items:** (1) live extension behavior still needs a user Load-unpacked
verify of v2.3.0 — cannot be proven from the harness; (2) `web/app/(app)/focus/page.tsx`
`startSession()` doesn't pass `squad_id` (notifies all squads by default — fine, revisit if
per-squad scoping is wanted); (3) still-open Groq/free-AI TODOs (`MentalCoachAgent.ts` Gemini→Groq,
`lib/ai/memory.ts` OpenAI-embeddings guard) — untouched this pass.

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
