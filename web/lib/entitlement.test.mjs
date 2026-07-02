// entitlement.test.mjs — the access state machine, proven.
// Run from web/:  node --test lib/entitlement.test.mjs
// Same no-build pattern as behavior.test.mjs (Node strips types from the .ts import).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { entitlementOf, GRACE_DAYS } from './entitlement.ts'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 6, 3) // fixed clock
const iso = (t) => new Date(t).toISOString()

const sub = (over = {}) => ({
  status: 'active',
  plan: 'monthly',
  current_period_end: iso(NOW + 20 * DAY),
  occurred_at: iso(NOW - DAY),
  ...over,
})

test('trial: no subscription, inside the 14 days', () => {
  const e = entitlementOf({ trial_ends_at: iso(NOW + 3 * DAY) }, null, NOW)
  assert.equal(e.state, 'trial')
  assert.equal(e.premium, true)
  assert.equal(e.trialDaysLeft, 3)
})

test('expired: trial over, no subscription — and null/missing profile is never premium', () => {
  assert.equal(entitlementOf({ trial_ends_at: iso(NOW - DAY) }, null, NOW).state, 'expired')
  assert.equal(entitlementOf({ trial_ends_at: iso(NOW - DAY) }, null, NOW).premium, false)
  assert.equal(entitlementOf(null, null, NOW).premium, false)
  assert.equal(entitlementOf({}, null, NOW).premium, false)
})

test('active subscription is premium regardless of the trial clock', () => {
  const e = entitlementOf({ trial_ends_at: iso(NOW - 30 * DAY) }, sub(), NOW)
  assert.equal(e.state, 'active')
  assert.equal(e.premium, true)
  assert.equal(e.plan, 'monthly')
})

test('past_due: grace period holds access, then closes', () => {
  const failedAt = iso(NOW - 2 * DAY)
  const inGrace = entitlementOf({}, sub({ status: 'past_due', occurred_at: failedAt }), NOW)
  assert.equal(inGrace.state, 'grace_period')
  assert.equal(inGrace.premium, true)

  const lateNow = NOW + (GRACE_DAYS + 1) * DAY
  const exhausted = entitlementOf({}, sub({ status: 'past_due', occurred_at: failedAt }), lateNow)
  assert.equal(exhausted.state, 'past_due')
  assert.equal(exhausted.premium, false)
})

test('paused: never premium', () => {
  const e = entitlementOf({}, sub({ status: 'paused' }), NOW)
  assert.equal(e.state, 'paused')
  assert.equal(e.premium, false)
})

test('cancelled: paid period is honored, then expired', () => {
  const running = entitlementOf({}, sub({ status: 'canceled', current_period_end: iso(NOW + 5 * DAY) }), NOW)
  assert.equal(running.state, 'cancelled')
  assert.equal(running.premium, true)
  assert.equal(running.accessUntil.getTime(), NOW + 5 * DAY)

  const over = entitlementOf({}, sub({ status: 'canceled', current_period_end: iso(NOW - DAY) }), NOW)
  assert.equal(over.state, 'expired')
  assert.equal(over.premium, false)
})

test('lifetime: profile grant wins over everything, provider row or not', () => {
  const alone = entitlementOf({ subscription_plan: 'lifetime' }, null, NOW)
  assert.equal(alone.state, 'lifetime')
  assert.equal(alone.premium, true)
  const withCanceled = entitlementOf(
    { subscription_plan: 'lifetime' },
    sub({ status: 'canceled', current_period_end: iso(NOW - DAY) }),
    NOW,
  )
  assert.equal(withCanceled.state, 'lifetime')
  assert.equal(withCanceled.premium, true)
})

test('fail-closed: an unknown mirror status can never grant premium', () => {
  const e = entitlementOf({ trial_ends_at: iso(NOW - DAY) }, sub({ status: 'weird_new_status' }), NOW)
  assert.equal(e.premium, false)
})
