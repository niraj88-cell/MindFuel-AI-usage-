-- ============================================================================
-- SatyaShift — DEV/EVAL demo seed   (account: niraj2055adk@gmail.com only)
-- ----------------------------------------------------------------------------
-- Purpose: populate every realistic UI state with believable, internally
-- consistent data so the product can be evaluated as if used daily.
--
-- SAFETY:
--   * Every demo row uses the id namespace  d33d0000-0000-4000-8000-...........
--     (plus a marker batch_id), so demo_teardown.sql removes it in one pass.
--   * No NEW auth users are created — it reuses existing "Deep Work Crew"
--     members. Other real users' own data is never modified.
--   * Idempotent: re-running is safe (ON CONFLICT DO NOTHING / NOT EXISTS).
--   * DEV ONLY. Never run against a production project.
-- ============================================================================

begin;

-- Fixed ids ------------------------------------------------------------------
--   NIRAJ   8ff85973-d456-4dc2-ac35-676ce3f09c48
--   DWC     b6621823-838e-42e5-853d-56bdaa1509dd   (squad "Deep Work Crew")
--   JOHN    efa7c53f-070b-49c1-995c-9acd4524ee33
--   NIKHIL  87f9c3c7-de80-4fe2-84f2-326eb372e09e
--   DILISHA 14031b4d-ca70-4a4e-a435-f07a06746b54
--   batch marker  d33d0000-0000-4000-8000-00000000ba01

-- 0. Ensure the Squad page surfaces Deep Work Crew (it shows the newest squad).
update squads set created_at = now()
where id = 'b6621823-838e-42e5-853d-56bdaa1509dd';

-- 1. Grow the squad to 4 people (reuse existing accounts; no new auth users).
insert into squad_members (squad_id, user_id, role)
select v.squad_id, v.user_id, 'member'
from (values
  ('b6621823-838e-42e5-853d-56bdaa1509dd'::uuid, '87f9c3c7-de80-4fe2-84f2-326eb372e09e'::uuid),
  ('b6621823-838e-42e5-853d-56bdaa1509dd'::uuid, '14031b4d-ca70-4a4e-a435-f07a06746b54'::uuid)
) as v(squad_id, user_id)
where not exists (
  select 1 from squad_members sm
  where sm.squad_id = v.squad_id and sm.user_id = v.user_id
);

-- 2. Niraj — today's sessions (drive Dashboard "Today" + session detail).
insert into focus_sessions
  (id, user_id, mf_duration_minutes, mf_completed, created_at, squad_id, intention, status, duration_s, session_quality, distraction_pct)
values
  ('d33d0000-0000-4000-8000-000000000001','8ff85973-d456-4dc2-ac35-676ce3f09c48',134,true, now()-interval '3 hours','b6621823-838e-42e5-853d-56bdaa1509dd','deep work on the redesign','completed',8040,'deep',12),
  ('d33d0000-0000-4000-8000-000000000002','8ff85973-d456-4dc2-ac35-676ce3f09c48', 40,true, now()-interval '5 hours','b6621823-838e-42e5-853d-56bdaa1509dd','clearing the inbox + planning the sprint','completed',2400,'focused',22),
  ('d33d0000-0000-4000-8000-000000000003','8ff85973-d456-4dc2-ac35-676ce3f09c48', 55,true, now()-interval '7 hours','b6621823-838e-42e5-853d-56bdaa1509dd','research spike on auth flows','mixed',3300,'mixed',52),
  ('d33d0000-0000-4000-8000-000000000004','8ff85973-d456-4dc2-ac35-676ce3f09c48', 25,true, now()-interval '8 hours','b6621823-838e-42e5-853d-56bdaa1509dd','quick fix before standup','completed',1500,'unverified',null)
on conflict (id) do nothing;

-- 3. Niraj — recent history (prior days; not squad-attached so the feed stays balanced).
insert into focus_sessions
  (id, user_id, mf_duration_minutes, mf_completed, created_at, squad_id, intention, status, duration_s, session_quality, distraction_pct)
values
  ('d33d0000-0000-4000-8000-000000000005','8ff85973-d456-4dc2-ac35-676ce3f09c48', 90,true, now()-interval '1 day 2 hours', null,'writing the launch post','completed',5400,'deep',8),
  ('d33d0000-0000-4000-8000-000000000006','8ff85973-d456-4dc2-ac35-676ce3f09c48', 45,true, now()-interval '1 day 6 hours', null,'code review backlog','completed',2700,'focused',18),
  ('d33d0000-0000-4000-8000-000000000007','8ff85973-d456-4dc2-ac35-676ce3f09c48',120,true, now()-interval '2 days 3 hours', null,'deep work: the data model','completed',7200,'deep',10),
  ('d33d0000-0000-4000-8000-000000000008','8ff85973-d456-4dc2-ac35-676ce3f09c48', 30,true, now()-interval '3 days 5 hours', null,'scattered afternoon','completed',1800,'mixed',46),
  ('d33d0000-0000-4000-8000-000000000009','8ff85973-d456-4dc2-ac35-676ce3f09c48', 50,true, now()-interval '4 days 2 hours', null,'morning reading','completed',3000,'focused',20),
  ('d33d0000-0000-4000-8000-00000000000a','8ff85973-d456-4dc2-ac35-676ce3f09c48', 75,true, now()-interval '6 days 4 hours', null,'design exploration','completed',4500,'deep',9)
on conflict (id) do nothing;

-- 4. Squad members — today (one focusing NOW, others verified earlier today).
insert into focus_sessions
  (id, user_id, mf_duration_minutes, mf_completed, created_at, squad_id, intention, status, duration_s, session_quality, distraction_pct)
values
  ('d33d0000-0000-4000-8000-000000000101','efa7c53f-070b-49c1-995c-9acd4524ee33',30,false, now()-interval '28 minutes','b6621823-838e-42e5-853d-56bdaa1509dd','shipping the API refactor','active', null, null, null),
  ('d33d0000-0000-4000-8000-000000000102','efa7c53f-070b-49c1-995c-9acd4524ee33',65,true,  now()-interval '6 hours','b6621823-838e-42e5-853d-56bdaa1509dd','morning deep work','completed',3900,'deep',11),
  ('d33d0000-0000-4000-8000-000000000103','87f9c3c7-de80-4fe2-84f2-326eb372e09e',45,true,  now()-interval '4 hours','b6621823-838e-42e5-853d-56bdaa1509dd','reading research papers','completed',2700,'focused',24),
  ('d33d0000-0000-4000-8000-000000000104','14031b4d-ca70-4a4e-a435-f07a06746b54',130,true, now()-interval '2 hours','b6621823-838e-42e5-853d-56bdaa1509dd','writing thesis chapter','completed',7800,'deep',7)
on conflict (id) do nothing;

-- 5. Domain logs for Niraj's flagship session (#0001) — drives "where the time went".
--    Window: session created now()-3h, ~2h14m long. Logs sit inside that window.
insert into domain_logs
  (id, user_id, domain, duration_s, category, batch_id, jitai_fired, jitai_outcome, created_at)
values
  ('d33d0000-0000-4000-8000-000000000201','8ff85973-d456-4dc2-ac35-676ce3f09c48','github.com',       4200,'productive', 'd33d0000-0000-4000-8000-00000000ba01', false, null,        now()-interval '2 hours 55 minutes'),
  ('d33d0000-0000-4000-8000-000000000202','8ff85973-d456-4dc2-ac35-676ce3f09c48','stackoverflow.com', 1800,'productive', 'd33d0000-0000-4000-8000-00000000ba01', false, null,        now()-interval '2 hours 20 minutes'),
  ('d33d0000-0000-4000-8000-000000000203','8ff85973-d456-4dc2-ac35-676ce3f09c48','youtube.com',        900,'distraction','d33d0000-0000-4000-8000-00000000ba01', true,  'closed_tab', now()-interval '1 hour 40 minutes'),
  ('d33d0000-0000-4000-8000-000000000204','8ff85973-d456-4dc2-ac35-676ce3f09c48','x.com',              300,'distraction','d33d0000-0000-4000-8000-00000000ba01', false, null,        now()-interval '1 hour 10 minutes')
on conflict (id) do nothing;

-- 6. Notifications (drive the Reminders screen + nav unread badge = 2).
insert into notifications (id, user_id, title, body, type, is_read, created_at)
values
  ('d33d0000-0000-4000-8000-000000000301','8ff85973-d456-4dc2-ac35-676ce3f09c48','John cheered your focus','John Garson sent encouragement on your 2h 14m session.','squad',    false, now()-interval '1 hour'),
  ('d33d0000-0000-4000-8000-000000000302','8ff85973-d456-4dc2-ac35-676ce3f09c48','2 hours of verified focus today','Three verified sessions so far. Quietly building.','milestone', false, now()-interval '2 hours 30 minutes'),
  ('d33d0000-0000-4000-8000-000000000303','8ff85973-d456-4dc2-ac35-676ce3f09c48','Nikhil joined Deep Work Crew','Your circle is now 4 people.','squad',                              true,  now()-interval '1 day'),
  ('d33d0000-0000-4000-8000-000000000304','8ff85973-d456-4dc2-ac35-676ce3f09c48','Evening check-in','A short session before you wind down?','reminder',                            true,  now()-interval '5 hours'),
  ('d33d0000-0000-4000-8000-000000000305','8ff85973-d456-4dc2-ac35-676ce3f09c48','Your week, quietly','8 verified sessions · 9h 40m of focus.','summary',                          true,  now()-interval '2 days')
on conflict (id) do nothing;

-- 7. Ingest marker so the "connect the extension" card stays hidden (= connected).
insert into processed_batches (id, user_id, row_count, received_at)
values ('d33d0000-0000-4000-8000-00000000ba02','8ff85973-d456-4dc2-ac35-676ce3f09c48',4, now()-interval '3 hours')
on conflict (id) do nothing;

commit;
