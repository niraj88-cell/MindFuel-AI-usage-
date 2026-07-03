// patterns.test.mjs — Pattern Discovery. Run from web/: node --test lib/intelligence/patterns.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSession, qualityOf } from '../behavior.ts'
import { emptyProfile, updateProfile } from './traits.ts'
import { discoverPatterns, topPatterns } from './patterns.ts'

const MIN = 60
const p = (dur) => [{ domain: 'github.com', category: 'productive', duration_s: dur }]
const drift = (dur) => [
  { domain: 'github.com', category: 'productive', duration_s: 10 * MIN },
  { domain: 'youtube.com', category: 'distraction', duration_s: dur },
  { domain: 'github.com', category: 'productive', duration_s: 5 * MIN },
]

function rec(events, hour, dow, day) {
  const signals = analyzeSession(events)
  return { startedAt: `2026-01-${String(day).padStart(2, '0')}T00:00:00Z`, durationS: signals.total_s, quality: qualityOf(signals), signals, hour, dow }
}

test('empty / thin profiles yield no patterns (needs evidence)', () => {
  assert.deepEqual(discoverPatterns(emptyProfile()), [])
})

test('late-night drift is discovered when evenings are distraction-heavy', () => {
  let prof = emptyProfile()
  let day = 1
  // Clean mornings...
  for (let i = 0; i < 8; i++) prof = updateProfile(prof, rec(p(45 * MIN), 9, 3, day++))
  // ...distracted late nights.
  for (let i = 0; i < 8; i++) prof = updateProfile(prof, rec(drift(15 * MIN), 23, 3, day++))
  const kinds = topPatterns(prof).map((s) => s.kind)
  assert.ok(kinds.includes('late_night_drift'), `expected late_night_drift, got ${kinds.join(',')}`)
})

test('weekend collapse is discovered when weekends scatter more than weekdays', () => {
  let prof = emptyProfile()
  let day = 1
  for (let i = 0; i < 8; i++) prof = updateProfile(prof, rec(p(45 * MIN), 10, 3, day++)) // Wed clean
  for (let i = 0; i < 6; i++) prof = updateProfile(prof, rec(drift(18 * MIN), 15, 6, day++)) // Sat scattered
  const kinds = topPatterns(prof).map((s) => s.kind)
  assert.ok(kinds.includes('weekend_collapse'), `got ${kinds.join(',')}`)
})

test('every discovered pattern carries strength, confidence, and evidence', () => {
  let prof = emptyProfile()
  let day = 1
  for (let i = 0; i < 8; i++) prof = updateProfile(prof, rec(p(45 * MIN), 9, 3, day++))
  for (let i = 0; i < 8; i++) prof = updateProfile(prof, rec(drift(15 * MIN), 23, 3, day++))
  for (const s of discoverPatterns(prof)) {
    assert.ok(s.strength >= 0 && s.strength <= 1)
    assert.ok(s.confidence >= 0 && s.confidence <= 1)
    assert.ok(Array.isArray(s.evidence) && s.evidence.length > 0)
  }
})
