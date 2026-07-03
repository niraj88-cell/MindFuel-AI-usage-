-- 024_behavioral_profile.sql — the longitudinal behavioral profile (Behavioral Intelligence).
-- Applied via MCP 2026-07-03; captured here as the repo record (latest migration).
--
-- One owner-only row per user holding the slowly-evolving, DOMAIN-FREE behavioral profile
-- computed by web/lib/intelligence/ at /api/focus/stop. The jsonb holds ONLY traits, rhythm
-- histograms (hour-of-day / day-of-week distraction shares), and running accumulators —
-- never a domain, URL, or any free text. It is a CACHE: an EWMA fold over the owner's own
-- focus_sessions, always rebuildable via intelligence.deriveProfile(). It is never a second
-- source of truth, never shared with a squad, and not published to realtime.

create table if not exists public.behavioral_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  profile       jsonb   not null default '{}'::jsonb,
  sessions_seen integer not null default 0,
  version       integer not null default 1,
  updated_at    timestamptz not null default now()
);

alter table public.behavioral_profiles enable row level security;

-- OWNER-ONLY on all four verbs (mirrors focus_sessions after migration 019). The user owns
-- their own derived cache; the service role never needs to touch it (kept narrow). Squadmates
-- have no access of any kind.
drop policy if exists bp_select on public.behavioral_profiles;
create policy bp_select on public.behavioral_profiles
  for select using ((select auth.uid()) = user_id);

drop policy if exists bp_insert on public.behavioral_profiles;
create policy bp_insert on public.behavioral_profiles
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists bp_update on public.behavioral_profiles;
create policy bp_update on public.behavioral_profiles
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists bp_delete on public.behavioral_profiles;
create policy bp_delete on public.behavioral_profiles
  for delete using ((select auth.uid()) = user_id);
