// continuation.test.mjs — tests for Flow Continuation.
// Run from web/:  node --test lib/continuation.test.mjs
// Plain .mjs on purpose, like behavior.test.mjs: Node strips the types when importing
// continuation.ts directly, so the tests need no runner, no build step, no dependency.
//
// The most important assertions here are the SILENT ones: the feature's contract is
// that it says nothing unless the evidence has earned an interruption.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveContinuation, workingSet } from './continuation.ts'

// Fixed "now": Tuesday 7 July 2026, 09:00 local. All sessions are built in local time
// relative to this, so the tests are timezone-independent.
const NOW = new Date(2026, 6, 7, 9, 0, 0)

let idCounter = 0
function sess({
  daysAgo = 1,
  hour = 14,
  min = 0,
  dur = 120 * 60,
  quality = 'deep',
  intention = 'refactor the ingest pipeline',
  status = 'completed',
} = {}) {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, min, 0, 0)
  return {
    id: `s${++idCounter}`,
    created_at: d.toISOString(),
    status,
    duration_s: dur,
    session_quality: quality,
    intention,
  }
}

test('a strong deep session yesterday produces an invitation with full context', () => {
  const anchor = sess({ daysAgo: 1, hour: 14, dur: 120 * 60, quality: 'deep' })
  const invite = deriveContinuation([anchor], NOW)
  assert.ok(invite, 'must speak: 2h deep work yesterday afternoon')
  assert.equal(invite.anchorId, anchor.id)
  assert.equal(invite.intention, 'refactor the ingest pipeline')
  assert.equal(invite.timeLabel, 'yesterday')
  assert.equal(invite.startIso, anchor.created_at)
  assert.equal(
    new Date(invite.endIso).getTime(),
    new Date(anchor.created_at).getTime() + 120 * 60 * 1000,
  )
  assert.ok(invite.confidence >= 0.45 && invite.confidence <= 1)
  assert.ok(invite.evidence.length >= 1, 'every invitation carries evidence')
})

test('no sessions → silence', () => {
  assert.equal(deriveContinuation([], NOW), null)
  assert.equal(deriveContinuation(undefined, NOW), null)
})

test('any session already started today → silence (they are already back)', () => {
  const rows = [
    sess({ daysAgo: 0, hour: 7, dur: 5 * 60, quality: 'unverified', status: 'abandoned' }),
    sess({ daysAgo: 1 }),
  ]
  assert.equal(deriveContinuation(rows, NOW), null)
})

test('an active session anywhere → silence (never interrupt a session)', () => {
  const rows = [sess({ daysAgo: 1 }), sess({ daysAgo: 2, status: 'active' })]
  assert.equal(deriveContinuation(rows, NOW), null)
})

test('a distracted session is never an anchor, however long', () => {
  assert.equal(deriveContinuation([sess({ quality: 'distracted', dur: 3 * 3600 })], NOW), null)
})

test('a short session is not meaningful work → silence', () => {
  assert.equal(deriveContinuation([sess({ dur: 15 * 60 })], NOW), null)
})

test('less than 6h away is a break, not a return → silence', () => {
  // Worked until 23:00; it is now 01:00 the next day.
  const lateNow = new Date(2026, 6, 7, 1, 0, 0)
  const anchor = sess({ daysAgo: 1, hour: 22, dur: 60 * 60 }) // ends 23:00 yesterday
  assert.equal(deriveContinuation([anchor], lateNow), null)
})

test('unverified with no intention has nothing to restore → silence', () => {
  assert.equal(
    deriveContinuation([sess({ quality: 'unverified', intention: null, dur: 2 * 3600 })], NOW),
    null,
  )
})

test('unverified WITH an intention can anchor — the intention is the context', () => {
  const anchor = sess({ daysAgo: 1, quality: 'unverified', dur: 2 * 3600 })
  const rhythm = [2, 3, 4, 5, 6].map((d) =>
    sess({ daysAgo: d, hour: 10, dur: 60 * 60, quality: 'focused' }),
  )
  const invite = deriveContinuation([anchor, ...rhythm], NOW)
  assert.ok(invite)
  assert.equal(invite.anchorId, anchor.id)
})

test('a moderate session speaks only when a working rhythm backs it up', () => {
  const moderate = sess({ daysAgo: 1, dur: 60 * 60, quality: 'focused' })
  // Alone: not enough evidence that returning matters.
  assert.equal(deriveContinuation([moderate], NOW), null)
  // The same session inside a 6-of-7-days rhythm: worth an invitation.
  const rhythm = [2, 3, 4, 5, 6].map((d) =>
    sess({ daysAgo: d, hour: 10, dur: 45 * 60, quality: 'focused' }),
  )
  const invite = deriveContinuation([moderate, ...rhythm], NOW)
  assert.ok(invite, 'rhythm must lift a moderate anchor over the speak bar')
  assert.equal(invite.anchorId, moderate.id, 'the recent session anchors, not the history')
})

test('the strongest work anchors, not the most recent scrap', () => {
  const deep = sess({ daysAgo: 1, hour: 10, dur: 2 * 3600, quality: 'deep' })
  const scrap = sess({ daysAgo: 1, hour: 18, dur: 25 * 60, quality: 'mixed', intention: null })
  const invite = deriveContinuation([deep, scrap], NOW)
  assert.ok(invite)
  assert.equal(invite.anchorId, deep.id)
})

test('"not now" means not now — no runner-up is offered behind a dismissal', () => {
  const deep = sess({ daysAgo: 1, hour: 10, dur: 2 * 3600, quality: 'deep' })
  const other = sess({ daysAgo: 1, hour: 18, dur: 40 * 60, quality: 'focused' })
  assert.equal(deriveContinuation([deep, other], NOW, deep.id), null)
})

test('work older than the window cannot be "continued" → silence', () => {
  assert.equal(deriveContinuation([sess({ daysAgo: 20, dur: 3 * 3600 })], NOW), null)
})

test('timeLabel names the weekday beyond yesterday', () => {
  // Sunday 5 July 2026, strong enough to clear the gate at 2 days old.
  const anchor = sess({ daysAgo: 2, hour: 14, dur: 2 * 3600, quality: 'deep' })
  const invite = deriveContinuation([anchor], NOW)
  assert.ok(invite)
  assert.equal(invite.timeLabel, 'on Sunday')
})

test('workingSet: aggregates, orders by dwell, caps at three', () => {
  const stays = [
    { domain: 'github.com', duration_s: 20 * 60, category: 'productive' },
    { domain: 'claude.ai', duration_s: 15 * 60, category: 'productive' },
    { domain: 'github.com', duration_s: 25 * 60, category: 'productive' },
    { domain: 'docs.rs', duration_s: 10 * 60, category: 'neutral' },
    { domain: 'notion.so', duration_s: 5 * 60, category: 'neutral' },
  ]
  assert.deepEqual(workingSet(stays), ['github.com', 'claude.ai', 'docs.rs'])
})

test('workingSet: never invites the loop back — drift-dominant domains are dropped', () => {
  const stays = [
    { domain: 'github.com', duration_s: 30 * 60, category: 'productive' },
    { domain: 'youtube.com', duration_s: 25 * 60, category: 'distraction' },
    { domain: 'youtube.com', duration_s: 2 * 60, category: 'neutral' },
  ]
  assert.deepEqual(workingSet(stays), ['github.com'])
})

test('workingSet: sub-3-minute visits and empty input leave no trace', () => {
  assert.deepEqual(workingSet([{ domain: 'x.dev', duration_s: 120, category: 'neutral' }]), [])
  assert.deepEqual(workingSet([]), [])
  assert.deepEqual(workingSet(undefined), [])
})
