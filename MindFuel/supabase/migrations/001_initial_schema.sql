-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector"; -- For future AI embeddings

-- ========================================
-- PROFILES TABLE (extends auth.users)
-- ========================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  subscription_tier text check (subscription_tier in ('free', 'premium')) default 'free',
  daily_log_limit integer default 3, -- Free tier limit
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies: Users can only see and edit their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========================================
-- MENTAL LOGS TABLE
-- ========================================
create table public.mental_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text not null check (char_length(content) > 0),
  category text check (category in ('educational', 'productive', 'creative', 'social', 'entertainment', 'doomscroll', 'neutral')) not null,
  mental_score integer not null check (mental_score between 1 and 100),
  duration_minutes integer not null check (duration_minutes > 0),
  mood_before integer check (mood_before between 1 and 10),
  mood_after integer check (mood_after between 1 and 10),
  source text check (source in ('manual', 'auto_tracking', 'url_submission')) default 'manual',
  metadata jsonb default '{}',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index idx_mental_logs_user_id on public.mental_logs(user_id);
create index idx_mental_logs_created_at on public.mental_logs(created_at);
create index idx_mental_logs_category on public.mental_logs(category);

-- Enable RLS
alter table public.mental_logs enable row level security;

-- Policies: Users can only see/manage their own logs
create policy "Users can view own logs" on mental_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own logs" on mental_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own logs" on mental_logs
  for update using (auth.uid() = user_id);

create policy "Users can delete own logs" on mental_logs
  for delete using (auth.uid() = user_id);

-- ========================================
-- DAILY SUMMARIES TABLE (Materialized View Alternative)
-- ========================================
create table public.daily_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null, -- Store as date, not timestamp
  total_score integer not null default 0,
  average_score numeric(5,2) not null default 0,
  total_logs integer not null default 0,
  category_breakdown jsonb default '{}', -- { "educational": 3, "productive": 2, "doomscroll": 1 }
  streak_days integer not null default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Indexes
create index idx_daily_summaries_user_id on public.daily_summaries(user_id);
create index idx_daily_summaries_date on public.daily_summaries(date);
create index idx_daily_summaries_user_date on public.daily_summaries(user_id, date);

-- Enable RLS
alter table public.daily_summaries enable row level security;

-- Policies
create policy "Users can view own summaries" on daily_summaries
  for select using (auth.uid() = user_id);

create policy "Users cannot insert summaries directly" on daily_summaries
  for insert with check (false); -- Only backend/function can insert

create policy "Users cannot update summaries directly" on daily_summaries
  for update using (false);

create policy "Users cannot delete summaries" on daily_summaries
  for delete using (false);

-- ========================================
-- WEEKLY REPORTS TABLE
-- ========================================
create table public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  week_start_date date not null, -- Monday of the week
  week_data jsonb not null, -- Full report data with insights
  generated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(user_id, week_start_date)
);

-- Indexes
create index idx_weekly_reports_user_id on public.weekly_reports(user_id);
create index idx_weekly_reports_week_start on public.weekly_reports(week_start_date);

-- Enable RLS
alter table public.weekly_reports enable row level security;

-- Policies
create policy "Users can view own reports" on weekly_reports
  for select using (auth.uid() = user_id);

create policy "System can insert reports" on weekly_reports
  for insert with check (auth.uid() = user_id);

-- ========================================
-- SUBSCRIPTIONS TABLE (RevenueCat)
-- ========================================
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  revenuecat_app_user_id text not null,
  tier text check (tier in ('premium')) default 'premium',
  active_until timestamptz,
  original_transaction_id text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(user_id),
  unique(revenuecat_app_user_id)
);

-- Indexes
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_active_until on public.subscriptions(active_until);
create index idx_subscriptions_revenuecat_id on public.subscriptions(revenuecat_app_user_id);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies
create policy "Users can view own subscription" on subscriptions
  for select using (auth.uid() = user_id);

create policy "System can manage subscriptions" on subscriptions
  for all using (true) with check (true);

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Function to calculate daily summaries from mental_logs
create or replace function public.calculate_daily_summary(target_date date, target_user_id uuid default auth.uid())
returns void as $$
declare
  logs_record record;
  summary_data record;
begin
  -- Get all logs for the user on the target date
  select
    count(*) as total_logs,
    coalesce(avg(mental_score), 0) as avg_score,
    coalesce(sum(mental_score), 0) as total_score,
    jsonb_object_agg(category, count(*)) as category_breakdown
  into summary_data
  from public.mental_logs
  where
    user_id = target_user_id
    and date(created_at) = target_date;

  -- If no logs exist, exit
  if summary_data.total_logs = 0 then
    return;
  end if;

  -- Calculate streak (simplified - consecutive days with at least 1 log)
  -- This could be more sophisticated based on your rules
  declare
    streak integer := 0;
    check_date date := target_date;
  begin
    while exists (
      select 1 from public.mental_logs
      where user_id = target_user_id and date(created_at) = check_date
    ) loop
      streak := streak + 1;
      check_date := check_date - interval '1 day';
    end loop;
  end;

  -- Upsert the daily summary
  insert into public.daily_summaries (user_id, date, total_score, average_score, total_logs, category_breakdown, streak_days)
  values (target_user_id, target_date, summary_data.total_score, round(summary_data.avg_score::numeric, 2), summary_data.total_logs, summary_data.category_breakdown, streak)
  on conflict (user_id, date)
  do update set
    total_score = excluded.total_score,
    average_score = excluded.average_score,
    total_logs = excluded.total_logs,
    category_breakdown = excluded.category_breakdown,
    streak_days = excluded.streak_days,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- Function to generate weekly report
create or replace function public.generate_weekly_report(target_date date default current_date)
returns jsonb as $$
declare
  week_start date;
  week_data jsonb;
  report_id uuid;
begin
  week_start := target_date - ((extract(dow from target_date)::integer + 6) % 7) * interval '1 day'; -- Monday

  select
    jsonb_build_object(
      'total_logs', count(*),
      'avg_daily_score', round(avg(mental_score)::numeric, 2),
      'top_category', (
        select category
        from public.mental_logs ml2
        where ml2.user_id = ml.user_id
          and date(ml2.created_at) >= week_start
          and date(ml2.created_at) < week_start + interval '7 days'
        group by category
        order by count(*) desc
        limit 1
      ),
      'category_distribution', jsonb_object_agg(category, count(*)),
      'insights', jsonb_build_array(
        'Your mental nutrition score this week is ' || round(avg(mental_score)::numeric, 1) || '/100',
        'You logged ' || count(*) || ' mental meals',
        'Your most common category was ' || (
          select category
          from public.mental_logs ml2
          where ml2.user_id = ml.user_id
            and date(ml2.created_at) >= week_start
            and date(ml2.created_at) < week_start + interval '7 days'
          group by category
          order by count(*) desc
          limit 1
        )
      ),
      'recommendations', jsonb_build_array(
        case
          when avg(mental_score) < 40 then 'Consider reducing doomscrolling and increasing educational content'
          when avg(mental_score) < 60 then 'Good balance! Try adding more productive activities'
          else 'Excellent mental nutrition! Keep up the great habits'
        end,
        'Maintain consistency with daily logging'
      ),
      'trend', case
        when avg(mental_score) > 70 then 'improving'
        when avg(mental_score) < 40 then 'declining'
        else 'stable'
      end
    ) as week_data
  into week_data
  from public.mental_logs ml
  where
    user_id = auth.uid()
    and date(created_at) >= week_start
    and date(created_at) < week_start + interval '7 days';

  if week_data is not null then
    insert into public.weekly_reports (user_id, week_start_date, week_data)
    values (auth.uid(), week_start, week_data)
    on conflict (user_id, week_start_date)
    do update set
      week_data = excluded.week_data,
      generated_at = now()
    returning id into report_id;

    return jsonb_build_object('report_id', report_id, 'week_start', week_start, 'data', week_data);
  else
    return jsonb_build_object('message', 'No logs for this week');
  end if;
end;
$$ language plpgsql security definer;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to check if user has exceeded daily log limit
create or replace function public.check_daily_limit()
returns boolean as $$
declare
  user_tier text;
  daily_limit integer;
  today_logs integer;
begin
  select subscription_tier, daily_log_limit into user_tier, daily_limit
  from public.profiles
  where id = auth.uid();

  if user_tier = 'premium' then
    return true; -- Unlimited for premium
  end if;

  select count(*) into today_logs
  from public.mental_logs
  where
    user_id = auth.uid()
    and date(created_at) = current_date;

  return today_logs < daily_limit;
end;
$$ language plpgsql stable;

-- RPC function for scraping and analyzing URLs (placeholder - will need Python/Edge Function)
create function public.scrape_and_analyze_url(url text)
returns jsonb
language sql
stable
as $$
  -- This is a placeholder. In production, you'd call an Edge Function.
  -- For now, return a default analysis
  select jsonb_build_object(
    'category', 'neutral',
    'mental_score', 50,
    'summary', 'URL analysis requires Edge Function integration'
  );
$$;
