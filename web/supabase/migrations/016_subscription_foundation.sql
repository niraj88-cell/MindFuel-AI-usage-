-- 016: Subscription foundation (data model only — no payment processor yet).
-- One plan, two billing periods. Status is derived in the app (lib/subscription.ts)
-- from these two facts; it is deliberately NOT stored so it cannot drift:
--   * trial_ends_at        — everyone gets a 14-day trial from signup
--   * subscription_plan    — set only when billing opens and the user subscribes
-- Existing users are backfilled with a fresh 14-day window (founding grace) so the
-- clock only starts once the trial is real to them.

alter table public.profiles
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days'),
  add column if not exists subscription_plan text
    check (subscription_plan in ('monthly', 'annual')),
  add column if not exists subscribed_at timestamptz;

comment on column public.profiles.trial_ends_at is
  'End of the 14-day trial. Defaults to signup + 14 days; existing users were backfilled at migration time.';
comment on column public.profiles.subscription_plan is
  'monthly ($8/mo) or annual ($30 first year, launch price). NULL until billing opens and the user chooses.';
comment on column public.profiles.subscribed_at is
  'When the user subscribed. NULL until billing opens.';
