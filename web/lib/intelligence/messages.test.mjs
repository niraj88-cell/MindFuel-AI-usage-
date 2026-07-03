// messages.test.mjs — the Message Generation pipeline (templates + safety validator).
// Run from web/:  node --test lib/intelligence/messages.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateMessage, compose } from './messages.ts'

test('validator rejects shame / blame language', () => {
  for (const bad of [
    'You wasted three hours today.',
    "You're distracted again.",
    'You should try harder.',
    'Stop procrastinating.',
    'That was a failure.',
    'You are lazy.',
  ]) {
    assert.equal(validateMessage(bad).ok, false, `should reject: ${bad}`)
  }
})

test('validator rejects a leaked domain, emoji, and over-long text', () => {
  assert.equal(validateMessage('You spent a while on youtube.com today.').ok, false)
  assert.equal(validateMessage('Nice focus 🎉').ok, false)
  assert.equal(validateMessage('x'.repeat(300)).ok, false)
  assert.equal(validateMessage('   ').ok, false)
})

test('validator accepts kind, plain, domain-free lines', () => {
  for (const good of [
    'Mornings are quietly your best hours.',
    'You drifted and found your way back within the session.',
    "This week the hard part wasn't distraction itself. It was getting going again.",
  ]) {
    assert.equal(validateMessage(good).ok, true, `should accept: ${good}`)
  }
})

test('every authored template composes and passes its own validator', () => {
  const intents = [
    'insight:restart_difficulty', 'insight:morning_strength', 'insight:late_night_drift',
    'insight:weekend_collapse', 'insight:monday_resistance', 'insight:post_lunch_dip',
    'insight:rapid_fragmentation', 'insight:steady_improvement', 'insight:quiet_week',
    'notice:recovered_well', 'notice:calmer_than_usual',
  ]
  for (const intent of intents) {
    // Try several seeds/registers to exercise every phrasing.
    let anyOk = false
    for (const reg of ['reflective', 'supportive', 'encouraging', 'calm', 'curious']) {
      for (let seed = 0; seed < 4; seed++) {
        const m = compose(intent, reg, {}, seed)
        if (m) { assert.equal(validateMessage(m.text).ok, true, `${intent}/${reg}: ${m.text}`); anyOk = true }
      }
    }
    assert.ok(anyOk, `intent ${intent} should produce at least one message`)
  }
})

test('compose returns null for an unknown intent (caller stays silent)', () => {
  assert.equal(compose('insight:does_not_exist', 'reflective'), null)
})

test('numeric noticings interpolate context safely', () => {
  const m = compose('notice:beat_typical_streak', 'encouraging', { streakMin: 42, typicalMin: 18 }, 0)
  assert.ok(m)
  assert.match(m.text, /42 min/)
  assert.match(m.text, /18 min/)
  assert.equal(validateMessage(m.text).ok, true)
})
