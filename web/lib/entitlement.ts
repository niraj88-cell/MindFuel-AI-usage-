// lib/entitlement.ts — the ONE place that decides what a user is entitled to.
// Pure and dependency-free so `node --test lib/entitlement.test.mjs` can prove the
// state machine (same pattern as behavior.ts). Every premium check in the app must go
// through entitlementOf — never read billing rows or trial dates directly in routes/UI.
//
// Inputs are the two server-owned facts:
//   * profiles.trial_ends_at / subscription_plan (the fast display cache, migration 016)
//   * billing_subscriptions (the provider mirror, written ONLY by the verified webhook)
// The provider (Paddle) is the source of truth for PAID state; this module only derives.

export type EntitlementState =
  | 'trial'         // inside the cardless 14-day trial, no subscription yet
  | 'active'        // paid and current
  | 'grace_period'  // payment failed; provider is dunning — access retained briefly
  | 'past_due'      // dunning exhausted our grace — access off until payment recovers
  | 'paused'        // user paused the subscription at the provider — access off
  | 'cancelled'     // cancelled but the paid period has not ended — access retained
  | 'expired'       // trial over with no plan, or a subscription that fully ended
  | 'lifetime'      // permanently entitled (founder grants); no provider row needed

/** Days of retained access after the provider first reports past_due. */
export const GRACE_DAYS = 14

export interface ProfileBillingRow {
  trial_ends_at?: string | null
  subscription_plan?: string | null
}

/** Mirror row shape (billing_subscriptions). All provider truth, webhook-written. */
export interface SubscriptionRow {
  status: 'active' | 'past_due' | 'paused' | 'canceled'
  plan: string | null
  current_period_end: string | null
  /** provider-side timestamp of the last applied event (out-of-order guard) */
  occurred_at: string | null
}

export interface Entitlement {
  state: EntitlementState
  /** The single gate every premium feature checks. */
  premium: boolean
  plan: string | null
  trialEndsAt: Date | null
  trialDaysLeft: number
  /** When retained access runs out (cancelled/grace), if known. */
  accessUntil: Date | null
}

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : null)

export function entitlementOf(
  profile: ProfileBillingRow | null,
  sub: SubscriptionRow | null,
  now: number = Date.now(),
): Entitlement {
  const trialEndsMs = ms(profile?.trial_ends_at)
  const trialEndsAt = trialEndsMs != null ? new Date(trialEndsMs) : null
  const trialDaysLeft = trialEndsMs != null ? Math.max(0, Math.ceil((trialEndsMs - now) / 86_400_000)) : 0

  const done = (state: EntitlementState, premium: boolean, plan: string | null, accessUntil: Date | null = null): Entitlement =>
    ({ state, premium, plan, trialEndsAt, trialDaysLeft, accessUntil })

  // Lifetime is a founder-granted plan value on the profile; it needs no provider row
  // and survives provider migrations.
  if (profile?.subscription_plan === 'lifetime') return done('lifetime', true, 'lifetime')

  if (sub) {
    const periodEnd = ms(sub.current_period_end)
    switch (sub.status) {
      case 'active':
        return done('active', true, sub.plan, periodEnd != null ? new Date(periodEnd) : null)
      case 'past_due': {
        // occurred_at marks when the provider told us dunning began.
        const since = ms(sub.occurred_at) ?? now
        const graceEnds = since + GRACE_DAYS * 86_400_000
        return now <= graceEnds
          ? done('grace_period', true, sub.plan, new Date(graceEnds))
          : done('past_due', false, sub.plan)
      }
      case 'paused':
        return done('paused', false, sub.plan)
      case 'canceled': {
        // Paid time is honored: entitled until the period the user paid for ends.
        if (periodEnd != null && now < periodEnd) return done('cancelled', true, sub.plan, new Date(periodEnd))
        return done('expired', false, null)
      }
    }
  }

  // No provider subscription: the cardless trial governs.
  if (trialEndsMs != null && now < trialEndsMs) return done('trial', true, null, trialEndsAt)
  return done('expired', false, null)
}
