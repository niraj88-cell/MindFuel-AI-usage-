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
- `.agents/AGENTS.md` — project context + mentoring rules (the user is a beginner:
  one step at a time, exact commands, no code dumps).

## Verify, don't assume
- Extension: `cd extension && node --test` (pure logic in `core.js` is fully unit-tested).
  The agent harness cannot click the extension — hand the user a load-unpacked checklist.
- Web: `cd web && npx tsc --noEmit` then `npx next build`.
- Backend: Supabase MCP (SQL, logs, advisors) against project `sztvvvphpawuxvvmuddm`.
- Deploy: `cd web && npx vercel --prod --yes` (ships the working tree; aliases only on
  success). Verify the live alias after.

## Architecture facts that bite
- The server is the source of truth for focus data: `/api/focus/start` anchors start time,
  `/api/focus/stop` computes duration/quality from `domain_logs`. Clients never self-report.
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
- Payments are DECIDED but not built (2026-07-02): **Paddle as Merchant of Record**
  (founder is in Nepal — Stripe/Polar/Lemon Squeezy are impossible; Creem/Dodo are the
  fallbacks). Read `docs/payments-architecture-2026-07-02.md` + the DECISIONS entry before
  writing ANY billing code. Non-negotiables: cardless trial stays; only the HMAC-verified
  webhook (service role) writes billing state; success redirects grant nothing; the
  extension never touches billing; `/terms` + `/refunds` pages must ship before Paddle
  verification.
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
  `web/supabase/migrations/NNN_*.sql` (latest: 018).
- Known-accepted advisor WARNs: vector in public, waitlist anon INSERT, get_squad_by_invite
  + is_squad_member/is_squad_admin executable by authenticated (used by RLS), leaked-password
  toggle (owner dashboard action). Do not "fix" these without reading the review doc.
