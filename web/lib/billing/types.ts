// lib/billing/types.ts — provider-agnostic billing contracts.
// Application code depends on THESE types only. Paddle (or any future provider)
// is an adapter that translates its webhooks into a canonical BillingUpdate.
// Nothing outside lib/billing/ may import a provider SDK or parse provider payloads.

/** Canonical subscription status stored in billing_subscriptions.status. */
export type ProviderSubStatus = 'active' | 'past_due' | 'paused' | 'canceled'

/**
 * The one normalized fact a provider event can assert. Deliberately small:
 * everything the entitlement engine needs, nothing else — and safe to persist
 * (ids, plan, status, timestamps; never card data, names, or addresses).
 */
export interface BillingUpdate {
  userId: string
  status: ProviderSubStatus
  plan: string | null
  providerCustomerId: string | null
  providerSubscriptionId: string
  currentPeriodEnd: string | null // ISO
  cancelAtPeriodEnd: boolean
  occurredAt: string // ISO, provider clock — drives the out-of-order guard
}

/** A verified, parsed webhook event before mapping. */
export interface VerifiedEvent {
  eventId: string
  eventType: string
  occurredAt: string
  /** Raw parsed payload; stays inside lib/billing (never persisted verbatim). */
  data: Record<string, unknown>
}

export type VerifyResult =
  | { ok: true; event: VerifiedEvent }
  | { ok: false; reason: 'bad_signature' | 'stale_timestamp' | 'malformed' }

/**
 * PaymentProvider — the seam. One implementation today (Paddle); the contract is
 * what makes a provider swap a configuration exercise instead of a rewrite.
 */
export interface PaymentProvider {
  readonly id: string
  /** Verify a raw webhook body against its signature header. Constant-time. */
  verifyWebhook(rawBody: string, signatureHeader: string | null, now?: number): VerifyResult
  /**
   * Translate a verified event into a canonical update.
   * null = event type is not subscription-relevant (acknowledge and ignore).
   * 'unattributable' = relevant but no user id — must be audited loudly.
   */
  mapEvent(event: VerifiedEvent): BillingUpdate | null | 'unattributable'
}
