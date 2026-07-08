# SatyaShift — repo guide

SatyaShift is a privacy-first accountability platform. The Chrome extension
(`extension/`) IS the product: a passive, domain-only attention tracker. The web app
(`web/`, Next.js + Supabase, deployed to satyashift.vercel.app) supports it: deep-session
verification, squads, insights.

Principles: effortless deep work · quiet accountability · privacy by design (bare domains
only, never URLs/content) · trust over engagement · calm, premium UX.

## Launch readiness (verdict 2026-07-07 — NOT yet public-launch-ready; delay ~1 month)
Foundation (security, privacy, intelligence architecture) is strong; a public PAID launch is
blocked by distribution + activation + offer, not by code quality. Four blockers, in order:
1. **Extension not on the Chrome Web Store.** `web/lib/extension.ts` `EXTENSION_STORE_URL=''`,
   so onboarding + the Today card ship load-unpacked dev steps no normal user will do. Without
   the extension there are no `domain_logs`, every session is `unverified`, and the whole
   intelligence layer stays dark. Store review is the long pole → sets the ~1-month timeline.
2. **No public pitch page.** `/` redirects to `/login` (waitlist retired), so discovery traffic
   hits a bare login wall. Need a real pitch page (what it is + privacy promise + one honest
   artifact), separate from the login wall.
3. **Offer isn't real.** Nothing is gated (no reason to pay) and Paddle checkout is unverified.
   Don't advertise $8/mo until the SQUAD layer is gated (never the user's own data) AND checkout
   is proven in prod, or launch free and enable billing later. Remove the dev-checkout scaffolding.
4. **No week-1 "aha" artifact.** The product is (rightly) quiet, leaving nothing to demo and no
   felt payoff in week one. Add one honest, shareable "your week of attention" picture + an
   "extension connected" activation state. Also: rotate the leaked VAPID key; add plain-language
   `cookies`/`tabs` permission copy to the store listing.
What genuinely works today: shape-aware drift detection (loops/fragmentation/recovery, not just
time), guilt-free reflection copy, and best-in-class domain-only privacy. Full review + scorecard:
`docs/project-status.md` (2026-07-07) and `docs/DECISIONS.md` "Launch readiness".

## Read these before changing anything
- `docs/project-status.md` — canonical, append-only implementation log. Newest entry first.
  Every session appends what it did and verified.
- `extension/CLAUDE.md` — non-negotiable extension invariants (privacy, MV3 state rules,
  attention + nudge policy, sync idempotency).
- `docs/design-language-2026-07-03.md` — the visual system ("a ledger of truth"): audit,
  tokens, typography, component philosophy. Read before ANY UI change; the rules below are
  the enforceable summary.
- `.agents/AGENTS.md` — project context + mentoring rules (the user is a beginner:
  one step at a time, exact commands, no code dumps).

## Design language — "a ledger of truth" (durable; full doc: docs/design-language-2026-07-03.md)
The interface is a quiet ledger: warm paper, warm ink, one green thread that appears ONLY
where something was verified. Trust is shown through restraint, not decoration. Enforce:
- **Color lives in ONE place.** `web/app/globals.css` `@theme` tokens: `paper #FAF8F4`,
  `card`, `ink #23201B`, `soft`/`faint`/`ghost` (warm grays, never Tailwind blue-grays),
  `line`/`hairline`, `green #2D6A3F` + `green-deep/bright/tint/line/wash`, `rust`, `clay`.
  Use the token utilities (`bg-paper`, `text-ink`, `border-line`, `text-green`…). A raw
  hex in markup is a defect (except the two files that can't read tokens: `global-error.tsx`
  and `maintenance/page.tsx`, and the extension's own palette blocks).
- **Green is EARNED, never decoration.** It marks: verified state, live presence, the one
  primary action, and Satya's voice. Nothing else is green.
- **Three typefaces (self-hosted via next/font in layout.tsx):** Instrument Sans =
  interface; Instrument Serif = Satya's voice + page-level statement headings only (use
  `font-serif`); IBM Plex Mono = measured values (durations, times, domains) + overline
  labels (`font-mono`, tabular). Don't use serif for chrome or mono for prose.
- **Verification uses the bindu seal, never a shield.** `components/brand/VerifiedMark.tsx`
  (`verified` = closed ring + filled center; unverified = open hollow ring). Never reintroduce
  lucide `Shield`/`ShieldCheck` as a verification chip.
- **Geometry:** cards `rounded-xl` (12px), controls `rounded-lg` (8px), chips `rounded-full`.
  No shadows except the mobile drawer. Depth comes from borders + surface color.
- **Motion only confirms:** 150ms color/opacity transitions; the only ambient motion is
  `.satya-breathe` on live presence dots (respects `prefers-reduced-motion`). No hover
  lifts, entrance choreography, ping/pulse theatrics, gradients, or glassmorphism.
- **Banned (these are the "generic AI SaaS" tells): ** emoji anywhere; decorative icons
  (icons only for comprehension — lock=private, play/stop=session); icon-in-tile card
  headers; three-icon feature-card grids; dark-mode surfaces (except the ink brand tile);
  sci-fi/marketing filler copy. Empty states = one true sentence. Icons `lucide-react` only.
- The extension (`popup.html`/`welcome.html`) has no build step: it mirrors the same palette
  as CSS variables and keeps the system font stack (a popup must open instantly). Its verified
  markers are the same bindu/open-ring semantics rendered in CSS.

## Verify, don't assume
- Extension: `cd extension && node --test` (pure logic in `core.js` is unit-tested; the whole
  service-worker pipeline — tracking, nudges, restarts — runs under a chrome stub in
  `background.test.js`). The agent harness cannot click the extension — hand the user a
  load-unpacked checklist. Nudge field debugging: `chrome.storage.local.get('nudge_diag')`
  in the SW console (see `extension/CLAUDE.md`).
- Web: `cd web && npx tsc --noEmit` then `npx next build`.
- Backend: Supabase MCP (SQL, logs, advisors) against project `sztvvvphpawuxvvmuddm`.
- Deploy: `cd web && npx vercel --prod --yes` (ships the working tree; aliases only on
  success). Verify the live alias after.

## Architecture facts that bite
- The server is the source of truth for focus data: `/api/focus/start` anchors start time,
  `/api/focus/stop` computes duration/quality from `domain_logs`. Clients never self-report.
- Session intelligence is the pure `web/lib/behavior.ts` (pattern-aware quality, honest
  reflection, baseline noticing) — tested via `node --test lib/behavior.test.mjs`. Signals
  stored in `focus_sessions.behavior` contain ZERO domains. Event order = (created_at, seq);
  the extension flushes before stop. Pattern logic changes go in that module WITH tests.
- LONGITUDINAL intelligence is the pure `web/lib/intelligence/` layer (Behavioral Intelligence
  System, 2026-07-03) — a slowly-evolving, domain-free per-user profile of traits/patterns that
  sits ON TOP of `behavior.ts` and the extension nudge, never replacing them. Cached in
  owner-only `behavioral_profiles` (migration 024) but ALWAYS rebuildable (`deriveProfile` = fold
  of `updateProfile`). EWMA (gradual, ≤ALPHA/session), user-vs-own-past only, confidence-gated
  (silent below `CONFIDENCE.speak`), every output carries evidence. Copy goes template →
  `validateMessage` → deliver; Claude is a DORMANT seam (`lib/intelligence/llm/`, off until
  `ANTHROPIC_API_KEY`, rephrase-only, re-validated). New behavioral logic goes in that module set
  WITH `.test.mjs` (cross-module value imports use `.ts` extensions). Full rules + phasing:
  `docs/DECISIONS.md` "Behavioral Intelligence System". Wired fail-safe into `/api/focus/stop`
  (`profile-store.ts`), the session page, and the dashboard "This week" line.
- `focus_sessions` RLS is OWNER-ONLY (migration 019). Squadmates read sessions exclusively
  through SECURITY DEFINER fns (`get_squad_feed`/`get_squad_live`/`get_squad_focused_today`)
  that expose who/active/verified/duration/intention only — never quality, percentages, or
  behavior. Do not add a squad SELECT policy back, and never widen the fns' columns.
- The only squad interaction is `encourage_session` (fixed phrases, one per member per
  session, all rules in SQL). No chat, no free text, no reaction feeds.
- Sessions are capped at 4h: `/api/focus/start` auto-abandons a forgotten active session,
  and the extension worker auto-ends its local session past the same cap.
- All extension state lives in `chrome.storage`; the MV3 worker dies at any time.
- Squad membership checks in RLS go through SECURITY DEFINER `is_squad_member` /
  `is_squad_admin` (never query `squad_members` inside its own policy — recursion).
- The legacy MindFuel product is DELETED (2026-07-02): its ten routes 307 → /dashboard via
  `next.config.ts` redirects. Do not resurrect manual logging, mood, coach, or streak
  surfaces — they contradict zero-manual-input and privacy.
- Subscription status is DERIVED, never stored: `web/lib/subscription.ts` computes
  active/trialing/free from `profiles.trial_ends_at` + `subscription_plan` (migration 016).
  No billing is wired YET; don't add gating or an upgrade CTA until payments ship.
- Payments: **Paddle as Merchant of Record** (founder is in Nepal — Stripe/Polar/Lemon
  Squeezy are impossible; Creem/Dodo are the fallbacks; payout rail is runtime-irrelevant,
  bank transfer preferred). FULLY WIRED and dormant until env config (2026-07-03):
  `lib/billing/` seam (adapter/service/gate), `lib/entitlement.ts` state machine (tested),
  `/api/billing/webhook` (HMAC + replay + idempotent event store, verified end-to-end in
  prod), `/api/billing/portal` (Paddle customer-portal session for manage/cancel),
  Paddle.js overlay checkout in Settings (`components/billing/CheckoutButtons.tsx`),
  migrations 020/021. **Two env-var classes**: SECRET server-only = `PADDLE_WEBHOOK_SECRET`
  (enables webhook), `PADDLE_API_KEY` (portal); PUBLIC client = `NEXT_PUBLIC_PADDLE_ENV`,
  `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY/YEARLY`, plus optional
  `NEXT_PUBLIC_PADDLE_DISCOUNT_MONTHLY` (founding offer: a Paddle discount id, dsc_…, for 50%
  off the FIRST month — pricing page + checkout mention it ONLY when set, so the UI can never
  promise a discount Paddle won't apply). Webhook
  answers 404 and checkout stays inert until set; price→plan resolves from the price-id env
  (no dashboard custom_data needed). Read `docs/payments-architecture-2026-07-02.md` + the
  DECISIONS entries before touching billing. Non-negotiables: cardless trial stays; only
  the webhook (service role) writes billing state; entitlement checks go through
  `entitlementOf`/`requirePremium` only; success redirects grant nothing; the extension
  never touches billing. Gating EXISTS as of 2026-07-08, deliberately scoped: POST
  /api/squads (HOSTING a circle) runs requirePremium, armed only while
  readPaddlePublicEnv().checkoutEnabled — with no client Paddle env nothing is gated, so
  nobody is ever locked out of an unpayable plan. Joining, encourage, and the user's own
  data stay free forever (DECISIONS "premium boundary", host-pays).
- The middleware (`web/proxy.ts`) is default-deny: any new public page must be added to its
  `isPublicRoute` list, and any new static file type to the static regex, or visitors get
  bounced to /login (this silently broke the PWA manifest once).
- Password reset flows through `/api/auth/callback?next=/reset-password` (server-side code
  exchange); the reset page requires the resulting session.
- In UI copy the words are "circle" (not squad) and "Activity" (not reminders); routes and
  DB tables keep the squad names.

## Security posture (see docs/security-review-2026-07-02.md + docs/DECISIONS.md)
- RLS is the authorization boundary (the browser hits Supabase directly with the anon key).
  Every new table MUST have RLS policies; route `getUser()` checks are defense in depth only.
- Service role (`createAdminClient`) is used narrowly — rate-limit RPC, ingest idempotency,
  ping delivery, aggregate COUNTs. Never use it to read user content (domain-only privacy
  applies to the owner admin panel too).
- Routes return GENERIC errors to clients; log detail server-side. Never return err.message.
- Client IP for rate limiting comes from `x-real-ip` (Vercel-set); never trust leftmost
  `x-forwarded-for`. See `lib/security.ts` getClientIP.
- Extension: least privilege, no npm deps, no externally_connectable. The token-bearing
  `SESSION_FROM_PAGE` message is origin-verified (sender.id + origin). Don't loosen either.
- DB migrations applied via MCP must also be captured as repo files in
  `web/supabase/migrations/NNN_*.sql` (latest: 023). 022 dropped the legacy MindFuel tables
  (`mental_logs`/`mood_logs`/`daily_summaries`/`habit_challenges`/`daily_pulses`) — those stay
  gone. 022 ALSO dropped `domain_logs.jitai_*`, which broke the DEPLOYED `/api/ingest` (it still
  inserts them) → 023 restored them. LESSON: never apply a destructive schema change before the
  code that stops depending on it is deployed (code-first, then DDL). Live tracking schema:
  `domain_logs`(domain, duration_s, category, seq, batch_id, created_at [+ dead jitai_* pending
  a post-deploy drop]) + `focus_sessions`.
- Known-accepted advisor WARNs: vector in public, waitlist anon INSERT, definer fns
  executable by authenticated (get_squad_by_invite, is_squad_member/is_squad_admin, and the
  019 squad-read/encourage fns — membership checks live INSIDE them), leaked-password
  toggle (owner dashboard action). Do not "fix" these without reading the review doc.
