// lib/intelligence/reflection.ts — the Reflection Engine (tiered, coherence-gated).
//
// This is a decision procedure, not a message generator. behavior.ts writes the base
// "Satya" line for a session (its shape, in plain words, always factual). This module
// decides whether ONE further line has been earned, in strict order of precedence:
//
//   1. SILENCE      — no verified signal, or the browser witnessed too little to comment.
//   2. INSIGHT      — a profile-backed noticing. Requires the relevant trait to clear the
//                     confidence bar AND the claim to be coherent with what the base line
//                     just said about this session.
//   3. OBSERVATION  — a plain numeric comparison against the user's own recent sessions,
//                     numbers included, coherence-gated the same way.
//   4. SILENCE      — an ordinary session gets no note. The base line already told the truth.
//
// Coherence is the trust rule this file exists for. Three ways the old version could read
// as generated text, all now impossible by construction:
//   - PRAISE ON A BAD LEDGER: "steadier than your recent run" under a session the card
//     just called distracted. A positive note now requires the session's own quality to
//     be deep or focused.
//   - RATE CLAIMS FROM NOISE: "less switching than usual" measured on a 13-minute,
//     one-tab session. Rate comparisons now need >= 20 witnessed minutes and a real
//     typical to be calmer THAN.
//   - THE ECHO: the note restating the recovery story the base line already told.
//     A candidate that duplicates the base line's bucket is skipped.
//
// Pure. Returns the register too, so the UI/voice can match its tone to the moment.

import {
  baselineComparison, evidenceIsThin, qualityOf, type BehaviorSignals,
} from '../behavior.ts'
import { canSpeak } from './confidence.ts'
import { estimateEmotion, dominantEmotion } from './emotion.ts'
import { readTrait } from './traits.ts'
import { compose, type MsgContext } from './messages.ts'
import type { BehavioralProfile, EmotionName, Register, SessionRecord } from './types.ts'

export type NoticingTier = 'insight' | 'observation'

export interface Noticing {
  line: string
  register: Register
  confidence: number
  evidence: string[]
  tier: NoticingTier
}

// Rate-based comparisons (switches/hour vs typical) need a real sample. Below this the
// numerator is noise: a short one-tab session "switches less than usual" trivially.
const RATE_CLAIM_MIN_S = 20 * 60
// A "calmer than usual" claim needs a genuine typical to be calmer than — a profile that
// was never fragmented offers nothing to compare against.
const FRAG_TYPICAL_FLOOR = 0.25
const FRAG_CLEAR_GAP = 0.2
const FRAG_FULL_PER_HOUR = 30 // mirrors traits.ts FRAG_FULL (the 0..1 normalizer)

// Emotional context → tonal register. Deterministic; never random.
function registerFor(emotion: EmotionName | null): Register {
  switch (emotion) {
    case 'overwhelm':
    case 'resistance':
    case 'fatigue':
    case 'recoveryReadiness':
      return 'supportive'
    case 'flow':
    case 'momentum':
      return 'encouraging'
    case 'calm':
      return 'calm'
    default:
      return 'reflective'
  }
}

/**
 * sessionNoticing — the one extra line (or null).
 *   record  — the finished session (domain-free).
 *   profile — the user's evolving behavioral profile.
 *   history — recent BehaviorSignals (owner-only), for the numeric observation tier.
 *   seed    — session-identity seed (start time) so phrasing varies across sessions
 *             while a given session reads the same on every visit.
 */
export function sessionNoticing(
  record: SessionRecord,
  profile: BehavioralProfile,
  history: BehaviorSignals[] = [],
  now = Date.now(),
  seed = 0,
): Noticing | null {
  const s = record.signals

  // ---- Tier 0: silence when there is nothing to stand on. -------------------------
  if (!s || !s.verified || s.total_s <= 0) return null
  // A session the browser barely witnessed gets no commentary at all. The base line
  // already names the coverage; any pattern claim layered on top would be a guess.
  if (evidenceIsThin(s, record.durationS)) return null

  const quality = qualityOf(s, record.durationS)
  // THE COHERENCE GATE. A positive noticing may only appear under a session whose own
  // ledger reads well; on a mixed or distracted session the only honest extra line is a
  // factual one (or nothing).
  const praiseAllowed = quality === 'deep' || quality === 'focused'

  const emotion = estimateEmotion(profile, record, now)
  const dominant = dominantEmotion(emotion)
  const register = registerFor(dominant && dominant.estimate.confidence > 0.25 ? dominant.name : null)

  // ---- Tier 1: INSIGHT — profile-backed, confidence- and coherence-gated. ---------
  const recovery = readTrait(profile, 'recoverySpeed', now)
  const frag = readTrait(profile, 'attentionFragmentation', now)

  type Cand = { intent: string; confidence: number; evidence: string[]; ctx: MsgContext }
  const candidates: Cand[] = []

  if (praiseAllowed) {
    // "You found your way back" — real drift (at least one bout) that ended clean, not a
    // heavy loop, from someone whose recovery we actually understand. Skipped when the
    // base line's own recovery bucket (pct >= 15 && ended_clean) already tells this
    // story — the note must add information, never echo.
    const baseTellsRecovery = s.distraction_pct >= 15 && s.ended_clean
    if (!baseTellsRecovery && s.distraction_bouts >= 1 && s.ended_clean
        && s.distraction_returns < 3 && canSpeak(recovery.confidence)) {
      candidates.push({
        intent: 'notice:recovered_well',
        confidence: recovery.confidence,
        evidence: ['drift, then a clean final stretch', `recovery observed across ${recovery.n} sessions`],
        ctx: {},
      })
    }
    // "Calmer than usual" — a rate claim, so it must be earned three ways: enough
    // witnessed time, a genuinely fragmented typical to compare against, and a clear gap.
    const sessionFrag = Math.min(1, s.switches_per_hour / FRAG_FULL_PER_HOUR)
    if (s.total_s >= RATE_CLAIM_MIN_S && canSpeak(frag.confidence)
        && frag.value >= FRAG_TYPICAL_FLOOR && sessionFrag < frag.value - FRAG_CLEAR_GAP) {
      const typicalPerHour = Math.round(frag.value * FRAG_FULL_PER_HOUR)
      candidates.push({
        intent: 'notice:calmer_than_usual',
        confidence: frag.confidence,
        evidence: [`${s.switches_per_hour}/h switching vs your typical ~${typicalPerHour}/h`],
        ctx: { perHour: s.switches_per_hour, typicalPerHour },
      })
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence)
  for (const c of candidates) {
    const msg = compose(c.intent, register, c.ctx, seed)
    if (msg) return { line: msg.text, register: msg.register, confidence: c.confidence, evidence: c.evidence, tier: 'insight' }
  }

  // ---- Tier 2: OBSERVATION — numbers against the user's own recent sessions. ------
  // The circling comparison is honest under any quality (it names a concern, with the
  // counts); the streak comparison praises, so it obeys the same coherence gate.
  const cmp = baselineComparison(s, history, seed)
  if (cmp && (cmp.kind === 'circling' || praiseAllowed)) {
    return { line: cmp.text, register, confidence: 0.5, evidence: ['compared to your recent sessions'], tier: 'observation' }
  }

  // ---- Tier 3: an ordinary session gets no note. Silence is the default state, ------
  // not a failure state — the base line has already said what was true.
  return null
}
