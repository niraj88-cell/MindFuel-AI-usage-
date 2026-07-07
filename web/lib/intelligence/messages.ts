// lib/intelligence/messages.ts — Message Generation (template + safety).
//
// The mission's pipeline is:  behavior engine → intent → TEMPLATE → [Claude refine] →
// SAFETY VALIDATION → deliver. This module owns the two deterministic ends of that pipe:
// a curated template library keyed by (intent, register), and validateMessage — the gate
// EVERYTHING user-facing passes, including any future Claude rephrasing. Because the
// validator runs last and falls back to the template on any violation, Claude can never
// make the product say something unkind, off-brand, or privacy-leaking.
//
// Tone law (from the design language + the mission): name what's real, zero blame, hand
// the next moment back to the user, stay short. No shame words, no emoji, never a domain.

import type { Register } from './types.ts'

export type MsgContext = Record<string, string | number>
type Template = (c: MsgContext) => string

// ---------------------------------------------------------------------------
// Safety validator. Returns { ok, reason }. Conservative on purpose: a false reject just
// falls back to a known-safe template; a false accept could hurt someone.
// ---------------------------------------------------------------------------
const BANNED = [
  /\b(wasted|lazy|pathetic|failure|failed|procrastinat\w*|worthless|undisciplined)\b/i,
  /\byou\s*'?re\s+(distracted|lazy|failing|behind)\b/i,
  /\byou\s+should\b/i,
  /\bstop\s+(procrastinating|wasting|scrolling)\b/i,
  /\b(discipline yourself|try harder|do better)\b/i,
]
// A safety net against ever leaking a domain into a message (mainly for the Claude phase).
const DOMAINISH = /\b[a-z0-9-]+\.(com|net|org|io|app|dev|tv|xyz|gov|edu|info|ai)\b/i
// eslint-disable-next-line no-misleading-character-class
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u
const MAX_LEN = 240

export function validateMessage(text: string): { ok: boolean; reason?: string } {
  const t = (text ?? '').trim()
  if (!t) return { ok: false, reason: 'empty' }
  if (t.length > MAX_LEN) return { ok: false, reason: 'too_long' }
  if (EMOJI.test(t)) return { ok: false, reason: 'emoji' }
  if (DOMAINISH.test(t)) return { ok: false, reason: 'domain_leak' }
  for (const re of BANNED) if (re.test(t)) return { ok: false, reason: 'shame' }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Template library. Keyed intent → register → phrasings (rotated by a seed, like the
// extension's nudge copy). Registers that don't need variants share one voice.
// ---------------------------------------------------------------------------
const TEMPLATES: Record<string, Partial<Record<Register, Template[]>>> = {
  'insight:restart_difficulty': {
    reflective: [
      () => "This week the hard part wasn't distraction itself. It was getting going again after each interruption.",
      () => 'The pattern this week was less about drifting and more about how long the way back took.',
      () => 'Interruptions cost less time this week than the restarts after them. The gap after each break is where the minutes went.',
    ],
    supportive: [
      () => 'The real work this week was starting again after each interruption. You did start again, every time.',
      () => 'Restarts came slowly this week. They came, though — each break ended with a return.',
    ],
  },
  'insight:morning_strength': {
    reflective: [
      () => 'Your morning sessions consistently became your strongest work this stretch.',
      () => 'Mornings are where your attention holds best. The day loosens from there.',
    ],
    encouraging: [
      () => 'Mornings are quietly your best hours. The pattern has held long enough to trust.',
    ],
  },
  'insight:late_night_drift': {
    reflective: [
      () => 'Late evenings are where attention tends to slip. Earlier in the day it holds better.',
      () => 'The later it got, the more attention wandered. Earlier hours kept their shape.',
    ],
  },
  'insight:weekend_collapse': {
    reflective: [
      () => 'Weekends scatter more than your weekdays do. That might be exactly what they are for.',
      () => 'Attention loosens on weekends and tightens again on weekdays. The rhythm repeats.',
    ],
  },
  'insight:monday_resistance': {
    reflective: [
      () => 'Mondays start slow for you. The week tends to find its feet after that.',
      () => 'The slowest starts land on Mondays. By midweek the sessions run longer on their own.',
    ],
    supportive: [
      () => 'Mondays ask the most to get moving. The rest of the week comes easier — it has before.',
    ],
  },
  'insight:post_lunch_dip': {
    reflective: [
      () => 'Early afternoon is where focus thins. It tends to gather again later, without much ceremony.',
      () => "Focus dips after midday and returns later in the afternoon. That's been the shape of your days.",
    ],
  },
  'insight:rapid_fragmentation': {
    reflective: [
      () => 'Attention moved between more places this week, and stayed in each for less time.',
      () => "This week's sessions were more scattered than settled — many short stays, few long ones.",
    ],
  },
  'insight:steady_improvement': {
    encouraging: [
      () => 'Your recent sessions have run deeper than the ones from a few weeks back. The change has been gradual and steady.',
      () => 'Session by session, the recent ones hold longer than the earlier ones did.',
    ],
  },
  'insight:quiet_week': {
    calm: [
      () => 'A steady week — regular sessions, nothing that stood out.',
      () => 'The sessions this week came and went without drama. An even stretch.',
    ],
  },
  // Session-level noticings (reflection.ts).
  'notice:beat_typical_streak': {
    encouraging: [
      (c) => `Your longest clean stretch here (${c.streakMin} min) ran well past your recent typical (${c.typicalMin} min).`,
    ],
  },
  'notice:more_circling': {
    supportive: [
      (c) => `This one circled back more often than your sessions usually do — ${c.returns} times, where ${c.typical} is more usual.`,
    ],
  },
  'notice:recovered_well': {
    supportive: [
      () => 'You drifted partway through and came back before the end. The session closed on the work.',
      () => 'There was a wander in the middle of this one, and then a return. The ending held.',
    ],
  },
  'notice:calmer_than_usual': {
    calm: [
      () => 'Steadier than your recent run — fewer moves, longer stays.',
      () => 'This one sat stiller than your sessions usually do. Less switching, longer stretches.',
    ],
  },
}

/** Ordered register fallbacks so a missing variant still finds a voice. */
const REGISTER_FALLBACK: Register[] = ['reflective', 'supportive', 'calm', 'encouraging', 'curious']

function pickBucket(intent: string, register: Register): Template[] | null {
  const byReg = TEMPLATES[intent]
  if (!byReg) return null
  if (byReg[register]?.length) return byReg[register]!
  for (const r of REGISTER_FALLBACK) if (byReg[r]?.length) return byReg[r]!
  return null
}

// ---------------------------------------------------------------------------
// compose — the deterministic end of the pipeline. Selects a template, renders it, and
// returns it ONLY if it passes validation. Returns null (⇒ the caller stays silent)
// rather than ever emitting something unsafe. Phase 2 inserts an async Claude refine
// between selection and validation; the validate-or-fallback contract stays identical.
// ---------------------------------------------------------------------------
export function compose(
  intent: string,
  register: Register,
  ctx: MsgContext = {},
  seed = 0,
): { text: string; intent: string; register: Register } | null {
  const bucket = pickBucket(intent, register)
  if (!bucket) return null
  const start = Math.abs(Math.trunc(Number(seed) || 0)) % bucket.length
  // Try the seeded template first, then the rest, so a single bad variant can't mute us.
  for (let i = 0; i < bucket.length; i++) {
    const text = bucket[(start + i) % bucket.length](ctx).trim()
    if (validateMessage(text).ok) return { text, intent, register }
  }
  return null
}
