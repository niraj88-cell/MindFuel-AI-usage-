# Payment Readiness Report — 2026-07-14

Audit of the full Paddle payment stack ahead of opening to paying customers. Scope: frontend
checkout, webhook + service layer, entitlement engine, database, auth/authz, secrets,
rate limiting, transport, and Chrome-extension store compliance. Companion to
`docs/payments-architecture-2026-07-02.md` and the DECISIONS.md billing entries.

## Verdict

**The code and backend are production-ready. Go-live is gated on two things I could not
complete from here, both of which are yours to clear:**

1. **No `paddle-live` MCP is connected to this session.** Every Paddle-side action in the test
   script (create discount, drive upgrade/cancel lifecycle, verify transaction, archive) needs
   it. Connect it, or perform those steps in the Paddle dashboard.
2. **The production `NEXT_PUBLIC_PADDLE_*` client values could not be read by any tool
   available** (`vercel env pull` returns them blank; the Vercel MCP doesn't expose values; the
   build chunks that carry them are auth-gated). This is the expected behaviour of Vercel
   **Sensitive** env vars, and the history says they were set 11 days ago — but it must be
   confirmed, because if any is blank, checkout silently cannot open.

Nothing below grants access from the client, no payment can be forged, and the database is a
clean slate (0 events, 0 subscriptions, 45 trial users) — so a controlled live test is safe to
run once the two gates are cleared.

## Method

Read every file in `web/lib/billing/`, `web/lib/entitlement.ts`, the webhook/portal/dev-checkout
routes, `CheckoutButtons`, the profile billing UI, and migrations 016/020/021. Ran the unit
suites. Probed the live endpoints with hostile inputs (no real payment). Inspected live DB state
and RLS via the Supabase MCP. Checked env config via `vercel env pull` and the Vercel MCP.

## Architecture (as built)

- **Server is the sole source of truth.** The client (Paddle.js overlay) never grants
  entitlement; access flips only when Paddle's signed webhook reaches the backend. See
  `CheckoutButtons.tsx` trust-boundary comment.
- **Provider-agnostic seam.** Everything Paddle-shaped lives in `lib/billing/paddle.ts`; the
  rest of the app depends on canonical `BillingUpdate`/entitlement types. A provider swap is
  config, not a rewrite.
- **Entitlement is derived, never stored** (`lib/entitlement.ts`), a pure state machine over
  two server-owned facts: `profiles.trial_ends_at`/`subscription_plan` and the webhook-written
  `billing_subscriptions` mirror.

## Controls verified

### Webhook authenticity, replay, idempotency
- HMAC-SHA256 over `"<ts>:<rawBody>"` per Paddle's scheme, compared **constant-time**
  (`timingSafeEqual`); replay window (±300s) checked **after** authenticity so a prober can't
  distinguish "bad signature" from "stale". (`paddle.ts`)
- **Idempotent by construction:** `billing_events.event_id` is the primary key. A duplicate that
  was already processed acks 200; a duplicate that died mid-apply re-applies (the apply step is
  idempotent). (`service.ts`)
- **Out-of-order guard:** `apply_billing_update` only overwrites when
  `excluded.occurred_at >= bs.occurred_at`, so a late-delivered older event can't clobber newer
  state. (migration 020)
- **Storage failure → HTTP 500 → Paddle redelivers.** No broker needed; Paddle's retry schedule
  is the queue.
- **Unattributable events** (subscription event with no `user_id`) are audited at `critical` and
  acked (redelivery can't fix missing attribution).

Live probes (production, no state change):

| Probe | Result | Expected |
|---|---|---|
| POST webhook, no signature | 401 | ✓ |
| POST webhook, garbage signature header | 401 | ✓ |
| POST webhook, well-formed but wrong HMAC | 401 | ✓ |
| POST webhook, stale ts + wrong HMAC | 401 | ✓ |
| POST webhook, prototype-pollution body, no sig | 401 (rejected before parse) | ✓ |
| GET webhook | 405 | ✓ |
| POST webhook on old `*.vercel.app` host | 401 (not a 301 bypass) | ✓ |
| POST portal, no auth / no Origin | 403 (CSRF) | ✓ |
| POST portal, bogus bearer | 401 | ✓ |
| GET dev-checkout, anon | 404 (owner-gated, invisible) | ✓ |

### Entitlement state machine
`node --test lib/entitlement.test.mjs` → **16/16 pass**, covering trial, active, past_due→grace
→expire, paused, cancelled (paid period honoured), lifetime, and — critically — **fail-closed**:
an unknown mirror status can never grant premium.

### Authorization & secrets
- Portal and the `requirePremium` gate require an authenticated user (cookie or bearer) and read
  only the caller's own rows under RLS.
- `dev-checkout` is owner-email-gated and returns 404 to everyone else — invisible, grants
  nothing, GET-only.
- Secrets (`PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`) are server-only, never `NEXT_PUBLIC`, never
  logged; routes return generic errors. The Paddle API key never reaches the client (portal URL
  is minted server-side).

### Database
- `billing_events`: RLS enabled, **no policies** (service-role-only; the "RLS enabled, no policy"
  advisor INFO is intentional deny-all).
- `billing_subscriptions`: owner **read-only**; all writes go through `apply_billing_update`,
  which is `EXECUTE`-revoked from `anon`/`authenticated` (service role only).
- Migrations 020/021 match the live schema. Live state: 0 billing_events, 0
  billing_subscriptions, 45 profiles all on active cardless trials → the armed squad-host gate
  locks nobody out today.

### Rate limiting & transport
- Edge limiter: 300 req / 5 min per IP fingerprint on all `/api/*`; portal adds a per-user 30-call
  ceiling.
- HTTPS enforced; HSTS `max-age=31536000; includeSubDomains; preload`; production server calls go
  to `https://api.paddle.com` (sandbox base only when `NEXT_PUBLIC_PADDLE_ENV !== 'production'`).

## Lifecycle coverage (maps to your Paddle test script)

All handled in code; **none yet exercised against live Paddle** (that's the live test).

| Event / action | Handling | Entitlement outcome |
|---|---|---|
| Checkout completed → `subscription.created`/`activated` | mapped, plan from price-id map | `active` → premium |
| Renewal → `subscription.updated` | mirror refreshed, period extended | stays `active` |
| Upgrade / downgrade → `subscription.updated` | plan re-resolved from the new price id | plan switches, premium |
| Payment fails → `subscription.past_due` | status `past_due`, `occurred_at` = dunning start | `grace_period` (14 days) then `past_due` (access off) |
| Scheduled cancel (`effective_from: next_billing_period`) | `scheduled_change.action='cancel'` → `cancelAtPeriodEnd` | still `active`, access retained |
| Immediate cancel → `subscription.canceled` | status `canceled` | access until `current_period_end`, then `expired` |
| Pause → `subscription.paused` | status `paused` | access off |
| Duplicate / out-of-order redelivery | PK dedupe + occurred_at guard | no double-apply, no regression |

## Blockers before opening to customers

- **B1 — connect `paddle-live` MCP** (or use the Paddle dashboard) to run the live transaction +
  lifecycle test. Not connected in this session.
- **B2 — confirm the four `NEXT_PUBLIC_PADDLE_*` values are populated in Production.** Fastest
  check: log into the live site and open `/profile`. If you see the plan-chooser buttons
  ("Choose Monthly — $8/month"), `checkoutEnabled` is true and the env is set. If you see the
  greyed "Billing isn't switched on yet" cards, at least one value is blank → set it in
  Vercel → Settings → Environment Variables (Production) and redeploy. Confirm
  `NEXT_PUBLIC_PADDLE_ENV=production`, the client token starts `live_`, and both price ids start
  `pri_`.

## Only you can confirm (Paddle dashboard)

- Business / identity verification **passed** (checkout won't open until it is).
- Checkout domain **satyashift.com = approved**.
- The API key and webhook secret in Vercel are the **live** ones (not sandbox).
- The webhook destination in Paddle points to `https://satyashift.com/api/billing/webhook` and is
  subscribed to the seven `subscription.*` events the adapter handles.

## Safe live-test plan (once B1 + B2 are green)

1. You (or I, via the MCP) create a **100% discount** — a real $0 checkout, nothing to refund.
2. **You** complete one checkout on the live domain with a real card (I never enter payment
   details). Apply the code.
3. I verify via the Supabase MCP: `billing_events` has the row(s) and `processed_at` is set;
   `billing_subscriptions` shows `active` + the right plan; the entitlement helper returns
   `premium: true`.
4. Lifecycle: upgrade (immediate, `do_not_bill`), scheduled cancel (still active + pending),
   immediate cancel (`canceled`, access denied) — verifying the DB + entitlement after each.
5. Clean up: cancel the test subscription, **archive** the discount.

I will **not** execute the refund/adjustment path (it moves real money); if you choose it, you
run it in the dashboard.

## Residual risks

- **Live checkout is unproven end-to-end** — the headline risk; the plan above closes it.
- **`past_due` grace start** relies on Paddle stamping `occurred_at` on the `subscription.past_due`
  event (used as the dunning clock). Confirm during the live test; low impact (worst case is a
  slightly different grace start, still fail-closed after 14 days).
- **Founding discount env** (`NEXT_PUBLIC_PADDLE_DISCOUNT_MONTHLY`) is optional and unset — the UI
  correctly shows no offer, so it can't promise a discount Paddle won't apply.
- **`dev-checkout` scaffolding** remains by design; delete it in one commit once a real checkout
  is proven (per its own header).

## Extension / Chrome Web Store compliance

- **Manifest V3**, service-worker background, no persistent background page. ✓
- **No remotely hosted code.** Every `fetch` targets Supabase auth or the app's own API (data,
  not executable code); no `eval`, no `new Function`, no remote `import()`, no CDN `<script>`.
  The only `<script src>` is local `popup.js`. ✓
- **Least privilege.** `permissions`: storage, tabs, alarms, cookies, idle, notifications.
  `host_permissions`: satyashift.com, satyashift.vercel.app, localhost only — no `<all_urls>`. ✓
- **Domain-only privacy** is the product invariant (bare hostname only; never URLs, content, or
  keystrokes).
- **Remaining store-listing tasks (yours):** plain-language justification copy for the two
  sensitive permissions — `tabs` (read the active tab's hostname to count time per site) and
  `cookies` (read the SatyaShift session cookie to sign the extension in) — plus a privacy
  disclosure that matches the domain-only promise. The `satyashift.vercel.app` host permission and
  content-script match can be dropped after the extension audience is fully on 2.9.3 (kept now for
  the old-host transition).

## Bottom line

Backend: ready. Clear B1 and B2, confirm the four dashboard facts, then run the $0 live test —
I can verify the app + database side of every step. Until a real checkout is proven end-to-end,
do not advertise paid plans.
