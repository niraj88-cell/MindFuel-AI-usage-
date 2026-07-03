# SatyaShift — Payment Architecture (decided 2026-07-02, NOT yet implemented)

Status: **architecture approved, implementation deferred.** This document is the outcome of
a research → challenge → compare → recommend → verify pass. Nothing here is wired; the
Stripe webhook line in older docs is superseded. Durable one-liners live in
`docs/DECISIONS.md`; this file is the full reasoning.

Constraints that shaped everything: solo founder **based in Nepal** (no Stripe, no PayPal
business receiving), customers in US/UK/EU, privacy-first subscription SaaS ($8/mo), and
the priority order security > customer trust > simplicity > low ops burden > scalability.

---

## 1. Architecture comparison

The Nepal constraint eliminates half the field immediately. A Merchant of Record (MoR) is
not merely preferred — for a Nepal-based solo founder it is effectively the only way to
sell subscriptions to US/UK/EU with cards, Apple Pay, and correct VAT/sales tax, because
the MoR is the legal seller and the founder never needs a US/EU merchant entity.

| | Paddle | Dodo Payments | Creem | Polar | Lemon Squeezy | Stripe direct | Stripe Atlas (US LLC) |
|---|---|---|---|---|---|---|---|
| Nepal seller eligibility | **Yes** (not on unsupported list) | Yes | Yes (86-country payout list incl. Nepal) | **No** (Stripe Connect Express list) | **Effectively closed** (folding into invite-gated Stripe Managed Payments) | **No** (Stripe has no Nepal) | Yes via US entity |
| Maturity / track record | ~14 yrs, thousands of SaaS sellers, SOC 2 | Founded ~2024 | Founded ~2023–24 | Young | Acquired 2024, sunsetting into Stripe MP | — | Mature |
| MoR (tax/VAT, chargebacks, compliance) | Yes, 200+ jurisdictions | Yes | Yes | Yes | Yes | **No — you are the merchant** | No — your LLC is the merchant |
| Subscriptions + trials + annual | Full (Paddle Billing) | Yes | Yes | Yes | Yes | Yes | Yes |
| Apple Pay / Google Pay | Yes (hosted/overlay checkout) | Yes | Yes | Yes | Yes | Yes | Yes |
| Fees (headline) | 5% + $0.50 | 4% + $0.40, **+1.5% intl, +0.5% subscription** | 3.9% + $0.40 (+payout fee ≥ $7 or 1%) | 4% + $0.40 | 5% + $0.50 (as Stripe MP) | 2.9% + $0.30 + tax stack you must build | 2.9% + $0.30 + LLC costs |
| Setup / monthly / annual platform fee | **$0 / $0 / $0** | $0 (payout fee $5 under $1k) | $0 (payout fee ≥$7 or 1%) | $0 | $0 | $0 | Atlas ~$500 + ~$300+/yr franchise tax/agent + US tax filings |
| Payout to Nepal | Wire or **Payoneer** (works in Nepal, NPR withdrawal) | Yes (FX on non-USD) | Local bank transfer | — | — | — | US bank → Nepal transfer, self-managed |
| Webhooks/API/docs | Mature, signed webhooks, good docs, official SDKs | Decent, young | Decent, young | Good | Frozen | Best-in-class | Best-in-class |
| Platform risk (they hold your revenue) | Low | **Higher** (young company, your money in their custody) | **Higher** | — | High (product in transition) | — | Low |

Fee reality at OUR price points (the fixed cent-fee dominates at $8):

- $8 monthly charge → Paddle $0.90 (11.3%) · Creem $0.71 (8.9%) · Dodo intl+sub $0.88 (11.0%)
- $30 annual charge → Paddle $2.00 (6.7%) · Creem $1.57 · Dodo $2.20

The spread between the "cheap" newcomers and Paddle is **$0.02–$0.19 per transaction** at
our prices. That difference does not buy back the platform risk of a one-to-two-year-old
company being the legal seller of record and custodian of all revenue.

## 2. Final recommendation

**Paddle (Paddle Billing) as Merchant of Record.**

- Eligible for a Nepal-based sole proprietor; payout method is Paddle's concern and
  runtime-irrelevant (preferred: direct bank transfer where Paddle supports it; other rails
  as offered). Zero setup / monthly / annual fees — Paddle earns only on successful payments,
  exactly matching the cost requirement.
- It is the most battle-tested MoR that will take us: 14 years, SOC 2, the default choice
  of indie SaaS. For priorities #1 (security) and #2 (customer trust), checkout provenance
  matters: buyers' statements say Paddle, disputes are handled by a party banks recognize,
  and EU VAT/US sales tax are Paddle's legal problem, not ours.
- Hosted/overlay checkout with cards + Apple Pay + Google Pay, hosted customer portal
  (self-serve cancel/update card — a trust feature and an EU expectation), signed webhooks,
  stable API. Lowest long-term operational burden of any option available to us.

The keep-warm fallback is **Creem or Dodo** (both Nepal-eligible): if Paddle's verification
rejects us, the architecture below is deliberately provider-shaped, not Paddle-shaped — an
abstraction seam (`lib/billing/`) keeps the webhook handler and entitlement model portable.

## 3. Trade-offs accepted

- **~5%+$0.50 vs ~3%** of a direct processor: this is the price of not being able to use a
  direct processor at all from Nepal, plus tax/chargeback/compliance outsourcing we could
  not self-operate responsibly as a solo founder.
- **Revenue custody**: MoR holds funds until payout (Paddle pays monthly, threshold-based).
  Mitigated by choosing the oldest provider; payout rail (bank transfer where supported) is
  a banking detail, not an architectural one.
- **Checkout is Paddle-branded** ("order processed by Paddle.com"): mild brand dilution,
  but it is also the trust signal that makes a small unknown product safe to buy from.
- **Verification friction upfront**: Paddle requires a live HTTPS site with Terms,
  Privacy, and a **≥30-day money-back refund policy** before approval. We must ship
  `/terms` and `/refunds` pages first (see roadmap). This is work we should do anyway.

## 4. Security review (design, enforced at implementation)

- **Backend source of truth.** Paddle is authoritative for PAID state; our DB holds a
  *mirror* written exclusively by the verified webhook handler using the service role.
  The client can read its own entitlement, never write any billing field (RLS: no
  INSERT/UPDATE policies for users on billing tables). Success-redirect pages NEVER grant
  entitlement — only webhooks do.
- **Webhook verification.** `/api/billing/webhook` verifies Paddle's `Paddle-Signature`
  (HMAC-SHA256 with the webhook secret) and rejects on mismatch with a generic 401.
  Timestamp tolerance (±5 min) defeats replay of captured payloads.
- **Idempotency + replay protection.** Every event's `event_id` is inserted into
  `billing_events` (PK on event_id) before processing — a duplicate delivery is a no-op,
  the same pattern as ingest's `processed_batches`. Handlers are written to be safely
  re-runnable; out-of-order events resolve by comparing `occurred_at` against the stored
  row before overwriting status.
- **Entitlement management.** One derived function (extending `lib/subscription.ts`)
  computes status from `trial_ends_at` + the webhook-mirrored subscription row. No route
  or component computes entitlement independently.
- **Subscription state machine.** `trialing` (app-managed, cardless) → `active` →
  `past_due` (dunning grace, entitlement retained) → `canceled` (retained until
  `current_period_end`) → `free`. Every transition originates from a named Paddle event;
  unknown events are logged and ignored, never guessed at.
- **Secret management / least privilege.** Server-side env only: `PADDLE_API_KEY`
  (used for nothing the webhook can provide — prefer webhook-driven state),
  `PADDLE_WEBHOOK_SECRET`. Client gets only the publishable client token. No secrets in
  the extension — the extension never talks to billing at all.
- **Audit logging.** `billing_events` is append-only (raw event id, type, subscription id,
  occurred_at, processed_at) — a replayable history of every state change. No card data
  ever touches us (PCI stays entirely inside Paddle).
- **Fraud/chargebacks.** MoR-owned: Paddle runs risk screening and eats the dispute
  process. Our job is honest product pages and a discoverable refund path (reduces
  chargebacks, which MoRs punish).
- **API boundary.** The CSRF origin gate already covers cookie-authed POSTs; the webhook
  route is signature-authed (exempted from CSRF like Bearer routes, gated by HMAC instead).
  Rate limiting via the existing edge WAF; generic errors per house rule.

## 5. Customer journey (evidence-based, no dark patterns)

Current funnel already matches the target shape; payments add exactly two touchpoints:

Landing → Install → Account → **trial starts automatically, no card** (already live,
migration 016) → value (verified sessions, circle presence) → *quiet upgrade moment* →
paid, friction-free.

- **Cardless opt-in trial (kept).** Evidence: opt-in trials produce more signups with
  lower trial→paid (~8–25%) vs card-required opt-out (~40–60% of far fewer trials).
  For a trust-positioned product, asking for a card before demonstrating value
  contradicts the brand; total paid volume is comparable, and zero surprise charges is
  itself risk reversal. This was already the founder's decision — research confirms it.
- **Value before price.** No pricing interruption during the trial. From day 11
  (3 days left), one calm banner on Today: "Your trial ends in 3 days — keep your circle
  going for $8/mo." No countdown theatrics, no fake scarcity.
- **Transparent annual framing.** Show monthly-equivalent math ("$6/mo billed yearly —
  save 25%") and label the launch price honestly ("Founding price: first year $30,
  renews at $72 — we'll email you before renewal").
- **Trust signals at checkout**: the privacy line ("domain-only, always"), "cancel
  anytime in one click" (Paddle portal), "30-day money-back guarantee" (required by
  Paddle anyway — make it a feature), and Paddle itself as the recognizable processor.
- **Trial end is honest, not hostage-taking.** Data export stays free forever; nothing
  the user created is ever locked away. What exactly gates at `free` is a founder product
  decision at implementation time; recommendation: solo verification stays free (extension
  + Today, short history), the social layer (circle) and long history are paid — the paid
  value maps to the product's actual hook.

**Pricing recommendation** (update `PLANS` at implementation):

- Monthly **$8** (unchanged).
- Standard annual **$72** ("$6/mo billed yearly", 25% off — inside the 15–30% discount
  band that SaaS pricing research consistently supports; deeper permanent discounts
  devalue the product and pull annual buyers who would have paid monthly).
- **$30 first-year founding offer** (already in migration 016): keep, but time-boxed,
  clearly labeled as launch pricing, renewing at $72 with an advance renewal email.
  Grandfathering forever at $30 is NOT recommended — honest one-year framing instead.
- One plan, two billing periods. No tiers, no seats, no add-ons. Simplicity converts.

## 6. Subscription flow

1. Upgrade entry points: Settings → Plan (exists) and the day-11 Today banner.
2. `/upgrade` (or Plan section) renders two prices; "Continue" opens **Paddle overlay
   checkout** (Paddle.js, client token) with `customData: { user_id }` and the account
   email prefilled.
3. Payment succeeds → Paddle fires `subscription.created`/`transaction.completed` →
   webhook verifies, dedupes, writes the mirror row, sets `profiles.subscription_plan` →
   entitlement flips server-side. The success screen just says "you're in" and links back;
   it grants nothing.
4. Lifecycle: renewals refresh `current_period_end`; failures → `past_due` (Paddle
   dunning retries, we keep entitlement through grace); cancels → `canceled`, entitlement
   until period end, then `free`. Refunds → immediate revoke via webhook.
5. Manage/cancel: link to Paddle's hosted customer portal from Settings. One click, no
   email-us-to-cancel, ever.

## 7. Backend architecture

- `lib/billing/` — provider seam: `verifySignature()`, `mapEventToState()`, types. Paddle
  specifics live only here (portability to Creem/Dodo if ever needed).
- `/api/billing/webhook` (POST, nodejs runtime) — signature check → `billing_events`
  dedupe insert → state mapping → service-role write to `billing_subscriptions` +
  `profiles.subscription_plan` → 200. Generic errors, detailed server logs.
- `lib/subscription.ts` — extended: `active` requires a live mirror row (or grace);
  `trialing`/`free` derivation unchanged. Still one function, still derived.
- No billing code in the extension. The popup never knows about money.

## 8. Database changes (future migration 019 — NOT applied)

- `billing_subscriptions`: `user_id (PK, FK profiles)`, `provider` ('paddle'),
  `provider_customer_id`, `provider_subscription_id`, `plan`, `status`
  (active|past_due|canceled), `current_period_end`, `updated_at`, `occurred_at` (for
  out-of-order guards). RLS: owner SELECT only; writes service-role only.
- `billing_events`: `event_id (PK)`, `type`, `subscription_id`, `payload_digest`,
  `occurred_at`, `processed_at`. Append-only audit + idempotency. RLS: no user access.
- `profiles.subscription_plan` stays as the fast entitlement cache, written only by the
  webhook handler (today it is NULL for everyone).

## 9. API changes (future)

- New: `POST /api/billing/webhook` (HMAC-gated).
- New (small): `GET /api/billing/portal` — server creates a Paddle portal session for the
  signed-in user (keeps provider IDs out of the client).
- Unchanged: everything else. No route starts checking entitlement until the gating
  decision ships (per existing rule: no gating until payments exist — and then only the
  chosen gates).

## 10. Implementation roadmap (each step independently shippable)

1. **Pre-approval (web only):** ship `/terms` and `/refunds` (≥30-day money-back) pages,
   public in `proxy.ts`, linked in the footer next to `/privacy`. Needed for Paddle
   verification and simply owed to users.
2. **Paddle account + verification:** sign up as Nepal sole proprietor, verify domain
   satyashift.vercel.app (or the custom domain if one lands first — do domain before
   Paddle if both are planned), business + payout verification (direct bank transfer where
   supported). Sandbox keys.
3. **Backend:** migration 019, `lib/billing/`, webhook route against **Paddle sandbox**,
   `lib/subscription.ts` extension + tests.
4. **Checkout UI:** Plan section upgrade flow + `/upgrade`, overlay checkout, portal link,
   day-11 banner. Copy per §5.
5. **Go live:** swap sandbox→live keys, end-to-end test with a real card ($8 then refund),
   verify webhook → entitlement → portal cancel loop. Only then decide + ship gating.

## 11. Risk assessment

- **Paddle rejects verification** (medium): mitigation — compliance pages first, honest
  product description; fallback Creem/Dodo behind the same seam.
- **Payout friction in Nepal** (low-medium): confirm the chosen Paddle payout rail (direct
  bank transfer where supported) and NPR settlement before go-live. Runtime-irrelevant.
- **MoR platform/custody risk** (low for Paddle): monthly payouts bound exposure.
- **Webhook bugs corrupt entitlement** (engineering): bounded by idempotent, replayable
  handlers + `billing_events` audit (can rebuild the mirror from history), sandbox first.
- **Trial-abuse / multi-account** (low, accepted): cardless trials invite re-signups;
  at $8 the fraud surface is tiny. Do not add invasive fingerprinting — contradicts brand.
- **Nepal FX/legal** (founder-owned): declare Paddle payout income per Nepal rules; out of
  codebase scope but noted so it is never a surprise.

## 12. Rejected alternatives (and why)

- **Stripe direct** — Stripe does not onboard Nepal merchants. Even via workarounds it
  would make us the merchant of record for EU VAT/US sales tax: unacceptable solo burden.
- **Stripe Atlas US LLC** — eligibility solved, but imports a permanent second-country
  legal existence: ~$500 setup, Delaware franchise tax + agent yearly, US federal filings
  (1120 + 5472; $25k penalty class for mistakes), banking/KYC as a non-resident. Maximum
  operational burden for a solo founder; contradicts priorities 3–5.
- **Polar** — Nepal not in its Stripe-Connect-derived payout list. Hard no.
- **Lemon Squeezy** — dissolving into Stripe Managed Payments (public preview, invite-only
  as of early 2026) whose seller eligibility follows Stripe countries → no Nepal path, plus
  transition-period product risk.
- **Creem / Dodo Payments** — genuinely eligible and cheaper on paper (§1 math: ~2–19¢ per
  transaction saved), but both are very young companies that would hold all revenue and be
  our legal seller. Fails the security>trust>simplicity ordering today; kept as named
  fallbacks behind the provider seam.
- **FastSpring** — mature MoR, but pricing is opaque/quote-based at small scale and the
  developer experience is dated; nothing it does better than Paddle for us.
- **Gumroad / Ko-fi class** — 10%+ fees, not subscription-SaaS-grade entitlement APIs.

## Challenge log (the recommendation attacked before acceptance)

- *"Cheapest MoR (Creem/Dodo) instead?"* Rejected: at $8 the delta is cents; custody +
  maturity dominate. Revisit only if Paddle rejects us.
- *"Simpler: skip webhooks, poll Paddle's API nightly?"* Rejected: stale entitlement up to
  24h, no audit trail, still needs auth handling. Webhooks + idempotency table is the same
  pattern we already run for ingest.
- *"Simpler still: store nothing, check Paddle API per request?"* Rejected: latency +
  availability coupling on every page load; violates local-derivation philosophy.
- *"Require card at trial to lift conversion?"* Rejected on brand and ethics; evidence
  says volume compensates; founder already decided cardless.
- *"Grandfather $30 forever as reward?"* Rejected: unsustainable unit economics at 6.7%
  fee load and devalues the product; honest first-year framing instead.
- *"Gate the tracker itself when free?"* Rejected: holding a privacy tool's own data
  hostage would poison the trust the whole product is built on. Gate the social layer.
- Remaining possible simplification reviewed: none found with high value — the design is
  one webhook route, one mirror table, one audit table, one derived function.
