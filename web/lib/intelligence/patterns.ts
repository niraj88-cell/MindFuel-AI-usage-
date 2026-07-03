// lib/intelligence/patterns.ts — Pattern Discovery.
//
// Recognizes recurring behavioral PATTERNS (never websites) from the profile's timing
// histograms and traits: late-night drift, weekend collapse, Monday resistance, a
// post-lunch dip, morning strength, chronic fragmentation, restart difficulty, and steady
// improvement. Each finding is a PatternSignal with strength + confidence + evidence, so
// nothing here is a hunch — it is a measured tendency the caller can choose to voice or not.
//
// Pure; reads only the domain-free BehavioralProfile.

import { confidence } from './confidence.ts'
import { readTrait } from './traits.ts'
import type { BehavioralProfile, PatternSignal, PatternKind } from './types.ts'

const LATE_HOURS = [22, 23, 0, 1, 2, 3]
const MORNING_HOURS = [6, 7, 8, 9, 10, 11]
const AFTERNOON_HOURS = [13, 14, 15]
const WEEKEND = [0, 6] // Sunday, Saturday
const WEEKDAYS = [1, 2, 3, 4, 5]

// A group's distraction share must beat/undercut the baseline by this much to matter,
// and `strength` saturates at ~this-times-two.
const DELTA = 0.15
const STRENGTH_FULL = 0.4

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

interface Bucket {
  mean: number
  n: number
}

function bucketMean(sum: number[], count: number[], indices: number[]): Bucket {
  let s = 0
  let n = 0
  for (const i of indices) {
    s += sum[i] ?? 0
    n += count[i] ?? 0
  }
  return { mean: n > 0 ? s / n : 0, n }
}

function allMean(sum: number[], count: number[]): Bucket {
  return bucketMean(sum, count, sum.map((_, i) => i))
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`
}

// A time-of-day / day-of-week contrast: is `group` distraction share notably higher (or,
// when `direction` is 'below', lower) than the rest? Returns a signal or null.
function contrast(
  kind: PatternKind,
  group: Bucket,
  rest: Bucket,
  direction: 'above' | 'below',
  label: string,
): PatternSignal | null {
  if (group.n < 3 || rest.n < 3) return null
  const delta = direction === 'above' ? group.mean - rest.mean : rest.mean - group.mean
  if (delta < DELTA) return null
  const strength = clamp01(delta / STRENGTH_FULL)
  const conf = confidence(Math.min(group.n, rest.n))
  return {
    kind,
    strength,
    confidence: conf,
    evidence: [
      `${label}: ${pct(group.mean)} distraction vs ${pct(rest.mean)} the rest of the time`,
      `${group.n} sessions in that window`,
    ],
  }
}

// Discover every pattern the profile currently supports. Unsorted; use topPatterns to rank.
export function discoverPatterns(profile: BehavioralProfile, now = Date.now()): PatternSignal[] {
  const out: PatternSignal[] = []
  const { hour, dow } = profile.rhythm

  // Time-of-day contrasts.
  const late = contrast('late_night_drift', bucketMean(hour.sum, hour.count, LATE_HOURS), bucketMean(hour.sum, hour.count, hour.sum.map((_, i) => i).filter((i) => !LATE_HOURS.includes(i))), 'above', 'Late nights')
  if (late) out.push(late)

  const afternoon = contrast('post_lunch_dip', bucketMean(hour.sum, hour.count, AFTERNOON_HOURS), bucketMean(hour.sum, hour.count, hour.sum.map((_, i) => i).filter((i) => !AFTERNOON_HOURS.includes(i))), 'above', 'Early afternoon')
  if (afternoon) out.push(afternoon)

  const morning = contrast('morning_strength', bucketMean(hour.sum, hour.count, MORNING_HOURS), bucketMean(hour.sum, hour.count, hour.sum.map((_, i) => i).filter((i) => !MORNING_HOURS.includes(i))), 'below', 'Mornings')
  if (morning) out.push(morning)

  // Day-of-week contrasts.
  const weekend = contrast('weekend_collapse', bucketMean(dow.sum, dow.count, WEEKEND), bucketMean(dow.sum, dow.count, WEEKDAYS), 'above', 'Weekends')
  if (weekend) out.push(weekend)

  const monday = contrast('monday_resistance', bucketMean(dow.sum, dow.count, [1]), bucketMean(dow.sum, dow.count, [2, 3, 4, 5]), 'above', 'Mondays')
  if (monday) out.push(monday)

  // Trait-driven patterns.
  const frag = readTrait(profile, 'attentionFragmentation', now)
  if (frag.value >= 0.6 && frag.confidence > 0) {
    out.push({
      kind: 'rapid_fragmentation',
      strength: clamp01((frag.value - 0.5) / 0.5),
      confidence: frag.confidence,
      evidence: ['attention changes places often across your sessions', `${frag.n} sessions`],
    })
  }

  const recovery = readTrait(profile, 'recoverySpeed', now)
  if (recovery.value <= 0.4 && recovery.confidence > 0) {
    out.push({
      kind: 'restart_difficulty',
      strength: clamp01((0.5 - recovery.value) / 0.5),
      confidence: recovery.confidence,
      evidence: ['getting going again after an interruption tends to take a while', `${recovery.n} sessions with drift`],
    })
  }

  const growth = readTrait(profile, 'selfAwarenessGrowth', now)
  if (growth.value >= 0.6 && growth.confidence > 0) {
    out.push({
      kind: 'steady_improvement',
      strength: clamp01((growth.value - 0.5) / 0.5),
      confidence: growth.confidence,
      evidence: ['recent sessions are landing deeper than your earlier ones'],
    })
  }

  return out
}

// Rank by how much a pattern deserves attention: pronounced AND well-evidenced first.
export function topPatterns(profile: BehavioralProfile, now = Date.now()): PatternSignal[] {
  return discoverPatterns(profile, now).sort((a, b) => b.strength * b.confidence - a.strength * a.confidence)
}
