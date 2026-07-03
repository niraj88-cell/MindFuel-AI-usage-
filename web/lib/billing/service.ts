// lib/billing/service.ts — SubscriptionService: the ONLY writer of billing state.
// Orchestrates webhook → event store → mirror, entirely server-side (service role),
// entirely provider-agnostic (everything Paddle-shaped stays in paddle.ts).
//
// Processing contract (retry-safe, queue-free by design):
//   1. verify signature (adapter, constant-time, replay-windowed)
//   2. persist to billing_events (PK event_id = duplicate detection). If the row
//      already exists AND was processed, ack as duplicate. If it exists but was
//      never marked processed (a crash mid-apply), fall through and apply again —
//      the apply step is idempotent, so completing a half-done event is safe.
//   3. apply the canonical update to billing_subscriptions with an out-of-order
//      guard (older provider events never overwrite newer state), refresh the
//      profiles display cache, mark the event processed.
//   4. any storage failure → 'retry' → HTTP 500 → the provider redelivers.
// Paddle's own retry schedule IS the queue: with idempotency + the order guard,
// synchronous processing of three small statements needs no broker to be correct.

import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/supabase/types'
import { createAdminClient } from '@/lib/supabase/server'
import { auditLog } from '@/lib/audit-log'
import { getBillingConfig, priceToPlan } from './config'
import { paddleProvider } from './paddle'
import type { BillingUpdate, PaymentProvider } from './types'

export type WebhookOutcome =
  | { status: 200; body: { received: true; duplicate?: true; ignored?: true } }
  | { status: 401 | 404 | 413 }
  | { status: 500 }

export const MAX_WEBHOOK_BYTES = 128 * 1024

function activeProvider(): PaymentProvider | null {
  const cfg = getBillingConfig()
  return cfg.enabled && cfg.webhookSecret ? paddleProvider(cfg.webhookSecret, priceToPlan(cfg)) : null
}

export async function processWebhook(
  rawBody: string,
  signatureHeader: string | null,
  now: number = Date.now(),
): Promise<WebhookOutcome> {
  const provider = activeProvider()
  if (!provider) return { status: 404 } // billing disabled: don't advertise the endpoint

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BYTES) return { status: 413 }

  const verified = provider.verifyWebhook(rawBody, signatureHeader, now)
  if (!verified.ok) {
    auditLog({
      type: 'billing.webhook_rejected',
      severity: 'warn',
      metadata: { provider: provider.id, reason: verified.reason },
    })
    return { status: 401 }
  }
  const event = verified.event

  const update = provider.mapEvent(event)
  if (update === 'unattributable') {
    // Relevant subscription event with no user id — someone will not get what they
    // paid for unless this is noticed. Loudest severity we have.
    auditLog({
      type: 'billing.event_unattributable',
      severity: 'critical',
      metadata: { provider: provider.id, eventId: event.eventId, eventType: event.eventType },
    })
    // Ack (200): redelivery cannot fix missing attribution; the audit trail owns it.
    return { status: 200, body: { received: true, ignored: true } }
  }

  const admin = createAdminClient()

  // -- 2. event store / duplicate detection ---------------------------------
  const { error: insertErr } = await admin.from('billing_events').insert({
    event_id: event.eventId,
    provider: provider.id,
    event_type: event.eventType,
    occurred_at: event.occurredAt,
    subscription_id: update?.providerSubscriptionId ?? null,
    user_id: update?.userId ?? null,
    // canonical normalized state only — never the raw payload (plain JSON by construction)
    update: update ? (JSON.parse(JSON.stringify(update)) as Json) : null,
  })
  if (insertErr) {
    if (insertErr.code === '23505') {
      const { data: existing } = await admin
        .from('billing_events')
        .select('processed_at')
        .eq('event_id', event.eventId)
        .maybeSingle()
      if (existing?.processed_at) {
        return { status: 200, body: { received: true, duplicate: true } }
      }
      // exists but unprocessed: a previous attempt died mid-apply — finish the job.
    } else {
      console.error('[billing] event store insert failed:', insertErr.code, insertErr.message)
      return { status: 500 }
    }
  }

  // -- 3. apply --------------------------------------------------------------
  if (update) {
    const applied = await applyUpdate(admin, update)
    if (!applied) return { status: 500 }
    auditLog({
      type: 'billing.subscription_updated',
      severity: 'info',
      userId: update.userId,
      metadata: {
        provider: provider.id,
        eventId: event.eventId,
        eventType: event.eventType,
        status: update.status,
        plan: update.plan,
      },
    })
  }

  const { error: markErr } = await admin
    .from('billing_events')
    .update({ processed_at: new Date(now).toISOString() })
    .eq('event_id', event.eventId)
  if (markErr) return { status: 500 } // safe: next delivery re-applies idempotently

  return { status: 200, body: update ? { received: true } : { received: true, ignored: true } }
}

// Upsert the mirror row, refusing to let an older event overwrite newer state.
// Both statements are idempotent — re-running the same update is a no-op.
async function applyUpdate(admin: SupabaseClient, u: BillingUpdate): Promise<boolean> {
  const { error } = await admin.rpc('apply_billing_update', {
    p_user_id: u.userId,
    p_provider: 'paddle',
    p_customer_id: u.providerCustomerId,
    p_subscription_id: u.providerSubscriptionId,
    p_plan: u.plan,
    p_status: u.status,
    p_period_end: u.currentPeriodEnd,
    p_cancel_at_period_end: u.cancelAtPeriodEnd,
    p_occurred_at: u.occurredAt,
  })
  if (error) {
    console.error('[billing] apply_billing_update failed:', error.code)
    return false
  }
  return true
}
