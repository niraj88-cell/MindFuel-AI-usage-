// behavior.test.mjs — tests for the behavioral intelligence core.
// Run from web/:  node --test lib/behavior.test.mjs
// Plain .mjs on purpose: Node strips the types when importing behavior.ts directly, and
// tsc/next ignore this file, so the tests need no runner, no build step, no dependency.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeSession, qualityOf, reflectionFor, noticeAgainstBaseline,
} from './behavior.ts'

const d = (domain, duration_s) => ({ domain, category: 'distraction', duration_s })
const n = (domain, duration_s) => ({ domain, category: 'neutral', duration_s })
const p = (domain, duration_s) => ({ domain, category: 'productive', duration_s })

const MIN = 60

test('mission example: an all-distraction loop reads as distracted, and the loop is named', () => {
  // YouTube → Reddit → TikTok → Instagram → X → gaming → YouTube → Instagram
  const events = [
    d('youtube.com', 6 * MIN), d('reddit.com', 4 * MIN), d('tiktok.com', 5 * MIN),
    d('instagram.com', 3 * MIN), d('x.com', 4 * MIN), d('store.steampowered.com', 6 * MIN),
    d('youtube.com', 5 * MIN), d('instagram.com', 4 * MIN),
  ]
  const sig = analyzeSession(events)
  assert.equal(sig.distraction_pct, 100)
  assert.equal(qualityOf(sig), 'distracted')
  assert.equal(sig.top_loop_domain_visits, 2) // youtube and instagram both entered twice
  const line = reflectionFor(sig)
  assert.doesNotMatch(line, /steady work|clean session|completed/i, 'must never reassure about this')
})

test('THE TRAP the old model failed: a loop diluted by neutral time must not read as praise', () => {
  // Old classifier: 8 min distraction / 48 min total = 17%… wait — build it so pct lands
  // in the old "focused" band (15–40%) while the shape is clearly circling.
  const events = [
    n('docs.google.com', 10 * MIN), d('instagram.com', 3 * MIN),
    n('docs.google.com', 8 * MIN), d('youtube.com', 4 * MIN),
    n('docs.google.com', 7 * MIN), d('instagram.com', 3 * MIN),
    n('docs.google.com', 6 * MIN), d('reddit.com', 4 * MIN),
    n('docs.google.com', 5 * MIN),
  ]
  const sig = analyzeSession(events)
  assert.ok(sig.distraction_pct >= 15 && sig.distraction_pct < 40, `pct ${sig.distraction_pct} sits in the old "focused" band`)
  assert.equal(sig.distraction_bouts, 4)
  assert.equal(sig.distraction_returns, 3)
  // Old model: 'focused' ("a couple of detours you caught. Steady work.") — flattery.
  // New model: the circling caps it.
  assert.equal(qualityOf(sig), 'focused') // returns=3 → capped at focused (not deep)…
  const line = reflectionFor(sig)
  assert.match(line, /4 times/, 'the loop is named, not papered over')
})

test('a heavy loop (4+ returns) is capped at mixed even with a low percentage', () => {
  const events = []
  for (let i = 0; i < 5; i++) {
    events.push(n('docs.google.com', 9 * MIN))
    events.push(d('x.com', 90)) // five quick check-ins: 7.5 min of 52.5 ≈ 14%
  }
  const sig = analyzeSession(events)
  assert.ok(sig.distraction_pct < 15, `pct ${sig.distraction_pct} would have been "deep" under the old model`)
  assert.equal(sig.distraction_returns, 4)
  assert.equal(qualityOf(sig), 'mixed', 'five check-ins an hour is not deep work, whatever the percentage says')
})

test('merge runs: the extension banks a long stay as 5-min chunks — no phantom switches', () => {
  const sig = analyzeSession([
    p('github.com', 5 * MIN), p('github.com', 5 * MIN), p('github.com', 5 * MIN),
  ])
  assert.equal(sig.switches, 0)
  assert.equal(sig.longest_focus_streak_s, 15 * MIN)
})

test('clean deep session: one detour, long unbroken stretch', () => {
  const sig = analyzeSession([p('github.com', 50 * MIN), d('reddit.com', 2 * MIN)])
  assert.ok(sig.distraction_pct < 15)
  assert.equal(qualityOf(sig), 'deep')
  assert.match(reflectionFor(sig), /unbroken stretch/i)
})

test('deep must be earned by an unbroken stretch, not just a low percentage', () => {
  // 9% distraction — the old model calls this "deep". But the distraction bouts cut the
  // session into 13-minute pieces: no stretch was ever unbroken long enough to go deep.
  const sig = analyzeSession([
    p('github.com', 13 * MIN), d('x.com', 2 * MIN),
    p('github.com', 13 * MIN), d('x.com', 2 * MIN),
    p('github.com', 13 * MIN),
  ])
  assert.ok(sig.distraction_pct < 15, `pct ${sig.distraction_pct} is in the old "deep" band`)
  assert.equal(sig.longest_focus_streak_s, 13 * MIN)
  assert.equal(qualityOf(sig), 'focused', 'low percentage alone no longer earns "deep"')
})

test('reference-hopping with no distraction is never called scattered (dev workflow guard)', () => {
  // A focus streak is consecutive NON-DISTRACTION time, domain-agnostic: switching between
  // github and stackoverflow is one continuous stretch of work, not fragmentation. With no
  // distraction signal at all we do not downgrade on suspicion — that's the privacy-honest call.
  const events = []
  for (let i = 0; i < 20; i++) {
    events.push(p(i % 2 ? 'github.com' : 'stackoverflow.com', 90))
  }
  const sig = analyzeSession(events)
  assert.ok(sig.switches_per_hour >= 15)
  assert.equal(sig.longest_focus_streak_s, 30 * MIN, 'streak survives work-site switches')
  assert.equal(qualityOf(sig), 'deep')
  assert.doesNotMatch(reflectionFor(sig), /changed places/, 'fragmentation line requires distraction in the mix')
})

test('escalating drift is detected and named', () => {
  const sig = analyzeSession([
    p('notion.so', 20 * MIN), n('example.com', 5 * MIN), d('youtube.com', 12 * MIN),
  ])
  assert.equal(sig.drift_trend, 'escalating')
  assert.equal(sig.distraction_returns, 0)
  assert.match(reflectionFor(sig), /toward the end/)
})

test('recovery: drift in the middle, clean ending — acknowledged honestly', () => {
  const sig = analyzeSession([
    p('overleaf.com', 10 * MIN), d('tiktok.com', 8 * MIN), p('overleaf.com', 15 * MIN),
  ])
  assert.equal(sig.ended_clean, true)
  assert.equal(sig.distraction_returns, 0)
  const line = reflectionFor(sig)
  assert.match(line, /came back/i)
  assert.doesNotMatch(line, /barely a detour/i)
})

test('mostly-distraction session is stated plainly, without shaming words', () => {
  const sig = analyzeSession([d('youtube.com', 40 * MIN), p('github.com', 5 * MIN)])
  assert.ok(sig.distraction_pct >= 70)
  assert.equal(qualityOf(sig), 'distracted')
  const line = reflectionFor(sig)
  assert.match(line, /distracting sites/)
  assert.doesNotMatch(line, /wasted|failed|shame|bad|should/i)
})

test('no signal at all → unverified, honest trust line', () => {
  const sig = analyzeSession([])
  assert.equal(sig.verified, false)
  assert.equal(qualityOf(sig), 'unverified')
  assert.match(reflectionFor(sig, 30 * MIN), /on trust/)
})

test('privacy: the stored signals contain no domain names, ever', () => {
  const events = [
    p('github.com', 30 * MIN), d('very-private-domain.example', 5 * MIN), n('mysite.io', 10 * MIN),
  ]
  const json = JSON.stringify(analyzeSession(events))
  for (const e of events) {
    assert.ok(!json.includes(e.domain), `signals leaked domain ${e.domain}`)
  }
})

test('distraction_pct matches the legacy formula (compat with existing rows)', () => {
  const sig = analyzeSession([d('x.com', 300), p('github.com', 700)])
  assert.equal(sig.distraction_pct, 30)
})

test('baseline noticing: fires only with history, only one line, only when meaningful', () => {
  const typical = analyzeSession([p('github.com', 12 * MIN), d('x.com', 2 * MIN), p('github.com', 10 * MIN)])
  const history = [typical, typical, typical]

  // A clearly longer clean stretch than the user's own typical gets noticed.
  const better = analyzeSession([p('github.com', 45 * MIN)])
  const note = noticeAgainstBaseline(better, history)
  assert.ok(note && /past your recent typical/.test(note))

  // Not enough history → silence, never a guess.
  assert.equal(noticeAgainstBaseline(better, [typical]), null)

  // An unremarkable session → silence, not filler.
  assert.equal(noticeAgainstBaseline(typical, history), null)

  // Circling far above typical gets named gently.
  const loopy = analyzeSession([
    n('docs.google.com', 5 * MIN), d('x.com', MIN), n('docs.google.com', 5 * MIN), d('x.com', MIN),
    n('docs.google.com', 5 * MIN), d('x.com', MIN), n('docs.google.com', 5 * MIN), d('x.com', MIN),
  ])
  const loopNote = noticeAgainstBaseline(loopy, history)
  assert.ok(loopNote && /circled back/.test(loopNote))
})

test('baseline noticing never runs against unverified sessions', () => {
  const history = [1, 2, 3].map(() => analyzeSession([p('github.com', 20 * MIN)]))
  assert.equal(noticeAgainstBaseline(analyzeSession([]), history), null)
})

// ---------------------------------------------------------------------------
// Thin evidence (the developer-honesty rule) + Sutra recovery signals.
// ---------------------------------------------------------------------------

test('THE INJUSTICE: a 3-min reddit glance in a 60-min off-browser session is NOT "distracted"', () => {
  // A developer codes for 57 minutes in the IDE; the browser only ever saw a short
  // reddit break. The old model: distraction_pct=100 → 'distracted'. That verdict is
  // a false accusation — the browser witnessed 5% of the session.
  const sig = analyzeSession([d('reddit.com', 3 * MIN)])
  assert.equal(sig.distraction_pct, 100)
  assert.equal(qualityOf(sig, 60 * MIN), 'unverified', 'thin evidence is not a verdict')
  const line = reflectionFor(sig, 60 * MIN)
  assert.match(line, /browser/i)
  assert.match(line, /doubt/i, 'the copy explicitly refuses suspicion')
  assert.doesNotMatch(line, /Most of this session sat on distracting sites/, 'never judged by the sliver')
})

test('thin evidence also refuses to PRAISE a sliver, and leaves short/covered sessions alone', () => {
  // 3 productive minutes of a 60-minute session: refusing to verify cuts both ways.
  const sliver = analyzeSession([p('github.com', 3 * MIN)])
  assert.equal(qualityOf(sliver, 60 * MIN), 'unverified')
  // Without duration context (legacy callers), behavior is unchanged.
  assert.equal(qualityOf(sliver), 'deep')
  // Solid coverage (>=25%) keeps the normal verdict.
  const covered = analyzeSession([p('github.com', 30 * MIN)])
  assert.equal(qualityOf(covered, 60 * MIN), 'deep')
  // Short sessions are exempt from the coverage rule entirely.
  const short = analyzeSession([p('github.com', 5 * MIN)])
  assert.equal(qualityOf(short, 10 * MIN), 'deep')
})

test('sutra recovery signals: returned detours are counted and measured; a trailing bout is not', () => {
  // One 8-minute detour, then back to the work: one recovery, measured.
  const recovered = analyzeSession([
    p('overleaf.com', 10 * MIN), d('tiktok.com', 8 * MIN), p('overleaf.com', 15 * MIN),
  ])
  assert.equal(recovered.recoveries, 1)
  assert.equal(recovered.median_recovery_s, 8 * MIN)
  assert.match(reflectionFor(recovered), /8 minutes/, 'the detour length is named')
  assert.match(reflectionFor(recovered), /came back/i, 'the return stays the anchor')

  // A session that ENDS inside a distraction bout: that departure is not a recovery.
  const departed = analyzeSession([p('github.com', 10 * MIN), d('youtube.com', 12 * MIN)])
  assert.equal(departed.recoveries, 0)
  assert.equal(departed.median_recovery_s, 0)

  // Loops: every completed return counts, and the median is the typical detour.
  const loopy = analyzeSession([
    n('docs.google.com', 9 * MIN), d('x.com', 2 * MIN),
    n('docs.google.com', 9 * MIN), d('x.com', 4 * MIN),
    n('docs.google.com', 9 * MIN), d('x.com', 6 * MIN),
    n('docs.google.com', 9 * MIN),
  ])
  assert.equal(loopy.recoveries, 3)
  assert.equal(loopy.median_recovery_s, 4 * MIN)
})

test('privacy: the new signals still contain no domain names', () => {
  const events = [p('secret-work.example', 20 * MIN), d('private-drift.example', 5 * MIN), p('secret-work.example', 20 * MIN)]
  const json = JSON.stringify(analyzeSession(events))
  for (const e of events) assert.ok(!json.includes(e.domain), `leaked ${e.domain}`)
})
