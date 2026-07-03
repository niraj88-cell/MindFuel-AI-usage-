// lib/intelligence/types.ts — the shared vocabulary of SatyaShift's longitudinal
// behavioral intelligence. This layer sits ON TOP of the per-session engine
// (lib/behavior.ts); it never replaces it.
//
// Privacy invariant (absolute, same as behavior.ts):
//   Nothing in this file — no type, no stored shape — ever holds a domain, URL, page
//   title, search term, or any free text. Only counts, durations, shares, 0..1 scores,
//   and hour-of-day / day-of-week BUCKETS. The BehavioralProfile jsonb is safe even if it
//   leaked: it describes the SHAPE of a person's attention, never where it went.
//
// Explainability invariant: every outward estimate carries `confidence` and `evidence`.
// Nothing this layer says is a black box; low confidence means the caller stays silent.

import type { BehaviorSignals, SessionQuality } from '@/lib/behavior'

// ---------------------------------------------------------------------------
// A single completed session, projected to the domain-free facts the intelligence
// needs. Built at the edge (e.g. /api/focus/stop) from focus_sessions + the stored
// behavior jsonb. `hour`/`dow` are computed in the USER'S timezone at the edge so the
// pure modules never touch Date/Intl and stay trivially testable.
// ---------------------------------------------------------------------------
export interface SessionRecord {
  /** ISO start time — kept only to order records and measure inter-session cadence. */
  startedAt: string
  durationS: number
  quality: SessionQuality
  /** The already-stored per-session signals (zero domains by construction). */
  signals: BehaviorSignals | null
  /** Local hour 0..23 of the session start (user tz). */
  hour: number
  /** Local day of week 0..6, 0 = Sunday (user tz). */
  dow: number
}

// ---------------------------------------------------------------------------
// A learned trait: a slowly-moving 0..1 estimate with its own confidence and the
// number of sessions that have contributed evidence to it. `value` is a normalized
// score where HIGHER always means MORE of the named quality (see TRAIT_MEANING).
// ---------------------------------------------------------------------------
export interface Trait {
  /** 0..1, higher = more of this quality. Neutral prior is 0.5. */
  value: number
  /** 0..1 — rises with sample size, decays with staleness. 0 = never observed. */
  confidence: number
  /** Sessions that contributed evidence to this trait. */
  n: number
  /** ISO time of the last update to this trait. */
  updatedAt: string | null
}

export const TRAIT_NAMES = [
  'focusStability',
  'recoverySpeed',
  'interventionResponsiveness',
  'notificationSensitivity',
  'deepSessionConsistency',
  'attentionFragmentation',
  'burnoutRisk',
  'motivationStability',
  'squadImpact',
  'selfAwarenessGrowth',
] as const

export type TraitName = (typeof TRAIT_NAMES)[number]

/** Human-readable meaning of value≈1 for each trait — the source of "evidence" copy. */
export const TRAIT_MEANING: Record<TraitName, string> = {
  focusStability: 'attention holds in long unbroken stretches',
  recoverySpeed: 'quick to return after drifting',
  interventionResponsiveness: 'a gentle check-in tends to land',
  notificationSensitivity: 'reacts strongly to notifications',
  deepSessionConsistency: 'sessions land at a steady depth',
  attentionFragmentation: 'attention changes places often',
  burnoutRisk: 'signs of strain are building',
  motivationStability: 'shows up on a steady rhythm',
  squadImpact: 'a friend showing up helps',
  selfAwarenessGrowth: 'the shape of attention is improving over time',
}

// ---------------------------------------------------------------------------
// The stored profile (the behavioral_profiles.profile jsonb). Domain-free.
// `acc` holds the running accumulators that variance/trend traits need so the whole
// thing can be rebuilt by folding updateProfile over history (see traits.ts).
// ---------------------------------------------------------------------------
export interface RhythmBuckets {
  /** Per-hour running sum of distraction share and the count of sessions in that hour. */
  hour: { sum: number[]; count: number[] } // length 24
  /** Per-day-of-week running sum of distraction share and session count. */
  dow: { sum: number[]; count: number[] } // length 7
}

export interface ProfileAccumulators {
  /** Mean and mean-of-squares of session "depth" (0..1) — feeds deepSessionConsistency. */
  depthMean: number
  depthSqMean: number
  /** Fast/slow EWMAs of depth — their difference is selfAwarenessGrowth. */
  depthShort: number
  depthLong: number
  /** Mean and mean-of-squares of inter-session gaps (hours) — feeds motivationStability. */
  gapMean: number
  gapSqMean: number
  gapN: number
}

export interface BehavioralProfile {
  /** Schema version of this jsonb shape. */
  v: number
  sessionsSeen: number
  updatedAt: string | null
  lastSessionAt: string | null
  traits: Record<TraitName, Trait>
  rhythm: RhythmBuckets
  acc: ProfileAccumulators
}

// ---------------------------------------------------------------------------
// An outward-facing estimate (emotional context, a noticing, an insight). ALWAYS
// carries confidence + human-readable evidence so nothing is unexplained.
// ---------------------------------------------------------------------------
export interface Estimate {
  value: number
  confidence: number
  evidence: string[]
}

/** The behavioral-only emotional context (never a diagnosis — see emotion.ts). */
export type EmotionName =
  | 'calm'
  | 'momentum'
  | 'resistance'
  | 'fatigue'
  | 'flow'
  | 'overwhelm'
  | 'recoveryReadiness'

export type EmotionEstimates = Record<EmotionName, Estimate>

// The tonal register the intelligence can choose for a message. Deterministic given
// the profile + emotion; never random (mission: "Never random").
export type Register = 'supportive' | 'reflective' | 'curious' | 'encouraging' | 'calm'

// A recurring behavioral pattern discovered from timing + shape (never a website).
export type PatternKind =
  | 'late_night_drift'
  | 'weekend_collapse'
  | 'monday_resistance'
  | 'post_lunch_dip'
  | 'morning_strength'
  | 'rapid_fragmentation'
  | 'restart_difficulty'
  | 'steady_improvement'

export interface PatternSignal {
  kind: PatternKind
  /** 0..1 how pronounced the pattern is. */
  strength: number
  confidence: number
  evidence: string[]
}

/** A single weekly realization (one is worth more than twenty charts). */
export interface WeeklyInsight {
  kind: PatternKind | 'quiet_week'
  text: string
  confidence: number
  evidence: string[]
}
