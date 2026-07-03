-- 022_purge_legacy_mindfuel_data.sql — data minimization / privacy hardening.
-- Applied via MCP 2026-07-03 (captured here per the repo rule that MCP migrations are files too).
--
-- The MindFuel product was deleted 2026-07-02. These five tables are its last remnants; they
-- held manual-log fields and FREE-TEXT content (mental_logs.content, 65 rows) that contradict
-- SatyaShift's domain-only promise, and were being dumped verbatim by the old /api/export
-- ("Download my data"). After the export rewrite, no live code references them. Drop them so the
-- content-bearing storage ceases to EXIST — defense in depth beyond the owner-only RLS they had.
-- Each table's own policies, indexes, triggers (e.g. audit_mental_logs) and realtime-publication
-- membership are removed with it.
drop table if exists public.mental_logs cascade;
drop table if exists public.mood_logs cascade;
drop table if exists public.daily_summaries cascade;
drop table if exists public.habit_challenges cascade;
drop table if exists public.daily_pulses cascade;

-- domain_logs.jitai_fired / jitai_outcome: vestigial columns from an abandoned design that would
-- have logged the intervention OUTCOME server-side. The shipped design keeps nudges FULLY LOCAL
-- (see docs/DECISIONS.md "Intervention reliability architecture"): the extension never sends
-- these, so they are dead (1 stray populated row out of 140). Remove them; domain_logs keeps only
-- domain / duration_s / category / seq / batch_id / created_at.
alter table public.domain_logs drop column if exists jitai_fired;
alter table public.domain_logs drop column if exists jitai_outcome;
