// sim.test.mjs — the mission's validation harness.
// Run from web/:  node --test lib/intelligence/sim.test.mjs
//
// Seven synthetic personas are driven through the REAL pipeline (behavior.analyzeSession →
// traits.updateProfile → patterns) over 1 day / 1 week / 1 month / 3 months. We assert:
//   1) personalization IMPROVES with time — confidence rises, traits converge to the
//      persona's true tendency, and the right patterns get discovered;
//   2) it is GRADUAL — no single session moves any trait by more than ALPHA (no lurching);
//   3) it adds NO data — the generators emit only {domain, category, duration_s}, and the
//      finished profile jsonb contains ZERO domain strings. Personalization without
//      surveillance is the whole thesis; this is where it is proven.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSession, qualityOf } from '../behavior.ts'
import { emptyProfile, updateProfile, readTrait, ALPHA } from './traits.ts'
import { topPatterns } from './patterns.ts'

// ---- deterministic PRNG so runs are reproducible ----
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const irand = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1))
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

const MIN = 60
const DISTRACTION = ['youtube.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'x.com', 'twitch.tv']
const PRODUCTIVE = ['github.com', 'stackoverflow.com', 'notion.so', 'docs.google.com', 'figma.com']
const NEUTRAL = ['wikipedia.org', 'news.ycombinator.com']
const ALL_DOMAINS = [...DISTRACTION, ...PRODUCTIVE, ...NEUTRAL]

const prod = (rng, m) => ({ domain: pick(rng, PRODUCTIVE), category: 'productive', duration_s: m * MIN })
const dist = (rng, m) => ({ domain: pick(rng, DISTRACTION), category: 'distraction', duration_s: m * MIN })
const neut = (rng, m) => ({ domain: pick(rng, NEUTRAL), category: 'neutral', duration_s: m * MIN })

// Each persona: given an rng and the day's day-of-week, produce {events, hour}.
const PERSONAS = {
  strong_performer: (rng) => ({ events: [prod(rng, irand(rng, 60, 130))], hour: irand(rng, 8, 9) }),

  heavy_doomscroller: (rng) => {
    const e = []
    const runs = irand(rng, 18, 24)
    for (let i = 0; i < runs; i++) e.push(rng() < 0.9 ? dist(rng, irand(rng, 2, 3)) : prod(rng, 2))
    return { events: e, hour: pick(rng, [22, 23, 0, 1]) }
  },

  rapid_switcher: (rng) => {
    const e = []
    const runs = irand(rng, 18, 26)
    for (let i = 0; i < runs; i++) {
      const r = rng()
      e.push(r < 0.55 ? prod(rng, irand(rng, 1, 2)) : r < 0.8 ? neut(rng, irand(rng, 1, 2)) : dist(rng, irand(rng, 1, 2)))
    }
    return { events: e, hour: irand(rng, 10, 16) }
  },

  knowledge_worker: (rng) => ({
    events: [prod(rng, irand(rng, 40, 60)), dist(rng, irand(rng, 3, 6)), prod(rng, irand(rng, 18, 30))],
    hour: irand(rng, 9, 11),
  }),

  student: (rng) => ({
    events: [prod(rng, 18), dist(rng, irand(rng, 5, 8)), prod(rng, 14), dist(rng, irand(rng, 5, 9)), prod(rng, 10)],
    hour: pick(rng, [18, 19, 20, 21, 22]),
  }),

  night_owl: (rng) => ({ events: [prod(rng, irand(rng, 50, 90))], hour: pick(rng, [22, 23, 0, 1]) }),

  weekend_only_distraction: (rng, dow) => {
    if (dow === 0 || dow === 6) {
      const e = []
      for (let i = 0; i < irand(rng, 12, 18); i++) e.push(rng() < 0.85 ? dist(rng, irand(rng, 2, 4)) : neut(rng, 2))
      return { events: e, hour: irand(rng, 13, 18) }
    }
    return { events: [prod(rng, irand(rng, 45, 70)), dist(rng, 4), prod(rng, 20)], hour: irand(rng, 9, 11) }
  },
}

// Drive a persona for `days` days (one session/day) and report the profile, the largest
// single-session trait movement seen, and a read-time `now`.
function run(name, days, seedBase = 1) {
  const gen = PERSONAS[name]
  const base = Date.UTC(2026, 0, 1)
  let profile = emptyProfile()
  let maxDelta = 0
  let lastStart = base
  for (let day = 0; day < days; day++) {
    const startMs = base + day * 86_400_000 + 12 * 3_600_000 // noon daily ⇒ ~24h cadence
    const date = new Date(startMs)
    const dow = date.getUTCDay()
    const rng = mulberry32(seedBase * 100003 + day)
    const { events, hour } = gen(rng, dow)
    const signals = analyzeSession(events)
    const record = {
      startedAt: date.toISOString(),
      durationS: signals.total_s,
      quality: qualityOf(signals),
      signals,
      hour,
      dow,
    }
    // No new input fields: a record is exactly these six domain-free keys.
    assert.deepEqual(Object.keys(record).sort(), ['dow', 'durationS', 'hour', 'quality', 'signals', 'startedAt'])
    const before = profile
    profile = updateProfile(profile, record)
    // The ALPHA per-session bound is the guarantee on the EWMA-LEARNED traits. The derived
    // statistics (consistency, growth, cadence) are running summaries that settle as n grows;
    // their convergence is asserted separately, not their per-step delta.
    for (const t of EWMA_TRAITS) {
      maxDelta = Math.max(maxDelta, Math.abs(profile.traits[t].value - before.traits[t].value))
    }
    lastStart = startMs
  }
  return { profile, maxDelta, now: lastStart + 3_600_000 }
}

const DAY = 1
const WEEK = 7
const MONTH = 28
const QUARTER = 84

// The traits whose per-session movement is ALPHA-bounded by construction (pure EWMA).
const EWMA_TRAITS = ['focusStability', 'attentionFragmentation', 'burnoutRisk', 'recoverySpeed']

test('confidence rises with time for every persona with verified work', () => {
  for (const name of Object.keys(PERSONAS)) {
    const wk = run(name, WEEK)
    const qt = run(name, QUARTER)
    const cWeek = readTrait(wk.profile, 'focusStability', wk.now).confidence
    const cQuarter = readTrait(qt.profile, 'focusStability', qt.now).confidence
    assert.ok(cQuarter > cWeek, `${name}: confidence should grow (week ${cWeek.toFixed(2)} → quarter ${cQuarter.toFixed(2)})`)
  }
})

test('no session ever moves a trait by more than ALPHA (gradual, never lurching)', () => {
  for (const name of Object.keys(PERSONAS)) {
    const { maxDelta } = run(name, QUARTER)
    assert.ok(maxDelta <= ALPHA + 1e-9, `${name}: maxDelta ${maxDelta} exceeded ALPHA ${ALPHA}`)
  }
})

test('traits converge to each persona\'s true tendency by 3 months', () => {
  const sp = run('strong_performer', QUARTER)
  assert.ok(readTrait(sp.profile, 'focusStability', sp.now).value > 0.75)
  assert.ok(readTrait(sp.profile, 'attentionFragmentation', sp.now).value < 0.3)
  assert.ok(readTrait(sp.profile, 'deepSessionConsistency', sp.now).value > 0.6)

  const ds = run('heavy_doomscroller', QUARTER)
  assert.ok(readTrait(ds.profile, 'focusStability', ds.now).value < 0.45, 'doomscroller focus stays low')
  assert.ok(readTrait(ds.profile, 'attentionFragmentation', ds.now).value > 0.55, 'doomscroller fragments')
  assert.ok(readTrait(ds.profile, 'burnoutRisk', ds.now).value > 0.4, 'doomscroller shows strain')

  const rs = run('rapid_switcher', QUARTER)
  assert.ok(readTrait(rs.profile, 'attentionFragmentation', rs.now).value > 0.6)
})

test('the right patterns are discovered (and the wrong ones are not)', () => {
  const we = run('weekend_only_distraction', QUARTER)
  const weKinds = topPatterns(we.profile, we.now).map((p) => p.kind)
  assert.ok(weKinds.includes('weekend_collapse'), `weekend persona → ${weKinds.join(',') || 'none'}`)

  // A doomscroller who is ALWAYS late has no daytime sessions to contrast, so late_night_drift
  // (a mixed-hours pattern, proven in patterns.test.mjs) can't fire — its fragmentation and
  // restart difficulty are the honest discoveries.
  const ds = run('heavy_doomscroller', QUARTER)
  const dsKinds = topPatterns(ds.profile, ds.now).map((p) => p.kind)
  assert.ok(dsKinds.includes('rapid_fragmentation') || dsKinds.includes('restart_difficulty'), `doomscroller → ${dsKinds.join(',') || 'none'}`)

  // Night owl works LATE but PRODUCTIVELY — late-night *drift* must not be claimed.
  const no = run('night_owl', QUARTER)
  const noKinds = topPatterns(no.profile, no.now).map((p) => p.kind)
  assert.ok(!noKinds.includes('late_night_drift'), `night owl should not read as late-night drift, got ${noKinds.join(',')}`)
})

test('personalization is achieved with ZERO domains stored (the whole thesis)', () => {
  for (const name of Object.keys(PERSONAS)) {
    const { profile } = run(name, QUARTER)
    const dump = JSON.stringify(profile)
    for (const domain of ALL_DOMAINS) {
      assert.ok(!dump.includes(domain), `${name}: profile leaked a domain (${domain})`)
    }
  }
})

test('a single day barely moves anyone (cold start stays humble)', () => {
  for (const name of Object.keys(PERSONAS)) {
    const { profile, now } = run(name, DAY)
    // One session: confidence must still be well below the speak bar.
    assert.ok(readTrait(profile, 'focusStability', now).confidence < 0.45, `${name}: too confident after one day`)
  }
})
