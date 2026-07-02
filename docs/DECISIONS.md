# SatyaShift — Architectural Decisions (durable)

Newest first. Each entry is a decision that should not be silently reversed. For the dated
change log see `docs/project-status.md`; for the full security reference see
`docs/security-review-2026-07-02.md`.

## Payment architecture (2026-07-02 — decided, NOT yet implemented)

Full reasoning: `docs/payments-architecture-2026-07-02.md`. Supersedes the earlier
"Stripe webhook verification when payments ship" note (Stripe direct is impossible from
Nepal).

- **Paddle (Paddle Billing) is the Merchant of Record.** Nepal-eligible, zero
  setup/monthly/annual fees (pays only on successful transactions), 14-year track record,
  handles VAT/sales tax, chargebacks, and compliance as the legal seller. Payouts via
  Payoneer (or wire). Fallbacks if verification fails: Creem or Dodo Payments, behind the
  same provider seam (`lib/billing/`) — do not couple handlers to Paddle types outside it.
- **Paddle is the source of truth for PAID state; our DB holds a webhook-written mirror.**
  Only the signature-verified webhook handler (service role) may write billing tables or
  `profiles.subscription_plan`. Users have read-only RLS on their own row. A checkout
  success redirect never grants entitlement — only webhooks do.
- **Webhooks are HMAC-verified, replay-protected (timestamp tolerance), and idempotent**
  via an append-only `billing_events` table (PK event_id), the same pattern as ingest's
  `processed_batches`. Handlers must be safely re-runnable.
- **The trial stays cardless** (opt-in, 14 days, app-managed via `trial_ends_at`). No
  payment details before value; this is a brand decision as much as a funnel one.
- **Pricing: one plan, two periods.** $8/mo; standard annual $72 ("$6/mo, save 25%");
  $30 first-year founding offer, honestly labeled, renews at $72 with advance notice.
  No tiers, no seats. No fake urgency, no countdown theatrics, cancel is one click
  (Paddle portal).
- **When gating ships, the social layer gates — never the user's own data.** Export stays
  free forever; the extension and popup never touch billing code.
- **Prerequisite before Paddle verification:** public `/terms` and `/refunds`
  (≥30-day money-back) pages on the live site.

## Security architecture (2026-07-02)

- **RLS is the authorization boundary, not the API layer.** The browser talks to Supabase
  directly with the anon key, so every table must have correct RLS. Route-handler
  `getUser()` checks are defense in depth, not the primary control. Never ship a table
  without RLS policies.
- **Service role is used narrowly and never for reading user content.** `createAdminClient()`
  is only for: the rate-limit RPC, the ingest idempotency marker, ping notification
  delivery, and aggregate COUNTs. The owner admin panel shows counts only — it must never
  read domains or session content (domain-only privacy applies to the owner too).
- **The extension holds least privilege and stays dependency-free.** Permissions are
  `storage, tabs, alarms, cookies, idle, notifications` + our own host only. No
  `externally_connectable`, no broad host access, no npm packages. Adding any of these
  requires a written justification here.
- **Token handoff is origin-verified.** The only untrusted extension message
  (`SESSION_FROM_PAGE`, which carries a session) is accepted only when
  `sender.id === chrome.runtime.id` AND the sender origin is our app. Keep this guard on any
  future message that carries credentials.
- **Client IP comes from `x-real-ip` (Vercel-set), never leftmost `x-forwarded-for`.**
  The latter is client-controllable and would let attackers evade/poison per-IP limits.
- **Errors are generic to the client, detailed in server logs.** No route returns
  `err.message` to callers.
- **Uploads are constrained in two places.** The `squad_photos` bucket enforces a 5 MB cap
  and an image-only MIME allowlist; the route re-validates and picks the filename in the
  user's own folder. Never trust a client-supplied filename or content type alone.
- **CSRF: Bearer-authed requests are exempt from the origin gate** (they can't be forged
  cross-site); everything cookie-based must be same-origin.

## Product architecture (carried from prior sessions)

- **The legacy MindFuel product is deleted** (2026-07-02, Phase 0). Its routes 307 →
  `/dashboard`. Do not reintroduce manual logging, mood, coach, or streak/leaderboard
  surfaces — they contradict zero-manual-input and domain-only privacy.
- **Subscription status is derived, never stored** (`lib/subscription.ts` from
  `trial_ends_at` + `subscription_plan`). No billing is wired; no gating until it is.
- **The server is the source of truth for focus data.** `/api/focus/start` anchors the
  start; `/api/focus/stop` computes duration/quality from `domain_logs`. Clients never
  self-report focus.
- **Squad model has no scores, streaks, or leaderboards.** This is a permanent product
  stance, not an omission. The orphaned dark `SquadDashboard` cluster (includes a
  leaderboard) is slated for delete-or-rebuild in Phase 2 and must not be wired in as-is.
- **UI vocabulary is "circle" and "Activity"; routes and DB keep the squad names.**
