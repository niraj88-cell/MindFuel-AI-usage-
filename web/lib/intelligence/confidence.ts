// lib/intelligence/confidence.ts — the Confidence Engine.
//
// One job: turn "how much evidence do we have, and how fresh is it" into a single
// 0..1 confidence. Everything downstream obeys the same rule — LOW CONFIDENCE MEANS
// STAY QUIET. The product would rather say nothing than say something it hasn't earned.
//
// Pure and dependency-free so the exact curve is provable in tests.

/** Sessions needed before the sample component reaches ~0.63 (one time-constant). */
const SAMPLE_K = 6
/** Days after which stale evidence has decayed to ~0.37 of its weight. */
const RECENCY_HALFLIFE_DAYS = 45
/** Variance (0..1 scale) that halves confidence — noisy traits are trusted less. */
const VARIANCE_K = 0.25

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/**
 * confidence(n, recencyDays, variance?)
 *   n            — number of evidence samples (sessions) behind the estimate
 *   recencyDays  — days since the most recent evidence (0 = today)
 *   variance     — optional 0..1 spread of the underlying observations (higher = noisier)
 *
 * Returns 0..1. n=0 always returns 0 (never observed ⇒ never speak).
 */
export function confidence(n: number, recencyDays = 0, variance?: number): number {
  if (!(n > 0)) return 0
  const sample = 1 - Math.exp(-n / SAMPLE_K)
  const recency = Math.exp(-Math.max(0, recencyDays) / RECENCY_HALFLIFE_DAYS)
  const varianceFactor =
    variance == null ? 1 : 1 / (1 + Math.max(0, variance) / VARIANCE_K)
  return clamp01(sample * recency * varianceFactor)
}

/** Days between an ISO timestamp and `now` (never negative). */
export function daysSince(iso: string | null, now = Date.now()): number {
  if (!iso) return Infinity
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return Infinity
  return Math.max(0, (now - t) / 86_400_000)
}

// Confidence bands the rest of the system reads against, so the thresholds live in ONE
// place. "speak" is the bar an outward line must clear; "act" is the higher bar an
// automated change (e.g. altering a nudge's tone) must clear.
export const CONFIDENCE = {
  /** Below this, produce nothing user-facing. */
  speak: 0.45,
  /** Below this, never take an automated action on the user's behalf. */
  act: 0.65,
} as const

export function canSpeak(c: number): boolean {
  return c >= CONFIDENCE.speak
}
export function canAct(c: number): boolean {
  return c >= CONFIDENCE.act
}
