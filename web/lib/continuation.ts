// lib/continuation.ts — Flow Continuation (pure).
//
// One job: decide whether inviting someone back to their previous work is worth their
// attention, and if so hand back the MENTAL context — their own stated intention, the
// window the work happened in, the places it lived — so returning feels like continuing,
// not starting over. The cost being reduced is remembering, not tab-opening.
//
// Same contract as lib/behavior.ts: pure, dependency-light, unit-tested
// (node --test lib/continuation.test.mjs). It stores nothing and sees nothing new —
// input is rows the owner already reads under RLS (their focus_sessions, their
// domain_logs), output is a value the dashboard renders once and forgets.
//
// The governing rule is the intelligence layer's: LOW CONFIDENCE MEANS STAY QUIET.
// Most visits this returns null and the dashboard looks exactly as it always has.
// It can only ever fire on the first visit of a day (any session started today
// silences it), so by construction it appears at most once per day.

import { CONFIDENCE } from './intelligence/confidence.ts'

export interface ContinuationSessionRow {
  id: string
  created_at: string
  status: string | null
  duration_s: number | null
  session_quality: string | null
  intention: string | null
}

export interface ContinuationInvite {
  /** The session being continued — also the dismissal key. */
  anchorId: string
  intention: string | null
  startIso: string
  endIso: string
  durationS: number
  /** 'yesterday' | 'on Friday' — computed here so the copy decision is testable. */
  timeLabel: string
  confidence: number
  evidence: string[]
}

/** A domain_logs row projected to what the working set needs (owner-only display). */
export interface DomainStay {
  domain: string
  duration_s: number
  category: string
}

// An anchor must be real work: at least this long…
const MIN_ANCHOR_S = 20 * 60
// …and the person must actually have been away (a coffee break is not a return).
const MIN_ABSENCE_H = 6
// Past this, "continue" would be fiction — the thread is gone.
const MAX_AGE_DAYS = 7
// e-folding of relevance: yesterday's work is vivid, three days ago is fading.
const DECAY_DAYS = 4
// How many of the last 7 days had a session — a working rhythm raises confidence
// that a return matters; its absence lowers it. Never a streak, never shown as one.
const RHYTHM_LOOKBACK_DAYS = 7
const RHYTHM_MIN_S = 10 * 60

// How strongly each verified quality vouches for "this was work worth returning to".
// 'distracted' is excluded outright — never invite someone back into a loop.
const QUALITY_WEIGHT: Record<string, number> = { deep: 1, focused: 0.85, mixed: 0.55 }
// An unverified session can still anchor IF the person named what they were doing —
// the intention is the context being restored. Without either, there is nothing to say.
const UNVERIFIED_WITH_INTENTION_WEIGHT = 0.7

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** Local-calendar-day difference (b later than a ⇒ positive). Client-side, user tz. */
function dayDiff(a: Date, b: Date): number {
  const key = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((key(b) - key(a)) / 86_400_000)
}

function timeLabelFor(start: Date, now: Date): string {
  const dd = dayDiff(start, now)
  return dd <= 1 ? 'yesterday' : `on ${WEEKDAYS[start.getDay()]}`
}

/**
 * deriveContinuation(sessions, now, dismissedAnchorId) → one invitation or null.
 *
 * `sessions` — the owner's recent focus_sessions (any order; today's included).
 * Silence is the default; every returned invite carries confidence + evidence.
 */
export function deriveContinuation(
  sessions: ContinuationSessionRow[],
  now: Date = new Date(),
  dismissedAnchorId?: string | null,
): ContinuationInvite | null {
  const rows = (sessions ?? []).filter((s) => s && s.created_at)
  if (rows.length === 0) return null

  // Mid-session, or already back at work today (even a false start counts as "back"):
  // the person doesn't need help returning. Say nothing.
  if (rows.some((s) => s.status === 'active')) return null
  if (rows.some((s) => dayDiff(new Date(s.created_at), now) <= 0)) return null

  // Pick the strongest recent anchor: quality × depth × recency.
  let best: ContinuationSessionRow | null = null
  let bestScore = 0
  let bestEnd = 0
  for (const s of rows) {
    const dur = s.duration_s ?? 0
    if (dur < MIN_ANCHOR_S) continue
    if (s.status === 'abandoned') continue
    const quality = s.session_quality ?? 'unverified'
    if (quality === 'distracted') continue
    const start = new Date(s.created_at).getTime()
    if (!Number.isFinite(start)) continue
    const end = start + dur * 1000
    const ageDays = (now.getTime() - end) / 86_400_000
    if (ageDays * 24 < MIN_ABSENCE_H) continue
    if (ageDays > MAX_AGE_DAYS) continue

    const qw =
      quality === 'unverified'
        ? s.intention?.trim()
          ? UNVERIFIED_WITH_INTENTION_WEIGHT
          : 0
        : (QUALITY_WEIGHT[quality] ?? 0)
    if (qw === 0) continue

    const depth = 1 - Math.exp(-dur / 3600)
    const recency = Math.exp(-Math.max(0, ageDays) / DECAY_DAYS)
    const score = qw * depth * recency
    if (score > bestScore) {
      bestScore = score
      best = s
      bestEnd = end
    }
  }
  if (!best) return null

  // "Not now" means not now — never re-offer a runner-up behind a dismissal.
  if (dismissedAnchorId && best.id === dismissedAnchorId) return null

  // Working rhythm over the last 7 days (distinct days with a real session).
  const workedDays = new Set<number>()
  for (const s of rows) {
    if ((s.duration_s ?? 0) < RHYTHM_MIN_S) continue
    const dd = dayDiff(new Date(s.created_at), now)
    if (dd >= 1 && dd <= RHYTHM_LOOKBACK_DAYS) workedDays.add(dd)
  }
  const rhythm = workedDays.size / RHYTHM_LOOKBACK_DAYS

  const confidence = clamp01(bestScore * (0.8 + 0.4 * rhythm))
  if (confidence < CONFIDENCE.speak) return null

  const start = new Date(best.created_at)
  const durationS = best.duration_s ?? 0
  const quality = best.session_quality ?? 'unverified'
  const label = timeLabelFor(start, now)
  const awayH = Math.round((now.getTime() - bestEnd) / 3_600_000)

  const evidence = [
    `${Math.round(durationS / 60)}m ${quality === 'unverified' ? '' : quality + ' '}session ${label}`,
    workedDays.size >= 3
      ? `sessions on ${workedDays.size} of the last ${RHYTHM_LOOKBACK_DAYS} days`
      : `first return after ${awayH}h away`,
  ]

  return {
    anchorId: best.id,
    intention: best.intention?.trim() || null,
    startIso: best.created_at,
    endIso: new Date(bestEnd).toISOString(),
    durationS,
    timeLabel: label,
    confidence,
    evidence,
  }
}

/**
 * workingSet(stays, max) → the anchor session's tools, for the owner's eyes only.
 * Drops drift-dominant domains (never invite the loop back) and sub-3-minute visits,
 * orders by dwell. Returns [] when the session left no meaningful trace.
 */
export function workingSet(stays: DomainStay[], max = 3): string[] {
  const agg = new Map<string, { work: number; drift: number }>()
  for (const s of stays ?? []) {
    if (!s?.domain || !(s.duration_s > 0)) continue
    const e = agg.get(s.domain) ?? { work: 0, drift: 0 }
    if (s.category === 'distraction') e.drift += s.duration_s
    else e.work += s.duration_s
    agg.set(s.domain, e)
  }
  return [...agg.entries()]
    .filter(([, v]) => v.work >= v.drift && v.work + v.drift >= 180)
    .sort((a, b) => b[1].work + b[1].drift - (a[1].work + a[1].drift))
    .slice(0, max)
    .map(([domain]) => domain)
}
