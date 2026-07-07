// week.test.mjs — tests for the week-of-attention fold.
// Run from web/:  node --test lib/week.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWeek, humanDurationS } from './week.ts'

// Fixed "now": Tuesday 7 July 2026, 09:00 local — same convention as continuation tests.
const NOW = new Date(2026, 6, 7, 9, 0, 0)

function row({ daysAgo = 1, hour = 14, dur = 60 * 60, quality = 'deep', status = 'completed' } = {}) {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return { created_at: d.toISOString(), duration_s: dur, status, session_quality: quality }
}

test('an empty week is seven honest zero days', () => {
  const w = buildWeek([], NOW)
  assert.equal(w.days.length, 7)
  assert.ok(w.days[6].isToday)
  assert.equal(w.days[6].label, 'Tue')
  assert.equal(w.days[0].label, 'Wed') // 7 days ending today
  assert.equal(w.totalS, 0)
  assert.equal(w.maxDayS, 0)
  assert.equal(w.deepestLabel, null)
})

test('sessions land in their local day buckets and split by verification', () => {
  const w = buildWeek(
    [
      row({ daysAgo: 1, hour: 10, dur: 90 * 60, quality: 'deep' }),
      row({ daysAgo: 1, hour: 15, dur: 30 * 60, quality: 'unverified' }),
      row({ daysAgo: 3, hour: 20, dur: 45 * 60, quality: 'focused' }),
    ],
    NOW,
  )
  const yesterday = w.days[5]
  assert.equal(yesterday.verifiedS, 90 * 60)
  assert.equal(yesterday.unverifiedS, 30 * 60)
  assert.equal(yesterday.sessions, 2)
  assert.equal(w.verifiedS, 135 * 60)
  assert.equal(w.totalS, 165 * 60)
  assert.equal(w.sessionCount, 3)
  assert.equal(w.verifiedCount, 2)
  assert.equal(w.maxDayS, 120 * 60)
})

test('the deepest stretch prefers verified work and names its moment', () => {
  const w = buildWeek(
    [
      row({ daysAgo: 2, hour: 21, dur: 3 * 3600, quality: 'unverified' }), // longer, on trust
      row({ daysAgo: 1, hour: 9, dur: 2 * 3600, quality: 'deep' }),        // verified wins
    ],
    NOW,
  )
  assert.equal(w.deepestS, 2 * 3600)
  assert.equal(w.deepestLabel, 'Monday morning')
})

test('active sessions, zero durations, and out-of-window rows are ignored', () => {
  const w = buildWeek(
    [
      row({ daysAgo: 1, status: 'active' }),
      row({ daysAgo: 1, dur: 0 }),
      row({ daysAgo: 10 }),
    ],
    NOW,
  )
  assert.equal(w.sessionCount, 0)
  assert.equal(w.totalS, 0)
})

test('humanDurationS speaks the dashboard duration voice', () => {
  assert.equal(humanDurationS(8040), '2h 14m')
  assert.equal(humanDurationS(2700), '45m')
  assert.equal(humanDurationS(0), '0m')
})
