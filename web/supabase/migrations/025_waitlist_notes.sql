-- 025: waitlist_notes — the optional "what makes focus hard for you?" answer, asked AFTER
-- the invite request goes in (landing audit 2026-07-14: a visible pre-commit form field cuts
-- completion; asked post-commit it costs nothing and answers arrive at a higher rate).
-- A separate INSERT-only table because waitlist has a unique lower(email) index and anon has
-- deliberately no UPDATE policy — client-written rows can never be read back or modified.

create table if not exists public.waitlist_notes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (position('@' in email) > 1 and length(email) <= 255),
  note       text not null check (length(note) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.waitlist_notes enable row level security;

-- Anyone may leave a note; nothing can be read back (no SELECT policy). Same posture — and
-- the same accepted "always-true INSERT" advisor WARN — as the waitlist table itself.
create policy "anyone can leave a waitlist note" on public.waitlist_notes
  for insert to anon, authenticated with check (true);
