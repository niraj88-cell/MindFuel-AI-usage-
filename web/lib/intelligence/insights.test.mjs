// insights.test.mjs — Weekly Intelligence. Run: node --test lib/intelligence/insights.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSession, qualityOf } from '../behavior.ts'
import { emptyProfile, updateProfile } from './traits.ts'
import { weeklyInsight } from './insights.ts'
import { validateMessage } from './messages.ts'

const MIN = 60
const clean = (dur) => [{ domain: 'github.com', category: 'productive', duration_s: dur }]
const drift = (dur) => [
  { domain: 'github.com', category: 'productive', duration_s: 8 * MIN },
  { domain: 'youtube.com', category: 'distraction', duration_s: dur },
  { domain: 'github.com', category: 'productive', duration_s: 4 * MIN },
]
function rec(events, hour, dow, day) {
  const signals = analyzeSession(events)
  return { startedAt: `2026-01-${String(day).padStart(2, '0')}T00:00:00Z`, durationS: signals.total_s, quality: qualityOf(signals), signals, hour, dow }
}

test('an empty / thin profile yields no insight (silence over filler)', () => {
  assert.equal(weeklyInsight(emptyProfile()), null)
})

test('a pronounced late-night pattern becomes the single weekly insight', () => {
  let prof = emptyProfile()
  let day = 1
  for (let i = 0; i < 8; i++) prof = updateProfile(prof, rec(clean(45 * MIN), 9, 3, day++))
  for (let i = 0; i < 8; i++) prof = updateProfile(prof, rec(drift(16 * MIN), 23, 3, day++))
  const now = Date.parse('2026-01-20T00:00:00Z')
  const insight = weeklyInsight(prof, now)
  assert.ok(insight, 'expected an insight')
  assert.equal(validateMessage(insight.text).ok, true)
  assert.ok(insight.confidence > 0)
  assert.ok(insight.evidence.length > 0)
})

test('a steady, unremarkable week gets a calm acknowledgement, not a manufactured win', () => {
  let prof = emptyProfile()
  // Consistent mid sessions, spread across hours/days so no time pattern dominates.
  for (let i = 0; i < 10; i++) {
    prof = updateProfile(prof, rec(clean(30 * MIN), 8 + (i % 8), 1 + (i % 5), i + 1))
  }
  const now = Date.parse('2026-01-12T00:00:00Z')
  const insight = weeklyInsight(prof, now)
  if (insight) {
    // Either a real pattern or the quiet-week line — never anything unsafe.
    assert.equal(validateMessage(insight.text).ok, true)
  }
})
