// paddle.test.mjs — the adapter's pure cores: signature verification and event mapping.
// Run from web/:  node --test lib/billing/paddle.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifyPaddleSignature, mapPaddleEvent, REPLAY_TOLERANCE_S } from './paddle.ts'

const SECRET = 'whsec_test_secret'
const NOW = Date.UTC(2026, 6, 3)
const USER = '8ff85973-d456-4dc2-ac35-676ce3f09c48'

const body = (over = {}) => JSON.stringify({
  event_id: 'evt_01',
  event_type: 'subscription.activated',
  occurred_at: new Date(NOW).toISOString(),
  data: {
    id: 'sub_01',
    status: 'active',
    customer_id: 'ctm_01',
    custom_data: { user_id: USER },
    current_billing_period: { ends_at: new Date(NOW + 30 * 86_400_000).toISOString() },
    items: [{ price: { id: 'pri_01', custom_data: { plan: 'monthly' } } }],
    ...over,
  },
})

const sign = (raw, ts = Math.floor(NOW / 1000), secret = SECRET) =>
  `ts=${ts};h1=${createHmac('sha256', secret).update(`${ts}:${raw}`).digest('hex')}`

test('verify: accepts a correctly signed, fresh payload', () => {
  const raw = body()
  const r = verifyPaddleSignature(raw, sign(raw), SECRET, NOW)
  assert.equal(r.ok, true)
  assert.equal(r.event.eventId, 'evt_01')
  assert.equal(r.event.eventType, 'subscription.activated')
})

test('verify: rejects wrong secret, tampered body, missing/garbage header', () => {
  const raw = body()
  assert.deepEqual(verifyPaddleSignature(raw, sign(raw, undefined, 'wrong'), SECRET, NOW), { ok: false, reason: 'bad_signature' })
  assert.deepEqual(verifyPaddleSignature(raw + ' ', sign(raw), SECRET, NOW), { ok: false, reason: 'bad_signature' })
  assert.deepEqual(verifyPaddleSignature(raw, null, SECRET, NOW), { ok: false, reason: 'bad_signature' })
  assert.deepEqual(verifyPaddleSignature(raw, 'ts=abc;h1=zz', SECRET, NOW), { ok: false, reason: 'bad_signature' })
})

test('verify: replay protection — a valid signature outside the window is rejected', () => {
  const raw = body()
  const staleTs = Math.floor(NOW / 1000) - REPLAY_TOLERANCE_S - 10
  const r = verifyPaddleSignature(raw, sign(raw, staleTs), SECRET, NOW)
  assert.deepEqual(r, { ok: false, reason: 'stale_timestamp' })
})

test('verify: signed-but-malformed JSON is rejected as malformed', () => {
  const raw = '{not json'
  const r = verifyPaddleSignature(raw, sign(raw), SECRET, NOW)
  assert.deepEqual(r, { ok: false, reason: 'malformed' })
})

test('map: subscription event → canonical update', () => {
  const v = verifyPaddleSignature(body(), sign(body()), SECRET, NOW)
  const u = mapPaddleEvent(v.event)
  assert.equal(u.userId, USER)
  assert.equal(u.status, 'active')
  assert.equal(u.plan, 'monthly')
  assert.equal(u.providerSubscriptionId, 'sub_01')
  assert.ok(u.currentPeriodEnd)
})

test('map: paused / past_due / canceled statuses map through; unknown status is ignored', () => {
  const evt = (status) => ({ eventId: 'e', eventType: 'subscription.updated', occurredAt: new Date(NOW).toISOString(), data: JSON.parse(body({ status })).data })
  assert.equal(mapPaddleEvent(evt('paused')).status, 'paused')
  assert.equal(mapPaddleEvent(evt('past_due')).status, 'past_due')
  assert.equal(mapPaddleEvent(evt('canceled')).status, 'canceled')
  assert.equal(mapPaddleEvent(evt('some_future_status')), null)
})

test('map: price→plan map resolves plan without custom_data, and custom_data still wins', () => {
  // A price with NO custom_data.plan resolves via the configured map.
  const noPlanData = JSON.parse(body({ items: [{ price: { id: 'pri_yearly_live' } }] })).data
  const evt = { eventId: 'e', eventType: 'subscription.activated', occurredAt: new Date(NOW).toISOString(), data: noPlanData }
  assert.equal(mapPaddleEvent(evt, { pri_yearly_live: 'annual' }).plan, 'annual')
  // Without the map (and no custom_data), plan falls back to the raw price id (forensic only).
  assert.equal(mapPaddleEvent(evt).plan, 'pri_yearly_live')
  // custom_data.plan is an explicit override and takes precedence over the map.
  const withCustom = JSON.parse(body({ items: [{ price: { id: 'pri_yearly_live', custom_data: { plan: 'monthly' } } }] })).data
  assert.equal(mapPaddleEvent({ ...evt, data: withCustom }, { pri_yearly_live: 'annual' }).plan, 'monthly')
})

test('map: irrelevant event types are ignored; missing user id is unattributable', () => {
  const base = { eventId: 'e', occurredAt: new Date(NOW).toISOString() }
  assert.equal(mapPaddleEvent({ ...base, eventType: 'transaction.completed', data: {} }), null)
  const noUser = JSON.parse(body({ custom_data: null })).data
  assert.equal(mapPaddleEvent({ ...base, eventType: 'subscription.activated', data: noUser }), 'unattributable')
  const badUser = JSON.parse(body({ custom_data: { user_id: 'nope' } })).data
  assert.equal(mapPaddleEvent({ ...base, eventType: 'subscription.activated', data: badUser }), 'unattributable')
})
