-- Pre-launch waitlist. Public can INSERT (join); no SELECT/UPDATE/DELETE policy exists,
-- so RLS denies reads through the API — emails can't be harvested with the public anon key.
-- (Owner/service role can still read for export.)
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  note text,
  created_at timestamptz default now(),
  constraint waitlist_email_valid check (position('@' in email) > 1 and length(email) <= 255),
  constraint waitlist_note_len check (note is null or length(note) <= 500)
);

create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

create policy "anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);
