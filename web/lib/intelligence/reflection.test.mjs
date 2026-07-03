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
