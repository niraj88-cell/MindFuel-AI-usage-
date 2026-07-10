// lib/widget.ts — the Desktop Reflection Widget's one decision: what single line to show.
//
// The widget is an ambient companion window, not a dashboard. It shows exactly ONE
// primary line (Satya's serif voice) with at most one small supporting line under it.
// No scores, no streaks, no charts, no ticking clock — a coarse, human sense of where
// attention is, refreshed about once a minute.
//
// Priority (one thing at a time, never competing):
//   1. A running session — presence, in coarse bands (never a live timer).
//   2. The weekly noticing, when the profile has one (the same line the dashboard shows).
//   3. The day so far, as one plain ledger line.
//   4. A quiet empty state.
//
// Pure and dependency-free so the tree is testable: node --test lib/widget.test.mjs

export interface WidgetState {
  /** Is a focus session running right now? */
  active: boolean
  /** The running session's intention, if any. */
  intention: string | null
  /** The running session's start (ms epoch), when active. */
  startedAtMs: number | null
  /** Completed sessions so far today. */
  todayCount: number
  /** Focus seconds banked today (completed sessions). */
  todayFocusS: number
  /** The weekly insight line, if the behavioral profile produced one. */
  insight: string | null
}

export interface WidgetMessage {
  /** Tiny mono label above the line: 'Deep session' | 'This week' | 'Today'. */
  overline: string
  /** The one serif line. */
  primary: string
  /** Optional small second line. Never a second insight. */
  support: string | null
}

function humanDuration(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60)
  const h = Math.floor(m / 60)
  return h === 0 ? `${m}m` : `${h}h ${m % 60}m`
}

/** Coarse presence, never a stopwatch: the wording changes a few times a day at most. */
function presenceLine(elapsedMin: number): string {
  if (elapsedMin < 30) return 'You’re in a session.'
  if (elapsedMin < 60) return 'You’ve been with this for over half an hour.'
  const h = Math.floor(elapsedMin / 60)
  return h === 1
    ? 'You’ve stayed with this for over an hour.'
    : `You’ve stayed with this for over ${h} hours.`
}

export function widgetMessage(s: WidgetState, now = Date.now()): WidgetMessage {
  if (s.active && s.startedAtMs != null) {
    const elapsedMin = Math.max(0, Math.floor((now - s.startedAtMs) / 60_000))
    return {
      overline: 'Focus session',
      primary: presenceLine(elapsedMin),
      support: s.intention ? `“${s.intention}”` : null,
    }
  }

  if (s.insight) {
    return {
      overline: 'This week',
      primary: s.insight,
      support: s.todayCount > 0
        ? `${s.todayCount} session${s.todayCount === 1 ? '' : 's'} today · ${humanDuration(s.todayFocusS)} of focus`
        : null,
    }
  }

  if (s.todayCount > 0) {
    return {
      overline: 'Today',
      primary: `${s.todayCount} session${s.todayCount === 1 ? '' : 's'} so far — ${humanDuration(s.todayFocusS)} of focus.`,
      support: null,
    }
  }

  return {
    overline: 'Today',
    primary: 'Nothing measured yet today.',
    support: null,
  }
}
