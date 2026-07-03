// lib/intelligence/reflection.ts — Deep Session Reflection (the profile-aware noticing).
//
// behavior.ts still writes the base "Satya" line for a session (its shape, in plain words).
// This adds AT MOST one further line: a quiet noticing that only the longitudinal profile
// could know — "steadier than your recent run", "you found your way back". Silence is the
// default. When the profile isn't confident enough yet, it falls back to behavior.ts's own
// numeric baseline comparison, so the feature can only ever improve the existing line.
//
// Pure. Returns the register too, so the UI/voice can match its tone to the moment.

import { noticeAgainstBaseline, type BehaviorSignals } from '../behavior.ts'
import { canSpeak } from './confidence.ts'
import { estimateEmotion, dominantEmotion } from './emotion.ts'
import { readTrait } from './traits.ts'
import { compose } from './messages.ts'
import type { BehavioralProfile, EmotionName, Register, SessionRecord } from './types.ts'

export interface Noticing {
  line: string
  register: Register
  confidence: number
  evidence: string[]
}

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
 *   history — recent BehaviorSignals (owner-only), for the numeric fallback.
 */
export function sessionNoticing(
  record: SessionRecord,
  profile: BehavioralProfile,
  history: BehaviorSignals[] = [],
  now = Date.now(),
  seed = 0,
): Noticing | null {
  const s = record.signals
  const emotion = estimateEmotion(profile, record, now)
  const dominant = dominantEmotion(emotion)
  const register = registerFor(dominant && dominant.estimate.confidence > 0.25 ? dominant.name : null)

  // Profile-aware qualitative noticings (no stored medians needed) — only when the
  // relevant trait is confident enough to earn a claim.
  const recovery = readTrait(profile, 'recoverySpeed', now)
  const frag = readTrait(profile, 'attentionFragmentation', now)

  type Cand = { intent: string; confidence: number; evidence: string[] }
  const candidates: Cand[] = []

  if (s && s.verified) {
    // "You found your way back" — real drift (at least one bout) that ended clean, and it
    // isn't a heavy loop (that's a different, more careful noticing). From someone whose
    // recovery we actually understand.
    if (s.distraction_bouts >= 1 && s.ended_clean && s.distraction_returns < 3 && canSpeak(recovery.confidence)) {
      candidates.push({ intent: 'notice:recovered_well', confidence: recovery.confidence, evidence: ['drift, then a clean final stretch'] })
    }
    // "Calmer than usual" — this session switched noticeably less than the user typically does.
    const sessionFrag = Math.min(1, s.switches_per_hour / 30)
    if (canSpeak(frag.confidence) && sessionFrag < frag.value - 0.2) {
      candidates.push({ intent: 'notice:calmer_than_usual', confidence: frag.confidence, evidence: [`less switching than your typical (${Math.round(frag.value * 100)}%)`] })
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence)
  for (const c of candidates) {
    const msg = compose(c.intent, register, {}, seed)
    if (msg) return { line: msg.text, register: msg.register, confidence: c.confidence, evidence: c.evidence }
  }

  // Fallback: behavior.ts's proven numeric comparison against the user's own recent
  // sessions. This is exactly today's behavior, so the feature never regresses.
  const baseline = noticeAgainstBaseline(s ?? ({} as BehaviorSignals), history)
  if (baseline) {
    return { line: baseline, register, confidence: 0.5, evidence: ['compared to your recent sessions'] }
  }
  return null
}
