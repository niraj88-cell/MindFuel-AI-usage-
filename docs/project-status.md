# SatyaShift — Project Status (canonical implementation log)

Append-only. Every new session reads this first. Newest entry on top.
Related: `.agents/AGENTS.md` (project context + mentoring rules), `extension/CLAUDE.md` (extension rules).

---

## 2026-07-08 — Sutra v1: the re-entry thread (extension 2.8.0)

Strategy investigation → one defining capability: **own the moment of RETURN, not the moment
of leaving**. Interruption research (Mark, Leroy, Parnin, Iqbal/Horvitz) converges on the same
root cause: people keep drifting because RESUMING is expensive (minutes of "where was I?"),
while leaving is one click. Every existing tool attacks the leaving (blockers, trackers,
prompts); nothing lowers the ramp back. Sutra is that ramp. Full rationale:
`docs/DECISIONS.md` "Sutra — the re-entry thread".

Shipped (fully local, extension only):
- `core.js`: pure thread state machine — `nextThread` (counted non-distraction attention
  anchors the thread to the CURRENT TAB; drift/blur/idle leave it untouched), `threadIsWarm`
  (60-min TTL), `shouldOfferThread` (restraint: warm only, never while already working, never
  on the thread tab itself), `threadLine` (ledger register).
- **Privacy is structural**: the thread is `{ domain, tabId, windowId, at }` — a bare domain
  plus Chrome's own integer ids. NO url, no title, not even locally; session-scoped (browser
  restart clears it); never transmitted. Re-entry verifies the tab live at click time (still
  exists AND still on the thread's domain) or falls back honestly.
- `background.js`: active state carries tabId/windowId; the 1-min nudge alarm also ticks the
  thread; the nudge's first button becomes **"Back to github.com"** and the click focuses the
  exact work tab (dashboard only as fallback); `nudge_diag` gains a `thread` field.
- Popup: quiet thread card — "Your thread: github.com · 14 min ago" + "Pick it back up"
  (OPEN_THREAD message → focus the tab, popup closes). Shown only when warm + verified +
  attention is elsewhere.
- Tests: 57/57 (`node --test`) — 4 new unit tests for the pure rules, 4 new integration
  tests through the real worker (nudge→click→tab focus; closed tab fallback; navigated-away
  tab never restored; popup offer/deny + OPEN_THREAD), plus the no-thread click-through
  updated for the new target shape `{ domain, thread }`.

NOT yet built (deliberate, phased): resumption-latency as a reflection line (the server can
already derive it from domain_logs — zero new transmission), precursor-gated pinning, circle
"returned" events. Founder verify: load-unpacked → work on a real tab ≥1 min → drift 5 min on
YouTube → the nudge should read "Back to <domain>" and the click should land on the work tab.

---

## 2026-07-08 — Full production-readiness audit (verification only, no code changes)

Independent end-to-end audit against live prod + DB. Evidence: extension tests 49/49,
web module tests 116/116, tsc clean, next build clean, 8 live-route probes correct
(public 200, gated 307→/login, OG png + zip served logged-out), Supabase advisors =
known-accepted list only, zip current with extension source.

**Verdict: 64/100, LAUNCH AFTER FIXES.** Blockers unchanged in kind:
- C1 store listing still unsubmitted (EXTENSION_STORE_URL=''); zip interim is good but
  load-unpacked filters out normal users. Submission kit ready → founder task, long pole.
- C2 pricing incoherent: front door advertises $8/mo + $60/yr, but NO Paddle client
  token/price ids exist in ANY deployed js chunk (all 12 checked) → checkout renders its
  error state; trial expires into nothing (no gating). NEW FACT: webhook probe returned
  401 (not 404) → PADDLE_WEBHOOK_SECRET IS set in prod; billing is half-armed.
- C3 $60 annual price object in Paddle still unverified (follow-up from 2026-07-07 open).
- High: VAPID rotation pending; leaked-password protection off; no CSP; no error
  alerting; Behavioral Intelligence validated by tests but by only 2 real profiles.
- DB reality: 45 users, 34 sessions ever, 325/328 domain_logs from last 7 days (founder
  testing). Dead legacy tables remain (subscriptions/ai_insights/squad_checkins/
  squad_missions/+participants/reactions) + dead jitai_* columns → cleanup, code-first.
- Approved as built: /demo (best trust artifact), Flow Continuation gating held up under
  adversarial reading, nudge copy + registers, /week. CLAUDE.md launch note stale on
  blocker #2 (pitch page exists). "Flexible Routine System" exists nowhere — never
  advertise it.

---

## 2026-07-08 — Final research pass: OG share card + permission-warning pre-empt

Web research surfaced two conversion facts and both were actionable in minutes:
(1) links with a real og:image get ~2–3x the click-through of bare text previews, and
satyashift.vercel.app had NO og:image — every share rendered as a dull text box;
(2) Chrome's `tabs` permission triggers the "Read your browsing history" install
warning, the single biggest install-killer for extensions, and it cannot be avoided
for passive domain tracking (`<all_urls>` warns worse).

- `app/opengraph-image.tsx` (next/og ImageResponse, edge): site-wide 1200×630 card —
  bindu, "Proof you did the work.", the domains-only promise, the /demo invitation.
  CAUGHT LIVE BY VERIFICATION: the extensionless /opengraph-image route was being
  bounced to /login by the default-deny middleware (the PWA-manifest trap, third
  occurrence) — social crawlers would have silently gotten HTML. proxy.ts now
  bypasses auth for the metadata file conventions (opengraph-image/twitter-image/
  icon/apple-icon). Verified: image/png 45KB served logged-out, og:image meta
  injected on all routes.
- Permission pre-empt: InstallGuide + BOTH dormant "Add to Chrome" store branches
  (onboarding, dashboard) now name Chrome's exact warning in plain words ("the one
  permission that lets it see which site you're on — the domain, nothing more") and
  link /demo as proof. STORE_LISTING.md section 6 notes the warning for the founder.
- Verified: tsc clean, build clean, OG card screenshot correct, deployed + live-checked.

---

## 2026-07-08 — /demo: the proof before the ask (public, no-signup live demo)

The one minimal high-leverage conversion feature: skeptical visitors (especially the
privacy-conscious developers we target) bounce at "install an extension that watches
your browsing." /demo answers the objection by SHOWING a finished session with no
account: the verified hero, the owner-only domain view, the Satya reflection, the
circle card, and — the trust argument made literal — "The complete record": the raw
8-row (domain, seconds, category) table with "if our database leaked tomorrow, this is
all anyone would learn."

- HONESTY RULE baked in: the sample events run through the REAL lib/behavior.ts
  engine at render time (analyzeSession/qualityOf/reflectionFor) — the page's Satya
  line is computed, not copywritten (currently: "133 minutes, most of it in one
  place. The longest unbroken stretch was 80 minutes.", quality "deep"). If the
  engine changes, the demo changes.
- Landing: secondary CTA is now "See it working — no account" → /demo; Sign in
  demoted to a quiet text link under the buttons. /demo added to proxy.ts
  isPublicRoute and to sitemap.ts.
- SECURITY PASS (this session's whole diff): Supabase advisors re-run — zero new
  findings, all WARNs match the known-accepted list; billing_events no-policy INFO is
  deny-all by design. /demo static, no inputs; .zip static allowance only affects the
  auth redirect; zip contains extension source only; /week + continuation are
  owner-scoped RLS reads, no new API surface. Residual (pre-existing, founder list):
  no CSP header yet; VAPID rotation still pending (STORE_LISTING.md §7).
- Verified: tsc clean, build clean (/demo static), preview: /demo 200 logged-out,
  renders correctly (screenshot), zero console/server errors.

---

## 2026-07-08 — Extension install made real (downloadable zip + guided steps)

The install surfaces told people to "Load unpacked → choose the SatyaShift extension
folder" but never gave them the folder — connecting was impossible for anyone but the
founder. Interim fix until the store listing lands (all surfaces still flip to the
one-click store button automatically when EXTENSION_PUBLISHED goes true):

- `web/scripts/package-extension.ps1` (+ `npm run package:extension`) builds
  `web/public/satyashift-extension.zip` (runtime files only, manifest as-is, 38 KB;
  verified manifest sits at the zip root so Extract-All → Load unpacked just works).
  RE-RUN IT AFTER ANY EXTENSION CHANGE or the download goes stale.
- `lib/extension.ts` gained EXTENSION_DOWNLOAD_URL; proxy.ts static regex now allows
  `.zip` (remember: default-deny middleware bounced unknown file types — this was the
  PWA-manifest lesson again).
- New shared `components/extension/InstallGuide.tsx`: green "Download the extension"
  + four plain steps, with a copy-to-clipboard chip for chrome://extensions (Chrome
  refuses chrome:// links from pages, so copy is the honest affordance). Used by
  onboarding step 2 (steps now always visible in the card) and the Today connect card
  ("Get the extension" toggle → guide).
- Verified: tsc clean, build clean, preview logged-out fetch of the zip = 200
  application/zip 38 KB with no login bounce, zero console/server errors.

---

## 2026-07-07 — Launch blockers sprint: /week artifact + Chrome Web Store kit

Doubling down on the main weakness (the product is dark). Blocker #2 (public pitch
page) was found ALREADY SOLVED by the earlier pricing session ( / is a real front door);
CLAUDE.md's launch-readiness note is stale on that point. Shipped the two remaining
code-shippable blockers:

- **Blocker #4 — the week-1 aha artifact.** New `/week` page ("A week of attention"):
  a seven-day ledger (verified green over on-trust ghost bars), verified-total headline,
  deepest stretch, the same weeklyInsight line + seed the dashboard speaks, and a
  "Save as image" button that draws a 1080×1080 PNG on canvas (no deps; palette mirrored
  as literals like the extension, since canvas can't read CSS tokens; fonts pulled from
  the rendered page's computed families). Domain-free BY CONSTRUCTION: the new pure
  `lib/week.ts` fold (buildWeek) never receives a domain, so page and image cannot leak
  one; footer states the promise ("domains only, never content"). 5 tests in
  `lib/week.test.mjs`. Dashboard gained one quiet "Your week of attention" door, shown
  only when the last 7 days hold a session. /week is auth-gated (default-deny verified:
  logged-out → /login).
- **Blocker #1 prep — `extension/STORE_LISTING.md`.** Complete Chrome Web Store
  submission kit: listing copy, plain-language permission justifications (tabs/cookies
  per the launch note), data-usage disclosure answers, screenshot checklist, a packaging
  script that strips localhost from the store manifest, the 15-minute founder
  submission steps, post-approval wiring (EXTENSION_STORE_URL/EXTENSION_PUBLISHED), and
  the VAPID rotation commands. The upload itself is founder-only (dev account, $5).
- Verified: 91 pure-module tests pass (5 new), tsc clean, next build clean (/week
  route present), preview boot clean.

---

## 2026-07-07 — Flow Continuation (one quiet invitation back to yesterday's work)

Reduces the cognitive cost of RESUMING: on the first dashboard visit of a day, if the
evidence has earned it, one card hands back the previous session's mental context — the
user's own intention, the time window, and the 2–3 domains the work lived on — with a
single decision: "Pick this back up" (starts a session under the same intention via the
existing /api/focus/start) or "Not now" (per-anchor localStorage dismissal, permanent,
never re-offers a runner-up). Silence is the default.

- New pure `lib/continuation.ts` (peer of behavior.ts — NOT in lib/intelligence/, whose
  zero-domain invariant this owner-only surface would violate): `deriveContinuation`
  picks an anchor by quality × depth × recency, boosted by 7-day working rhythm, gated
  at the shared `CONFIDENCE.speak` bar; `workingSet` drops drift-dominant domains (never
  invite the loop back) and sub-3-min visits. Hard bails: any session today, an active
  session, <6h absence, <20min anchors, 'distracted' anchors, unverified without an
  intention, >7 days old. 17 tests in `lib/continuation.test.mjs` (mostly silence cases).
- Dashboard: session query widened to 14 days/40 rows (today's UI unchanged — filtered
  client-side); invitation derived fail-safe (any error → no card); the anchor's
  domain_logs window is the same owner-only read the session page already does. Card
  replaces the generic green start button so the page keeps ONE primary action; hidden
  while the extension is unconnected (activation first). No new tracking, tables,
  routes, or storage; every invite carries confidence + evidence.
- Verified: 17 new + 86 existing pure-module tests pass, tsc clean, next build clean,
  dev preview boots with zero console/server errors, middleware default-deny intact.
  NOT yet committed/deployed this session.

---

## 2026-07-07 — Pricing refined + corrected + CRO pass (annual $60; dormant founding offer)

Three rounds on the public pricing surface, all DEPLOYED (74647f8, 09928ad):
- /pricing rebuilt for hierarchy + trust: price-led mono typography, a CTA per card into
  the existing signup→cardless-trial flow (no checkout from this page), ONE shared
  outcome-led included list ("Understand how you actually work." … mechanism after),
  factual trust strip (no card / cancel in one click / no hidden fees / 30-day money-back /
  Paddle holds card details), stale waitlist copy replaced with open signup.
- PRICE CORRECTION per founder: annual is $60, not $30 (`lib/subscription.ts` priceUsd).
  Discount framing is derived, never hand-typed: anchor = 12×monthly ($96 struck),
  "Save $36 a year" chip; landing page (/) gained a compact pricing card under the CTAs.
  REMINDER: constants are display-only — confirm the Paddle annual price id also bills $60.
- Founding offer (50% off FIRST month), honest by construction and DORMANT:
  `NEXT_PUBLIC_PADDLE_DISCOUNT_MONTHLY` (Paddle discount id) → only when set do /pricing +
  CheckoutButtons mention it, and Paddle applies it in the overlay (UI does no price math).
  Unset in prod today → invisible (verified live). Activation: create the 50%/1-period
  discount on the monthly price in Paddle, set the env var, redeploy.
- Verified each round: preview screenshots (desktop+mobile, no console errors), tsc,
  next build, live-content probes. CLAUDE.md billing env docs updated.

---

## 2026-07-07 — Desktop Reflection Widget (optional companion window; one line, no dashboard)

An optional small window that sits beside the user's work and holds ONE quiet line.
Opened explicitly from Settings; closing the window is the whole off switch. Not a
dashboard: no scores, streaks, charts, controls, or ticking timers — a running session
reads in coarse bands ("You've stayed with this for over an hour"), never a live count.

- New pure `lib/widget.ts` (`widgetMessage`): the single decision of what to show.
  Priority: running session (coarse presence + intention as the only support line) →
  weekly insight (same `weeklyInsight` line + seed as the dashboard, so the week speaks
  with one voice) → plain day line → quiet empty state. Tested in `lib/widget.test.mjs`
  incl. a content-rule guard (no score/streak/%/hype ever).
- New `app/widget/page.tsx` OUTSIDE the (app) group: paper, mono overline, one serif
  line, optional faint support line; static green dot only while a session is live (no
  motion — the widget must stay comfortable for a whole workday). Client reads own rows
  under RLS (today's focus_sessions + behavioral_profiles), refreshes every 60s. NO
  middleware change needed: default-deny already requires auth for /widget.
- Settings (/profile): new "Desktop widget" section with an Open button —
  `window.open('/widget', 'satyashift-widget', popup 360×200)`; the named window
  prevents duplicates.
- FLOAT ON TOP (same session): the widget can move onto the real desktop via Document
  Picture-in-Picture (Chrome 116+) — an always-on-top window above every application.
  Implementation: the card's DOM node is physically moved into the PiP document (the
  documented framework pattern; React keeps driving the moved node, so the tree renders
  it unconditionally and it never unmounts), styles + next/font variable classes are
  cloned in, `pagehide` moves the card home. Button appears only when the API exists;
  gesture-gated; while floating, the tab shows one faint keep-this-open note. Known
  constraint stated in-page: the PiP window lives only as long as its opener tab (a
  native tray widget would need Electron/Tauri — deliberately out of pre-launch scope).
- Untouched: dashboard, focus flow, intelligence, notifications, extension, DB, deps.
- Verified: `node --test` 75/75 (incl. new widget tests), `tsc --noEmit` clean,
  `next build` green (/widget prerenders, hydrates client-side). Visual check in a real
  signed-in window still needs a human (agent has no credentials). Not deployed.

The two-noise "Backdrop" on the focus screen became a small curated Environment System —
a place to work, not a music feature. Concept unchanged: optional, off by default,
device-local preference, audio GENERATED with WebAudio (no files, no streaming, no
third-party requests → nothing to license, nothing leaves the browser). Environments that
can't be synthesized honestly (café murmur, piano) were excluded rather than sourced.

- New `lib/environments.ts`: catalog (Silent · Deep Noise · Gentle Rain · Ocean Waves ·
  Forest Wind · Fireplace — curation guard ≤8), pure pref parsing with legacy
  `satyashift_focus_audio` migration (brown/pink → Deep Noise, volume carried), and the
  synthesis builders (looped filtered noise layers + slow LFO swells/sweeps; rain droplets
  and fire crackle as short bursts scheduled ~2.5s ahead on the AUDIO clock so background-tab
  timer throttling can't thin them out). Each builder returns a full cleanup — only the
  selected environment ever exists in memory.
- `components/focus/FocusAudio.tsx` rewritten as the thin UI: environment chips (choosing a
  place starts it — the click is the gesture), play/pause toggle, volume slider. Never
  autoplays: the remembered environment restores SELECTED but silent. Green appears only on
  the actively sounding chip (live state). Fades on every start/stop/switch; leaving the
  screen closes the AudioContext. aria-pressed / aria-labels / keyboard-native controls.
- Mounting unchanged: `focus/page.tsx` still renders `<FocusAudio />`; no other surface,
  no layout/dashboard/middleware changes, no new deps, no DB anything.
- Verified: `node --test` 70/70 (incl. new `lib/environments.test.mjs`: catalog invariants,
  naming rules, pref clamp/migration), `tsc --noEmit` clean, `next build` green. Sound
  QUALITY needs a human ear in a real session (agent can't listen) — tuning knobs are the
  gain/LFO constants in `buildEnvironment`. Not deployed.

Rewrote the user-facing reflection language so it reads as observation, not evaluation, and
added deterministic phrasing variety so months of sessions don't read like one template.
Detection logic, signals, quality rules, gating thresholds, validator, privacy model: untouched.

- `lib/behavior.ts` `reflectionFor`: every shape bucket (loop / mostly-distraction / escalating /
  fragmentation / recovery / clean / default) now has 2–3 phrasings sharing that bucket's factual
  anchor; a pure `pick()` seeded from the signals chooses one, so a session reads identically on
  every visit while different sessions vary. Dropped the evaluative/coaching tails ("Coming back
  is the skill", "Seeing it clearly is the point", "tends to feel better…"). `noticeAgainstBaseline`
  lines reworded to plain prose (kept the "past your recent typical" / "circled back" anchors).
- `lib/intelligence/messages.ts`: templates rewritten to describe rather than advise — removed
  "Worth protecting…", "might be the whole game", "Something is working", "No verdict — just a
  heads-up"; added variants to every single-phrasing bucket. Validator + compose untouched.
- Dashboard day line: dropped trailing verdicts ("A good start.", "Steady work.") — the line now
  states the count and duration only. Active-session line softened.
- Seeds actually wired: session page passes `durationS` to `sessionNoticing`, dashboard passes the
  ISO-week number to `weeklyInsight`, so the existing seed rotation (previously always 0) is live.
- Tests: 3 regex anchors in `behavior.test.mjs` relaxed to the per-bucket invariants ("4 times",
  "unbroken stretch", "toward the end"); all wording buckets keep an anchor every variant carries.
- Verified: `node --test` 64/64 (full lib suite) and 27/27 (copy-touching files), `tsc --noEmit`
  clean, `next build` green. Not deployed.

---

## 2026-07-07 — Pre-launch product review (verdict: DELAY ~1 month; foundation strong, not shippable as public paid)

Full adversarial review (product/eng/security/YC/skeptical-user lenses). Code is strong; a public
PAID launch is blocked by distribution, activation, and offer — not craft.

**The three questions, answered honestly.**
- *Understands drifting, or just time?* Partial-yes. `lib/behavior.ts` reads attention SHAPE
  (loops, fragmentation, recovery, drift-trend) and the nudge fires on a sustained distraction
  BLOCK — genuinely better than a timer. But "meaningful work" is a hardcoded proxy: `core.js
  categoryFor()` is a ~10-domain distraction / ~8-domain productive list; the rest of the web is
  "neutral" and uncounted, and context (a tutorial vs. a doomscroll) is invisible. It understands
  the geometry of attention, not the user's actual work.
- *Would a privacy engineer trust + recommend it?* Yes, with caveats. Owner-only RLS, definer-fn
  column privacy (019), domain-only, no content, least-privilege MV3, HMAC webhooks — a code-reader
  trusts it. Caveats: `cookies`/`tabs` permissions need plain-language justification on the store
  listing; rotate the VAPID key leaked in git history before mass scrutiny.
- *Week-1 "I didn't realize I drifted, and it didn't shame me"?* No, not reliably. The per-session
  reflection delivers that feeling on day one and is guilt-free — but only if the extension is
  running (today a dev load-unpack), and the longitudinal "understands me" payoff is confidence-
  gated (~14 sessions) so week one is mostly silent. The emotion is real; the delivery path is broken.

**Ranked launch blockers.** (1) Extension not on the Chrome Web Store (`EXTENSION_STORE_URL=''`) →
core loop uninstallable → intelligence dark; store review is the long pole. (2) No public pitch page
(`/`→`/login` is a bare wall for discovery traffic). (3) Offer isn't real — nothing gated + Paddle
checkout unverified; gate the SQUAD layer only (never the user's own data) and prove checkout, or
launch free. (4) No week-1 "aha"/demo artifact.

**Scorecard (1–10, uninflated).** Security 9 · Privacy 9 · Product craft 8 · Performance 8 · Trust 8 ·
Reliability 7 · Originality 7 · Long-term differentiation 7 · Dashboard 6 · Extension (once installed)
6 · Accessibility 6 · Community 5 · Retention 4 · Onboarding 4 · Cross-device 4 · Pricing 3 ·
Subscription value 3.

**Decision: C (delay ~1 month).** Highest-impact work only: submit + ship the Web Store extension
and set `EXTENSION_STORE_URL`; ship a real pitch page; decide+wire the paid story (gate squad only,
verify Paddle, remove dev-checkout) OR launch free; add the week-1 attention picture + an
"extension connected" activation state; rotate VAPID; add permission copy. Do NOT redesign the soul
(unverified honesty, guilt-free copy, domain-only privacy, fixed-phrase encouragement).

---

## 2026-07-03 — Behavioral Intelligence, Phases 3 + 4 (local nudge loop + notif/squad personalization)

Extended the intelligence layer with its two learning loops, both additive and privacy-preserving.

**Phase 3 — extension LOCAL nudge intelligence (`extension/core.js` + `background.js`).** The
deterministic `nextNudge` still decides WHETHER/WHEN (fixed 5-min block). New pure helpers decide
only HOW it speaks and, when check-ins keep getting ignored, space them further apart:
`nudgeRegister` (curious | reflective | gentle from local responsiveness + block shape),
`updateNudgeOutcome` (EWMA of the extension's OWN heeded/ignored signal), `nudgeCooldownMultiplier`
(fatigue back-off, capped at 3×). Two invariants held: it only ever backs OFF (never lowers the
fire threshold — no silent adaptive-lowering), and it learns from a `nudge_profile` in
`chrome.storage.local` that is NEVER transmitted (no server dependency, no server-side nudge log).
The heeded/ignored outcome is read from the existing `nextWelcome` transition. `background.js` wires
it: cooldown via `cfg`, register on fire, outcome fold after the welcome check. `node --test` 49/49.

**Phase 4 — notification + squad personalization (server loop, derive-on-read).** Two pure modules,
no new data collected. `lib/intelligence/notifications.ts`: per-recipient responsiveness from the
`notifications.is_read` we already store → `notificationDecision` backs off recipients who let
`squad_focus_start` pass unread (fail-open; wired into `lib/squad/notifySessionStart.ts`).
`lib/intelligence/squad.ts`: `squadImpact` (encouraged vs own baseline outcomes) + `recommendSquadSupport`
(invite | solo | silent) — wired into the dashboard so a thriving-solo worker is quietly left alone
instead of pushed to socialize. Confidence-gated, user-vs-own-past only. The squad still sees exactly
what it saw before (who/active/verified/duration/intention).

**Verified.** web `tsc` clean, `node --test` 75/75 (adds phase4 + reflection/emotion/etc), extension
`node --test` 49/49, `next build` green (deploy). Harness can't drive the extension — the local nudge
loop needs a load-unpack pass to see tone/back-off live (`chrome.storage.local.get('nudge_profile')`).

---

## 2026-07-03 — Behavioral Intelligence System, Phase 1 (the longitudinal layer)

Built the additive intelligence layer the product's edge depends on: a slowly-evolving,
domain-free understanding of HOW each person loses focus, recovers, and returns. Self-awareness
first; personalization without surveillance. The deterministic engines are UNTOUCHED — this
sits on top. Full durable rules in `docs/DECISIONS.md` ("Behavioral Intelligence System").

**What shipped (all `web/lib/intelligence/`, pure + `node --test`, zero domains):**
- `types.ts` (Trait/BehavioralProfile/Estimate/PatternSignal, all confidence+evidence bearing),
  `confidence.ts` (Confidence Engine: n + recency + variance → 0..1; below `speak` ⇒ silence),
  `traits.ts` (Behavioral Memory + Learning Engine: 10 traits, EWMA ALPHA=0.12 so one session
  moves a learned trait ≤ALPHA; `deriveProfile` ≡ fold of `updateProfile` = rebuildable cache),
  `patterns.ts` (late-night drift, weekend collapse, Monday resistance, post-lunch dip, morning
  strength, rapid fragmentation, restart difficulty, steady improvement — from timing, never a
  site), `emotion.ts` (calm/momentum/resistance/fatigue/flow/overwhelm/recovery-readiness,
  behavioral-only, non-diagnostic), `reflection.ts` (profile-aware session noticing that upgrades
  but never regresses `behavior.noticeAgainstBaseline`), `insights.ts` (one weekly realization or
  null), `messages.ts` (template library + `validateMessage` safety gate: bans shame/emoji/any
  domain-token, caps length).
- **Dormant Claude seam** `llm/{types,refine}.ts`: OFF until `ANTHROPIC_API_KEY`; only rephrases
  an already-safe template, `applyRefinement` re-validates after ⇒ non-load-bearing. No SDK/dep
  added (SatyaShift still ships zero AI dependency).
- **Data:** migration 024 `behavioral_profiles` (owner-only RLS, domain-free jsonb, cascades on
  auth.users delete). Applied via MCP + captured as repo file; added to `lib/supabase/types.ts`.
  Advisors: no new warning.
- **Wiring (all fail-safe / silent by default):** `/api/focus/stop` folds each finished session
  into the profile via `profile-store.ts` (user-scoped client, timezone-aware hour/dow at the
  edge, wrapped so a profile hiccup never breaks a stop); session page shows the profile-aware
  noticing (falls back to the numeric baseline for new users); dashboard shows the weekly
  realization only when confident.

**Validation (the mission's core proof):** `sim.test.mjs` drives 7 personas (doomscroller,
knowledge worker, student, rapid-switcher, strong performer, weekend-only, night owl) through the
REAL pipeline (`analyzeSession → updateProfile → patterns`) over 1 day / 1 week / 1 month / 3
months and asserts: confidence rises with time, traits converge to each persona's true tendency,
the right patterns are discovered (and false ones — e.g. night-owl ≠ late-night drift — are not),
no session moves a learned trait past ALPHA, and the finished profile jsonb contains ZERO domain
strings. Personalization improves with NO new data collection.

**Verified:** `tsc --noEmit` clean; `next build` green (40 routes); `node --test` 67/67
(intelligence + llm + behavior + entitlement). Migration advisors clean.

**Follow-ups (phased, see DECISIONS):** P2 real Claude adapter behind the dormant seam; P3
extension LOCAL nudge register/fatigue (never transmitted); P4 notification + squad
personalization from outcomes (fills the 3 currently-unobserved traits). Harness can't drive the
auth-gated UI with a populated profile — owner manual check: run a few sessions, confirm a
`behavioral_profiles` row appears and the session "Satya" noticing + dashboard "This week" line
show once enough verified sessions exist. Working tree UNCOMMITTED.

---

## 2026-07-03 — Developer-only checkout path (pre-launch Paddle testing, owner-gated)

Added a hidden developer checkout so the owner can verify the FULL real Paddle flow
(overlay → signed webhook → entitlement → profile cache → portal/cancel) before public
launch, without exposing checkout to any other user. **No production flow changed; the
webhook, entitlement, subscription-state, and RLS pipelines are byte-for-byte untouched.**

**The real problem it solves.** There was never a "wait until trial expires" gate — the
profile page already shows checkout to trialing users when `checkoutEnabled`. The actual
pre-launch hazard: setting `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (+ price ids) to test flips
`checkoutEnabled` true for EVERY trialing/free user. The dev path lets the owner drive the
real pipeline while the public UI stays inert.

**Architecture (server decides; nothing mocked).**
- New `GET /api/billing/dev-checkout`: returns the Paddle checkout config ONLY when the
  authenticated caller is the owner email (same `OWNER_EMAILS` gate as `admin/stats`) AND
  the server-only `PADDLE_CLIENT_TOKEN` is set. Everyone else / unconfigured → 404. GET, so
  CSRF-exempt; covered by the edge WAF.
- The client token is delivered **server-only** (env `PADDLE_CLIENT_TOKEN`, NOT
  `NEXT_PUBLIC_*`), so it never enters the public bundle and `checkoutEnabled` stays false
  for everyone. Price ids stay `NEXT_PUBLIC_PADDLE_PRICE_*` because the webhook's
  `priceToPlan` map reads them (price ids are non-secret and useless without the token).
- `components/billing/DevCheckout.tsx`: fetches the route; renders nothing on non-200 (so
  every normal user sees the unchanged inert Plan state). For the owner it wraps the SAME
  `CheckoutButtons` used by production, injected with the server-delivered config.
- `CheckoutButtons` gained one optional, backward-compatible prop (`config?`) — defaults to
  the public env, so production behavior is identical. The dev path reuses the identical,
  tested overlay/trust-boundary code.

**Dev-test env (owner sets in Vercel, sandbox first):** `PADDLE_WEBHOOK_SECRET`,
`PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_ENV`, `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY/YEARLY`, and
the NEW server-only `PADDLE_CLIENT_TOKEN`. Deliberately NOT `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
(that is the launch switch that opens checkout to all).

**Security.** No entitlement is ever granted here — the route only hands the owner config it
is allowed to see. Webhook HMAC/replay/idempotency, entitlement derivation, and
service-role-only writes are unchanged. Backend is the sole gate: no client flag, cookie,
query param, or public token can enable it.

**Verified.** `tsc --noEmit` clean; `next build` green (route registered as
`ƒ /api/billing/dev-checkout`); `node --test lib/entitlement.test.mjs lib/billing/paddle.test.mjs`
= 16/16 pass. Harness can't drive the Paddle overlay — owner runs the live checkout probe once
env is set (checklist in the session summary).

**Remove at launch (one commit):** delete `app/api/billing/dev-checkout/`,
`components/billing/DevCheckout.tsx`, and the `<DevCheckout .../>` line + import in
`profile/page.tsx`; revert the `config?` prop on `CheckoutButtons`; unset `PADDLE_CLIENT_TOKEN`
and set `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` to open checkout for everyone.

---

## 2026-07-03 — Pre-market optimization + production deploy (dead deps removed, Next.js security patch)

Shipped the privacy pass + a dependency/security cleanup to prod (satyashift.vercel.app).

**Optimization.**
- Removed 12 unused top-level deps (**116 packages** total): `groq-sdk`, `openai`, `ai`,
  `@ai-sdk/google`, `@ai-sdk/openai`, `@langchain/core`, `@langchain/google-genai`,
  `@langchain/langgraph`, `@prisma/client`, `prisma`, `@upstash/ratelimit`, `@upstash/redis`.
  Proven unused (no source imports, no `schema.prisma`); all were dead weight from the deleted
  MindFuel AI coach / abandoned ORM+rate-limit choices. **SatyaShift uses NO LLM/AI provider** —
  all intelligence is deterministic (`lib/behavior.ts`, `extension/core.js`). The Groq
  deprecation email is irrelevant.
- `next.config.ts`: dropped the vestigial `serverExternalPackages` (LangChain) and the
  `generativelanguage.googleapis.com` CSP `connect-src` entry (no AI calls exist). CSP verified
  live: `connect-src 'self' https://*.supabase.co wss://*.supabase.co`.
- **Security patch: Next.js 16.2.4 → 16.2.10** — fixes the HIGH-severity advisories incl.
  Middleware/Proxy bypass + cache poisoning, directly relevant since `proxy.ts` is the
  default-deny auth boundary. Residual: 3 moderate npm-audit findings, all one nested `postcss`
  inside `next@16.2.10` (build-time CSS tool on our own authored CSS; unfixable without a
  breaking downgrade) — ACCEPTED.

**Deploy.** `vercel --prod --yes` → built on 16.2.10, 40/40 pages, aliased to
satyashift.vercel.app (READY). Live probes: landing/privacy/pricing 200; `/api/export` 401,
`/api/ingest` 403 (no longer 500). Ingest recovery confirmed: `domain_logs` 140→156, 16 rows
landed post-hotfix.

**Verified state.** web `tsc` + `next build` green; extension `node --test` 42/42 (v2.7.3).
Export now returns real domain-only data; ingest no longer writes `jitai_*` (columns retained as
inert — no further destructive DDL until deliberately sequenced code-first).

**Still needs the user (harness can't drive the extension):** reload the unpacked extension to
v2.7.3, Resume tracking (it was paused), and watch one distraction domain ~5 min to finally see
the "A quiet check-in" nudge. Recommended: commit the working tree (deployed state not yet in
git); remove the unused AI deps is DONE.

---

## 2026-07-03 — INCIDENT + hotfix: migration 022 broke live ingest (schema before code)

**Symptom.** The extension popup showed "satyashift.vercel.app is briefly unavailable"; attention
stopped persisting to the server (queued locally in the extension, not lost).

**Root cause (proven via Postgres logs).** Migration 022 dropped `domain_logs.jitai_fired` /
`jitai_outcome`, but the **deployed** `/api/ingest` still INSERTs those columns. Every batch flush
then failed with `column domain_logs.jitai_fired does not exist` → HTTP 500 → the extension records
a `server` error → the popup's transient note. Classic ordering bug: a **destructive schema change
was applied ahead of the code that stops depending on it.** The local code (ingest/types/session
page) was already fixed to not use jitai, but that code is NOT deployed.

**Hotfix (migration 023, applied via MCP).** Re-added the two columns
(`jitai_fired boolean not null default false`, `jitai_outcome text`). They are domain-free and
harmless; restoring them makes the deployed code work again immediately with no site deploy. The
extension drains its local backlog on the next 5-min flush. The five legacy content/URL tables
dropped in 022 STAY dropped (only the vestigial jitai columns are restored).

**Correct sequencing going forward.** The jitai columns may be dropped again ONLY in a migration
applied AFTER the ingest build that no longer writes them is deployed (code-first, then DDL). For a
single-instance Vercel deploy, prefer: deploy code → verify → then drop. Given the columns are
dead + domain-free, keeping them permanently is also fine — the marginal privacy gain isn't worth a
second incident.

**Also confirmed this session:** SatyaShift uses **no LLM/AI provider** — `groq-sdk` / `openai` /
`@ai-sdk/*` are dead deps from the deleted MindFuel coach (no source imports them; only a stale
`web/README.md` line mentions `GROQ_API_KEY`). The Groq deprecation notice is irrelevant; all
"intelligence" is deterministic (`lib/behavior.ts`, `extension/core.js`). Removing the unused AI
deps is recommended supply-chain hygiene.

---

## 2026-07-03 — Privacy audit: "Download my data" leak fixed + legacy data purged (migration 022)

Full privacy/security pass on the data pipeline, triggered by "Settings → Download My Data
appears to expose website URLs/links". The report was right in spirit and the root cause was
worse than a URL: **the export route was a legacy remnant.**

**Root cause (proven).** `web/app/api/export/route.ts` still queried the DELETED MindFuel
tables — `mental_logs` (has a free-text `content` column), `mood_logs`, `daily_summaries`,
`habit_challenges` — and the CSV emitted `content` verbatim; the file was branded
`mindfuel-export`. Worse, it exported NONE of the user's real data (`domain_logs`,
`focus_sessions`). So the one place that promised "export everything" both leaked deleted-product
free-text AND omitted the actual domain-only record. Live DB held 108 legacy rows
(mental_logs=65, mood_logs=12, daily_summaries=13, habit_challenges=12, daily_pulses=6).

**Fixes.**
- **Export rebuilt** (`api/export/route.ts`): returns ONLY the two live tables — `focus_sessions`
  (started_at, duration_s, quality, distraction_pct, intention, status, domain-free `behavior`)
  and `domain_logs` (time, BARE domain, category, duration). Named columns only (never
  `select('*')`), a plain `privacy_notice`, `satyashift-export-*` filename, and CSV
  formula-injection guarding. No `content`, no URL, no path — nothing the extension never
  collected. Rate-limit (5/day), RLS scoping, and counts-only audit log preserved.
- **Legacy data purged** (migration 022, applied via MCP + captured as repo file): dropped all
  five legacy tables (their policies/indexes/triggers/publication membership go with them), so
  the content-bearing storage ceases to EXIST — defense in depth beyond the owner-only RLS.
- **Dead intervention columns removed**: `domain_logs.jitai_fired` / `jitai_outcome` were
  vestigial (nudges are fully local; the extension never sent them — 1 stray row of 140).
  Dropped from the DB, the ingest write path + Zod schema, `lib/supabase/types.ts`, and the
  session-detail page (its always-0 "gentle nudges" line, now removed). Deleted the dead
  `dev-scripts/check-db.ts` (it read `mental_logs.content`).

**Audit conclusions (no other leak found).** ingest normalizes to bare hostname (defense in
depth even if a URL slipped through); focus/stop computes `behavior` server-side with ZERO
domains (tested) and returns none; presence + squad feed expose only safe columns via the 019
SECURITY DEFINER fns; admin/stats is counts-only; delete cascades the whole user. The extension
is already least-privilege: bare hostname only (full URL never persisted), no `<all_urls>`, no
content script off our own origin, sensitive/incognito/own-app skipped. Supabase security
advisors: only the known-accepted set (vector-in-public, waitlist anon INSERT, the definer squad
fns with internal membership checks, leaked-password toggle, service-role-only billing_events) —
no new findings; this change added no risky DDL.

**Verified.** `cd web && npx tsc --noEmit` clean; `npx next build` green; MCP confirms 0 legacy
tables remain and `domain_logs` now = (id, user_id, domain, duration_s, category, batch_id,
created_at, seq). Implementation now matches `/privacy` ("we never collect URLs/titles/content"
and "export everything") with no contradiction.

**Residual / follow-up (non-blocking).** `lib/supabase/types.ts` still carries hand-written types
for the dropped tables AND other long-dead ones (weekly_reports, ai_insights, intercept_logs,
etc.) — harmless (type-only, no runtime data, no app references) but stale; regenerate from the
live schema (`supabase gen types`) in a dedicated cleanup rather than hand-pruning a subset.
Squad residual tables from earlier phases remain a separate later drop.

---

## 2026-07-03 — Intervention (nudge) RCA + fix: fragmentation now triggers (ext v2.7.3)

Production-critical: the JITAI nudge "never triggered" for the users who most need it. The
2026-07-02 pass declared the DECISION logic correct and hardened only delivery/alarms; it
never challenged the decision model, and the real defect was inside it.

**Root cause (proven, not guessed).** Built a minute-by-minute decision trace
(`scratchpad/trace.mjs`, imports the real `nextNudge`/`categoryFor`) over the mission's exact
scenarios. `nextNudge` keyed its streak to a SINGLE domain:
`minutes = p.domain === ctx.domain ? minutes+1 : 1` (core.js:166). Every switch to a
*different* distraction domain reset the streak to 1. A genuinely distracted user channel-surfs
(YouTube→Instagram→Reddit→X→…), so they never accrued 5 minutes on one site and were NEVER
nudged. Trace, before: "15 min single-domain YouTube" fired; "fragmentation across 8 sites for
12 min" fired ZERO times. The single-domain and short-detour cases (the ones the old tests
covered) worked, which is why 38/38 green masked it.

**Fix (core.js `nextNudge`, the only decision change).** The streak is now a category-scoped
distraction BLOCK: switching between distraction domains CONTINUES it. Recovery grace unified —
a live block survives a short detour off distraction (blur, idle, OR a brief work/neutral
glance) for `NUDGE_GRACE_TICKS`, then a sustained return resets (real recovery). State gained
`domains[]` + `switches`; the policy returns a `decision` tag + `distinctDomains`/`switches`.
`nudgeCopy` gained a scattered register (≥3 distinct domains → "a few different places", never
over-claims one site). Firing stays strictly deterministic at the 5-min block — fragmentation
is recorded/observable but does NOT lower the threshold (high-confidence first; adaptive
lowering deferred as a deliberate, documented layer). `fireNudge` now uses
`chrome.runtime.getURL('icon128.png')` (robust OS-notification icon) and passes the scatter
count to the copy.

**Observability.** `nudge_diag` (per tick, storage.local) extended with
`category, threshold, distinctDomains, switches, decision` — `chrome.storage.local.get('nudge_diag')`
now answers *why* a tick did/didn't intervene, deterministically.

**Verification.** `node --test` 41/41 (was 38): replaced the test that encoded the old
domain-reset with the corrected grace/recovery semantics; added a pure fragmentation test and a
scattered-copy test; added an end-to-end `background.test.js` case that drives the REAL worker
through rapid distraction-domain switches (tab switch → gate → 1-min alarm → `nextNudge` →
`chrome.notifications.create`) and asserts one nudge + `decision:'fire'` + fragmented diag.
Trace, after: all 6 mission scenarios pass (15-min single, fragmentation, VS Code→Docs→YT(2m)→VS
Code stays quiet, short detour stays quiet, long distraction, fragmentation-with-work-glances).

**Scope discipline.** Passive tracking, deep sessions, payments, privacy (domain-only), and the
delivery/alarm hardening from v2.7.1 are untouched. No new permissions, no new data. The nudge
stays fully local.

**Needs the user (harness cannot click the extension):**
1. Load-unpacked reload → confirm **v2.7.3**.
2. Deterministic single-domain check: open youtube.com, attend it ~5 min → expect ONE
   "A quiet check-in".
3. Fragmentation check (the fix): bounce youtube → instagram → reddit → x every ~1 min for
   ~5 min without returning to real work → expect ONE "A quiet check-in" whose copy says a few
   different places (not one site).
4. Restraint check: 2 min on youtube then back to work ≥3 min → expect SILENCE.
5. If silent: SW console → `chrome.storage.local.get('nudge_diag')` — `decision`, `streak` vs
   `threshold`, `distinctDomains`, `permission:'granted'`, `lastFire.result:'fired'`. A healthy
   diag with nothing on screen ⇒ OS layer (Windows Settings → Notifications → Chrome, Focus
   Assist / Do Not Disturb).

---

## 2026-07-03 — Paddle LIVE integration wired (checkout + portal); activates on env config only

Connected the (already-proven) billing foundation to a now-live Paddle account with the
minimum change set. No backend rewrite: the webhook pipeline, event store, idempotency,
replay protection, entitlement engine, and migrations 020/021 are untouched. Checkout was
the deliberately-deferred piece; it is now built. Everything stays DORMANT until the
PADDLE_* env vars exist (webhook 404s, checkout shows the honest inert state).

**Changed (additive, minimal):**
- **Config split into secret vs public** (`lib/billing/config.ts` + new
  `lib/billing/public-config.ts`, client-safe). Secrets server-only: `PADDLE_WEBHOOK_SECRET`,
  `PADDLE_API_KEY`. Public (Paddle designs these to be client-visible):
  `NEXT_PUBLIC_PADDLE_ENV`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
  `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY`, `NEXT_PUBLIC_PADDLE_PRICE_YEARLY`. Dropped the unused
  `PADDLE_PRODUCT_ID`. `getBillingConfig()` gains `checkoutEnabled`; added `paddleApiBase()`
  and `priceToPlan()`.
- **Robust price→plan** (`paddle.ts` `mapPaddleEvent` gains an optional `priceToPlan` arg;
  `paddleProvider`/service thread it from config). Plan now resolves from the configured
  price ids, so the webhook no longer depends on `custom_data.plan` being set on each price
  in the dashboard — removes a silent-failure mode (an unmapped plan would leave
  `profiles.subscription_plan` null while `billing_subscriptions` looked active). custom_data
  still wins if present. +1 test (16/16 billing, entitlement 15/15).
- **Paddle.js overlay checkout** (`components/billing/CheckoutButtons.tsx`): official
  `@paddle/paddle-js`, monthly/yearly, loading/error/success states, `customData.user_id`
  for webhook attribution, `successUrl=/profile?upgraded=1`. Grants nothing client-side —
  entitlement flips only via the webhook. Cancellation of the overlay is a no-op.
- **Manage/cancel** (`app/api/billing/portal/route.ts`): mints a Paddle customer-portal
  session (`POST /customers/{id}/portal-sessions`, API key server-side), returns the
  single-use cancel/overview URL. Honors the "cancel in one click" promise the Terms/Pricing
  pages already make. Cookie/bearer-authed, own mirror row only, rate-limited, generic errors.
- **Settings Plan section** wired: active → Manage subscription; trial/free + configured →
  overlay checkout; unconfigured → the prior honest inert copy. `?upgraded=1` return polls
  the profile a few times so "active" appears without a manual refresh.
- **Payout-agnostic docs**: Payoneer references (docs only — never in config) replaced with
  "Paddle payout, bank transfer where supported; runtime-irrelevant" across DECISIONS,
  architecture doc, project-status. No billing logic touched (payout ≠ runtime).

**Untouched:** webhook route shell, service.ts pipeline shape, entitlement.ts, gate.ts,
types.ts, migrations, proxy CSRF exemption, RLS. Backend remains the single source of truth.

**Verification:** tsc + next build green (`/api/billing/portal` + `/api/billing/webhook`
in the route map); billing tests 16/16, entitlement 15/15. Full webhook pipeline was already
proven end-to-end in prod last session (idempotency, replay/sig rejection, out-of-order guard).

**REMAINING — user, in Paddle dashboard + Vercel (no code):**
1. Paddle → Developer Tools → Notifications: add destination
   `https://satyashift.vercel.app/api/billing/webhook`, subscribe to `subscription.*`
   events, copy the signing secret.
2. Paddle → Developer Tools → Authentication: copy the **client-side token** and create a
   **server API key**.
3. Catalog: note the **monthly** and **annual** price ids (custom_data not required).
4. Vercel env (production): set `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`,
   `NEXT_PUBLIC_PADDLE_ENV=production`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
   `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY`, `NEXT_PUBLIC_PADDLE_PRICE_YEARLY`; redeploy.
5. Live smoke: one real subscription (Settings → Choose plan), confirm the row in
   `billing_subscriptions` + `profiles.subscription_plan`, then cancel via Manage and refund
   from the Paddle dashboard.

---

## 2026-07-03 — Design identity rebuilt: "a ledger of truth" (web + extension, verified)

The interface still read as generic AI-generated SaaS. Root cause (audit in
`docs/design-language-2026-07-03.md`): the shipped design system belonged to a deleted
product. `web/app/globals.css` was 751 lines of unused "MindFuel × Spider-Verse"
(glassmorphism, gradient text, floating orbs, neon glows) — the exact catalogue of AI-slop
tells — set a dark `body` background every page painted over, and declared `Outfit`/
`Instrument Serif` fonts **that were never loaded** (Satya's serif silently fell back to
Georgia). ~15 Tailwind/Material default hexes were hand-copied across ~20 files; the deleted
dark product still bled through `error.tsx`/`not-found.tsx`/`global-error.tsx`/admin
("System Glitch", "Decrypting Secure Neural Link").

**New system (durable rules: DECISIONS.md + CLAUDE.md "Design language"):** a quiet ledger —
warm paper `#FAF8F4`, warm ink `#23201B`, one moss green `#2D6A3F` that appears ONLY where
something was verified. Built from first principles, not trends.

- **Foundation:** rewrote `globals.css` to a lean `@theme` token set (paper/card/ink/soft/
  faint/ghost/line/hairline/green+5 shades/rust/clay) consumed as Tailwind utilities — color
  now has one home; raw hex in markup is a defect. Three self-hosted typefaces via `next/font`
  in `layout.tsx`: Instrument Sans (UI), Instrument Serif (Satya + statement headings), IBM
  Plex Mono (measured values + overline labels, tabular). Deleted every Spider-Verse
  animation/utility.
- **New brand glyph:** `components/brand/VerifiedMark.tsx` — the bindu seal (closed ring +
  filled center = verified; open hollow ring = unverified). Replaced every lucide
  `Shield`/`ShieldCheck` verification chip across dashboard, session, squads, onboarding.
- **Migrated every surface to tokens + the new language:** landing (now a statement of
  belief with one honest "what your circle sees" artifact), login/signup (dropped the
  three-icon trust grid, a flagged AI tell), forgot/reset-password, dashboard (Today),
  focus (calm breath replaces the `animate-ping`), session detail, squads, notifications,
  profile, onboarding, admin (killed the sci-fi copy), 404/error/global-error/maintenance,
  app shell, trust pages + shell + footer, WaitlistForm, PushNotificationManager,
  button/input/label primitives.
- **Extension (the product):** rewrote `popup.html` + `welcome.html` to the same palette as
  CSS variables (kept the system font stack — a popup must open instantly); replaced the
  ✓/✗ dingbats with on-brand bindu/open-ring CSS markers; dropped the seal's ✓ glyph
  (`popup.js`, words only). All popup.js logic untouched; all 13 DOM ids + toggled classes
  preserved (verified by grep).
- **Removed dead weight:** 8 unused UI components (WebPattern/WebCorner/AccentButton/badge/
  card/progress/slider/tabs), the 6 orphaned `lib/fuel/*` engines from the deleted coach,
  and 7 orphaned public images (Next.js starter SVGs, hero-calm, aspiration-nature,
  og-premium).

**Verification:** `npx tsc --noEmit` clean; `npx next build` green (39/39 pages; clean
`.next` rebuild confirmed production CSS carries the new tokens and zero `Outfit`/old-green
— an earlier stale-dev-cache reading was a false alarm); extension `node --test` green
(38/38); live-preview screenshots of landing, login, and a trust page confirm the identity
renders (serif display, warm paper, bindu seal, mono measures). Adversarial self-critique
(Reddit power user / designer / engineer / first-time visitor / subscriber) run; no generic
tells survived. **Not visually verifiable by the agent:** the extension popup/welcome in a
real Chrome (harness can't load-unpack) — hand the user a load-unpacked glance as the last
check. Working tree only; not committed or deployed (awaiting the user's commit, per the
standing extension-work convention).

---

## 2026-07-03 — Payment FOUNDATION built + proven end-to-end (dormant; go-live = env config only)

Roadmap step 3 of `docs/payments-architecture-2026-07-02.md`, built BEFORE Paddle
approval so going live is configuration: set PADDLE_* env vars in Vercel (sandbox first),
create the products, ship the checkout UI (deliberately NOT built), done. No business
logic, schema, or UI rewrite will be needed. Durable rules: DECISIONS.md "Foundation
implemented" section.

**The seam (`web/lib/billing/`):** `types.ts` (canonical BillingUpdate + PaymentProvider
interface) → `paddle.ts` (the only Paddle-aware file: constant-time HMAC-SHA256
signature verify with ±5 min replay window, event→canonical mapping, fail-closed on
unknown statuses) → `service.ts` (SubscriptionService, the only writer) → `gate.ts`
(`getEntitlement`/`requirePremium` for future premium routes; nothing gated yet, per
rule). `config.ts` validates env; billing disabled ⇒ webhook answers 404.

**Entitlement engine:** `lib/entitlement.ts` — pure, ONE authoritative function
(`entitlementOf`) deriving trial/active/grace_period/past_due/paused/cancelled/expired/
lifetime from profiles + the mirror row; `lib/subscription.ts` now delegates to it
(UI API unchanged). GRACE_DAYS=14. Fail-closed everywhere.

**Webhook pipeline (`/api/billing/webhook`, thin handler):** raw-body HMAC verify →
128KB cap → `billing_events` insert (PK event_id = dedupe; existing-unprocessed rows are
crash recovery, finished on redelivery) → atomic `apply_billing_update` SQL fn
(service-role-only EXECUTE; out-of-order guard on provider `occurred_at`; profiles cache
refresh in the same transaction) → processed mark. 500 ⇒ Paddle redelivers; NO queue on
purpose (documented in DECISIONS — the provider's retry schedule is the queue at our
volume). Exempted from the cookie-CSRF origin gate in proxy.ts (HMAC-authed, path-exact).
Audit: new `billing.*` events via `auditLog`; unattributable paid events log CRITICAL.

**DB (migrations applied live + repo files):** 020 `billing_events` (RLS on, NO policies
— service-role only, advisor INFO accepted) + `billing_subscriptions` (owner SELECT only,
no user writes) + `apply_billing_update` + profiles.subscription_plan now allows
'lifetime'. **021: fixed a REAL pre-existing prod bug found while smoke-testing** — the
live `log_security_audit_event()` trigger still had the pre-fix body referencing
OLD.user_id (profiles has `id`), so EVERY profiles UPDATE/DELETE raised 42703; the repo's
20260525 fix file had never been applied live. Fixed + hardened (search_path).

**Verification:** unit tests 15/15 (`node --test lib/entitlement.test.mjs
lib/billing/paddle.test.mjs`: full state machine incl. fail-closed, signature/replay/
tamper, mapping incl. unattributable) + tsc + build green. **Production end-to-end
smoke test** with a temporary webhook secret (set → deploy → six-case suite → cleaned →
secret removed → redeployed): activation 200, duplicate {duplicate:true}, older
out-of-order cancel did NOT overwrite active (guard held), bad signature 401, replayed
timestamp 401, unattributable 200+CRITICAL audit; crash-recovery path exercised for real
(events stuck by the 021 bug completed on redelivery). Smoke rows deleted; founder
profile reset; endpoint verified back to dormant 404. Advisors re-run: only the accepted
INFO on billing_events; `apply_billing_update` NOT user-executable.

**Also:** dead `lib/stripe.ts` + `stripe` npm dep removed (Paddle decision supersedes);
`server-only` added to fence billing config/service/gate out of client bundles;
Paddle placeholders documented in `.env.example`; billing table/RPC types added to
`lib/supabase/types.ts`.

**Deliberately NOT built:** checkout UI, portal link, upgrade surfaces, any gating —
that is the go-live session, after Paddle approval, per the roadmap.

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
seller, zero setup/monthly fees (5% + $0.50 only on success), Nepal-eligible payouts
(bank transfer where supported; rail is runtime-irrelevant), hosted checkout with
Apple/Google Pay, hosted cancel portal, signed webhooks.
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
