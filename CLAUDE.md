# SatyaShift — repo guide

SatyaShift is a privacy-first accountability platform. The Chrome extension
(`extension/`) IS the product: a passive, domain-only attention tracker. The web app
(`web/`, Next.js + Supabase, deployed to satyashift.vercel.app) supports it: deep-session
verification, squads, insights.

Principles: effortless deep work · quiet accountability · privacy by design (bare domains
only, never URLs/content) · trust over engagement · calm, premium UX.

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
  `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY/YEARLY`. Webhook
  answers 404 and checkout stays inert until set; price→plan resolves from the price-id env
  (no dashboard custom_data needed). Read `docs/payments-architecture-2026-07-02.md` + the
  DECISIONS entries before touching billing. Non-negotiables: cardless trial stays; only
  the webhook (service role) writes billing state; entitlement checks go through
  `entitlementOf`/`requirePremium` only; success redirects grant nothing; the extension
  never touches billing; no gating until you deliberately add it (then gate the social
  layer, never the user's own data).
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
  `web/supabase/migrations/NNN_*.sql` (latest: 019).
- Known-accepted advisor WARNs: vector in public, waitlist anon INSERT, definer fns
  executable by authenticated (get_squad_by_invite, is_squad_member/is_squad_admin, and the
  019 squad-read/encourage fns — membership checks live INSIDE them), leaked-password
  toggle (owner dashboard action). Do not "fix" these without reading the review doc.
