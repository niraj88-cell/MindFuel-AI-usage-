// traits.test.mjs — Behavioral Memory + Learning Engine unit tests.
// Run from web/:  node --test lib/intelligence/traits.test.mjs
//
// Records are built from the REAL per-session engine (behavior.analyzeSession/qualityOf)
// so these tests exercise the actual signal shapes production stores, not hand-waved ones.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSession, qualityOf } from '../behavior.ts'
import {
  emptyProfile, updateProfile, deriveProfile, observe, readTrait, ALPHA,
} from './traits.ts'

const MIN = 60
const d = (domain, s) => ({ domain, category: 'distraction', duration_s: s })
const p = (domain, s) => ({ domain, category: 'productive', duration_s: s })

// Build a domain-free SessionRecord the way /api/focus/stop would.
function rec(events, { startedAt = '2026-01-01T09:00:00Z', hour = 9, dow = 4 } = {}) {
  const signals = analyzeSession(events)
  return {
    startedAt,
    durationS: signals.total_s,
    quality: qualityOf(signals),
    signals,
    hour,
    dow,
  }
}

const deepEvents = [p('github.com', 50 * MIN)]
const scatterEvents = () => {
  const e = []
  for (let i = 0; i < 12; i++) e.push({ domain: `s${i % 6}.com`, category: 'distraction', duration_s: 90 })
  return e
}

test('empty profile has neutral priors and zero confidence', () => {
  const prof = emptyProfile()
  assert.equal(prof.sessionsSeen, 0)
  for (const name of Object.keys(prof.traits)) {
    assert.equal(prof.traits[name].value, 0.5)
    assert.equal(prof.traits[name].n, 0)
    assert.equal(readTrait(prof, name).confidence, 0)
  }
})

test('a single session never moves a trait by more than ALPHA (gradual, no lurching)', () => {
  const before = emptyProfile()
  const after = updateProfile(before, rec(deepEvents))
  for (const name of ['focusStability', 'attentionFragmentation', 'burnoutRisk']) {
    const delta = Math.abs(after.traits[name].value - before.traits[name].value)
    assert.ok(delta <= ALPHA + 1e-9, `${name} moved ${delta} > ALPHA ${ALPHA}`)
  }
})

test('repeated deep sessions raise focusStability and lower fragmentation over weeks', () => {
  let prof = emptyProfile()
  for (let i = 0; i < 20; i++) {
    prof = updateProfile(prof, rec(deepEvents, { startedAt: `2026-01-${String(i + 1).padStart(2, '0')}T09:00:00Z` }))
  }
  // Read "as of" the last session (recency decay is real; fresh at display time in prod).
  const now = Date.parse('2026-01-20T10:00:00Z')
  const focus = readTrait(prof, 'focusStability', now)
  const frag = readTrait(prof, 'attentionFragmentation', now)
  assert.ok(focus.value > 0.75, `focusStability ${focus.value} should be high`)
  assert.ok(frag.value < 0.2, `fragmentation ${frag.value} should be low`)
  assert.ok(focus.confidence > 0.5, 'confidence should build with 20 recent sessions')
})

test('repeated scattered sessions raise fragmentation and keep focusStability low', () => {
  let prof = emptyProfile()
  for (let i = 0; i < 20; i++) {
    prof = updateProfile(prof, rec(scatterEvents(), { startedAt: `2026-02-${String(i + 1).padStart(2, '0')}T14:00:00Z` }))
  }
  assert.ok(readTrait(prof, 'attentionFragmentation').value > 0.6)
  assert.ok(readTrait(prof, 'focusStability').value < 0.45)
})

test('recovery is UNOBSERVED when there was no distraction to recover from', () => {
  const o = observe(rec(deepEvents))
  assert.equal(o.recovery, null)
  // A session with drift that ends clean should register recovery.
  const withDrift = rec([p('github.com', 20 * MIN), d('youtube.com', 4 * MIN), p('github.com', 20 * MIN)])
  assert.notEqual(observe(withDrift).recovery, null)
})

test('an unverified session moves no shape trait but still counts cadence', () => {
  let prof = updateProfile(emptyProfile(), rec(deepEvents, { startedAt: '2026-03-01T09:00:00Z' }))
  const focusBefore = prof.traits.focusStability.value
  // Unverified = no signals.
  const unverified = { startedAt: '2026-03-02T09:00:00Z', durationS: 1800, quality: 'unverified', signals: null, hour: 9, dow: 1 }
  prof = updateProfile(prof, unverified)
  assert.equal(prof.traits.focusStability.value, focusBefore, 'shape trait unchanged by unverified session')
  assert.ok(prof.traits.motivationStability.n > 0, 'cadence still learned')
})

test('deriveProfile equals folding updateProfile (the rebuildable guarantee)', () => {
  const history = [
    rec(deepEvents, { startedAt: '2026-04-01T09:00:00Z' }),
    rec(scatterEvents(), { startedAt: '2026-04-02T22:00:00Z', hour: 22, dow: 4 }),
    rec(deepEvents, { startedAt: '2026-04-03T09:00:00Z' }),
  ]
  const folded = history.reduce(updateProfile, emptyProfile())
  const derived = deriveProfile([...history].reverse()) // out of order on purpose
  assert.deepEqual(derived, folded, 'derive must reproduce the fold regardless of input order')
})

test('interventionResponsiveness / notificationSensitivity / squadImpact stay unobserved in Phase 1', () => {
  let prof = emptyProfile()
  for (let i = 0; i < 10; i++) prof = updateProfile(prof, rec(deepEvents, { startedAt: `2026-05-${String(i + 1).padStart(2, '0')}T09:00:00Z` }))
  for (const name of ['interventionResponsiveness', 'notificationSensitivity', 'squadImpact']) {
    assert.equal(prof.traits[name].n, 0)
    assert.equal(readTrait(prof, name).confidence, 0)
  }
})
