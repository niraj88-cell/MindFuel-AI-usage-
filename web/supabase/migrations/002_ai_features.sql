-- MindFuel Migration 002: AI Features
-- Run after 001_initial_schema.sql

-- ========================================
-- MOOD LOGS TABLE
-- ========================================
create table if not exists public.mood_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  mood integer not null check (mood between 1 and 10),
  energy integer check (energy between 1 and 10),
  anxiety integer check (anxiety between 1 and 10),
  notes text,
  context text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_mood_logs_user_id on public.mood_logs(user_id);
create index if not exists idx_mood_logs_created_at on public.mood_logs(created_at);

alter table public.mood_logs enable row level security;

create policy "Users can manage own mood logs" on mood_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========================================
-- AI INSIGHTS TABLE
-- ========================================
create table if not exists public.ai_insights (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('daily_coach', 'content_swap', 'mood_correlation', 'recipe', 'challenge')),
  title text not null,
  body text not null,
  action_items jsonb default '[]',
  metadata jsonb default '{}',
  is_read boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_ai_insights_user_id on public.ai_insights(user_id);
create index if not exists idx_ai_insights_type on public.ai_insights(type);
create index if not exists idx_ai_insights_created_at on public.ai_insights(created_at);

alter table public.ai_insights enable row level security;

create policy "Users can view own insights" on ai_insights
  for select using (auth.uid() = user_id);

create policy "Users can update own insights" on ai_insights
  for update using (auth.uid() = user_id);

create policy "System can insert insights" on ai_insights
  for insert to service_role with check (true);

-- ========================================
-- HABIT CHALLENGES TABLE
-- ========================================
create table if not exists public.habit_challenges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text not null,
  target_days integer not null default 7,
  completed_days integer not null default 0,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')) default 'medium',
  category text not null,
  target_category text not null,
  is_active boolean default true,
  started_at timestamptz default timezone('utc'::text, now()) not null,
  completed_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_habit_challenges_user_id on public.habit_challenges(user_id);
create index if not exists idx_habit_challenges_is_active on public.habit_challenges(is_active);

alter table public.habit_challenges enable row level security;

create policy "Users can manage own challenges" on habit_challenges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  body text not null,
  type text not null check (type in ('daily_coach', 'swap_suggestion', 'challenge', 'streak')),
  is_read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

alter table public.notifications enable row level security;

create policy "Users can manage own notifications" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========================================
-- Allow service role to insert daily summaries
-- ========================================
drop policy if exists "Users cannot insert summaries directly" on daily_summaries;
create policy "Service role can insert summaries" on daily_summaries
  for insert to service_role with check (true);

drop policy if exists "Users cannot update summaries directly" on daily_summaries;
create policy "Service role can update summaries" on daily_summaries
  for update to service_role using (true);

-- ========================================
-- SUPABASE CRON: Daily Coach at 8AM UTC
-- (Enable pg_cron extension in Supabase dashboard first)
-- ========================================
-- select cron.schedule(
--   'daily-mental-coach',
--   '0 8 * * *',
--   $$
--   select net.http_post(
--     url := current_setting('app.settings.site_url') || '/api/daily-coach',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.cron_secret') || '"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ========================================
-- REALTIME: Enable for ai_insights + notifications
-- ========================================
alter publication supabase_realtime add table ai_insights;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table daily_summaries;
