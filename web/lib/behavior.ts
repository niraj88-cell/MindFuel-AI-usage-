// lib/behavior.ts — SatyaShift's behavioral intelligence core.
//
// PURE and dependency-free on purpose: the entire "how did attention unfold" model lives in
// this one file so it can be unit-tested (`node --test lib/behavior.test.mjs`), audited for
// privacy in one sitting, and shared by the server (/api/focus/stop) and the client
// (session page fallback for legacy sessions).
//
// Privacy invariants (absolute):
//   - Input is only what the extension already records: bare domain, category, dwell seconds,
//     in order. No URLs, no content, no titles, no keystrokes — those never exist anywhere.
//   - Output (BehaviorSignals) contains ZERO domains: only counts, durations, and shares.
//     The stored jsonb is safe even if it ever leaked; the raw sequence stays in domain_logs
//     under owner-only RLS.
//
// Honesty invariants:
//   - Pattern adjustments only ever DOWNGRADE a quality label, never inflate one. A diluted
//     distraction percentage must not read as praise when the underlying shape was a loop.
//   - Reflections state what happened, in plain words, without blame and without flattery.

export type AttentionCategory = 'distraction' | 'productive' | 'neutral'

export interface AttentionEvent {
  domain: string
  category: AttentionCategory
  duration_s: number
}

export interface BehaviorSignals {
  verified: boolean
  total_s: number
  distraction_s: number
  distraction_pct: number
  /** Domain-to-different-domain transitions (consecutive same-domain chunks merged first). */
  switches: number
  switches_per_hour: number
  longest_focus_streak_s: number
  longest_distraction_streak_s: number
  /** Maximal runs of consecutive distraction time. */
  distraction_bouts: number
  /** Times attention came BACK to distraction after having left it (the loop signal). */
  distraction_returns: number
  /** Most times any single distraction domain was entered (count only — never the domain). */
  top_loop_domain_visits: number
  /** Distraction share of the final third vs the first third of the session. */
  drift_trend: 'steady' | 'escalating' | 'recovering'
  /** The session's last stretch was non-distraction and long enough to mean something. */
  ended_clean: boolean
  /** Sutra: distraction bouts that ended with attention RETURNING to the work. */
  recoveries: number
  /** Sutra: typical recorded length of a detour before the return (median; 0 when none). */
  median_recovery_s: number
}

export type SessionQuality = 'unverified' | 'deep' | 'focused' | 'mixed' | 'distracted'

// A dwell run shorter than this doesn't end a focus streak's meaning, but we keep the model
// simple: every recorded event counts (the extension already drops flicks under 15s).
const ENDED_CLEAN_MIN_S = 5 * 60      // final non-distraction run that counts as "came back"
const TREND_DELTA = 0.25              // thirds must differ by 25 percentage points to call a trend
const TREND_FLOOR = 0.30              // and the heavier third must be at least 30% distraction

/** Merge consecutive same-domain events (the extension banks a long stay as 5-min chunks). */
function mergeRuns(events: AttentionEvent[]): AttentionEvent[] {
  const runs: AttentionEvent[] = []
  for (const e of events) {
    if (!e || !e.domain || !(e.duration_s > 0)) continue
    const last = runs[runs.length - 1]
    if (last && last.domain === e.domain && last.category === e.category) {
      last.duration_s += e.duration_s
    } else {
      runs.push({ domain: e.domain, category: e.category, duration_s: e.duration_s })
    }
  }
  return runs
}

export function analyzeSession(events: AttentionEvent[]): BehaviorSignals {
  const runs = mergeRuns(events ?? [])
  const total_s = runs.reduce((s, r) => s + r.duration_s, 0)

  if (total_s <= 0) {
    return {
      verified: false, total_s: 0, distraction_s: 0, distraction_pct: 0,
      switches: 0, switches_per_hour: 0,
      longest_focus_streak_s: 0, longest_distraction_streak_s: 0,
      distraction_bouts: 0, distraction_returns: 0, top_loop_domain_visits: 0,
      drift_trend: 'steady', ended_clean: false,
      recoveries: 0, median_recovery_s: 0,
    }
  }

  const distraction_s = runs.filter((r) => r.category === 'distraction').reduce((s, r) => s + r.duration_s, 0)
  const switches = Math.max(0, runs.length - 1)

  // Streaks: consecutive time on one side of the distraction line.
  let longestFocus = 0, longestDistraction = 0, curFocus = 0, curDistraction = 0
  // Bouts + loop counting, and (Sutra) the detours that ended with a RETURN to the work —
  // a trailing bout the session ended inside is a departure, not a recovery.
  let bouts = 0
  let inBout = false
  const recoveredBouts: number[] = []
  const visitsPerDistractionDomain = new Map<string, number>()

  for (const r of runs) {
    if (r.category === 'distraction') {
      curDistraction += r.duration_s
      curFocus = 0
      if (!inBout) { bouts++; inBout = true }
      visitsPerDistractionDomain.set(r.domain, (visitsPerDistractionDomain.get(r.domain) ?? 0) + 1)
    } else {
      if (inBout) recoveredBouts.push(curDistraction) // the detour ended and attention came back
      curFocus += r.duration_s
      curDistraction = 0
      inBout = false
    }
    longestFocus = Math.max(longestFocus, curFocus)
    longestDistraction = Math.max(longestDistraction, curDistraction)
  }

  // Drift trend: distraction share of the first vs last third of recorded time.
  const third = total_s / 3
  let elapsed = 0, firstThirdDistraction = 0, lastThirdDistraction = 0
  for (const r of runs) {
    const start = elapsed
    const end = elapsed + r.duration_s
    if (r.category === 'distraction') {
      firstThirdDistraction += Math.max(0, Math.min(end, third) - start)
      lastThirdDistraction += Math.max(0, end - Math.max(start, total_s - third))
    }
    elapsed = end
  }
  const firstShare = firstThirdDistraction / third
  const lastShare = lastThirdDistraction / third
  const drift_trend: BehaviorSignals['drift_trend'] =
    lastShare >= firstShare + TREND_DELTA && lastShare >= TREND_FLOOR ? 'escalating' :
    firstShare >= lastShare + TREND_DELTA && firstShare >= TREND_FLOOR ? 'recovering' : 'steady'

  // Ended clean: the final run is non-distraction and substantial (5 min, or most of a short session).
  const lastRun = runs[runs.length - 1]
  const cleanFloor = Math.min(ENDED_CLEAN_MIN_S, total_s * 0.25)
  const ended_clean = lastRun.category !== 'distraction' && lastRun.duration_s >= cleanFloor

  return {
    verified: true,
    total_s,
    distraction_s,
    distraction_pct: Math.round((distraction_s / total_s) * 100),
    switches,
    switches_per_hour: Math.round((switches / total_s) * 3600),
    longest_focus_streak_s: longestFocus,
    longest_distraction_streak_s: longestDistraction,
    distraction_bouts: bouts,
    distraction_returns: Math.max(0, bouts - 1),
    top_loop_domain_visits: Math.max(0, ...visitsPerDistractionDomain.values()),
    drift_trend,
    ended_clean,
    recoveries: recoveredBouts.length,
    median_recovery_s: recoveredBouts.length ? Math.round(median(recoveredBouts)) : 0,
  }
}

// ---------------------------------------------------------------------------
// Evidence coverage (the developer-honesty rule). The browser can only witness what
// happens IN the browser. When a session ran mostly elsewhere (an IDE, a call, a
// notebook), the recorded slice is too thin to characterize the whole session — and
// judging 60 minutes by a 3-minute glance at reddit branded real deep work as
// 'distracted'. Thin evidence therefore reads as UNVERIFIED (we saw too little to
// verify), never as a verdict. This can only ever downgrade, honoring the honesty
// invariant at the top of this file.
// ---------------------------------------------------------------------------
const THIN_MIN_SESSION_S = 15 * 60  // short sessions are exempt — coverage noise dominates
const THIN_COVERAGE = 0.25          // browser witnessed less than a quarter of the session

export function evidenceIsThin(sig: BehaviorSignals, durationS?: number): boolean {
  if (!durationS || !sig.verified || sig.total_s <= 0) return false
  return durationS >= THIN_MIN_SESSION_S && sig.total_s < durationS * THIN_COVERAGE
}

// ---------------------------------------------------------------------------
// Quality: same four DB labels as before (deep/focused/mixed/distracted + unverified),
// but pattern-aware. The old classifier was distraction_pct alone, which praised a
// distraction LOOP as "focused" whenever neutral time diluted the percentage.
// Rules are explainable and only ever push the label DOWN:
//   - base band from distraction share (unchanged, so honest sessions read the same)
//   - loop cap: returning to distraction again and again is not a "deep" session
//   - fragmentation cap: constant switching with no long stretch is not "deep"/"focused"
//   - deep additionally requires a real unbroken stretch, not just a low percentage
// ---------------------------------------------------------------------------
export function qualityOf(sig: BehaviorSignals, durationS?: number): SessionQuality {
  if (!sig.verified || sig.total_s <= 0) return 'unverified'
  // Thin coverage: the browser witnessed too little of the session to judge it (see
  // evidenceIsThin). 'unverified' here means "not enough evidence", never suspicion.
  if (evidenceIsThin(sig, durationS)) return 'unverified'

  const order: SessionQuality[] = ['deep', 'focused', 'mixed', 'distracted']
  const capTo = (q: SessionQuality, cap: SessionQuality): SessionQuality =>
    order.indexOf(q) >= order.indexOf(cap) ? q : cap

  let q: SessionQuality =
    sig.distraction_pct < 15 ? 'deep' :
    sig.distraction_pct < 40 ? 'focused' :
    sig.distraction_pct < 70 ? 'mixed' : 'distracted'

  // Deep must be earned by an unbroken stretch (15 min, or half of a shorter session).
  if (q === 'deep' && sig.longest_focus_streak_s < Math.min(15 * 60, sig.total_s * 0.5)) {
    q = 'focused'
  }
  // Loop cap: repeated returns to distraction mean the session's shape was circling.
  if (sig.distraction_returns >= 4) q = capTo(q, 'mixed')
  else if (sig.distraction_returns >= 2 && sig.distraction_pct >= 10) q = capTo(q, 'focused')
  // Fragmentation cap: 20+ minutes of constant switching with no 10-min stretch anywhere —
  // but only when distraction is in the mix. Hopping between reference sites while working
  // is a normal workflow shape (the editor time in between isn't in the browser at all),
  // and must not be misread as scatter.
  if (sig.distraction_pct >= 10 && sig.total_s >= 20 * 60
      && sig.switches_per_hour >= 15 && sig.longest_focus_streak_s < 10 * 60) {
    q = capTo(q, 'mixed')
  }
  return q
}

// ---------------------------------------------------------------------------
// Honest reflection (the Satya line). One or two plain sentences that describe the
// session's actual shape. Never flattery, never shame, no "should".
//
// Each shape has several phrasings that state the same facts; which one appears is a
// pure function of the signals, so a session always reads the same line on every visit
// while months of sessions don't read like one template. Every phrasing in a bucket
// carries the bucket's factual anchor (the count, "distracting sites", "came back"…),
// which is also what the tests pin.
// ---------------------------------------------------------------------------
function mins(s: number) {
  return Math.max(1, Math.round(s / 60))
}

/** Deterministic per-session variety: same signals → same line, different sessions vary. */
function pick(variants: string[], sig: BehaviorSignals): string {
  const seed = Math.abs(Math.trunc(sig.total_s + sig.distraction_s * 3 + sig.switches * 7))
  return variants[seed % variants.length]
}

export function reflectionFor(sig: BehaviorSignals, durationS?: number): string {
  const sessionMin = mins(durationS ?? sig.total_s)

  if (!sig.verified || sig.total_s <= 0) {
    return 'The extension wasn’t connected, so this one is yours on trust. It still counts as time you set aside.'
  }

  // Thin coverage MUST speak first: judging a mostly off-browser session by its browser
  // sliver is the one way this page could accuse someone falsely. Name the coverage,
  // claim nothing about the unwitnessed time — in either direction.
  if (evidenceIsThin(sig, durationS)) {
    const seen = mins(sig.total_s)
    return pick([
      `The browser saw about ${seen} of these ${sessionMin} minutes — the rest of this session lived in other tools. Nothing to verify there, and nothing to doubt.`,
      `Most of this session happened off the browser: it witnessed only ${seen} of ${sessionMin} minutes, so there’s nothing to verify — and nothing to doubt.`,
      `About ${seen} of ${sessionMin} minutes were in the browser; the rest ran elsewhere. Too little to verify, which is not the same as doubt.`,
    ], sig)
  }

  // The loop is the most important pattern to name honestly — it is exactly the shape the
  // old percentage-only line used to paper over.
  if (sig.distraction_returns >= 2) {
    const times = sig.distraction_returns + 1
    const head = pick([
      `You left distraction and came back to it ${times} times in ${sessionMin} minutes.`,
      `Distraction pulled attention back ${times} times across these ${sessionMin} minutes.`,
      `Across ${sessionMin} minutes, attention returned to the same distracting places ${times} times.`,
    ], sig)
    const tail = sig.ended_clean
      ? pick([
          ' The last stretch settled, and the session ended on the work.',
          ' The final stretch stayed with the work.',
        ], sig)
      : pick([
          ' The shape of it was circling more than staying.',
          ' That back-and-forth was the session’s shape.',
        ], sig)
    return `${head}${tail}`
  }

  if (sig.distraction_pct >= 70) {
    const dm = mins(sig.distraction_s)
    return pick([
      `Most of this session sat on distracting sites — about ${dm} of ${sessionMin} minutes.`,
      `About ${dm} of these ${sessionMin} minutes went to distracting sites. That’s the whole account.`,
      `Distracting sites held most of this one: roughly ${dm} of ${sessionMin} minutes.`,
    ], sig)
  }

  if (sig.drift_trend === 'escalating') {
    return pick([
      'The first stretch held; the drift arrived toward the end.',
      'This one started clean and loosened toward the end.',
      'Attention held early, then slipped toward the end.',
    ], sig)
  }

  if (sig.distraction_pct >= 10 && sig.total_s >= 20 * 60
      && sig.switches_per_hour >= 15 && sig.longest_focus_streak_s < 10 * 60) {
    return pick([
      `Attention changed places about ${sig.switches_per_hour} times an hour, and nothing got a long run.`,
      `Attention changed places roughly ${sig.switches_per_hour} times an hour here — many short stays, no long ones.`,
    ], sig)
  }

  if (sig.distraction_pct >= 15 && sig.ended_clean) {
    const finalMin = mins(Math.min(sig.longest_focus_streak_s, sig.total_s))
    // Sutra: name the detour's actual length — the return is the achievement, and a
    // measured "you were back after ~4 minutes" makes the recovery feel real, not lucky.
    const detourMin = mins(sig.median_recovery_s || sig.longest_distraction_streak_s)
    return pick([
      `A detour of about ${detourMin} minutes in the middle, and you came back — the last ${finalMin} minutes stayed with the work.`,
      `The middle wandered for about ${detourMin} minutes. You came back, and the final ${finalMin} minutes held.`,
      `Drift held this one for roughly ${detourMin} minutes before you came back; the closing ${finalMin} minutes ran unbroken.`,
    ], sig)
  }

  if (sig.distraction_pct < 15) {
    const streakMin = mins(sig.longest_focus_streak_s)
    return pick([
      `${sessionMin} minutes with barely a detour — the longest unbroken stretch ran ${streakMin} minutes.`,
      `${sessionMin} minutes, most of it in one place. The longest unbroken stretch was ${streakMin} minutes.`,
      `Little pulled at this one: ${streakMin} of its ${sessionMin} minutes passed as one unbroken stretch.`,
    ], sig)
  }

  const streakMin = mins(sig.longest_focus_streak_s)
  return pick([
    `${sessionMin} minutes, with a detour you caught. The longest clean stretch was ${streakMin} minutes.`,
    `Some drift moved through this one. The longest clean stretch ran ${streakMin} of ${sessionMin} minutes.`,
    `A detour or two inside ${sessionMin} minutes — the longest clean stretch held for ${streakMin}.`,
  ], sig)
}

// ---------------------------------------------------------------------------
// Adaptive layer: compare this session to the user's own recent history (their last
// verified sessions' stored signals). DERIVED, never stored — the same philosophy as
// subscription status. Returns at most ONE quiet noticing line, or null. Comparing a
// user only to themselves is what makes this personal without profiling anyone.
// ---------------------------------------------------------------------------
const BASELINE_MIN_SESSIONS = 3

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function noticeAgainstBaseline(
  current: BehaviorSignals,
  history: BehaviorSignals[],
): string | null {
  const past = (history ?? []).filter((h) => h && h.verified && h.total_s > 0)
  if (!current.verified || past.length < BASELINE_MIN_SESSIONS) return null

  const typicalStreak = median(past.map((h) => h.longest_focus_streak_s))
  const typicalReturns = median(past.map((h) => h.distraction_returns))

  // Streak meaningfully above the user's own typical: worth a quiet mention.
  if (typicalStreak > 0 && current.longest_focus_streak_s >= typicalStreak * 1.5
      && current.longest_focus_streak_s - typicalStreak >= 5 * 60) {
    return `The longest clean stretch here ran ${mins(current.longest_focus_streak_s)} minutes — past your recent typical of ${mins(typicalStreak)}.`
  }
  // Circling meaningfully above typical: name it, without judgment.
  if (current.distraction_returns >= typicalReturns + 3) {
    return `This one circled back to distraction more than your recent sessions have — ${current.distraction_returns} returns, where ${Math.round(typicalReturns)} is more usual for you.`
  }
  return null
}
