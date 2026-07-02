# SatyaShift — Project Status (canonical implementation log)

Append-only. Every new session reads this first. Newest entry on top.
Related: `.agents/AGENTS.md` (project context + mentoring rules), `extension/CLAUDE.md` (extension rules).

---

## 2026-07-03 — Paddle-readiness trust pages SHIPPED (web DEPLOYED + probed live)

The public trust surface Paddle's domain review requires (and users deserve), written as a
production trust review: every sentence checked against implementation, no invented
features. This clears roadmap step 1 of `docs/payments-architecture-2026-07-02.md`
(/terms + /refund with a 30-day money-back guarantee were the Paddle verification
prerequisites).

**New public pages** (all on a shared quiet shell `components/site/TrustPage.tsx`, all in
`proxy.ts` isPublicRoute, sitemap, and a shared footer `components/site/SiteFooter.tsx`
that now also renders on the landing page):
- **/how-it-works** — first-time-visitor walkthrough: what happens after install, how
  server-side verification works, exactly what the extension sees (domain + audible +
  away) and never sees (URLs/content/keystrokes/incognito/sensitive-site skip list), what
  the circle sees (DB-enforced), nudges never block, pause/export/delete.
- **/pricing** — reads prices from `lib/subscription.ts` (can't drift): 14-day cardless
  trial, $8/mo, $30 first-year founding annual with plain renewal-notice promise, why
  annual exists, what happens after trial (data never hostage), Paddle as merchant of
  record, founding-preview note pointing to the waitlist.
- **/terms** — 13 plain-words sections: sole-proprietor identity, service description,
  trial/billing via Paddle MoR, one-click cancellation, acceptable use, user data
  ownership, IP, availability, liability cap, suspension, governing law (Nepal), support,
  effective date.
- **/refund** — one-minute read: cardless trial first, 30-day money-back on every charge
  (Paddle's required minimum, made a feature), how to claim (email or via Paddle receipt),
  cancel ≠ refund, post-30-day fairness clause.
- **/privacy** — upgraded on the shared shell; added: browser-permissions section (each
  permission + why), retention/deletion section, incognito + sensitive-domain-skip bullets,
  waitlist email disclosure, Paddle card-handling line. All claims re-verified against
  extension/core.js, manifest, export/delete routes.

Also: `/refunds` and `/tos` 308 → canonical pages (next.config); sitemap rebuilt (dropped
the stale `/#pricing` anchor and login-priority cruft); landing gained "See how it works /
what it costs" links + footer.

**Review simulation run** (Paddle reviewer / privacy customer / security engineer / buyer /
first-time extension user): fixed in-pass — "extension cannot run code on pages" corrected
to the exact bridge.js truth (own-site-only), waitlist collection disclosed, refund page
kept to one screen, terms carry the brand + sole-proprietor identity Paddle checks for.

**Verification:** next build green (all five pages static in the route map); local preview
checked (pages render, footer nav, prices correct, /refunds redirect); deployed and probed
live: /pricing /terms /refund /how-it-works /privacy /refunds all 200 on
satyashift.vercel.app; sitemap lists the five pages.

**Commit scope note:** only the trust-page files were committed; the working tree's
uncommitted extension v2.7.2 + behavioral-intelligence work from the previous session
remains untouched, awaiting the user's own commit.

---

## 2026-07-02 — Behavioral intelligence redesign: pattern-aware sessions, squad column-privacy, encouragement (web DEPLOYED, ext v2.7.2, migration 019)

The Deep Session intelligence was percentage-only ("visited Instagram briefly but still
completed") and the squad layer leaked private columns. Full redesign; durable model in
`docs/DECISIONS.md` ("Behavioral intelligence + squad privacy architecture").

**What was wrong (verified, not guessed):**
1. `/api/focus/stop` reduced a session to summed `distraction_pct` — a loop
   (YouTube→Reddit→TikTok→…→YouTube) diluted by neutral time read as "focused. Steady
   work." Falsely reassuring by construction.
2. Event ORDER was unrecoverable: `domain_logs.id` is a random uuid and every row of a
   flush batch shares one `created_at`, so no sequence-aware analysis was even possible.
3. The extension stopped sessions WITHOUT flushing: the final ≤5 min of signal was
   invisible to the verdict it produced.
4. PRIVACY LEAK: the `focus_select` RLS squad arm let any squadmate SELECT a co-member's
   entire session row from the browser (session_quality, distraction_pct, status='mixed'
   which encodes distraction ≥ 50%) — contradicting "verified time, no site, no score".
   The feed route + Circle UI were also shipping session_quality to squadmates outright.

**Built:**
- **`web/lib/behavior.ts`** (pure, dependency-free): `analyzeSession` → BehaviorSignals
  (switches/hr, longest unbroken stretch, distraction bouts + returns, top-domain revisit
  count, drift trend thirds, ended_clean) — ZERO domains in the output (tested);
  `qualityOf` (same 4 DB labels, pattern caps only ever downgrade: loops cap at
  focused/mixed, deep requires a real unbroken stretch, fragmentation counts only when
  distraction is in the mix — work-site hopping is not "scatter"); `reflectionFor` (honest
  Satya line: names loops, escalation, recovery; no flattery/shame); `noticeAgainstBaseline`
  (user vs their own last ≤10 sessions, ≥3 required, at most one quiet line, derived never
  stored). 15 tests in `lib/behavior.test.mjs` (`node --test`, Node type-stripping, no
  runner dep) including the mission's literal loop example and the diluted-loop trap.
- **Migration 019** (applied + repo file): `domain_logs.seq` (in-batch order),
  `focus_sessions.behavior` jsonb, `focus_select` → OWNER-ONLY, four SECURITY DEFINER fns:
  `get_squad_feed` (who/active/verified/duration/intention/when — nothing else),
  `get_squad_live` (presence), `get_squad_focused_today` (dot ids only),
  `encourage_session` (fixed-phrase cheer: membership, active+4h cap, phrase allowlist,
  one-per-member-per-session dedupe, all in SQL; service role untouched).
- **Backend:** ingest writes `seq` (+ fixed the `jitai_outcome` zod enum that mismatched
  the DB CHECK and would have poisoned batches); focus/stop analyzes the ORDERED timeline,
  stores `behavior`, quality now pattern-aware; feed/presence/squads routes moved to the
  definer fns (old direct queries would return empty under owner-only RLS — deployed
  immediately to close the window). New `POST /api/squads/encourage` (rate-limited
  `encourage`/30, RPC, best-effort push via new shared `lib/squad/push.ts`;
  notifySessionStart refactored onto it). `NotificationType` + `squad_encouragement`.
- **UI:** session page Satya line = `reflectionFor(signals)` (stored behavior; legacy
  sessions analyzed client-side from ordered logs) + optional baseline notice; Circle page
  consumes the privacy-shaped feed (verified boolean — quality label no longer exists
  client-side), active rows get four cheer chips ("With you" / "Cheering you on" / "Stay
  strong" / "You've got this") that collapse to "Sent." after one use; /focus running
  screen polls own notifications (45s) and shows cheers as quiet chips.
- **Extension v2.7.2:** stopSession flushes BEFORE `/api/focus/stop` (new integration test
  asserts ingest precedes stop through the real worker; 38/38). New zip
  `dist/satyashift-extension-2.7.2.zip`, kit doc updated.

**Verification evidence:** behavior tests 15/15; extension 38/38; `tsc --noEmit` clean;
`next build` green (route map has /api/squads/encourage); migration probed live (columns,
owner-only policy, 4 fns anon=false/authenticated=true); deployed to satyashift.vercel.app
and probed (presence 401 anon, encourage 403 anon origin-gate, landing 200); security
advisors: only the expected definer-executable WARNs (same accepted class as
is_squad_member), no new criticals.

**Known limits (accepted, documented):** pre-019 rows have seq=0 so within-batch order of
LEGACY sessions is approximate (labels stored at stop time are untouched; only the
client-side reflection fallback is affected); a dwell that started before /focus/start but
flushed after it still counts into the session window (pre-existing, unchanged);
`encourage_session` dedupe is check-then-insert (a same-instant double-click could slip a
duplicate cheer — cosmetic); time-of-day tendencies are in the signals' reach but not yet
surfaced (future: dashboard weekly line).

**Needs the user:** load-unpacked reload → v2.7.2; store upload now
`dist/satyashift-extension-2.7.2.zip`; a real two-account circle test of cheer → /focus
chips would be the final human verification.

---

## 2026-07-02 — Gentle Intervention (nudge) reliability investigation + hardening (ext v2.7.1)

Production-critical audit of the whole intervention pipeline (tab → gate → 1-min alarm →
`nextNudge` threshold → `chrome.notifications` → click-through), prompted by "nudges never
appear". Full RCA + durable rules in `docs/DECISIONS.md` ("Intervention reliability
architecture") and `extension/CLAUDE.md` ("Nudge reliability + observability").

**Findings.** The DECISION logic (`nextNudge`, `gateAllowsCounting`) is correct — the two
historical root causes (idle killing the mid-video streak; one alt-tab erasing a 4-min
streak) were already fixed in v2.6.0 and are test-locked. The remaining failure surface was
entirely in scheduling + delivery, and all three holes failed SILENTLY:
1. **Unrecoverable alarm loss** — `NUDGE_ALARM`/`FLUSH_ALARM` were created only in
   onInstalled/onStartup; a dropped alarm (crashed profile, missed onStartup) killed nudges
   AND sync until a full browser restart, with zero signal.
2. **Muted delivery invisible** — `chrome.notifications.getPermissionLevel()` was never
   checked; if the user muted the extension's notifications (one click in Chrome),
   `create()` rendered nothing forever and nothing anywhere said so.
3. **Zero observability** — `fireNudge` swallowed every error (`catch {}`); the alarm
   handler's `checkNudge()` rejection vanished; no way to prove the pipeline even ticked.

**Fixes (background.js, popup.js; ext 2.7.0 → 2.7.1):**
- `ensureAlarm()` now also runs at worker top level on EVERY wake (existence-checked first,
  so it can never reset a live countdown — no C2 regression). Any event that wakes the
  worker self-heals lost alarms.
- `fireNudge` checks `getPermissionLevel()`; 'denied' is recorded, not ignored;
  `buildStatus` exposes `nudgesMuted` and the popup shows "Gentle check-ins are muted:
  Chrome has notifications turned off for SatyaShift."
- New `nudge_diag` record (storage.local) written every tick: { tickAt, counting, domain,
  streak, permission, lastFire: fired|blocked|error }. Tick exceptions are caught into it.
  Field debugging: `chrome.storage.local.get('nudge_diag')` in the SW console.

**Verification — new `background.test.js` (12 integration tests) runs the REAL
background.js under a faithful chrome stub, plus the 25 existing unit tests = `node --test`
37/37 green.** Proven end to end: 5 sustained YouTube minutes → exactly one gentle
notification (copy, buttons, zero network calls); cooldown blocks then releases;
blur + ≤2-tick grace holds the streak, 3 ticks resets; same-domain multi-tab/multi-window
switches keep the streak; SW restart mid-streak continues on schedule; full browser restart
(session storage + alarms gone, onStartup deliberately NOT fired) self-heals and nudges;
lost alarms recreated on any wake without clobbering live ones; muted delivery detected,
recorded, surfaced, and recovers when re-granted; media exemption (idle + audible counts,
silent idle pauses); notification click opens /dashboard and cleans its stored target.
`node --check` green on all edited scripts. New store zip
`dist/satyashift-extension-2.7.1.zip` (kit doc updated).

**Scope notes (deliberate):** the nudge stays fully local (offline-proof, no auth, no
server writes — distraction TIME already syncs via domain_logs, which is what the dashboard
shows); LinkedIn / user-custom distraction domains remain out of the built-in list — a
product decision for a future settings pass, not a bug.

**Needs the user (the harness cannot click the extension or see the OS layer):**
1. chrome://extensions → Reload SatyaShift (confirm v2.7.1), or Load unpacked `extension/`.
2. Open youtube.com and actually attend it (scroll/play a video) for ~5 minutes → expect
   ONE "A quiet check-in" notification.
3. If silent: SW console → `chrome.storage.local.get('nudge_diag')` — `tickAt` fresh +
   `streak` climbing + `permission: 'granted'` + `lastFire.result: 'fired'` means Chrome
   delivered it and Windows suppressed it → check Windows Settings → System → Notifications
   (Chrome ON, Do Not Disturb / Focus Assist OFF). `permission: 'denied'` → the popup will
   already be saying check-ins are muted; re-enable Chrome notifications for the extension.
4. Store upload now uses `dist/satyashift-extension-2.7.1.zip`.

---

## 2026-07-02 — Payment architecture DECIDED (research pass, NO implementation)

Full deliverable: `docs/payments-architecture-2026-07-02.md` (comparison, security design,
customer journey, DB/API plan, roadmap, risks, rejected alternatives, challenge log).
Durable rules added to `docs/DECISIONS.md`. Nothing was built, applied, or deployed —
this session's output is the decision itself, per the Fable workflow
(research → challenge → compare → recommend → verify; implement later).

**Decision: Paddle (Paddle Billing) as Merchant of Record.**
The founder is in Nepal: Stripe direct and PayPal receiving are impossible, Polar's
payout list (Stripe Connect) excludes Nepal, and Lemon Squeezy is dissolving into
invite-gated Stripe Managed Payments (Stripe-country sellers only). Of the eligible MoRs
(Paddle, Creem, Dodo Payments), Paddle wins on the priority order security > trust >
simplicity: 14-year track record vs 1–2-year-old startups holding all revenue as legal
seller, zero setup/monthly fees (5% + $0.50 only on success), Payoneer payout path to
Nepal, hosted checkout with Apple/Google Pay, hosted cancel portal, signed webhooks.
At our price points the "cheaper" newcomers save only $0.02–$0.19 per transaction.
Creem/Dodo are the named fallbacks behind a `lib/billing/` provider seam.

**Architecture (to build later, roadmap §10 of the doc):** cardless 14-day trial stays
app-managed (migration 016, unchanged); Paddle owns PAID truth; a webhook-only mirror
(`billing_subscriptions` + append-only `billing_events`, future migration 019) with HMAC
verification, timestamp replay protection, and event-id idempotency (same pattern as
ingest); entitlement derived in one place (`lib/subscription.ts` extended); success
redirects never grant anything. Pricing: $8/mo, standard annual $72, $30 founding first
year (honest label, renews at $72 with notice). When gating ships: social layer gates,
never the user's own data; export free forever; extension never touches billing.

**Prerequisite work identified (belongs to the implementation session, step 1):** public
`/terms` + `/refunds` (≥30-day money-back) pages — required by Paddle verification.

---

## 2026-07-02 — Phase 2 SHIPPED: the hook (popup presence, Welcome back, seal), squad-cluster deletion, Focus-idle merge (web DEPLOYED, ext v2.7.0)

Phase 2 of `docs/experience-audit-2026-07-02.md` (§4, §5, §8, §13) plus the deferred
squad-UI decision. Extension bumped 2.6.2 → 2.7.0; new store zip
`dist/satyashift-extension-2.7.0.zip` (kit doc updated — upload THIS one).

**Root-cause fix that unblocked the hook:** no session ever carried `squad_id` (web and
extension both started without one), and `focus_select` RLS only shows a session to
squadmates when `squad_id` is set — so the Circle page's "In it right now" and Recent feed
could never see anything. `/api/focus/start` now attaches the user's newest circle when no
`squad_id` is passed (matches the single circle the UI renders; `notifySquadOnSessionStart`
is scoped to it). This also makes the member "focused today" dots work.

**New `/api/presence` (GET, bearer or cookie, RLS, rate-limited `presence`/120):** returns
`{ circle, live: { name, started_at } | null }` — one co-member first name, newest active
squad-visible session inside the 4h cap. No domains, no feed, generic errors.

**Extension v2.7.0 (all pure logic tested — `node --test` 25/25):**
- **Presence line in the popup:** one row under the status card — "Maya is focusing · 24 min"
  (breathing dot, `prefers-reduced-motion` respected) / "Your circle is quiet right now" /
  hidden entirely when the user has no circle. Worker `GET_PRESENCE` message; response cached
  60s in `storage.session`; fetched after first paint so a slow network never delays status.
- **Post-nudge "Welcome back."** — new pure `nextWelcome()` in core.js (+5 tests): when a
  nudge is heeded (attention counted on non-distraction ground within 30 min), the next popup
  open greets ONCE (one-shot flag consumed by GET_STATUS, held for the popup's lifetime).
- **Verification seal on end:** worker's stopSession now reads the server verdict; the popup
  swaps the End button for a settled line — "44 min · verified ✓" (or "· saved" when
  unverified) — soft opacity/2px-rise settle, reduced-motion honored, until the popup closes.
- Nudge "Return to focus" now opens `/dashboard` directly (the /intercept route was deleted
  in Phase 0; only the 307 redirect kept it working).

**Squad-UI decision executed (the deferred dark cluster): DELETED, not rebuilt.**
`components/squads/` (SquadDashboard, LiveActivityRing, MomentumMeter, ProofFeed,
SquadLeaderboard, DailyMissionBoard, CheckInModal, MapCheckIn, SquadRadarMap,
CuratedInteractionMenu, ActiveMissionCard, SquadPulse) — all confirmed orphaned, dark-themed
in a cream app, and Leaderboard/missions/check-ins contradict the no-scoreboard +
zero-manual-input product line. With them went their orphaned API routes
(`squads/[id]/checkins/**`, `missions/**`, `radar`, `pings`, `squads/upload`), the leaflet
deps + squad-animation CSS (reverted), and the stale planning docs (CRITICAL_FIX_PROMPT.md,
UI_REDESIGN_DIRECTION.md). Migrations 012–015 committed as records — that schema EXISTS live
(verified: tables + profiles policy) even though schema_migrations doesn't list them.
**Residual:** unused live tables squad_checkins/squad_missions/squad_mission_participants/
squad_checkin_reactions/squad_pings + squad_photos bucket — recommend dropping alongside
legacy mental_logs (same cleanup pass, owner decision).

**Focus-idle merged into Today (audit §8):** the dashboard grows an inline starter
(collapsed "Start a focus session" → optional intention field → Begin → running screen);
"Start a session without verifying" opens the same starter. `/focus` is now ONLY the
running screen (redirects to `/dashboard?start=1` when idle, loads the active session's
intention from the DB). Nav is four items (Today · Circle · Activity · Settings); the mobile
FAB is a Play button → `/dashboard?start=1` (auto-opens the starter via useSearchParams in
a Suspense boundary).

**Vocabulary taught once (audit §5):** under Today's session list, when an unverified chip
is visible: "Verified means the extension confirmed this time. Unverified sessions still
count, they are just on trust." — "Got it" dismisses forever (localStorage).

**Also committed:** the good half of the old uncommitted working-tree pile that is already
live in prod (root layout + JsonLd rebrand MindFuel→SatyaShift, cream ui/button + ui/card,
PushNotificationManager refactor, ingest counts-only logs, `.agents/AGENTS.md`).

**Verification:** `extension node --test` 25/25 + `node --check` both scripts; `web npx tsc
--noEmit` + `npx next build` green (route map: `/api/presence` present, five orphaned squad
routes gone); deployed to satyashift.vercel.app and probed live (see commit).

**Needs the user (harness cannot click the extension):**
1. Load-unpacked reload → confirm v2.7.0, then: popup shows the presence line when a
   circle-mate has an active session; "End session" shows the seal; after a heeded nudge the
   next popup open says "Welcome back."
2. Web Store upload now uses `dist/satyashift-extension-2.7.0.zip`.

---

## 2026-07-02 — Security architecture review: defense-in-depth pass (web DEPLOYED, ext v2.6.2)

Full trust-boundary audit of every layer. Deliverables in `docs/security-review-2026-07-02.md`
(threat model, risk ranking, checklist, residual risks, roadmap) and durable decisions in
`docs/DECISIONS.md`. Commit `b37b889`, deployed + probed live. Verdict: no Critical/High
open; one Medium residual (CSP unsafe-inline); rest accepted with rationale.

**Fixed & verified this pass:**
- **[HIGH] `/api/admin/stats`** queried columns dropped in Phase 0 → 500 + leaked raw DB
  error to the admin, and exposed `mental_logs` CONTENT in an admin feed (breaks domain-only
  privacy). Rewrote to live schema (profiles + focus_sessions.duration_s/status), service
  role for COUNTs only, removed the content feed, generic errors. `/admin` page updated.
- **[MED] IP spoofing / rate-limit evasion:** `getClientIP`/`getRequestFingerprint` trusted
  the client-controllable leftmost `x-forwarded-for`. Now prefer Vercel `x-real-ip`
  (unspoofable), fall back to last XFF hop for local dev.
- **[MED] Info leak:** `/api/push/subscribe` returned `err.message`. Now generic.
- **[MED] Extension token handoff:** `SESSION_FROM_PAGE` now requires
  `sender.id === runtime.id` AND origin ∈ {prod, localhost} before storing a session.
- **[MED] Upload:** `squads/upload` now validates MIME + size server-side and writes a
  server-chosen name in `${uid}/` (was client filename/ext at root).
- **[LOW] DB migrations (applied live + captured as repo files 017/018):** revoked
  anon/PUBLIC EXECUTE on `is_squad_member`/`is_squad_admin` (advisor anon finding cleared,
  authenticated retained for RLS); dropped the loose `squad_photos` INSERT policy that
  overrode per-user folder scoping.

**Confirmed sound (no change):** squad_pings RLS (sender+recipient must be co-members),
ingest auth/idempotency/rate-limit, focus start/stop ownership, CSRF gate, OAuth callback,
forgot-password (no enumeration).

**Verification:** tsc + next build green; extension `node --test` 21/21 + `node --check`;
advisors re-run; live probes — admin/stats→401, push/subscribe→401, ingest→403 (CSRF gate),
landing→200.

**Residual / owner actions:** strict nonce CSP (deferred, larger change); enable Supabase
leaked-password protection (dashboard toggle); rotate service-role key (runbook); drop
legacy `mental_logs`; move `vector` out of public; add dependency scanning to CI; Stripe
webhook verification when payments ship.

---

## 2026-07-02 — Phase 1 SHIPPED (agent side): onboarding install step, /privacy, Web Store kit (web DEPLOYED; store upload = user)

Same session as Phase 0 below. Commit `abff2c8`, deployed + verified live
(/privacy 200 public, landing links it, sitemap updated).

- **`web/lib/extension.ts` is THE flip switch:** paste the Chrome Web Store listing URL
  into `EXTENSION_STORE_URL` and redeploy — onboarding step 2 AND the Today connect card
  both turn into one-click "Add to Chrome". Until then both show the honest
  founding-preview manual install.
- **Onboarding is now: privacy boundary → install extension → Today.** The install step
  (the product's most important action) was previously absent from first-run entirely.
  Skippable ("Take me to Today"); Today's connect card remains the fallback.
- **/privacy** (public in proxy `isPublicRoute` — remember the middleware is
  default-deny): plain-words policy; discloses Supabase/Vercel and that Mixpanel runs in
  the WEB APP only (`NEXT_PUBLIC_MIXPANEL_TOKEN` is set in prod), extension has no
  analytics. Linked from signup consent line + landing. NOTE: a privacy-first product
  running Mixpanel is worth revisiting — flagged to user as an optional removal.
- **Web Store package + kit:** `dist/satyashift-extension-2.6.1.zip` (localhost host
  permissions/matches stripped from the STORE manifest only; repo manifest keeps them
  for dev). `docs/webstore-submission.md` = full kit: listing copy, permission
  justifications (incl. the honest web-history disclosure), data-usage checkboxes,
  recommended UNLISTED visibility for preview, repackaging one-liner, and what to do
  after approval.
- **Needs the user (harness cannot):** Web Store dev account ($5) + upload the zip +
  paste listing copy + 1–3 screenshots (1280×800) + submit. Then paste the approved URL
  into `web/lib/extension.ts` and redeploy.
- **Next after store approval:** Phase 2 — popup presence line, post-nudge "Welcome
  back", verification seal on end, squad-UI decision (delete or rebuild the orphaned
  dark cluster), Focus-idle merge into Today.

---

## 2026-07-02 — Phase 0 SHIPPED: ghost product deleted, subscription foundation, password-reset fixed (web DEPLOYED, ext v2.6.1)

Implemented Phase 0 of `docs/experience-audit-2026-07-02.md` plus the subscription
foundation (mission Priority 4). Commits `d093dcd` (Phase 0), `de7a8eb` (subscription +
ext), `+1` (manifest gate fix); deployed `web-hyunu9j37` → satyashift.vercel.app, alias
verified.

**Deleted the ghost legacy product (commit d093dcd):** 10 page routes (/log /coach
/insights /pulse /challenges /weekly-report /mood-scan /intercept /subscription
/promo-simulate) now 307 → /dashboard via `next.config.ts`; 17 legacy-only API route
groups incl. stripe, daily-coach (+ its vercel cron), cron/predictive-push, push/send;
the whole `lib/agents` + `lib/ai` stack; all orphaned components (chat, challenges, fuel,
insights, log, mood-scan, progress, 8 dead dashboard widgets). `next build` route map now
contains ONLY the real product. Verified live: /coach 307→/dashboard, /api/coach dead.

**Core-flow bugs found & fixed in passing:**
- **Password reset was broken since forever**: `/reset-password` never existed (email
  link → 404). Now: reset email → `/api/auth/callback?next=/reset-password` (server-side
  code exchange) → new session-gated reset page. Forgot-password page rebuilt in cream
  (was black MindFuel).
- **PWA manifest was login-gated**: proxy static regex omitted `.json`, so
  /manifest.json redirected to /login for everyone. Fixed + manifest rebranded
  (was "MindFuel — Focus & Productivity App", start_url now /dashboard).
- Stale `getmindfuel.vercel.app` domain in robots/sitemap; MindFuel branding in
  maintenance page and reset-email fallback origin.

**Renames + honesty (labels only, routes unchanged):** nav Squad→Circle,
Reminders→Activity; "circle" wording across squads/login/focus/profile/session pages;
session detail no longer says "watching" ("wasn't connected, so this one is yours on
trust"). Onboarding cut to ONE step (privacy boundary → Today): the persona step
configured the deleted coach, nudge copy never read it, and "Blunt" contradicted the
extension's own no-harshness rule. Settings' two dead knobs (persona, nudge timing)
removed — nothing read them (`jitai_threshold_minutes` and `coach_persona` columns
remain in DB, unread).

**A11y pass:** informational `#9CA3AF` → `#6B7280` on every surviving page + popup
(placeholders/decorative icons keep the light tier); `motion-reduce:animate-none` on the
running-screen ping and circle presence pulse; popup status gets `aria-live="polite"`.

**Subscription foundation (de7a8eb, NO billing):** migration 016 APPLIED live (44
profiles backfilled): `profiles.trial_ends_at` (signup+14d default; existing users got a
fresh founding window ending 2026-07-16), `subscription_plan` ('monthly' $8/mo |
'annual' $30 first year), `subscribed_at`. Status is DERIVED in `web/lib/subscription.ts`
(active/trialing/free) — never stored. Settings has an honest Plan section: prices, trial
state, and "billing isn't switched on, nothing can be charged, subscribing will always be
an explicit step". No upgrade button until one can work.

**Extension v2.6.1** (UI-only: popup contrast + aria-live; tests 21/21). Supersedes the
pending v2.6.0 reload — the user's one load-unpacked reload now gets both.

**Confirmed orphaned, deliberately NOT deleted (uncommitted WIP, Phase 2 decision):**
`components/squads/SquadDashboard.tsx` + its dark cluster (LiveActivityRing,
MomentumMeter, ProofFeed, SquadLeaderboard, DailyMissionBoard, CheckInModal, MapCheckIn,
SquadRadarMap, CuratedInteractionMenu) — nothing renders SquadDashboard; the calm
`squads/page.tsx` replaced it. Note: SquadLeaderboard contradicts the no-leaderboards
line; recommend delete-or-rebuild when Phase 2 touches squad UI. Same for the
checkins/missions/radar API routes + migrations 012-015 that only serve that cluster.

**Still needs the user:** (1) load-unpacked reload to **v2.6.1** + the YouTube nudge
test from the previous entry; (2) optional Supabase leaked-password toggle + service-key
rotation. **Next session:** Phase 1 — Chrome Web Store submission + onboarding install
step (the audit's release gate).

---

## 2026-07-02 — Product experience audit (analysis only, NOTHING implemented)

Full experience audit written to `docs/experience-audit-2026-07-02.md` (all 13 deliverables:
IA, nav, popup UX, dashboard UX, cut/merge/keep lists, micro-interactions, a11y, trust,
phased roadmap, challenge log). Grounded in the real code (popup, app shell, Today, Focus,
Squad, onboarding, session detail). Key findings, ranked:
1. **Install cliff** — load-unpacked is the #1 blocker; Chrome Web Store publication gates
   everything else (Phase 1).
2. **Ghost product** — ~10 orphaned legacy MindFuel routes still ship (`/log /coach /insights
   /pulse /challenges /weekly-report /mood-scan /intercept /subscription /promo-simulate`),
   contradict zero-manual-input + privacy promises. Delete/redirect (Phase 0).
3. **Popup has no squad presence** (planned Phase 2 never started) — one presence line is the
   highest-leverage addition.
4. **verified/unverified vocabulary never taught**; onboarding step 2 (persona incl. "Blunt")
   should move to Settings, install step should replace it; "Reminders"→"Activity",
   "Squad"→"Circle"; mobile bottom bar duplicates /focus; `#9CA3AF` on cream fails WCAG AA;
   reduced-motion missing on infinite pulses.
Roadmap: Phase 0 trust-bleed fixes → Phase 1 Web Store + onboarding rework → Phase 2 popup
presence + nudge "Welcome back" + Focus-idle merge into Today → Phase 3 warmth (Monday line,
overlap noticing, data ledger). Next session: start Phase 0 (delete legacy routes, renames,
contrast pass). No code changed this session.

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
