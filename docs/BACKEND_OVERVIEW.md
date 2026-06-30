# SatyaShift — Backend Overview (Team)

Status: living document. Last verified against the live DB on 2026-06-28.
Brand note: migrating **MindFuel → SatyaShift**; code/domain still say `mindfuel` in places.

---

## 1. System shape

Four coordinated apps in one repo:

| Dir | What | Role |
|---|---|---|
| `web/` | Next.js 16 (App Router) | Backend API + dashboard |
| `MindFuel/` | Expo / React Native | Mobile companion (viewer-first) |
| `extension/` | Manifest V3 Chrome ext | Passive, domain-only tracker |
| `supabase/` | SQL migrations | Schema / RLS / functions |

**Stack:** Next 16.2 · React 19 · Supabase (Auth/Postgres/Realtime/Storage) · Vercel AI
SDK (Groq + Google Gemini) · Zod · Stripe · web-push. Upstash has been **retired** from
code (per-user rate limiting moved to Postgres). Prisma was declared but unused — removed.

## 2. Request lifecycle

Every request passes through `web/proxy.ts` (edge middleware):
1. **Global IP WAF** — in-memory sliding window (per-instance flood guard).
2. **CSRF** — mutating requests need a same-origin `Origin` **unless** they carry a
   `Bearer` token (immune to CSRF) or are the signature-verified Stripe webhook.
3. **Session refresh** + route protection (unauth → `/login`).
4. **Security headers** (plus full CSP/HSTS/COOP/COEP in `next.config.ts`).

## 3. Auth model

- **Web**: Supabase cookie session (`@supabase/ssr`).
- **Extension / mobile**: Supabase **JWT** as `Authorization: Bearer`.
- `lib/supabase/route-auth.ts → getUserContext(req)` resolves either into one
  **RLS-scoped** client. Use it for new user-facing routes.
- `createAdminClient()` (service role) is **server-only**, used only where RLS must be
  bypassed intentionally (e.g. calling `check_rate_limit`).

## 4. Data model (current/canonical)

| Table | Purpose | Privacy |
|---|---|---|
| `domain_logs` | Ambient domain visits (domain, duration_s, category, jitai_*) | **Owner-only**, never squad, never realtime |
| `focus_sessions` | The proof layer (status, duration_s, session_quality, distraction_pct) | Owner + squad members; realtime |
| `processed_batches` | Idempotency guard for extension batches (PK = batch_id) | Owner-only |
| `rate_limits` | Hourly per-user/endpoint counters | Owner-only; written by SECURITY DEFINER fn |
| `profiles` | Identity + prefs (coach_persona, timezone, jitai_threshold, soft-delete) | Owner full; squad sees id/name/avatar **only** (enforced in API) |
| `squads` / `squad_members` | Circles + membership (role, left_at) | Squad members only |
| MindFuel tables (`mental_logs`, `coaching_sessions`, `intercept_logs`, …) | Legacy | **Ignored** by SatyaShift; not dropped |

`focus_sessions` still carries legacy `mf_duration_minutes`/`mf_completed`; the generated
TS type also keeps stale `duration_minutes`/`completed` — **type debt, cleared in Phase E.**

## 5. Security layers (defense in depth)

- **RLS first** — verified: `domain_logs` owner-only; `focus_sessions` owner-or-squad
  (`left_at IS NULL`); `profiles` respects `deleted_at`.
- **Column filtering** — every squad endpoint returns only `id, full_name, avatar_url`
  from profiles (no email/PII). Verified across all squad routes.
- **Rate limiting** — Postgres `check_rate_limit(user_id, endpoint, max)` — atomic upsert
  increment, hourly window, self-guarded, **service-role-only** (locked down via advisor).
- **Input validation** — Zod on new routes (`/api/ingest`, `/api/focus/*`).
- **Secrets** — gitignored; `.env*` not committed. (VAPID keypair leaked in history →
  rotation pending — see §8.)
- Two CRITICAL squad bugs (role self-escalation; missing index) are **fixed and verified**
  in the live DB.

## 6. Core flows

**Ambient ingest** — `POST /api/ingest`
JWT → Zod-validated `{ batch_id, events[] }` → `check_rate_limit` → insert
`processed_batches` (PK dedupes retries) → insert **domain-only** `domain_logs`. Rolls
back the batch marker if the row insert fails.

**Focus proof** — `POST /api/focus/start` then `POST /api/focus/stop`
Start anchors `created_at` server-side. Stop computes **server-side**: `duration_s`
(start→now), `distraction_pct` + `session_quality` (from `domain_logs` in the window),
and `status` (completed/mixed/abandoned). No ambient signal ⇒ quality = `unverified`
(anti-gaming). Idempotent via `status='active'` guard.

**Squad** — `GET /api/squads` (supportive statuses, **no leaderboard**) ·
`GET /api/squads/[id]/feed` (recent focus sessions, RLS-gated). Realtime enabled on
`focus_sessions`.

## 7. Functions (SECURITY DEFINER, locked to least privilege)

`check_rate_limit` (service-role only) · `get_squad_by_invite` (authenticated only) ·
`is_squad_member` (RLS helper) · `handle_new_user` · `log_security_audit_event` (writes
`security_audit_logs`). MindFuel report fns (`calculate_daily_summary`,
`generate_weekly_report`) locked to service-role.

## 8. Known gaps / backlog

**Action items (carry real risk):**
- Rotate the leaked VAPID keypair (in git history) + set new keys in Vercel.
- Enable Supabase leaked-password protection (dashboard).

**Engineering debt:**
- No automated tests (RLS, ingest, focus integrity) — highest-value next.
- No error monitoring/observability beyond `console`.
- CI `npm run lint` red (~165 pre-existing MindFuel errors; doesn't block `next build`).
- API naming drift: locked spec says `/api/v1/...`, code is unversioned — reconcile.
- Manual-logging routes (`/api/quick-log`, `/api/log/save`) still live — cut over at
  extension launch (don't strand users before the extension ships).
- `focus/page.tsx` still inserts client-side with legacy columns — rewire to
  `/api/focus/start|stop` during the UI phase.
- Two migration folders + `vector` ext in `public` schema (low).

## 9. Verification posture

Build: `next build` green. Types: `tsc --noEmit` clean. DB security advisor: clean except
by-design (`get_squad_by_invite`, `is_squad_member`) and the pending leaked-password
toggle. All RLS/critical-fix claims in the locked schema doc were verified against the
live database, not taken on faith.
