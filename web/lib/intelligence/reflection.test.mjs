// reflection.test.mjs — profile-aware session noticing. Run: node --test lib/intelligence/reflection.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSession, qualityOf } from '../behavior.ts'
import { emptyProfile, updateProfile } from './traits.ts'
import { sessionNoticing } from './reflection.ts'
import { validateMessage } from './messages.ts'

const MIN = 60
function rec(events, { day = 1, hour = 10 } = {}) {
  const signals = analyzeSession(events)
  return { startedAt: `2026-01-${String(day).padStart(2, '0')}T10:00:00Z`, durationS: signals.total_s, quality: qualityOf(signals), signals, hour, dow: 3 }
}

// A session with real drift that ends clean (so recovery is observed).
const recoverEvents = [
  { domain: 'github.com', category: 'productive', duration_s: 15 * MIN },
  { domain: 'youtube.com', category: 'distraction', duration_s: 4 * MIN },
  { domain: 'github.com', category: 'productive', duration_s: 15 * MIN },
]

test('thin profile with no history says nothing', () => {
  const out = sessionNoticing(rec(recoverEvents), emptyProfile(), [])
  assert.equal(out, null)
})

test('after a history of recoveries, a clean comeback is noticed and passes validation', () => {
  // Build recovery confidence.
  let prof = emptyProfile()
  for (let i = 0; i < 14; i++) prof = updateProfile(prof, rec(recoverEvents, { day: i + 1 }))
  const now = Date.parse('2026-01-15T10:00:00Z')
  const out = sessionNoticing(rec(recoverEvents, { day: 15 }), prof, [], now)
  assert.ok(out, 'should produce a noticing')
  assert.equal(validateMessage(out.line).ok, true)
  assert.ok(out.confidence > 0)
  assert.ok(['supportive', 'reflective', 'calm', 'encouraging', 'curious'].includes(out.register))
})

// A profile whose typical sessions are heavily fragmented (high attentionFragmentation
// value with real confidence) — the precondition for any "calmer than usual" claim.
function fragmentedProfile() {
  const scattered = []
  for (let i = 0; i < 15; i++) {
    scattered.push({ domain: 'docs.google.com', category: 'neutral', duration_s: MIN })
    scattered.push({ domain: 'x.com', category: 'distraction', duration_s: MIN })
  }
  let prof = emptyProfile()
  for (let i = 0; i < 14; i++) prof = updateProfile(prof, rec(scattered, { day: i + 1 }))
  return prof
}
const NOW = Date.parse('2026-01-15T10:00:00Z')

test('COHERENCE: a distracted session is never praised as calmer than usual', () => {
  // The shipped bug: 25 straight minutes on one distracting site — quality "distracted",
  // near-zero switching — and the old engine answered "steadier than your recent run".
  const prof = fragmentedProfile()
  const distracted = rec([{ domain: 'youtube.com', category: 'distraction', duration_s: 25 * MIN }], { day: 15 })
  assert.equal(sessionNoticing(distracted, prof, [], NOW), null, 'no praise under a distracted ledger')
})

test('EVIDENCE FLOOR: a quiet session under 20 minutes cannot support a rate claim', () => {
  const prof = fragmentedProfile()
  const shortQuiet = rec([{ domain: 'github.com', category: 'productive', duration_s: 10 * MIN }], { day: 15 })
  assert.equal(sessionNoticing(shortQuiet, prof, [], NOW), null, '10 minutes of one tab proves nothing about rates')

  // The same shape with a real sample DOES earn the insight — and it carries its numbers.
  const longQuiet = rec([{ domain: 'github.com', category: 'productive', duration_s: 25 * MIN }], { day: 15 })
  const out = sessionNoticing(longQuiet, prof, [], NOW)
  assert.ok(out, 'a 25-minute quiet session against a fragmented typical earns the claim')
  assert.equal(out.tier, 'insight')
  assert.match(out.line, /\d/, 'the claim states the measured comparison, not an adjective')
  assert.equal(validateMessage(out.line).ok, true)
})

test('THIN EVIDENCE: a session the browser barely saw gets no note at all', () => {
  // 10 witnessed minutes of a 60-minute session. The streak comparison would fire on the
  // numbers alone — but commenting on a session we barely saw is a guess, so: silence.
  const sig = analyzeSession([{ domain: 'github.com', category: 'productive', duration_s: 10 * MIN }])
  const record = { startedAt: '2026-01-15T10:00:00Z', durationS: 60 * MIN, quality: qualityOf(sig, 60 * MIN), signals: sig, hour: 10, dow: 3 }
  const flat = analyzeSession([{ domain: 'github.com', category: 'productive', duration_s: MIN }])
  assert.equal(sessionNoticing(record, fragmentedProfile(), [flat, flat, flat], NOW), null)
})

test('COHERENCE: the streak comparison never praises a mostly-distracted session', () => {
  // A 20-minute streak inside a 70-minute session that was mostly drift: the streak beats
  // the user's typical, but praising it under a "distracted" ledger would be incoherent.
  const events = [
    { domain: 'github.com', category: 'productive', duration_s: 20 * MIN },
    { domain: 'youtube.com', category: 'distraction', duration_s: 50 * MIN },
  ]
  const flat = analyzeSession([
    { domain: 'github.com', category: 'productive', duration_s: 5 * MIN },
    { domain: 'x.com', category: 'distraction', duration_s: 2 * MIN },
  ])
  assert.equal(sessionNoticing(rec(events), emptyProfile(), [flat, flat, flat]), null)
})

test('DETERMINISM: same session, same profile, same seed → the same words every visit', () => {
  let prof = emptyProfile()
  for (let i = 0; i < 14; i++) prof = updateProfile(prof, rec(recoverEvents, { day: i + 1 }))
  const a = sessionNoticing(rec(recoverEvents, { day: 15 }), prof, [], NOW, 12345)
  const b = sessionNoticing(rec(recoverEvents, { day: 15 }), prof, [], NOW, 12345)
  assert.ok(a, 'the recovery noticing fires')
  assert.deepEqual(a, b)
})

test('falls back to behaviors numeric baseline when the profile is not yet confident', () => {
  // A strong outlier streak vs a flat history triggers behavior.noticeAgainstBaseline.
  const flat = analyzeSession([
    { domain: 'github.com', category: 'productive', duration_s: 5 * MIN },
    { domain: 'reddit.com', category: 'distraction', duration_s: 5 * MIN },
  ])
  const history = [flat, flat, flat]
  const bigStreak = rec([{ domain: 'github.com', category: 'productive', duration_s: 40 * MIN }])
  const out = sessionNoticing(bigStreak, emptyProfile(), history)
  assert.ok(out, 'baseline fallback should still speak from history')
  assert.equal(validateMessage(out.line).ok, true)
})
