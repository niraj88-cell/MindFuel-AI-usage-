// confidence.test.mjs — the Confidence Engine.
// Run from web/:  node --test lib/intelligence/confidence.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { confidence, daysSince, canSpeak, canAct, CONFIDENCE } from './confidence.ts'

test('no evidence is never confident (silence by default)', () => {
  assert.equal(confidence(0), 0)
  assert.equal(confidence(0, 0, 0), 0)
})

test('confidence rises monotonically with sample size', () => {
  let prev = -1
  for (const n of [1, 2, 3, 6, 12, 30, 100]) {
    const c = confidence(n)
    assert.ok(c > prev, `n=${n} should exceed the previous`)
    assert.ok(c <= 1)
    prev = c
  }
})

test('fresh evidence beats stale evidence at equal sample size', () => {
  assert.ok(confidence(12, 0) > confidence(12, 60))
  assert.ok(confidence(12, 60) > confidence(12, 180))
})

test('higher variance lowers confidence', () => {
  const steady = confidence(12, 0, 0)
  const noisy = confidence(12, 0, 0.6)
  assert.ok(noisy < steady)
})

test('a handful of sessions does not yet clear the speak bar', () => {
  // 2 recent sessions: real but not enough to make a claim about someone.
  assert.ok(!canSpeak(confidence(2, 0)))
  // A couple of weeks of near-daily sessions should.
  assert.ok(canSpeak(confidence(14, 1)))
})

test('the act bar is stricter than the speak bar', () => {
  assert.ok(CONFIDENCE.act > CONFIDENCE.speak)
  const c = confidence(8, 2)
  if (canAct(c)) assert.ok(canSpeak(c), 'anything actionable is also speakable')
})

test('daysSince handles null and bad input as infinitely stale', () => {
  assert.equal(daysSince(null), Infinity)
  assert.equal(daysSince('not-a-date'), Infinity)
  const now = Date.UTC(2026, 0, 10)
  assert.equal(daysSince(new Date(Date.UTC(2026, 0, 5)).toISOString(), now), 5)
  // Future timestamps never go negative.
  assert.equal(daysSince(new Date(Date.UTC(2026, 0, 20)).toISOString(), now), 0)
})
