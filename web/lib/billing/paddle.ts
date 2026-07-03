// lib/billing/paddle.ts — the Paddle adapter (the ONLY file that knows Paddle's shapes).
// No SDK: verification is HMAC-SHA256 per Paddle's documented scheme and mapping is a
// plain translation, so the adapter stays auditable and dependency-free.
//
// Signature scheme (Paddle Billing "Paddle-Signature" header):
//   header  = "ts=<unix seconds>;h1=<hex hmac>"
//   signed  = "<ts>:<raw body>"
//   h1      = HMAC-SHA256(webhook secret, signed)
// We enforce a timestamp tolerance so a captured request cannot be replayed later,
// and compare digests in constant time.

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { BillingUpdate, PaymentProvider, ProviderSubStatus, VerifiedEvent, VerifyResult } from './types'

export const REPLAY_TOLERANCE_S = 300 // ±5 minutes

export function parseSignatureHeader(header: string): { ts: number; h1: string } | null {
  const parts = new Map<string, string>()
  for (const kv of header.split(';')) {
    const i = kv.indexOf('=')
    if (i > 0) parts.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim())
  }
  const ts = Number(parts.get('ts'))
  const h1 = parts.get('h1')
  if (!Number.isFinite(ts) || !h1 || !/^[0-9a-f]{64}$/i.test(h1)) return null
  return { ts, h1 }
}

/** Pure verification core — exported for tests. `now` in ms. */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  now: number = Date.now(),
): VerifyResult {
  if (!signatureHeader) return { ok: false, reason: 'bad_signature' }
  const parsed = parseSignatureHeader(signatureHeader)
  if (!parsed) return { ok: false, reason: 'bad_signature' }

  const expected = createHmac('sha256', secret).update(`${parsed.ts}:${rawBody}`).digest()
  const given = Buffer.from(parsed.h1, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad_signature' }
  }
  // Replay window checked AFTER authenticity so probing cannot distinguish the two.
  if (Math.abs(now / 1000 - parsed.ts) > REPLAY_TOLERANCE_S) {
    return { ok: false, reason: 'stale_timestamp' }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  const eventId = typeof body.event_id === 'string' ? body.event_id : null
  const eventType = typeof body.event_type === 'string' ? body.event_type : null
  const occurredAt = typeof body.occurred_at === 'string' ? body.occurred_at : null
  const data = body.data
  if (!eventId || !eventType || !occurredAt || typeof data !== 'object' || data === null) {
    return { ok: false, reason: 'malformed' }
  }
  return { ok: true, event: { eventId, eventType, occurredAt, data: data as Record<string, unknown> } }
}

// Paddle subscription statuses → canonical. Unknown statuses map to null (ignored,
// audited) rather than guessed — an unexpected provider state must never grant access.
const STATUS_MAP: Record<string, ProviderSubStatus> = {
  active: 'active',
  trialing: 'active', // provider-side trials are unused (our trial is cardless/app-managed)
  past_due: 'past_due',
  paused: 'paused',
  canceled: 'canceled',
}

/** Events that carry authoritative subscription state. Everything else is ignored. */
const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.activated',
  'subscription.updated',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'subscription.canceled',
])

/**
 * Pure mapping core — exported for tests.
 * `priceToPlan` maps our configured price ids → canonical plan ('monthly' | 'annual'),
 * so plan resolves from configuration and does NOT depend on custom_data being set on
 * each Paddle price. Optional and backward compatible.
 */
export function mapPaddleEvent(
  event: VerifiedEvent,
  priceToPlan: Record<string, 'monthly' | 'annual'> = {},
): BillingUpdate | null | 'unattributable' {
  if (!SUBSCRIPTION_EVENTS.has(event.eventType)) return null
  const d = event.data as {
    id?: string
    status?: string
    customer_id?: string
    custom_data?: { user_id?: string } | null
    current_billing_period?: { ends_at?: string } | null
    scheduled_change?: { action?: string } | null
    items?: { price?: { id?: string; custom_data?: { plan?: string } | null } }[]
  }

  const status = d.status ? STATUS_MAP[d.status] : undefined
  const subId = d.id
  if (!status || !subId) return null // not a state we act on (audited by the service)

  // Attribution: checkout passes custom_data.user_id (set by our upgrade flow).
  const userId = d.custom_data?.user_id
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return 'unattributable'

  // Plan resolution, in order: the price's custom_data.plan (explicit override) →
  // the configured price-id map → the raw price id (forensic fallback only; note the
  // profiles cache only accepts 'monthly'/'annual', so an unmapped price stays uncached).
  const item = d.items?.[0]
  const priceId = item?.price?.id
  const plan =
    item?.price?.custom_data?.plan ??
    (priceId && priceToPlan[priceId]) ??
    priceId ??
    null

  return {
    userId,
    status,
    plan,
    providerCustomerId: d.customer_id ?? null,
    providerSubscriptionId: subId,
    currentPeriodEnd: d.current_billing_period?.ends_at ?? null,
    cancelAtPeriodEnd: d.scheduled_change?.action === 'cancel',
    occurredAt: event.occurredAt,
  }
}

export function paddleProvider(
  secret: string,
  priceToPlan: Record<string, 'monthly' | 'annual'> = {},
): PaymentProvider {
  return {
    id: 'paddle',
    verifyWebhook: (rawBody, header, now) => verifyPaddleSignature(rawBody, header, secret, now),
    mapEvent: (event) => mapPaddleEvent(event, priceToPlan),
  }
}
