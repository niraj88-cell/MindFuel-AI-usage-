// lib/intelligence/traits.ts — Behavioral Memory + the Learning Engine.
//
// This turns a stream of domain-free SessionRecords into a slowly-moving BehavioralProfile.
// Two guarantees make it trustworthy:
//
//   1) GRADUAL. Every trait is an EWMA with a small alpha, so one session can move an
//      estimate by at most `alpha` of the gap to the new observation. Behavior "evolves
//      gradually, never drastically from one session" — this is that sentence as math.
//
//   2) REBUILDABLE. `deriveProfile(history)` is literally `history.reduce(updateProfile)`.
//      The stored profile is therefore an accumulator/cache, never a second source of
//      truth: it can always be regenerated from the owner's own focus_sessions. That is
//      how we keep the "derive, never store" ethos while not recomputing months on read.
//
// Pure and dependency-free (only ./confidence + ./types). Zero domains touch this file.

import { confidence, daysSince } from './confidence.ts'
import {
  type BehavioralProfile,
  type ProfileAccumulators,
  type RhythmBuckets,
  type SessionRecord,
  type Trait,
  type TraitName,
  TRAIT_NAMES,
} from './types.ts'

export const PROFILE_VERSION = 1

// EWMA rates. Small on purpose: ~a dozen sessions to meaningfully move, i.e. weeks.
export const ALPHA = 0.12 // per-trait learning rate (max single-session move)
const ALPHA_SHORT = 0.25 // fast depth EWMA (recent self)
const ALPHA_LONG = 0.06 // slow depth EWMA (older self) — their gap is growth

// Normalizers (all in the SAME units the behavior signals already use).
const FRAG_FULL = 30 // switches/hour that reads as fully fragmented
const STD_FULL = 0.35 // depth std-dev that reads as fully inconsistent
const GAP_DESIRED_H = 72 // inter-session gap (h) under which cadence reads as "engaged"
const GROWTH_GAIN = 1.6 // how strongly a depthShort-vs-depthLong gap maps to 0..1
const RECOVERY_FLOOR_S = 60 // below this distraction, recovery is simply not observed

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

// ---------------------------------------------------------------------------
// Empty state — neutral priors (0.5), zero confidence everywhere.
// ---------------------------------------------------------------------------
function emptyTrait(): Trait {
  return { value: 0.5, confidence: 0, n: 0, updatedAt: null }
}

function emptyAcc(): ProfileAccumulators {
  return {
    depthMean: 0.5,
    depthSqMean: 0.25,
    depthShort: 0.5,
    depthLong: 0.5,
    gapMean: 0,
    gapSqMean: 0,
    gapN: 0,
  }
}

function emptyRhythm(): RhythmBuckets {
  return {
    hour: { sum: new Array(24).fill(0), count: new Array(24).fill(0) },
    dow: { sum: new Array(7).fill(0), count: new Array(7).fill(0) },
  }
}

export function emptyProfile(): BehavioralProfile {
  const traits = {} as Record<TraitName, Trait>
  for (const name of TRAIT_NAMES) traits[name] = emptyTrait()
  return {
    v: PROFILE_VERSION,
    sessionsSeen: 0,
    updatedAt: null,
    lastSessionAt: null,
    traits,
    rhythm: emptyRhythm(),
    acc: emptyAcc(),
  }
}

// ---------------------------------------------------------------------------
// Per-session observations. Each is 0..1 with HIGHER = MORE of the named quality, or
// null when this session carries no evidence for it (e.g. no distraction ⇒ nothing to
// say about recovery; unverified ⇒ nothing to say about shape). Learning only ever
// happens from evidence — never from the absence of it.
// ---------------------------------------------------------------------------
interface Observations {
  depth: number | null
  focus: number | null
  fragmentation: number | null
  recovery: number | null
  burnout: number | null
  distractionShare: number | null // for the rhythm histograms
}

const DEPTH_BY_QUALITY: Record<string, number> = {
  deep: 1,
  focused: 0.72,
  mixed: 0.38,
  distracted: 0.12,
}

export function observe(record: SessionRecord): Observations {
  const s = record.signals
  // No ambient signal ⇒ we cannot honestly judge the session's shape. Cadence still counts
  // (handled in updateProfile), but every shape trait is unobserved here.
  if (!s || !s.verified || record.quality === 'unverified') {
    return { depth: null, focus: null, fragmentation: null, recovery: null, burnout: null, distractionShare: null }
  }

  const total = Math.max(1, s.total_s)
  const focusFraction = clamp01(s.longest_focus_streak_s / total)
  const fragPenalty = clamp01(s.switches_per_hour / FRAG_FULL)

  const depth = DEPTH_BY_QUALITY[record.quality] ?? 0.38
  const focus = clamp01(0.65 * focusFraction + 0.35 * (1 - fragPenalty))
  const fragmentation = fragPenalty

  // Recovery is only meaningful if there was something to recover FROM.
  let recovery: number | null = null
  if (s.distraction_s >= RECOVERY_FLOOR_S && s.distraction_bouts >= 1) {
    const distStreakFraction = clamp01(s.longest_distraction_streak_s / total)
    recovery = clamp01(0.5 * (1 - distStreakFraction) + (s.ended_clean ? 0.5 : 0))
  }

  // Burnout: strain signals, deliberately conservative. Late hour, escalating drift,
  // fragmentation, and long low-quality grind each contribute.
  const lateHour = record.hour >= 22 || record.hour <= 4
  const longGrind = s.total_s > 2.5 * 3600 && s.distraction_pct >= 50
  const burnout = clamp01(
    0.3 * (lateHour ? 1 : 0) +
      0.25 * (s.drift_trend === 'escalating' ? 1 : 0) +
      0.25 * fragPenalty +
      0.2 * (longGrind ? 1 : 0),
  )

  return { depth, focus, fragmentation, recovery, burnout, distractionShare: s.distraction_pct / 100 }
}

// ---------------------------------------------------------------------------
// EWMA update of a single trait. The stored confidence is the "fresh" value (recency 0);
// read-time confidence is recomputed with staleness by traitConfidence().
// ---------------------------------------------------------------------------
function bump(t: Trait, obs: number, alpha: number, at: string): Trait {
  const n = t.n + 1
  const value = clamp01(t.value + alpha * (obs - t.value))
  return { value, n, updatedAt: at, confidence: confidence(n, 0) }
}

function setDerived(value: number, n: number, at: string, variance?: number): Trait {
  return { value: clamp01(value), n, updatedAt: at, confidence: confidence(n, 0, variance) }
}

function copyProfile(p: BehavioralProfile): BehavioralProfile {
  return {
    ...p,
    traits: { ...p.traits },
    rhythm: {
      hour: { sum: [...p.rhythm.hour.sum], count: [...p.rhythm.hour.count] },
      dow: { sum: [...p.rhythm.dow.sum], count: [...p.rhythm.dow.count] },
    },
    acc: { ...p.acc },
  }
}

// ---------------------------------------------------------------------------
// The learning step. Pure: (previous profile, one new session) -> next profile.
// ---------------------------------------------------------------------------
export function updateProfile(prev: BehavioralProfile, record: SessionRecord): BehavioralProfile {
  const next = copyProfile(prev)
  const at = record.startedAt
  next.sessionsSeen = prev.sessionsSeen + 1

  // --- Cadence (motivationStability) counts for EVERY session, verified or not. ---
  if (prev.lastSessionAt) {
    const gapH = clamp(
      (new Date(record.startedAt).getTime() - new Date(prev.lastSessionAt).getTime()) / 3_600_000,
      0,
      24 * 14,
    )
    const gn = prev.acc.gapN + 1
    next.acc.gapMean = prev.acc.gapMean + (gapH - prev.acc.gapMean) / gn
    next.acc.gapSqMean = prev.acc.gapSqMean + (gapH * gapH - prev.acc.gapSqMean) / gn
    next.acc.gapN = gn
    const varGap = Math.max(0, next.acc.gapSqMean - next.acc.gapMean ** 2)
    const cv = next.acc.gapMean > 0 ? Math.sqrt(varGap) / next.acc.gapMean : 1
    const regularity = clamp01(1 - cv)
    const freq = clamp01(1 - next.acc.gapMean / GAP_DESIRED_H)
    next.traits.motivationStability = setDerived(0.7 * regularity + 0.3 * freq, gn, at)
  }

  const o = observe(record)

  // --- Shape traits, only from verified sessions. ---
  if (o.depth != null) {
    next.traits.focusStability = bump(prev.traits.focusStability, o.focus!, ALPHA, at)
    next.traits.attentionFragmentation = bump(prev.traits.attentionFragmentation, o.fragmentation!, ALPHA, at)
    next.traits.burnoutRisk = bump(prev.traits.burnoutRisk, o.burnout!, ALPHA, at)
    if (o.recovery != null) {
      next.traits.recoverySpeed = bump(prev.traits.recoverySpeed, o.recovery, ALPHA, at)
    }

    // Depth accumulators (running mean/sqmean + fast/slow EWMAs).
    const dn = depthCount(prev) + 1
    next.acc.depthMean = prev.acc.depthMean + (o.depth - prev.acc.depthMean) / dn
    next.acc.depthSqMean = prev.acc.depthSqMean + (o.depth * o.depth - prev.acc.depthSqMean) / dn
    next.acc.depthShort = prev.acc.depthShort + ALPHA_SHORT * (o.depth - prev.acc.depthShort)
    next.acc.depthLong = prev.acc.depthLong + ALPHA_LONG * (o.depth - prev.acc.depthLong)

    // deepSessionConsistency = 1 - normalized std of depth.
    const varDepth = Math.max(0, next.acc.depthSqMean - next.acc.depthMean ** 2)
    const std = Math.sqrt(varDepth)
    next.traits.deepSessionConsistency = setDerived(1 - clamp01(std / STD_FULL), dn, at, std)

    // selfAwarenessGrowth = recent-vs-older depth, centered at 0.5.
    const growth = next.acc.depthShort - next.acc.depthLong
    next.traits.selfAwarenessGrowth = setDerived(0.5 + growth * GROWTH_GAIN, dn, at)

    // Rhythm histograms (running means of distraction share by hour + day-of-week).
    if (o.distractionShare != null) {
      next.rhythm.hour.sum[record.hour] += o.distractionShare
      next.rhythm.hour.count[record.hour] += 1
      next.rhythm.dow.sum[record.dow] += o.distractionShare
      next.rhythm.dow.count[record.dow] += 1
    }
  }

  next.lastSessionAt = record.startedAt
  next.updatedAt = record.startedAt
  return next
}

// The number of verified sessions that have fed the depth accumulators. Derived from the
// consistency trait's n so we don't store a redundant counter.
function depthCount(p: BehavioralProfile): number {
  return p.traits.deepSessionConsistency.n
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

// ---------------------------------------------------------------------------
// Rebuild from scratch. This IS the fold, which is what makes the stored profile a
// pure cache of the owner's own history.
// ---------------------------------------------------------------------------
export function deriveProfile(history: SessionRecord[]): BehavioralProfile {
  const ordered = [...(history ?? [])]
    .filter((r) => r && r.startedAt)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  return ordered.reduce(updateProfile, emptyProfile())
}

// ---------------------------------------------------------------------------
// Read-time confidence: the stored value times recency decay. Consumers MUST read
// confidence through here (not the snapshot on the trait) so staleness is honored.
// ---------------------------------------------------------------------------
export function traitConfidence(t: Trait, now = Date.now()): number {
  if (!t || t.n <= 0) return 0
  return confidence(t.n, daysSince(t.updatedAt, now))
}

export function readTrait(
  p: BehavioralProfile,
  name: TraitName,
  now = Date.now(),
): { value: number; confidence: number; n: number } {
  const t = p.traits[name]
  return { value: t.value, confidence: traitConfidence(t, now), n: t.n }
}
