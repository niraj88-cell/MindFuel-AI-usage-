// lib/week.ts — the week of attention (pure).
//
// Folds the owner's last seven days of focus_sessions into the one honest picture the
// /week page shows and shares. Domain-free BY CONSTRUCTION: the input rows carry no
// domains, so the output cannot either — that is what makes the artifact safe to share.
//
// Same contract as lib/behavior.ts: pure, dependency-free, unit-tested
// (node --test lib/week.test.mjs). Dates are handled with local Date methods because
// this runs client-side in the user's own timezone.

import { human } from './duration.ts'

export interface WeekSessionRow {
  created_at: string
  duration_s: number | null
  status: string | null
  session_quality: string | null
}

export interface WeekDay {
  /** Short weekday label for the row, e.g. 'Mon'. */
  label: string
  /** Local YYYY-MM-DD, for keys and the canvas. */
  dateKey: string
  verifiedS: number
  unverifiedS: number
  sessions: number
  isToday: boolean
}

export interface WeekSummary {
  /** Exactly 7 entries, oldest first, ending today. */
  days: WeekDay[]
  verifiedS: number
  totalS: number
  sessionCount: number
  verifiedCount: number
  /** Longest single session this week (verified preferred; 0 when none). */
  deepestS: number
  /** e.g. 'Tuesday afternoon' — null when there is no session. */
  deepestLabel: string | null
  /** Largest day total, for scaling bars. 0 for an empty week. */
  maxDayS: number
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dateKeyOf(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function daypartOf(hour: number): string {
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
}

/**
 * buildWeek(rows, now) → the seven-day picture ending today (local time).
 * Active sessions are excluded (the week reports what happened, not what's happening);
 * short/abandoned sessions count honestly toward their day.
 */
export function buildWeek(rows: WeekSessionRow[], now: Date = new Date()): WeekSummary {
  const days: WeekDay[] = []
  const byKey = new Map<string, WeekDay>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const day: WeekDay = {
      label: DAY_SHORT[d.getDay()],
      dateKey: dateKeyOf(d),
      verifiedS: 0,
      unverifiedS: 0,
      sessions: 0,
      isToday: i === 0,
    }
    days.push(day)
    byKey.set(day.dateKey, day)
  }

  let verifiedS = 0
  let totalS = 0
  let sessionCount = 0
  let verifiedCount = 0
  let deepestS = 0
  let deepestLabel: string | null = null
  // A verified deepest always outranks an unverified one, whatever the durations —
  // the artifact leads with what can be proven.
  let deepestVerified = false

  for (const r of rows ?? []) {
    if (!r || !r.created_at || r.status === 'active') continue
    const start = new Date(r.created_at)
    if (isNaN(start.getTime())) continue
    const day = byKey.get(dateKeyOf(start))
    if (!day) continue
    const dur = Math.max(0, r.duration_s ?? 0)
    if (dur === 0) continue
    const verified = !!r.session_quality && r.session_quality !== 'unverified'

    day.sessions += 1
    sessionCount += 1
    totalS += dur
    if (verified) {
      day.verifiedS += dur
      verifiedS += dur
      verifiedCount += 1
    } else {
      day.unverifiedS += dur
    }

    const beats = deepestVerified
      ? verified && dur > deepestS
      : verified || dur > deepestS
    if (beats) {
      deepestS = dur
      deepestVerified = verified
      deepestLabel = `${DAY_LONG[start.getDay()]} ${daypartOf(start.getHours())}`
    }
  }

  const maxDayS = days.reduce((m, d) => Math.max(m, d.verifiedS + d.unverifiedS), 0)
  return { days, verifiedS, totalS, sessionCount, verifiedCount, deepestS, deepestLabel, maxDayS }
}

/** 8040 → "2h 14m", 0 → "0m" — the app's one duration voice. */
// The week module's public name for the shared formatter (used by the page and the canvas).
export function humanDurationS(totalSeconds: number): string {
  return human(totalSeconds)
}
