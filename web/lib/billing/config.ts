// lib/billing/config.ts — billing environment, validated in one place. Server-only.
// Going live is a configuration change: set the PADDLE_* variables in Vercel and the
// pipeline lights up. Until then billing is DISABLED and every billing surface is inert
// (the webhook route answers 404, no code path can grant paid entitlement).
//
// Placeholders (never hardcode values; secrets only in env):
//   PADDLE_ENVIRONMENT     sandbox | production        (default: sandbox)
//   PADDLE_WEBHOOK_SECRET  webhook signing secret      (server; enables the pipeline)
//   PADDLE_API_KEY         server API key              (server; portal/checkout session use)
//   PADDLE_CLIENT_TOKEN    client-side checkout token  (public by design, still env-driven)
//   PADDLE_PRODUCT_ID      product id
//   PADDLE_PRICE_MONTHLY   price id for the monthly plan
//   PADDLE_PRICE_YEARLY    price id for the annual plan

import 'server-only'

export type BillingEnvironment = 'sandbox' | 'production'

export interface BillingConfig {
  enabled: boolean
  environment: BillingEnvironment
  webhookSecret: string | null
  apiKey: string | null
  clientToken: string | null
  productId: string | null
  priceMonthly: string | null
  priceYearly: string | null
}

export function getBillingConfig(): BillingConfig {
  const environment: BillingEnvironment =
    process.env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || null
  return {
    // The webhook secret is the minimum viable configuration; everything else is
    // needed only when the checkout UI ships.
    enabled: webhookSecret !== null,
    environment,
    webhookSecret,
    apiKey: process.env.PADDLE_API_KEY || null,
    clientToken: process.env.PADDLE_CLIENT_TOKEN || null,
    productId: process.env.PADDLE_PRODUCT_ID || null,
    priceMonthly: process.env.PADDLE_PRICE_MONTHLY || null,
    priceYearly: process.env.PADDLE_PRICE_YEARLY || null,
  }
}

/**
 * Full-configuration gate for the future checkout flow: call before rendering any
 * upgrade surface so a half-configured environment fails loudly at the seam,
 * never silently at the customer.
 */
export function assertCheckoutConfigured(cfg: BillingConfig = getBillingConfig()): void {
  const missing = (
    [
      ['PADDLE_WEBHOOK_SECRET', cfg.webhookSecret],
      ['PADDLE_API_KEY', cfg.apiKey],
      ['PADDLE_CLIENT_TOKEN', cfg.clientToken],
      ['PADDLE_PRODUCT_ID', cfg.productId],
      ['PADDLE_PRICE_MONTHLY', cfg.priceMonthly],
      ['PADDLE_PRICE_YEARLY', cfg.priceYearly],
    ] as const
  ).filter(([, v]) => !v).map(([k]) => k)
  if (missing.length > 0) {
    throw new Error(`Billing checkout not configured; missing: ${missing.join(', ')}`)
  }
}
