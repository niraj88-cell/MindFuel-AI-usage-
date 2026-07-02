# SatyaShift — Security Architecture Review (2026-07-02)

Full defense-in-depth review of every layer. Grounded in the real code, the live Supabase
project (`sztvvvphpawuxvvmuddm`), and the Vercel deployment. Every finding below was
verified against the running system; fixes were re-tested before acceptance. This document
is the canonical security reference; `docs/project-status.md` has the dated change log and
`docs/DECISIONS.md` has the durable decisions.

---

## 1. Threat model

### Trust boundaries
1. **Browser ↔ Extension service worker** — MV3 worker, `chrome.storage`, message passing.
2. **Extension ↔ Web app page (bridge.js)** — content script on our own origin reads the
   Supabase auth cookie and forwards it to the worker.
3. **Extension/Web client ↔ Backend API** — Next.js route handlers on Vercel.
4. **Backend ↔ Supabase** — anon-key (RLS-scoped) vs service-role (RLS-bypassing) clients.
5. **Client ↔ Supabase directly** — the browser SDK talks to Supabase with the anon key;
   RLS is the real access-control boundary, not the API layer.
6. **Platform** — Vercel edge/middleware, environment variables, build pipeline.

### Sensitive assets
- Supabase **service-role key** (full DB bypass) — server-only env var.
- User **session tokens** (access + rotating refresh) — in cookies and extension storage.
- **VAPID private key** (push) — server-only (rotated once already, see history).
- User data: bare domains + durations (`domain_logs`), focus sessions, circle membership,
  email. By design there is **no** page content, URL, or keystroke data.

### Privileged components
- `createAdminClient()` (service role) — used narrowly: rate-limit RPC, ingest idempotency
  marker, ping notification delivery, admin stats COUNTs.
- Postgres `SECURITY DEFINER` functions: `check_rate_limit` (service-role only),
  `is_squad_member`/`is_squad_admin` (authenticated, used by RLS), `get_squad_by_invite`
  (authenticated join path), `handle_new_user`, summary/report fns (service-role only).

### Primary attack surfaces
Web API routes; the direct Supabase REST/Realtime endpoint (RLS-gated); the extension
message surface; the public `squad_photos` bucket; auth flows (login, OAuth callback,
password reset); the waitlist INSERT (public by design).

### High-risk workflows
Ambient ingest (`/api/ingest`), focus session start/stop (proof integrity), squad pings
(cross-user notification), password reset (account takeover), file upload (stored XSS).

### Single points of failure
Supabase (DB + auth + storage + realtime); Vercel (hosting + middleware + env);
the service-role key (compromise = full data access).

---

## 2. Security architecture review (by layer)

**Authentication** — Supabase Auth (email/password + Google OAuth). Passwords never touch
our code. The extension never handles credentials; it reuses the web session via the
cookie bridge and refreshes with the rotating refresh token. OAuth callback exchanges the
code server-side. **Sound.**

**Authorization** — Two enforced layers: (a) route handlers check `getUser()`; (b) RLS on
every table is the true boundary. Verified RLS on `domain_logs` (owner-only),
`focus_sessions` (owner-or-active-squad-member), `squad_checkins/reactions/missions/pings`
(membership-gated via `is_squad_member`, pings additionally require the recipient be a
co-member). Admin routes gated by a hard-coded owner email allowlist. **Sound.**

**Session management** — Short-lived access token + rotating refresh token. Extension
serializes refresh with a Web Lock so it never double-spends a rotating token. Cookies are
Supabase-managed (SameSite/secure in prod). **Sound.**

**CSRF** — `proxy.ts` requires a same-origin `Origin` header on all mutating API requests
except Bearer-authenticated ones (extension/mobile — immune to CSRF since the attacker
can't set the Authorization header). Verified live: unauthenticated `POST /api/ingest`
with no origin → 403. **Sound.**

**Transport / headers** — `next.config.ts` sets HSTS (preload), CSP, `X-Content-Type-
Options: nosniff`, `X-Frame-Options: DENY` + `frame-ancestors 'none'` (clickjacking),
COOP/CORP/COEP, and a restrictive Permissions-Policy. **Strong**, with one residual (CSP
`'unsafe-inline'`, §5).

**Rate limiting** — Two tiers: an in-memory per-IP WAF at the edge (`proxy.ts`) and a
Postgres `check_rate_limit` per-user limiter (service-role only, atomic) on ingest, focus,
and pings. IP source hardened this pass (§3).

**Input validation** — Zod schemas on ingest, pings; domain normalization strips URLs to
bare host; upload MIME/size validated server-side + at the bucket. Prompt-injection/XSS
helpers exist in `lib/security.ts` (legacy AI paths now deleted, so mostly dormant).

**Idempotency / replay** — Ingest is idempotent by `processed_batches` primary key; the
extension persists the `batch_id` across retries. Focus start is guarded against double
active sessions.

**Extension (MV3)** — Permissions: `storage, tabs, alarms, cookies, idle, notifications` +
host permission for our own origin only. No `webNavigation`, no `scripting`, no broad host
access, no `externally_connectable`. Content script runs only on our origin and reads only
the `sb-*-auth-token` cookie. Message surface now hardened (§3). **Least privilege honored.**

**Logging** — Server logs counts, never domains or content. Errors log server-side and
return generic messages (leaks fixed this pass). A `security_audit_logs` table persists
auth/security events via DB trigger.

**Payments** — No processor wired. Subscription state is derived, never stored; no billing
code path exists to attack (see Phase-0/1 work). When Stripe is added: webhook signature
verification + replay/idempotency guard are required (tracked in §4 roadmap).

---

## 3. Findings & fixes (this pass — all verified)

| # | Sev | Finding | Fix | Verification |
|---|-----|---------|-----|--------------|
| 1 | HIGH | `/api/admin/stats` queried columns dropped in Phase 0 → 500 + leaked raw DB error to admin; also exposed `mental_logs` **content** in an admin feed (violates domain-only) | Rewrote to live schema; service role used for COUNTs only; removed content feed; generic errors | `tsc`/build green; live unauth → 401 `{"error":"Unauthorized"}` |
| 2 | MED | `getClientIP`/`getRequestFingerprint` trusted client-controllable leftmost `x-forwarded-for` → edge rate-limit evasion/poisoning | Prefer Vercel `x-real-ip` (unspoofable); fall back to last XFF hop | code review; build green |
| 3 | MED | `/api/push/subscribe` returned `err.message` to client | Generic error, detail logged server-side | live unauth → 401 |
| 4 | MED | Extension `SESSION_FROM_PAGE` accepted a token with no sender validation | Enforce `sender.id === runtime.id` AND origin ∈ {prod, localhost} before storing | 21/21 tests; syntax-checked |
| 5 | MED | `squad_photos` upload: client-controlled filename/ext, root path; relied solely on bucket for MIME/size | Server-side MIME allowlist + size cap + server-chosen name in `${uid}/` folder | build green |
| 6 | LOW | `is_squad_admin`/`is_squad_member` executable by `anon` via RPC | Revoked anon + PUBLIC EXECUTE (migration 017); authenticated retained for RLS | advisor re-run: anon finding cleared |
| 7 | LOW | Two permissive `squad_photos` INSERT policies; loose one overrode per-user folder scoping | Dropped loose policy (migration 018) | policy list re-queried |

**Confirmed NOT vulnerable (checked, no change needed):** squad_pings cross-user spam
(RLS requires sender + recipient co-membership); ingest auth/idempotency/rate-limit;
focus start/stop ownership; CSRF gate; squad checkins/missions membership RLS; OAuth
callback; forgot-password (no enumeration, fingerprint rate-limited).

---

## 4. Risk ranking (current state, after fixes)

- **Critical:** none open.
- **High:** none open. (Finding #1 fixed.)
- **Medium (residual):** CSP `'unsafe-inline'` in `script-src` weakens XSS containment.
- **Low / accepted:** `vector` extension in `public` schema; `waitlist` anon INSERT
  (intended public form, has its own rate limiting at the edge); `get_squad_by_invite`
  callable by authenticated (the join path — brute-force of 6-char codes is the residual,
  mitigated by edge rate limiting); leaked-password protection disabled (needs a Supabase
  dashboard toggle — owner action); legacy `mental_logs` table still present with old
  content rows (unused by code; a data-minimization cleanup, not an access hole).

---

## 5. Residual risks (accepted, with rationale)

1. **CSP `'unsafe-inline'` scripts.** Next.js App Router injects inline bootstrap scripts;
   a strict nonce-based CSP is a larger, higher-risk migration. XSS is contained by other
   controls (React auto-escaping, no `dangerouslySetInnerHTML` on user data, no user HTML
   rendered, nosniff, framing denied). Path forward in §6.
2. **Invite-code brute force.** `get_squad_by_invite` lets any authenticated user test
   codes. 6-char space + edge rate limiting makes this slow; impact is limited to joining a
   circle (which only ever exposes verified time, never domains). Acceptable for now.
3. **Service-role key blast radius.** Compromise of the Vercel env var = full DB access.
   Mitigated by Vercel secret storage, no client exposure, and narrow usage. Rotation is a
   manual runbook item.
4. **Legacy `mental_logs` content at rest.** Pre-pivot content rows remain. No code reads
   them for display anymore. Recommend a drop once export legacy branch is retired.
5. **Single-provider dependency (Supabase/Vercel).** No multi-region failover; accepted at
   current scale.

---

## 6. Security roadmap (future hardening, prioritized)

1. **Strict CSP with nonces** (removes `'unsafe-inline'`) — the highest-value remaining
   web hardening.
2. **Enable Supabase leaked-password protection** (dashboard toggle — owner).
3. **Rotate the service-role key** on a schedule; document the runbook.
4. **When payments ship:** Stripe webhook signature verification + event idempotency table
   + never trust client-sent price/plan.
5. **Drop legacy `mental_logs`** (and the `/api/export` legacy branch) — data minimization.
6. **Move `vector` extension out of `public`** schema.
7. **Automated dependency/supply-chain scanning** in CI (`npm audit` / Dependabot) and
   Subresource-Integrity review; pin the extension to zero third-party runtime deps (already
   true — keep it true).
8. **Rate-limit `get_squad_by_invite`** per-user to blunt code brute force.

---

## 7. Security checklist (current status)

- [x] AuthN on every non-public route (getUser / Bearer)
- [x] AuthZ enforced at the DB via RLS on every table
- [x] Least-privilege extension permissions; no broad host access; no externally_connectable
- [x] Extension message sender validation for token handoff
- [x] CSRF origin gate on mutating requests (Bearer-exempt)
- [x] Clickjacking denied (XFO + frame-ancestors)
- [x] HSTS, nosniff, COOP/CORP/COEP, Permissions-Policy
- [x] Per-user + per-IP rate limiting; IP source unspoofable on Vercel
- [x] Idempotent ingest; replay-safe
- [x] Input validation (Zod) + domain-only normalization
- [x] Upload MIME allowlist + size cap + server-chosen path (route + bucket)
- [x] Storage RLS: per-user folder write, member-scoped read
- [x] No secrets in the repo; server-only env vars
- [x] Errors generic to client, detailed server-side
- [x] Audit logging of security events
- [ ] Strict CSP (no unsafe-inline) — residual
- [ ] Leaked-password protection — owner dashboard toggle
- [ ] Automated dependency scanning in CI
- [ ] Payment webhook verification — when payments ship

---

## 8. Verification method

Every fix was validated: `npx tsc --noEmit` + `npx next build` (green), extension
`node --test` (21/21) + `node --check`, Supabase security advisors re-run (anon finding
cleared; remainder are the documented accepted set), and live production probes
(admin/stats → 401 generic, push/subscribe → 401, ingest → 403 via CSRF gate, landing →
200). Residual risks are explicitly listed rather than silently accepted.
