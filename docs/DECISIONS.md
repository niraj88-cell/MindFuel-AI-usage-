# SatyaShift — Architectural Decisions (durable)

Newest first. Each entry is a decision that should not be silently reversed. For the dated
change log see `docs/project-status.md`; for the full security reference see
`docs/security-review-2026-07-02.md`.

## Design language: "a ledger of truth" (2026-07-03)

Full reference + audit: `docs/design-language-2026-07-03.md`. The enforceable summary lives
in `CLAUDE.md` ("Design language"). The prior interface shipped a 751-line unused
"Spider-Verse" dark CSS system, never loaded its declared fonts, and hand-copied ~15
Tailwind/Material default hexes across ~20 files — the exact catalogue of generic
AI-generated SaaS. Replaced with a first-principles system. Durable rules:

- **The identity is a quiet ledger:** warm paper (`#FAF8F4`), warm ink (`#23201B`), and one
  moss green (`#2D6A3F`) that appears ONLY where something was verified — verified state,
  live presence, the single primary action, and Satya's voice. Green is earned, never
  decoration. This is a permanent stance, not a palette that can drift back to accent-blue.
- **Color has ONE home:** `web/app/globals.css` `@theme` tokens, consumed as utilities
  (`bg-paper`, `text-ink`, `border-line`…). Raw hex in markup is a defect. The only exempt
  files are `global-error.tsx` + `maintenance/page.tsx` (render outside the token layer) and
  the extension's own CSS-variable palette blocks (no build step).
- **Typographic system is the brand, not an accent:** Instrument Sans (interface),
  Instrument Serif (Satya's voice + statement headings only), IBM Plex Mono (measured
  values + overline labels, tabular). Self-hosted via `next/font` in `layout.tsx`. Before
  this, the product had no loaded typeface at all.
- **Verification is marked by the brand's own bindu seal** (`components/brand/VerifiedMark`),
  never a stock lucide shield. Closed ring + filled center = verified; open hollow ring =
  unverified. Not color-only (shape + adjacent word + title), so it stays accessible.
- **Restraint is the aesthetic:** `rounded-xl`/`rounded-lg`/`rounded-full` only; no shadows
  (except the mobile drawer); depth from borders + surface color; motion only confirms
  (150ms transitions + one `.satya-breathe` presence dot, reduced-motion-safe).
- **Banned as generic-AI tells:** emoji, decorative icons, icon-in-tile card headers,
  three-icon feature grids, gradients, glassmorphism, dark surfaces (except the ink brand
  tile), sci-fi/marketing filler. Icons earn their place by comprehension only.
- Verified end-to-end 2026-07-03: `tsc` + `next build` (39/39) green, extension
  `node --test` green (38/38, popup DOM hooks preserved), live preview screenshots.

## Behavioral intelligence + squad privacy architecture (2026-07-02)

The product's edge is recognizing ATTENTION PATTERNS while staying domain-only. Durable
rules (implementation: `web/lib/behavior.ts`, migration 019, this date's status entry):

- **One pure module is the entire intelligence.** `web/lib/behavior.ts` turns the ordered
  (domain, category, duration) timeline into `BehaviorSignals` (switch rate, longest
  unbroken stretch, distraction bouts/returns, drift trend, recovery) and derives the
  quality label + the Satya reflection from those signals. It is dependency-free and
  unit-tested (`node --test lib/behavior.test.mjs`); new pattern logic goes THERE, with
  tests — never inline in routes or pages.
- **Stored signals contain zero domains.** `focus_sessions.behavior` (jsonb) holds counts,
  durations, and shares only — verified by test. The raw sequence stays in `domain_logs`
  under owner-only RLS. Never add a domain, a URL, or free text to the signals shape.
- **Honesty is asymmetric: pattern rules only ever DOWNGRADE a quality label.** A
  distraction loop diluted by neutral time must not read as praise; with zero distraction
  signal we do not downgrade on suspicion (a work-site hop is not "scatter"). Reflections
  state what happened; no flattery, no shame, no "should".
- **Learning = the user compared to their own recent sessions, derived at read time.**
  `noticeAgainstBaseline` needs 3+ verified sessions and returns at most ONE line, usually
  none. No profiles, no stored aggregates, no cross-user comparison — ever.
- **Event ORDER is part of measurement integrity.** `domain_logs.seq` preserves in-batch
  order (ids are random, created_at is per-batch); the extension flushes before
  /api/focus/stop so the verdict sees the final stretch. Don't break either.
- **Squadmates read sessions ONLY through SECURITY DEFINER functions** (`get_squad_feed`,
  `get_squad_live`, `get_squad_focused_today`); `focus_sessions` RLS is owner-only. RLS is
  row-level, so the old squad-arm SELECT policy leaked quality/percentages to any squadmate
  with devtools. What a circle sees is exactly: who, active/verified, duration, the
  member's own intention words, when. Never a quality label, percentage, or behavior.
  (These four fns join the accepted definer-executable advisor WARNs.)
- **The only squad interaction is a fixed-phrase encouragement** (`encourage_session`:
  membership + active-session + allowlist + one-per-member-per-session enforced in SQL).
  No chat, no free text, no reactions feed, no reciprocity mechanics. Delivered as a quiet
  notification + chips on the recipient's running focus screen.

## Intervention (nudge) reliability architecture (2026-07-02)

The gentle nudge is a core product promise; every stage of its pipeline must be either
provably working or loudly diagnosable. Durable rules (details in `extension/CLAUDE.md`):

- **The nudge is fully local.** It reads only the bare domain already being tracked, never
  needs the network or auth, and works offline / with Supabase down. Do not add a server
  dependency to the intervention path, and do not log nudge events server-side — the
  distraction TIME already lands in `domain_logs` via ingest; the intervention itself is
  private by design (trust over engagement).
- **Alarms self-heal on every worker wake.** `ensureAlarm()` runs at top level of the
  service worker (existence-checked, so it never resets a live countdown). Relying on
  onInstalled/onStartup alone is forbidden — a lost alarm silently killed nudges AND sync
  until a browser restart.
- **Delivery is verified, never assumed.** `chrome.notifications.getPermissionLevel()` is
  checked before firing; 'denied' is recorded and surfaced in the popup ("Gentle check-ins
  are muted"). A create() that renders nothing must never be indistinguishable from success.
- **The pipeline leaves evidence.** Every tick writes `nudge_diag` (storage.local); tick
  errors are caught and recorded, never swallowed. Integration tests (`background.test.js`)
  drive the real background.js through threshold, cooldown, grace, media exemption,
  SW/browser restarts, lost alarms, muted delivery, and click-through — keep them green.

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
  (≥30-day money-back) pages on the live site. (Shipped 2026-07-03.)

### Foundation implemented 2026-07-03 (dormant until PADDLE_* env vars exist)

- **The seam is `lib/billing/`** (types → paddle adapter → service → gate). Application
  code may import the service/gate/entitlement modules only; provider payloads and SDK
  shapes never leave the adapter. A provider swap = new adapter + env change.
- **Entitlement is derived in exactly one place:** `lib/entitlement.ts` (pure, tested)
  computes trial / active / grace_period / past_due / paused / cancelled / expired /
  lifetime from profiles + the webhook-written mirror. `lib/subscription.ts` delegates
  to it; future premium routes use `lib/billing/gate.ts` (`requirePremium`). Fail-closed:
  unknown provider states never grant access.
- **Webhook pipeline is synchronous ON PURPOSE (no queue/broker).** Verify (constant-time
  HMAC, ±5 min replay window) → event-store insert (PK dedupe; unprocessed rows are
  crash-recovery, completed on redelivery) → atomic SQL apply (`apply_billing_update`,
  service-role-only EXECUTE, out-of-order guard `occurred_at`) → mark processed. A 500
  makes the provider redeliver — the provider's retry schedule IS the queue. Do not add
  a broker without new evidence (volume) — it would only add failure modes.
- **`billing_events` has RLS enabled with NO policies — intentional** (service-role
  only; the advisor INFO is accepted). Users read `billing_subscriptions` (own row) only.
  Events store the NORMALIZED update, never raw provider payloads (no PII at rest).
- **Mission-checklist mapping (deliberate simplifications):** plans live in code
  (`PLANS`), not a table (a plans table drifts); entitlements are derived, not stored
  (migration-016 philosophy); `payment_providers` is a column, not a table;
  `webhook_events`/`audit`/`security` logs = `billing_events` + existing
  `security_audit_logs` + structured `auditLog`; feature_flags deferred (no use case).
- **Environments are configuration only:** `PADDLE_ENVIRONMENT` sandbox|production plus
  keys/ids in env (`.env.example`). Billing disabled ⇒ `/api/billing/webhook` answers
  404. The webhook route is exempt from the cookie-CSRF origin gate (HMAC-authed,
  machine-to-machine) — keep that exemption path-exact.

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
