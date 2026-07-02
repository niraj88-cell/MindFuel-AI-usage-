// lib/billing/gate.ts — the server-side entitlement gate (feature gating contract).
// Every future premium surface calls ONE of these two functions; nothing else may
// decide access. Client state is never trusted: both read the database under the
// caller's own RLS session and derive through lib/entitlement.ts.
//
// NOT applied to any route yet — per DECISIONS.md, gating ships only with checkout,
// and gates the social layer, never the user's own data.

import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { entitlementOf, type Entitlement, type SubscriptionRow } from '@/lib/entitlement'

/** Load both billing facts (profile cache + provider mirror) and derive. */
export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string,
  now: number = Date.now(),
): Promise<Entitlement> {
  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from('profiles').select('trial_ends_at, subscription_plan').eq('id', userId).maybeSingle(),
    supabase
      .from('billing_subscriptions')
      .select('status, plan, current_period_end, occurred_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  // A read failure degrades to the profile-only view; it can only ever deny paid
  // state, never grant it (fail-closed for premium, fail-open for nothing).
  return entitlementOf(profile ?? null, (sub as SubscriptionRow | null) ?? null, now)
}

/**
 * Route guard for future premium endpoints:
 *   const gate = await requirePremium(supabase, userId)
 *   if (!gate.ok) return gate.response
 * Generic 402 body by house rule (no entitlement details leak to the client;
 * the UI learns the friendly state through its own profile queries).
 */
export async function requirePremium(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; entitlement: Entitlement } | { ok: false; response: Response }> {
  const entitlement = await getEntitlement(supabase, userId)
  if (entitlement.premium) return { ok: true, entitlement }
  return {
    ok: false,
    response: Response.json({ error: 'Subscription required' }, { status: 402 }),
  }
}
