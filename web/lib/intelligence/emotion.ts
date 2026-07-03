// lib/intelligence/emotion.ts — Emotional Intelligence (behavioral signals ONLY).
//
// Estimates the emotional CONTEXT of attention — calm, momentum, resistance, fatigue,
// flow, overwhelm, recovery-readiness — from nothing but timing and the session's shape.
// Two hard rules:
//   * NEVER a diagnosis. These are transient states of a work session, not traits of a
//     person and never a medical inference. The names describe attention, not pathology.
//   * Every estimate carries confidence. A single short session says little; we say little.
//
// Used by reflection.ts to pick a tonal register, and available to insights. Pure.

import { readTrait } from './traits.ts'
import type {
  BehavioralProfile, EmotionEstimates, EmotionName, Estimate, SessionRecord,
} from './types.ts'

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function est(value: number, confidence: number, evidence: string[]): Estimate {
  return { value: clamp01(value), confidence: clamp01(confidence), evidence }
}

// How much a single "right now" read can be trusted: a longer, verified session gives a
// clearer picture of the current state (this is about signal quality, not sample size).
function momentConfidence(record: SessionRecord | null): number {
  if (!record || !record.signals || !record.signals.verified) return 0.1
  return clamp01(0.3 + 0.4 * clamp01(record.signals.total_s / (30 * 60)))
}

/**
 * estimateEmotion(profile, record?, now)
 *   record — the session just finished (for "right now" reads). Optional: without it the
 *            estimates fall back to the slower trait picture at lower confidence.
 */
export function estimateEmotion(
  profile: BehavioralProfile,
  record: SessionRecord | null = null,
  now = Date.now(),
): EmotionEstimates {
  const s = record?.signals ?? null
  const mc = momentConfidence(record)

  const focusFraction = s ? clamp01(s.longest_focus_streak_s / Math.max(1, s.total_s)) : 0.5
  const fragPenalty = s ? clamp01(s.switches_per_hour / 30) : 0.5
  const escalating = s?.drift_trend === 'escalating'
  const recovering = s?.drift_trend === 'recovering'
  const lateHour = record ? record.hour >= 22 || record.hour <= 4 : false
  const longSession = s ? s.total_s > 2 * 3600 : false

  const fragTrait = readTrait(profile, 'attentionFragmentation', now)
  const recoveryTrait = readTrait(profile, 'recoverySpeed', now)
  const growthTrait = readTrait(profile, 'selfAwarenessGrowth', now)
  const consistencyTrait = readTrait(profile, 'deepSessionConsistency', now)
  const burnoutTrait = readTrait(profile, 'burnoutRisk', now)
  const motivationTrait = readTrait(profile, 'motivationStability', now)

  const out = {} as EmotionEstimates
  const put = (name: EmotionName, e: Estimate) => {
    out[name] = e
  }

  // Flow: long unbroken attention, little switching. A "right now" read.
  put('flow', est(0.6 * focusFraction + 0.4 * (1 - fragPenalty), mc, [
    s ? `longest unbroken stretch was ${Math.round(focusFraction * 100)}% of the session` : 'no session signal',
  ]))

  // Overwhelm: fast switching plus drift that built through the session.
  put('overwhelm', est(0.55 * fragPenalty + 0.45 * (escalating ? 1 : 0), mc, [
    escalating ? 'drift built toward the end' : 'drift did not escalate',
  ]))

  // Calm: the quiet inverse of overwhelm, steadied by the user's own consistency.
  put('calm', est(0.6 * (1 - fragPenalty) + 0.4 * consistencyTrait.value, Math.max(mc * 0.8, consistencyTrait.confidence), [
    'low switching reads as calm',
  ]))

  // Fatigue: late-hour, long grind, or a standing burnout signal. Conservative.
  put('fatigue', est(0.4 * (lateHour ? 1 : 0) + 0.3 * (longSession ? 1 : 0) + 0.3 * burnoutTrait.value, Math.max(mc * 0.6, burnoutTrait.confidence), [
    lateHour ? 'a late-hour session' : 'not a late-hour session',
  ]))

  // Momentum: recent depth trending up, on a steady rhythm.
  put('momentum', est(0.6 * growthTrait.value + 0.4 * motivationTrait.value, Math.max(growthTrait.confidence, motivationTrait.confidence) * 0.9, [
    'recent sessions vs your earlier ones',
  ]))

  // Resistance: the pull against starting — a fragmented, drift-heavy session with a
  // standing burnout undertone. The opposite of momentum.
  put('resistance', est(0.5 * fragPenalty + 0.3 * (escalating ? 1 : 0) + 0.2 * burnoutTrait.value, Math.max(mc * 0.7, burnoutTrait.confidence), [
    'a scattered, drifting session reads as resistance',
  ]))

  // Recovery readiness: how ready the person is to get back to it — strong when they
  // recover well and aren't fatigued.
  const fatigueVal = out.fatigue.value
  put('recoveryReadiness', est(0.6 * recoveryTrait.value + 0.4 * (1 - fatigueVal) + (recovering ? 0.1 : 0), Math.max(recoveryTrait.confidence, mc * 0.6), [
    recovering ? 'this session was already recovering' : 'based on how you usually come back',
  ]))

  return out
}

/** The single most-confident, most-pronounced emotion right now (or null if all are faint). */
export function dominantEmotion(e: EmotionEstimates): { name: EmotionName; estimate: Estimate } | null {
  let best: { name: EmotionName; estimate: Estimate } | null = null
  for (const name of Object.keys(e) as EmotionName[]) {
    const score = e[name].value * e[name].confidence
    if (!best || score > best.estimate.value * best.estimate.confidence) best = { name, estimate: e[name] }
  }
  return best
}
