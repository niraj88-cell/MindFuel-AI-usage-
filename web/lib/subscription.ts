// lib/subscription.ts — plan constants + the display-level subscription summary.
// The AUTHORITATIVE access decision lives in lib/entitlement.ts (entitlementOf);
// this module keeps the stable UI-facing API (profile + pricing pages) and derives
// its answer from the same engine so the two can never disagree.

import { entitlementOf, type ProfileBillingRow } from '@/lib/entitlement'

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

export function getSubscriptionState(row: ProfileBillingRow | null): SubscriptionState {
  // Display summary from the profile cache only (the webhook keeps subscription_plan
  // in sync with the provider). Access gating must use entitlementOf with the mirror row.
  const e = entitlementOf(row, null)
  const plan = row?.subscription_plan === 'monthly' || row?.subscription_plan === 'annual'
    ? (row.subscription_plan as PlanId)
    : null

  if (plan || e.state === 'lifetime') {
    return { status: 'active', plan, trialEndsAt: e.trialEndsAt, trialDaysLeft: 0 }
  }
  return {
    status: e.state === 'trial' ? 'trialing' : 'free',
    plan: null,
    trialEndsAt: e.trialEndsAt,
    trialDaysLeft: e.trialDaysLeft,
  }
}
