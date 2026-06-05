# MindFuel Critical Fix Prompt

You are a senior product strategist, UX director, senior frontend engineer, and Supabase engineer working on MindFuel, a mental wellness and productivity web app.

Your mission is to make MindFuel instantly understandable, premium, calm, trustworthy, and technically reliable. Focus only on critical fixes first. Do not add new feature complexity until the core product loop is obvious and stable.

## Product Truth

MindFuel helps users understand how their screen time and content consumption affect their mood, focus, and energy. The core loop is:

1. Log what you consumed.
2. See how it affected you.
3. Get one better next move.
4. Repeat until patterns become clear.

Every screen should support this loop.

## Critical UX Fixes

- Replace abstract hero copy like "Operating System for your Mind" with plain value copy: "Understand how your screen time affects your mood and focus."
- Remove exaggerated or trust-damaging language such as "Billion-Dollar Architecture," "terrifyingly accurate," "Upgrade your reality," and shame-based Squad copy.
- Use one primary CTA across acquisition and onboarding: "Start free."
- Simplify app navigation to the core product surfaces: Today, Log Content, Insights, Coach, Squad, Settings.
- Collapse competing onboarding flows into one short first-use flow that gets the user to a first log quickly.
- Make empty states operational: one sentence of context, one example, one clear action.
- Make all button labels concrete and human. Avoid metaphor labels like "Save to Mirror."

## Critical UI Fixes

- Move the product toward calm premium: charcoal, warm white, muted blue/teal, restrained amber/red.
- Reduce oversized sci-fi visual language, glow effects, giant rounded cards, and jargon labels.
- Use product previews and real UI states instead of abstract spectacle.
- Keep one obvious next action per screen.
- Ensure dashboard content answers: "What happened?", "What does it mean?", and "What should I do next?"

## Critical Squad Fixes

Squad should feel like a small supportive accountability circle, not a shame-driven leaderboard.

Required product changes:

- Rename user-facing language from competitive or shame-based copy to supportive copy.
- Empty state should explain: "Create a small private circle for daily check-ins and support."
- After creating a squad, guide users to invite members or start a simple mission.
- Show human statuses like "Checked in today," "Quiet today," and "Could use support," not just numeric scores.
- Add a lightweight activity feed for joins, pings, and mission updates.

Required technical checks:

- Verify Supabase auth/session works for all Squad API routes.
- Verify Row Level Security policies allow members to see only their squads.
- Verify Squad members can see member profile basics and shared daily summary fields needed for Squad.
- Verify `squad_pings` joins use explicit foreign key aliases for `from_user` and `to_user`.
- Verify `to_user` must be a member of the same squad before a ping can be inserted.
- Add Squad tables to `supabase_realtime` publication if realtime UI is used.
- Replace 30-second polling with Supabase realtime subscriptions where practical.
- Harden invite code lookup RPC with explicit `search_path`, execute grants, and normalized invite codes.
- Return actionable error messages from API routes while keeping sensitive details out of user-facing UI.
- Remove `@ts-nocheck` from Squad routes after fixing route and type issues.

## Prioritization

Must fix now:

- Homepage clarity and CTA.
- Onboarding simplification.
- Navigation simplification.
- Squad copy, empty state, and basic active-state clarity.
- Squad RLS/realtime/ping hardening.

Fix next:

- Dashboard hierarchy and dashboard empty states.
- Complete design token cleanup.
- Better loading and error states.
- Analytics events for activation and retention.

Later:

- Wearables, advanced predictions, complex missions, premium feature expansion, and advanced AI memory.

## Acceptance Criteria

- A first-time visitor can explain MindFuel in under 10 seconds.
- A new user knows the first action is to log content.
- The logged-in nav has no more than six primary destinations.
- Squad never uses guilt or shame as motivation.
- Squad create, join, ping, and mission flows return clear success/error states.
- Supabase policies protect private data while allowing legitimate Squad member visibility.
- The app feels calm, expensive, and emotionally intelligent rather than generic or overbuilt.
