alter table public.profiles
add column if not exists onboarding_completed boolean default false not null,
add column if not exists content_love text,
add column if not exists content_regret text;
