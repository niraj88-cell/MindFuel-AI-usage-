-- 020: Billing foundation (provider-agnostic; Paddle is configuration, not schema).
-- Dormant until PADDLE_* env vars exist. Two tables + one atomic apply function:
--   billing_events         — append-only event store: webhook idempotency + audit trail.
--                            Stores the NORMALIZED update (ids/status/plan/dates only),
--                            never raw provider payloads (no PII at rest).
--   billing_subscriptions  — one mirror row per user: the provider's current truth.
--                            Written ONLY by the service role via apply_billing_update.
-- Entitlement is DERIVED in lib/entitlement.ts from this mirror + profiles.trial_ends_at;
-- it is deliberately not stored (same philosophy as migration 016).

-- ── Event store ─────────────────────────────────────────────────────────────
create table if not exists public.billing_events (
  event_id        text primary key,          -- provider event id = duplicate detection
  provider        text not null,
  event_type      text not null,
  subscription_id text,
  user_id         uuid references public.profiles(id) on delete set null,
  occurred_at     timestamptz not null,      -- provider clock (out-of-order forensics)
  update          jsonb,                     -- canonical BillingUpdate; null = ignored type
  received_at     timestamptz not null default now(),
  processed_at    timestamptz                -- null until fully applied (crash recovery)
);

alter table public.billing_events enable row level security;
-- No policies: service-role only. Users never read the event store.

create index if not exists billing_events_user_idx on public.billing_events (user_id, occurred_at desc);

-- ── Subscription mirror ─────────────────────────────────────────────────────
create table if not exists public.billing_subscriptions (
  user_id                  uuid primary key references public.profiles(id) on delete cascade,
  provider                 text not null default 'paddle',
  provider_customer_id     text,
  provider_subscription_id text not null,
  plan                     text,
  status                   text not null check (status in ('active', 'past_due', 'paused', 'canceled')),
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  occurred_at              timestamptz not null,  -- last applied event's provider time
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists billing_subscriptions_provider_sub_idx
  on public.billing_subscriptions (provider, provider_subscription_id);

alter table public.billing_subscriptions enable row level security;

-- Owner may READ their mirror row (the UI shows plan/renewal); nobody but the
-- service role may write (no insert/update/delete policies exist).
create policy billing_subscriptions_select_own on public.billing_subscriptions
  for select using ((select auth.uid()) = user_id);

-- ── Lifetime plan value (founder grants; provider-independent) ──────────────
alter table public.profiles drop constraint if exists profiles_subscription_plan_check;
alter table public.profiles add constraint profiles_subscription_plan_check
  check (subscription_plan in ('monthly', 'annual', 'lifetime'));

-- ── Atomic apply (called by the webhook service with the service role) ──────
-- One transaction: conditional upsert with the out-of-order guard, plus the
-- profiles display-cache refresh — so the mirror and the cache can never diverge.
create or replace function public.apply_billing_update(
  p_user_id uuid,
  p_provider text,
  p_customer_id text,
  p_subscription_id text,
  p_plan text,
  p_status text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_occurred_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.billing_subscriptions as bs
    (user_id, provider, provider_customer_id, provider_subscription_id,
     plan, status, current_period_end, cancel_at_period_end, occurred_at, updated_at)
  values
    (p_user_id, p_provider, p_customer_id, p_subscription_id,
     p_plan, p_status, p_period_end, p_cancel_at_period_end, p_occurred_at, now())
  on conflict (user_id) do update set
    provider                 = excluded.provider,
    provider_customer_id     = excluded.provider_customer_id,
    provider_subscription_id = excluded.provider_subscription_id,
    plan                     = excluded.plan,
    status                   = excluded.status,
    current_period_end       = excluded.current_period_end,
    cancel_at_period_end     = excluded.cancel_at_period_end,
    occurred_at              = excluded.occurred_at,
    updated_at               = now()
  where excluded.occurred_at >= bs.occurred_at;  -- out-of-order guard (idempotent on equal)

  -- Display cache on profiles: plan while payment stands, cleared when it ends.
  -- 'lifetime' is founder-managed and never touched by the provider pipeline.
  update public.profiles set
    subscription_plan = case
      when subscription_plan = 'lifetime' then 'lifetime'
      when p_status in ('active', 'past_due') and p_plan in ('monthly', 'annual') then p_plan
      when p_status in ('paused', 'canceled') then null
      else subscription_plan
    end,
    subscribed_at = coalesce(subscribed_at, case when p_status = 'active' then now() end)
  where id = p_user_id
    and not exists (
      select 1 from public.billing_subscriptions bs2
      where bs2.user_id = p_user_id and bs2.occurred_at > p_occurred_at
    );
end;
$$;

-- Service role only — the webhook pipeline is the sole caller.
revoke execute on function public.apply_billing_update(uuid, text, text, text, text, text, timestamptz, boolean, timestamptz) from public, anon, authenticated;

comment on table public.billing_events is
  'Append-only billing event store: webhook idempotency (PK), crash recovery (processed_at), audit trail. Normalized updates only — no raw provider payloads.';
comment on table public.billing_subscriptions is
  'Per-user mirror of provider subscription truth. Written only via apply_billing_update (service role). Entitlement derives in lib/entitlement.ts.';
