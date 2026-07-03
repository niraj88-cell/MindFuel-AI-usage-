-- ============================================================================
-- SatyaShift — DEV/EVAL demo teardown   (reverses demo_seed.sql)
-- ----------------------------------------------------------------------------
-- Removes every demo row in one pass. All demo rows live under the id namespace
-- d33d0000-0000-4000-8000-........... (plus the marker batch_id), so this can
-- never touch real user data. Safe to run repeatedly.
--   Run with:  psql / Supabase SQL editor / MCP execute_sql
-- ============================================================================

begin;

delete from domain_logs
where batch_id = 'd33d0000-0000-4000-8000-00000000ba01'
   or id::text like 'd33d0000-%';

delete from focus_sessions      where id::text like 'd33d0000-%';
delete from notifications       where id::text like 'd33d0000-%';
delete from processed_batches   where id::text like 'd33d0000-%';

-- Remove the two members added to Deep Work Crew by the seed.
delete from squad_members
where squad_id = 'b6621823-838e-42e5-853d-56bdaa1509dd'
  and user_id in (
    '87f9c3c7-de80-4fe2-84f2-326eb372e09e',
    '14031b4d-ca70-4a4e-a435-f07a06746b54'
  );

-- Restore the one pre-existing seed row the seed normalized (John's stale "active").
update focus_sessions
  set status='active', duration_s=null, session_quality=null, distraction_pct=null
where id = '6449bcb1-972d-4c20-b9fd-add395031d80';

commit;
