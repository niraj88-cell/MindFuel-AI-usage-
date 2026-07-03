// lib/intelligence/notifications.ts — Notification Personalization (server loop).
//
// Learns, per recipient, how much they actually engage with a KIND of notification, from a
// signal we already store (notifications.is_read) — no new collection. When someone
// consistently lets a kind pass unread, we space it further apart for THEM; when they engage,
// normal cadence. Fatigue is answered by backing off, never by pushing harder.
//
// Pure. The caller (lib/squad/notifySessionStart.ts) supplies the recipient's recent rows.

import { confidence, daysSince, CONFIDENCE } from './confidence.ts'
import type { Estimate } from './types.ts'

export interface NotifRecord {
  is_read: boolean
  created_at: string
}

const WINDOW_DAYS = 21
const MIN_N = 3

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** How much this recipient engages with the recent notifications of a kind (read share). */
export function notificationResponsiveness(recent: NotifRecord[], now = Date.now()): Estimate {
  const inWindow = (recent ?? []).filter((r) => r && daysSince(r.created_at, now) <= WINDOW_DAYS)
  const n = inWindow.length
  if (n < MIN_N) {
    return { value: 0.5, confidence: 0, evidence: [`${n} recent notifications — not enough to tell`] }
  }
  const read = inWindow.filter((r) => r.is_read).length
  const recency = Math.min(...inWindow.map((r) => daysSince(r.created_at, now)))
  return {
    value: clamp01(read / n),
    confidence: confidence(n, recency),
    evidence: [`opened ${read} of the last ${n}`],
  }
}

export interface NotifyDecision {
  send: boolean
  reason: string
  confidence: number
  responsiveness: number
}

/**
 * Adaptive back-off for one recipient + kind. Uses the recent rows both to gauge engagement
 * and to know when the last one was sent. Fail-open: with no confident signal we always send
 * (never withhold support on a hunch); we only stretch the gap once someone has clearly been
 * ignoring the kind.
 */
export function notificationDecision(recent: NotifRecord[], now = Date.now()): NotifyDecision {
  const r = notificationResponsiveness(recent, now)
  const inWindow = (recent ?? []).filter((x) => x && daysSince(x.created_at, now) <= WINDOW_DAYS)
  const lastSentAt = inWindow.length
    ? Math.max(...inWindow.map((x) => new Date(x.created_at).getTime()))
    : null
  const gapMin = lastSentAt ? (now - lastSentAt) / 60_000 : Infinity

  if (r.confidence < CONFIDENCE.speak) {
    return { send: true, reason: 'no clear signal yet', confidence: r.confidence, responsiveness: r.value }
  }
  if (r.value < 0.2) {
    return { send: gapMin >= 24 * 60, reason: 'rarely opened — easing to about once a day', confidence: r.confidence, responsiveness: r.value }
  }
  if (r.value < 0.5) {
    return { send: gapMin >= 3 * 60, reason: 'opened sometimes — easing the pace', confidence: r.confidence, responsiveness: r.value }
  }
  return { send: true, reason: 'engaged', confidence: r.confidence, responsiveness: r.value }
}
