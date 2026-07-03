-- 019_behavioral_intelligence.sql — behavioral intelligence + squad column-privacy.
-- (2026-07-02, applied via MCP the same day; see docs/DECISIONS.md "Behavioral intelligence".)
--
-- 1) domain_logs.seq: within-batch event order. domain_logs.id is a random uuid and every
--    row in a batch shares one created_at (transaction now()), so the dwell SEQUENCE was
--    unrecoverable — and sequence is what attention patterns are made of. /api/ingest now
--    writes the batch index; ordering is (created_at, seq). Legacy rows keep 0.
alter table public.domain_logs
  add column if not exists seq integer not null default 0;

-- 2) focus_sessions.behavior: the session's behavioral signals as computed by
--    web/lib/behavior.ts at /api/focus/stop. Counts, durations, and shares ONLY —
--    the shape contains zero domains by construction (tested), so even this jsonb
--    never widens what a leak could reveal. Owner-only via RLS (below).
alter table public.focus_sessions
  add column if not exists behavior jsonb;

-- 3) Column-level squad privacy. RLS is row-level: the old focus_select policy let any
--    squadmate SELECT a co-member's ENTIRE session row from the browser — including
--    session_quality, distraction_pct, and now behavior. That contradicts the product
--    promise ("verified time, no site, no score"). Sessions are now owner-only; squads
--    read through the definer functions below, which expose exactly: who, active/verified,
--    duration, the member's own intention words, and when. Never a quality label, never a
--    percentage, never behavior.
drop policy if exists focus_select on public.focus_sessions;
create policy focus_select on public.focus_sessions
  for select using ((select auth.uid()) = user_id);

-- 4) Squad-safe reads (SECURITY DEFINER, membership-checked, same pattern as
--    is_squad_member / get_squad_by_invite which the security review accepted).

-- The circle feed: recent sessions of the squad, safe columns only.
create or replace function public.get_squad_feed(p_squad_id uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  active boolean,
  verified boolean,
  duration_s integer,
  intention text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    fs.id,
    fs.user_id,
    pr.full_name,
    pr.avatar_url,
    (fs.status = 'active' and fs.created_at > now() - interval '4 hours') as active,
    (fs.session_quality is not null and fs.session_quality <> 'unverified') as verified,
    fs.duration_s,
    fs.intention,
    fs.created_at
  from public.focus_sessions fs
  join public.profiles pr on pr.id = fs.user_id
  where fs.squad_id = p_squad_id
    and public.is_squad_member(p_squad_id)
  order by fs.created_at desc
  limit 30
$$;

-- The popup presence line: the newest active co-member session across my circles.
create or replace function public.get_squad_live()
returns table (user_id uuid, full_name text, started_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select fs.user_id, pr.full_name, fs.created_at
  from public.focus_sessions fs
  join public.profiles pr on pr.id = fs.user_id
  where fs.status = 'active'
    and fs.created_at > now() - interval '4 hours'
    and fs.user_id <> (select auth.uid())
    and fs.squad_id in (
      select sm.squad_id from public.squad_members sm
      where sm.user_id = (select auth.uid()) and sm.left_at is null
    )
  order by fs.created_at desc
  limit 1
$$;

-- The "focused today" member dots: ids only, no session details at all.
create or replace function public.get_squad_focused_today(p_squad_id uuid)
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select distinct fs.user_id
  from public.focus_sessions fs
  where fs.squad_id = p_squad_id
    and public.is_squad_member(p_squad_id)
    and fs.created_at >= date_trunc('day', now())
    and fs.status in ('completed', 'mixed')
$$;

-- 5) Encouragement: the only thing a squad can SEND — a fixed phrase, one per member per
--    session, to a co-member who is in an active session right now. No chat, no free text,
--    no reply thread. The whole flow lives in this one function so the service role never
--    touches it and no client input reaches the notification body.
create or replace function public.encourage_session(p_session_id uuid, p_phrase smallint)
returns table (ok boolean, recipient uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_session record;
  v_phrase text;
  v_actor_name text;
begin
  if v_actor is null then
    return query select false, null::uuid; return;
  end if;

  select fs.user_id, fs.squad_id, fs.status, fs.created_at
    into v_session
    from public.focus_sessions fs
    where fs.id = p_session_id;

  if v_session is null
     or v_session.squad_id is null
     or v_session.user_id = v_actor
     or v_session.status <> 'active'
     or v_session.created_at <= now() - interval '4 hours'
     or not public.is_squad_member(v_session.squad_id) then
    return query select false, null::uuid; return;
  end if;

  -- Fixed phrase set. Anything else is rejected; no client text ever lands in a notification.
  v_phrase := case p_phrase
    when 0 then 'With you'
    when 1 then 'Cheering you on'
    when 2 then 'Stay strong'
    when 3 then 'You''ve got this'
    else null
  end;
  if v_phrase is null then
    return query select false, null::uuid; return;
  end if;

  -- One encouragement per member per session — support, not a stream to check.
  if exists (
    select 1 from public.notifications n
    where n.type = 'squad_encouragement'
      and n.user_id = v_session.user_id
      and n.metadata->>'session_id' = p_session_id::text
      and n.metadata->>'from_id' = v_actor::text
  ) then
    return query select false, null::uuid; return;
  end if;

  select coalesce(nullif(split_part(trim(pr.full_name), ' ', 1), ''), 'A friend')
    into v_actor_name
    from public.profiles pr where pr.id = v_actor;

  insert into public.notifications (user_id, title, body, type, metadata)
  values (
    v_session.user_id,
    coalesce(v_actor_name, 'A friend') || ': ' || v_phrase,
    'Sent while you were in your session.',
    'squad_encouragement',
    jsonb_build_object(
      'session_id', p_session_id,
      'from_id', v_actor,
      'from_name', coalesce(v_actor_name, 'A friend'),
      'phrase', v_phrase,
      'squad_id', v_session.squad_id
    )
  );

  return query select true, v_session.user_id;
end
$$;

-- 6) Locked-down execution, mirroring 017: authenticated only, never anon.
revoke all on function public.get_squad_feed(uuid) from public, anon;
revoke all on function public.get_squad_live() from public, anon;
revoke all on function public.get_squad_focused_today(uuid) from public, anon;
revoke all on function public.encourage_session(uuid, smallint) from public, anon;
grant execute on function public.get_squad_feed(uuid) to authenticated;
grant execute on function public.get_squad_live() to authenticated;
grant execute on function public.get_squad_focused_today(uuid) to authenticated;
grant execute on function public.encourage_session(uuid, smallint) to authenticated;
