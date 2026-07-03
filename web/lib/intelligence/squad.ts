// lib/intelligence/squad.ts — Squad Recommendation (server loop).
//
// Decides, from the user's own behavioral profile (and, when available, whether encouragement
// has actually helped them before), whether to gently suggest bringing a friend in, to leave a
// thriving solo worker alone, or to say nothing. The squad NEVER sees domains or session
// detail — this only decides whether to OFFER support. Learned, confidence-gated, and quiet by
// default. Pure.

import { confidence, CONFIDENCE } from './confidence.ts'
import { readTrait } from './traits.ts'
import type { BehavioralProfile, Estimate } from './types.ts'

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** A domain-free session outcome tag: was it encouraged, and did it land well? */
export interface SessionOutcome {
  encouraged: boolean
  good: boolean // completed and at least verified/decent quality
}

/**
 * Does squad encouragement correlate with better sessions FOR THIS USER? Compares the "good"
 * rate of their encouraged sessions vs their own un-encouraged baseline — user-vs-own-past
 * only, never cross-user. Returns a 0..1 estimate centered at 0.5 (no effect).
 */
export function squadImpact(outcomes: SessionOutcome[]): Estimate {
  const enc = (outcomes ?? []).filter((o) => o && o.encouraged)
  const base = (outcomes ?? []).filter((o) => o && !o.encouraged)
  if (enc.length < 3 || base.length < 3) {
    return { value: 0.5, confidence: 0, evidence: ['not enough encouraged sessions to compare'] }
  }
  const encRate = enc.filter((o) => o.good).length / enc.length
  const baseRate = base.filter((o) => o.good).length / base.length
  return {
    value: clamp01(0.5 + (encRate - baseRate) * 1.5),
    confidence: confidence(Math.min(enc.length, base.length)),
    evidence: [`encouraged sessions land well ${Math.round(encRate * 100)}% of the time vs ${Math.round(baseRate * 100)}%`],
  }
}

export type SquadRec = 'invite' | 'solo' | 'silent'

export interface SquadRecommendation {
  recommend: SquadRec
  reason: string
  confidence: number
  evidence: string[]
}

/**
 * Should we suggest bringing a friend in? Order of preference:
 *   1) encouragement has demonstrably helped them  -> invite (lean in)
 *   2) they sustain focus well on their own now     -> solo (leave them be — privacy is better)
 *   3) they're alone AND struggling to sustain      -> invite (a friend tends to help)
 *   else                                            -> silent (not enough to say)
 */
export function recommendSquadSupport(args: {
  profile: BehavioralProfile
  aloneInCircle: boolean
  squadImpact?: Estimate | null
  now?: number
}): SquadRecommendation {
  const { profile, aloneInCircle, now = Date.now() } = args
  const si = args.squadImpact ?? null
  const recovery = readTrait(profile, 'recoverySpeed', now)
  const burnout = readTrait(profile, 'burnoutRisk', now)
  const motivation = readTrait(profile, 'motivationStability', now)
  const focus = readTrait(profile, 'focusStability', now)

  if (si && si.confidence >= CONFIDENCE.speak && si.value >= 0.62) {
    return { recommend: 'invite', reason: 'a friend showing up has helped you before', confidence: si.confidence, evidence: si.evidence }
  }

  if (focus.confidence >= CONFIDENCE.act && focus.value >= 0.7 && burnout.value < 0.4) {
    return { recommend: 'solo', reason: 'you sustain focus well on your own right now', confidence: focus.confidence, evidence: ['steady focus, low strain'] }
  }

  const struggling =
    (burnout.confidence >= CONFIDENCE.speak && burnout.value >= 0.55) ||
    (recovery.confidence >= CONFIDENCE.speak && recovery.value <= 0.4) ||
    (motivation.confidence >= CONFIDENCE.speak && motivation.value <= 0.4)
  if (aloneInCircle && struggling) {
    return {
      recommend: 'invite',
      reason: 'restarting has been the hard part — someone in it with you tends to help',
      confidence: Math.max(recovery.confidence, burnout.confidence, motivation.confidence),
      evidence: ['low recovery / rising strain in recent sessions'],
    }
  }

  return { recommend: 'silent', reason: 'not enough to say', confidence: 0, evidence: [] }
}
