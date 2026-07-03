// lib/intelligence/insights.ts — Insight Generator (Weekly Intelligence).
//
// Turns the profile into ONE realization worth a person's attention, or nothing. Not a
// dashboard of charts — a single sentence that names a real pattern in how they work. The
// bar is deliberately high: we would rather say nothing this week than pad it with a stat.
//
// Pure. Composition goes through messages.ts (template → validate), so a future Claude
// rephrasing slots in without changing this file.

import { CONFIDENCE } from './confidence.ts'
import { topPatterns } from './patterns.ts'
import { compose } from './messages.ts'
import type { BehavioralProfile, PatternKind, Register, WeeklyInsight } from './types.ts'

// Registers chosen per pattern so the voice fits the news (never random).
const REGISTER_BY_KIND: Record<PatternKind, Register> = {
  steady_improvement: 'encouraging',
  morning_strength: 'encouraging',
  restart_difficulty: 'supportive',
  monday_resistance: 'supportive',
  rapid_fragmentation: 'reflective',
  late_night_drift: 'reflective',
  weekend_collapse: 'reflective',
  post_lunch_dip: 'reflective',
}

const MIN_STRENGTH = 0.3
const QUIET_WEEK_MIN_VERIFIED = 6

/**
 * weeklyInsight(profile, now, seed) → one realization or null.
 * The single strongest, best-evidenced pattern that clears the speak bar wins. If there is
 * genuine steady activity but nothing pronounced, a quiet acknowledgement may stand in.
 */
export function weeklyInsight(
  profile: BehavioralProfile,
  now = Date.now(),
  seed = 0,
): WeeklyInsight | null {
  const patterns = topPatterns(profile, now)
  const top = patterns[0]

  if (top && top.confidence >= CONFIDENCE.speak && top.strength >= MIN_STRENGTH) {
    const register = REGISTER_BY_KIND[top.kind] ?? 'reflective'
    const msg = compose(`insight:${top.kind}`, register, {}, seed)
    if (msg) {
      return { kind: top.kind, text: msg.text, confidence: top.confidence, evidence: top.evidence }
    }
  }

  // Steady, unremarkable week with enough verified work behind it: a calm acknowledgement,
  // never a manufactured "achievement".
  const verified = profile.traits.deepSessionConsistency.n
  if (verified >= QUIET_WEEK_MIN_VERIFIED) {
    const msg = compose('insight:quiet_week', 'calm', {}, seed)
    if (msg) return { kind: 'quiet_week', text: msg.text, confidence: CONFIDENCE.speak, evidence: [`${verified} verified sessions, no single pattern stood out`] }
  }

  return null
}
