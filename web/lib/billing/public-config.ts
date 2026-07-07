// lib/billing/public-config.ts — the NON-SECRET Paddle config, safe on the client.
// NO 'server-only' fence: the browser checkout needs these values, and Paddle designs the
// client-side token + price ids to be public. Secrets (webhook secret, API key) live only
// in server config.ts and never reach here. Next.js inlines NEXT_PUBLIC_* at build for both
// server and client, so server config.ts reads through this module too — one var per value.

export type BillingEnvironment = 'sandbox' | 'production'

export interface PaddlePublicConfig {
  environment: BillingEnvironment
  clientToken: string | null
  priceMonthly: string | null
  priceYearly: string | null
  /** True when the overlay checkout can actually be opened. */
  checkoutEnabled: boolean
  /** Optional founding-member offer: a Paddle discount id (dsc_…) for 50% off the FIRST
   *  month, created in the Paddle dashboard. The UI mentions the offer ONLY when this is
   *  set, so the page can never promise a discount the checkout won't apply. */
  discountMonthly?: string | null
}

export function readPaddlePublicEnv(): PaddlePublicConfig {
  const environment: BillingEnvironment =
    process.env.NEXT_PUBLIC_PADDLE_ENV === 'production' ? 'production' : 'sandbox'
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || null
  const priceMonthly = process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || null
  const priceYearly = process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || null
  return {
    environment,
    clientToken,
    priceMonthly,
    priceYearly,
    checkoutEnabled: !!(clientToken && priceMonthly && priceYearly),
    discountMonthly: process.env.NEXT_PUBLIC_PADDLE_DISCOUNT_MONTHLY || null,
  }
}
