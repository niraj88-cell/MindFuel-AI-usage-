-- Align focus_sessions CHECK constraints with the proof-layer vocabulary that
-- /api/focus/stop already produces and the SatyaShift screens display.
-- Non-destructive widening: existing rows (status abandoned/completed, quality
-- focused/null) all satisfy the new sets.

alter table public.focus_sessions drop constraint if exists focus_sessions_status_check;
alter table public.focus_sessions add constraint focus_sessions_status_check
  check (status = any (array['active','completed','mixed','abandoned']));

alter table public.focus_sessions drop constraint if exists focus_sessions_session_quality_check;
alter table public.focus_sessions add constraint focus_sessions_session_quality_check
  check (session_quality = any (array['unverified','deep','focused','mixed','distracted']));
