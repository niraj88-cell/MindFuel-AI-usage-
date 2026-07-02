# SatyaShift — Product Experience Audit (2026-07-02)

Scope: the whole experience, not the visuals. Grounded in the actual code on branch
`backend-hardening` (popup v2.6, app shell, Today, Focus, Squad, onboarding, session detail)
and the canonical log in `docs/project-status.md`. Nothing here is implemented yet.

## 0. The honest reframe (challenging the brief itself)

The brief assumes a bloated dashboard product with complex navigation and a settings-panel
popup. That product no longer exists. Previous passes already did the hard pivot: the nav is
five items, Today is a calm reflection page, the popup is a mode switch with one primary
action, the copy is non-punitive, the privacy line is everywhere. Re-litigating those wins
would be motion, not progress.

What actually remains, in order of how much it costs the product:

1. **The install cliff.** The extension IS the product, and installing it requires
   `chrome://extensions`, Developer mode, and Load unpacked. Every persona in the brief
   except "founder who codes" fails at this step. No interaction polish matters until the
   product's core artifact is one click away.
2. **The ghost product.** Roughly ten legacy MindFuel routes still ship and are reachable by
   URL: `/log`, `/coach`, `/insights`, `/pulse`, `/challenges`, `/weekly-report`,
   `/mood-scan`, `/intercept`, `/subscription`, `/promo-simulate`. They are orphaned from the
   nav but link to each other, so one stray click drops a user into a different product with
   a different philosophy (manual content logging, mood scans, AI coach personas). That
   directly contradicts the two core promises: zero manual input, and domain-only privacy.
3. **The hook is missing from the daily surface.** The positioning is social accountability,
   but the popup (the one surface seen daily) shows no squad presence at all. Phase 2 of the
   popup plan was never started.
4. **A vocabulary the user is never taught.** "verified / unverified" chips appear before the
   product has ever explained what verification is, and "unverified" reads as a demerit to
   the person who deliberately started a session without the extension.

Everything below is organized around the 13 requested deliverables, but those four findings
are the audit.

## 1. Experience audit (component by component)

Verdicts: KEEP (earned its place), FIX (right idea, wrong detail), CUT (remove), MERGE.

### Extension popup (`extension/popup.html` / `popup.js`)
- Brand row with सत्य · truth subtitle: KEEP. It is the trust signature, 2 lines, no cost.
- Status card (dot + state + detail): KEEP. This is the product answering "is it working".
  FIX: add `aria-live="polite"` on the state text; the dot is color-only for state changes.
- "Start deep session" / "End session" mode switch: KEEP. Exactly right.
- "Open SatyaShift" ghost link: KEEP, demoted correctly.
- "Pause tracking": KEEP. This is a trust affordance, not a feature. Being able to turn the
  tracker off in one click is the strongest privacy proof the popup makes.
- Privacy footer line: KEEP verbatim.
- Missing: one line of squad presence ("Maya is focusing now" / "Your circle is quiet").
  This is the single highest-leverage addition in the whole product. See §4.

### App shell (`web/app/(app)/layout.tsx`)
- Five-item nav (Today, Focus, Squad, Reminders, Settings): KEEP the shape.
  FIX: "Reminders" mislabels `/notifications`, which is actually squad activity and pings.
  Call it "Activity". Reminders promises alarms the product does not set.
- Mobile bottom bar: FIX. Five slots, and two of them (Focus item + center green FAB) go to
  the same `/focus` route. Give the FAB the slot; drop the duplicate item.
- "Private by default" chip in the sidebar user card: KEEP.

### Today (`dashboard/page.tsx`)
- Greeting + focus total + Satya reflection: KEEP. The reflection derives from real data and
  never scolds. This is the emotional core of the web app.
- Connect-extension card with fail-safe logic (never nags on error): KEEP the logic, it is
  genuinely careful. FIX the content once the Web Store listing exists (one flag flip,
  already built).
- "Start a session without verifying" escape hatch: KEEP. Honesty over funnel.
- Alone-in-circle invite card: KEEP. It echoes the landing promise at the right moment.
- Closing line "Just keep working — everything here updates on its own": KEEP. That sentence
  is the product philosophy in nine words.

### Focus (`focus/page.tsx`)
- Idle state (intention input + Begin): MERGE candidate, see §8. Today already has a start
  CTA that links here, where the user finds... another start button. Two screens, two
  clicks, one action.
- Running state: KEEP almost untouched. Minute-level elapsed instead of a ticking stopwatch,
  "There's nothing to watch here", WebAudio noise with honest labels. This screen is the
  best-designed thing in the product.
  FIX: the infinite `animate-ping` pulse must respect `prefers-reduced-motion`.
- Recent-sessions list: KEEP, it is the same row component as Today (good consistency).

### Squad (`squads/page.tsx` + components)
- Presence first, chronological verified feed, no streaks, no leaderboard: KEEP the model.
- Known debt: `SquadDashboard` / `CuratedInteractionMenu` are dark-themed inside a cream
  app. FIX (already logged as deferred).
- Invite by code with copy confirmation: KEEP.

### Onboarding (`onboarding/page.tsx`)
- Step 1 (privacy boundary: what we see, what we never see): KEEP. Leading with the boundary
  is the right trust move.
- Step 2 (Satya persona, Gentle / Direct / Blunt): CUT from onboarding, move to Settings.
  Two reasons. It configures the legacy coach; the actual nudge copy is fixed, tested prose
  in `core.js` and ignores this setting. And "Blunt: unsparing tough love" contradicts the
  extension's own rule ("no fear language, never harsh") on the second screen the user ever
  sees. The freed step should hold the thing onboarding currently never mentions: installing
  the extension. Today the single most important action of the entire product is not in the
  first-run flow at all; it waits on a dashboard card the user may not read.

### Session detail (`session/[id]/page.tsx`)
- Honest verdict, "Short session" instead of the system word "abandoned", non-punitive Satya
  line even at high drift: KEEP. FIX one line: "the extension wasn't watching" is the only
  place the product describes itself as watching. Use its own better vocabulary:
  "the extension wasn't connected, so this one is yours on trust."
- Private per-domain breakdown: KEEP, and label it as private ("only you ever see this").

### Legacy routes
- `/log`, `/coach`, `/insights`, `/pulse`, `/challenges`, `/weekly-report`, `/mood-scan`,
  `/intercept`, `/subscription`, `/promo-simulate`: CUT (delete or redirect to `/dashboard`).
  Manual logging pages actively break the promise "no buttons that ask the user to log
  anything". `/admin` should be gated, not linked. `/session/[id]` stays, it is live.

## 2. Information architecture (target)

Two surfaces, four jobs:

- **Extension popup** (daily surface): Am I tracked? Am I in a session? Is anyone in my
  circle focusing? One action (start/end).
- **Web app** (reflection surface): Today (how did it go), Circle (who is with me),
  Activity (what happened while I was away), Settings (control and exit rights).

That is it. Every screen answers "what is my next action" with exactly one primary control.
The web app is allowed to be boring; the popup is allowed to be tiny. The product's depth
lives in the honesty of the data, not in surface count.

## 3. Navigation redesign

- Web nav: Today · Circle · Activity · Settings (four items). Focus stops being a
  destination and becomes an action (see §8); the running screen remains as a full-screen
  state you are placed into, not a place you browse to.
- Rename: Squad → Circle everywhere (the dashboard copy already says "circle"; the nav
  disagrees with the product's own voice). Reminders → Activity.
- Mobile: three items + center start button. Delete the duplicate Focus slot.
- Delete all legacy routes so deep links and browser history cannot resurrect the ghost
  product.

## 4. Extension UX redesign

The popup already has the right skeleton. Three additions, in priority order:

1. **Presence line** (the missing hook): one row under the status card.
   "● Maya is focusing · 24 min" when true, "Your circle is quiet right now" when not,
   nothing at all when the user has no circle. Data: one GET to the existing squads/feed
   endpoints, cached in `storage.session` for a minute. No avatars, no feed, one line.
2. **Post-nudge acknowledgement**: the worker already knows when a nudge fired and when
   attention returned to productive ground. The next popup open (or the nudge notification
   itself resolving) should say, once, "Welcome back." That closes the loop with warmth
   instead of leaving the nudge as the only voice. This is the cheapest real delight in the
   product and it reinforces deep work, not engagement.
3. **Verification seal on end**: when "End session" succeeds, swap the button for one
   settled line before close: "44 min · verified ✓" (or "saved" when unverified). The moment
   of completion currently has no moment.

Non-goals for the popup, deliberately: no charts, no history, no settings, no squad feed.
It is a companion, and companions are brief.

## 5. Dashboard (web) UX redesign

Today is close to done. Remaining moves:

- Fold the start action in (§8) so Today answers "what next" with a button, not a link to a
  screen with a button.
- Teach the verification vocabulary once: the first time a user sees an "unverified" chip,
  a one-line footnote under the list: "Verified means the extension confirmed this time.
  Unverified sessions still count, they are just on trust." After first dismissal, never
  again. The chips currently assume knowledge the product never provides.
- The weekly rhythm the deleted `/weekly-report` gestured at can return later as a single
  quiet paragraph on Today every Monday (Satya's weekly line), not a separate destination.

## 6. Interaction improvements

- Start: press Begin → button becomes the breathing dot in place (no route jump jank), then
  the running screen settles in. One continuous motion from intent to state.
- End: verdict chip "verified" should arrive with a soft single settle (opacity + 2px rise),
  never confetti. The product's celebration register is a nod, not a party.
- Nudge notification: keep "Return to focus" / "Stay, on purpose" (already shipped, already
  right).
- Copy-invite already confirms with a check; keep that pattern as the standard confirmation
  idiom everywhere (no toasts).

## 7. Components to remove

- All ten legacy routes (§1) and their orphaned components (`components/chat`,
  `components/fuel`, `components/mood-scan`, `components/challenges`, remaining
  `components/log`, `components/insights` leftovers, landing components already deleted in
  the working tree).
- Onboarding step 2 (persona) from the first-run flow.
- The duplicate Focus slot in the mobile bottom bar.
- Subscription surface from nav-reachable UI until there is something to sell; a tier chip
  on Settings is enough.

## 8. Components to merge

- **Focus idle state → Today.** Today grows the intention input inline (collapsed to a
  single "Start focusing" button; tapping reveals the optional intention field). `/focus`
  keeps only the running state. Two screens become one, three clicks become one, the nav
  loses an item. Trade-off: Today gets one more element; acceptable because it is the
  page's whole reason to exist.
- Session-row component is already shared across Today and Focus history: formalize it
  (one component, one place) when the merge happens.
- Notifications + squad pings are already converging server-side (pings now land as
  notification rows): let Activity be the single inbox and delete any second feed rendering.

## 9. Components worth preserving exactly as they are

- The running screen's stillness ("There's nothing to watch here").
- The popup's pause button and privacy footer.
- Fail-safe nag logic on Today (never a false "connect" card, never a false invite).
- Non-punitive verdict language and the "Short session" euphemism for abandoned.
- The onboarding privacy boundary card (what we never see, itemized).
- WebAudio-generated noise with honest labels (no fake rain).
- No streaks, no leaderboards, no totals in Squad. Hold this line forever; it is the moat
  against becoming the engagement products this tool exists to resist.

## 10. Delightful micro-interactions (all mission-aligned, all quiet)

1. "Welcome back" after a heeded nudge (§4.2). Highest value.
2. Verification seal on session end (§4.3).
3. Presence dot breathing in the popup when a circle-mate is live.
4. Monday morning: Satya's one-paragraph weekly line on Today.
5. First verified session ever: the chip gets one extra sentence, once:
   "Your first verified session. This is what proof looks like."
6. Circle feed: when two members' sessions overlapped in time, a single shared line:
   "You and Maya were focusing at the same time." No badge, no streak, just noticing.

## 11. Accessibility improvements

- Contrast: `#9CA3AF` body/microcopy on `#FAF8F4` is ~2.5:1, failing WCAG AA. Darken the
  muted tier to ~`#6B7280` for anything informational; reserve `#9CA3AF` for true
  decoration. This affects every screen and the popup.
- `prefers-reduced-motion`: the running screen's infinite ping, the popup pulse, and any
  new breathing dots need a static fallback.
- Popup: `aria-live` on the status state, and the session button's label must change
  textually (it does) not just visually.
- The 10px uppercase mono chips (verified/unverified) are below comfortable legibility;
  11px minimum and drop the tracking, or pair with the icon carrying an accessible label.
- Mobile FAB already has an aria-label; keep that standard for all icon-only controls.

## 12. Trust improvements

- **Publish to the Chrome Web Store.** Load-unpacked is not just friction, it is a trust
  inversion: the product about integrity asks users to bypass the browser's safety flow.
- **Show the ledger.** Settings gets "Your data": the exact domains sent (last 7 days),
  one-tap export, one-tap delete. The privacy promise is currently words; this makes it
  inspectable. The session detail's per-domain view proves the data exists; let the user
  hold it.
- Fix the one "watching" phrase (§1, session detail).
- Keep refusing fake numbers (already policy per the UI direction doc). The empty circle
  card sells the idea without inventing users; that restraint is the brand.

## 13. Phased roadmap

**Phase 0 — stop the trust bleed (days, low risk)**
Delete/redirect legacy routes; rename Reminders→Activity and Squad→Circle; fix the mobile
nav duplicate; contrast pass; reduced-motion pass; the "watching" copy fix.

**Phase 1 — the cliff (the release gate)**
Chrome Web Store submission. Rework onboarding to: privacy boundary → install (one click)
→ land on Today with the first-session prompt. Persona moves to Settings. Today's connect
card becomes the fallback, not the primary path.

**Phase 2 — the hook (the retention gate)**
Popup presence line; post-nudge "Welcome back"; verification seal; Squad visual
unification with the cream theme; Focus-idle merge into Today.

**Phase 3 — the warmth (steady state)**
Monday Satya line; overlap noticing in the circle feed; first-verified-session moment;
"Your data" ledger in Settings.

Each phase is independently shippable and independently reversible. Nothing in Phase 2 or 3
is worth doing before Phase 1: presence lines and celebrations are compounding interest on
a product people can actually install.

## Challenge log (proposals considered and rejected)

- Streaks/gamification: rejected, contradicts trust-over-engagement; the Squad model's
  refusal of scoreboards is a feature.
- Merging Today and the running screen: rejected; the running screen's emptiness is the
  point, mixing reflection into it invites clock-watching.
- Removing the intention field as friction: rejected; it is optional, it feeds the circle
  feed with human words, and it costs nothing when skipped.
- Removing "Pause tracking" to simplify the popup: rejected; the off switch is the privacy
  argument made tangible.
- A richer popup (mini feed, stats): rejected; the popup's restraint is what makes it a
  companion instead of another feed to check.
- Onboarding tour/coach marks: rejected; a product this small should be self-evident, and
  every screen already carries one primary action. If a tour feels needed, the screen is
  wrong, not the user.
