// lib/billing/config.ts — billing environment, validated in one place. Server-only.
// Going live is a configuration change: set the PADDLE_* / NEXT_PUBLIC_PADDLE_* variables
// in Vercel and the pipeline lights up. Until then billing is DISABLED and every billing
// surface is inert (the webhook route answers 404, no code path grants paid entitlement).
//
// Secret, server-only (never NEXT_PUBLIC):
//   PADDLE_WEBHOOK_SECRET  webhook signing secret   — enables the webhook pipeline
//   PADDLE_API_KEY         server API key           — portal sessions (server → Paddle API)
// Non-secret, safe on the client (Paddle designs the client token + price ids to be public):
//   NEXT_PUBLIC_PADDLE_ENV           sandbox | production
//   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN  Paddle.js client-side token
//   NEXT_PUBLIC_PADDLE_PRICE_MONTHLY price id for the $8/mo plan
//   NEXT_PUBLIC_PADDLE_PRICE_YEARLY  price id for the annual plan
// (PADDLE_PRODUCT_ID is intentionally not used at runtime — the price ids drive checkout
// and the price→plan map below; the product id lives only in the Paddle dashboard.)

import 'server-only'
import { readPaddlePublicEnv, type BillingEnvironment } from './public-config'

export type { BillingEnvironment }

export interface BillingConfig {
  /** Webhook pipeline is live (the minimum viable configuration). */
  enabled: boolean
  /** Checkout UI can be shown (client token + both price ids present). */
  checkoutEnabled: boolean
  environment: BillingEnvironment
  webhookSecret: string | null
  apiKey: string | null
  clientToken: string | null
  priceMonthly: string | null
  priceYearly: string | null
}

export function getBillingConfig(): BillingConfig {
  const pub = readPaddlePublicEnv()
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || null
  return {
    enabled: webhookSecret !== null,
    checkoutEnabled: !!(pub.clientToken && pub.priceMonthly && pub.priceYearly),
    environment: pub.environment,
    webhookSecret,
    apiKey: process.env.PADDLE_API_KEY || null,
    clientToken: pub.clientToken,
    priceMonthly: pub.priceMonthly,
    priceYearly: pub.priceYearly,
  }
}

/** Paddle REST API base for the configured environment (portal sessions live here). */
export function paddleApiBase(env: BillingEnvironment = getBillingConfig().environment): string {
  return env === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'
}

/**
 * Maps a Paddle price id → our canonical plan ('monthly' | 'annual'). Derived from the
 * same price-id env vars the checkout uses, so the webhook resolves plan WITHOUT relying
 * on custom_data being set on each price in the dashboard (one less manual step, one less
 * silent-failure mode: an unmapped plan would leave profiles.subscription_plan null).
 */
export function priceToPlan(cfg: BillingConfig = getBillingConfig()): Record<string, 'monthly' | 'annual'> {
  const map: Record<string, 'monthly' | 'annual'> = {}
  if (cfg.priceMonthly) map[cfg.priceMonthly] = 'monthly'
  if (cfg.priceYearly) map[cfg.priceYearly] = 'annual'
  return map
}

/**
 * Full-configuration gate for server billing actions (portal). Fails loudly at the seam,
 * never silently at the customer. Checkout readiness is `checkoutEnabled` (client side).
 */
export function assertServerBillingConfigured(cfg: BillingConfig = getBillingConfig()): void {
  const missing = (
    [
      ['PADDLE_WEBHOOK_SECRET', cfg.webhookSecret],
      ['PADDLE_API_KEY', cfg.apiKey],
      ['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN', cfg.clientToken],
      ['NEXT_PUBLIC_PADDLE_PRICE_MONTHLY', cfg.priceMonthly],
      ['NEXT_PUBLIC_PADDLE_PRICE_YEARLY', cfg.priceYearly],
    ] as const
  ).filter(([, v]) => !v).map(([k]) => k)
  if (missing.length > 0) {
    throw new Error(`Billing not fully configured; missing: ${missing.join(', ')}`)
  }
}
