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
