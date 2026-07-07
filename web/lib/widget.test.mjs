// widget.test.mjs — the Desktop Reflection Widget's message decision.
// Run from web/:  node --test lib/widget.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { widgetMessage } from './widget.ts'

const NOW = Date.parse('2026-07-07T14:00:00Z')
const min = (n) => n * 60_000

const base = {
  active: false, intention: null, startedAtMs: null,
  todayCount: 0, todayFocusS: 0, insight: null,
}

test('a running session always wins, in coarse bands — never a ticking timer', () => {
  const at = (elapsedMin) =>
    widgetMessage({ ...base, active: true, startedAtMs: NOW - min(elapsedMin) }, NOW)

  assert.equal(at(3).overline, 'Deep session')
  assert.equal(at(3).primary, 'You’re in a session.')
  assert.equal(at(29).primary, 'You’re in a session.', 'same line for 3 and 29 min — no countable number')
  assert.match(at(45).primary, /half an hour/)
  assert.match(at(75).primary, /over an hour/)
  assert.match(at(150).primary, /over 2 hours/)
  // No live minute count anywhere in the presence line.
  for (const m of [3, 29, 45, 75, 150]) assert.doesNotMatch(at(m).primary, /\d+ ?min/)
})

test('the intention is the only supporting line during a session', () => {
  const out = widgetMessage(
    { ...base, active: true, startedAtMs: NOW - min(10), intention: 'Draft the essay', insight: 'ignored' },
    NOW,
  )
  assert.equal(out.support, '“Draft the essay”')
  assert.notEqual(out.primary, 'ignored', 'a session outranks the weekly insight')
})

test('without a session, the weekly insight is the primary line — never shown alongside another insight', () => {
  const out = widgetMessage(
    { ...base, insight: 'Mornings are where your attention holds best.', todayCount: 2, todayFocusS: 5400 },
    NOW,
  )
  assert.equal(out.overline, 'This week')
  assert.equal(out.primary, 'Mornings are where your attention holds best.')
  assert.equal(out.support, '2 sessions today · 1h 30m of focus')
})

test('a plain day line when there is no insight, and a quiet empty state when there is nothing', () => {
  const day = widgetMessage({ ...base, todayCount: 1, todayFocusS: 1500 }, NOW)
  assert.equal(day.overline, 'Today')
  assert.equal(day.primary, '1 session so far — 25m of focus.')
  assert.equal(day.support, null)

  const empty = widgetMessage(base, NOW)
  assert.equal(empty.primary, 'Nothing measured yet today.')
  assert.equal(empty.support, null)
})

test('content rules: never a score, streak, percentage, or hype word', () => {
  const states = [
    base,
    { ...base, active: true, startedAtMs: NOW - min(90), intention: 'x' },
    { ...base, todayCount: 4, todayFocusS: 9999 },
    { ...base, insight: 'A steady week — regular sessions, nothing that stood out.' },
  ]
  for (const s of states) {
    const { primary, support, overline } = widgetMessage(s, NOW)
    const all = `${overline} ${primary} ${support ?? ''}`
    assert.doesNotMatch(all, /score|streak|%|🔥|amazing|crushing|productivity/i)
  }
})
