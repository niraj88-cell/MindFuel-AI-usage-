// lib/subscription.ts — subscription foundation (no payment processor wired yet).
// The product has one plan: SatyaShift. Everyone starts with a 14-day trial;
// until billing opens nobody can be charged and nothing is gated. Status is
// DERIVED (never stored) so it can't drift from the two facts that define it:
// trial_ends_at and subscription_plan on profiles.

export const TRIAL_DAYS = 14

export const PLANS = {
  monthly: {
    id: 'monthly' as const,
    label: 'Monthly',
    priceUsd: 8,
    period: 'month' as const,
    note: null,
  },
  annual: {
    id: 'annual' as const,
    label: 'Annual',
    priceUsd: 30,
    period: 'year' as const,
    note: 'Launch price for your first year.',
  },
}

export type PlanId = keyof typeof PLANS

export interface SubscriptionState {
  /** active = has a plan · trialing = inside the 14 days · free = trial over, billing not started */
  status: 'active' | 'trialing' | 'free'
  plan: PlanId | null
  trialEndsAt: Date | null
  trialDaysLeft: number
}

export function getSubscriptionState(row: {
  subscription_plan?: string | null
  trial_ends_at?: string | null
} | null): SubscriptionState {
  const plan = row?.subscription_plan === 'monthly' || row?.subscription_plan === 'annual'
    ? row.subscription_plan
    : null
  const trialEndsAt = row?.trial_ends_at ? new Date(row.trial_ends_at) : null

  if (plan) {
    return { status: 'active', plan, trialEndsAt, trialDaysLeft: 0 }
  }

  const msLeft = trialEndsAt ? trialEndsAt.getTime() - Date.now() : 0
  const trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000))

  return {
    status: trialDaysLeft > 0 ? 'trialing' : 'free',
    plan: null,
    trialEndsAt,
    trialDaysLeft,
  }
}
