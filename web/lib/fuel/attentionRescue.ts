// lib/fuel/attentionRescue.ts
// The Attention Rescue Engine — detects negative patterns and triggers interventions

export type RescueLevel = 'nudge' | 'notice' | 'redirect' | 'rescue'
export type RescueTrigger = 'doomscroll' | 'distraction_spiral' | 'late_night' | 'content_binge' | 'mental_fatigue'

export interface RescueEvent {
  level: RescueLevel
  trigger: RescueTrigger
  appName: string
  minutesSpent: number
  voiceLine: string
  headline: string
  explanation: string
  action: { label: string; type: 'break' | 'timer' | 'dismiss' }
}

interface RescueState {
  rescuesToday: number
  lastRescueTime: number | null
  dismissalsToday: number
}

const MAX_RESCUES_PER_DAY = 3
const MIN_RESCUE_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

// ── Should we trigger a rescue? ──
export function shouldTriggerRescue(state: RescueState): boolean {
  // Anti-annoyance: max 3 per day
  if (state.rescuesToday >= MAX_RESCUES_PER_DAY) return false

  // If user dismissed 3 times today, go silent
  if (state.dismissalsToday >= 3) return false

  // 30-minute cooldown
  if (state.lastRescueTime && Date.now() - state.lastRescueTime < MIN_RESCUE_INTERVAL_MS) return false

  return true
}

// ── Determine rescue level based on context ──
export function determineRescueLevel(
  minutesSpent: number,
  previousRescuesToday: number,
  hour: number
): RescueLevel {
  // Late night is always more urgent
  const isLateNight = hour >= 23 || hour < 5

  if (minutesSpent >= 40 || (isLateNight && minutesSpent >= 20) || previousRescuesToday >= 2) {
    return 'rescue'
  }
  if (minutesSpent >= 25 || previousRescuesToday >= 1) {
    return 'redirect'
  }
  if (minutesSpent >= 15) {
    return 'notice'
  }
  return 'nudge'
}

// ── Generate rescue content using N-E-A framework ──
// Notice → Explain → Act
export function generateRescue(
  trigger: RescueTrigger,
  appName: string,
  minutesSpent: number,
  level: RescueLevel
): RescueEvent {
  const app = appName || 'this app'

  // ── NUDGE (Level 1) — ambient, no voice ──
  if (level === 'nudge') {
    return {
      level,
      trigger,
      appName: app,
      minutesSpent,
      voiceLine: '', // Nudge is silent
      headline: `${minutesSpent} minutes`,
      explanation: `You've been on ${app} for ${minutesSpent} minutes. Just so you know.`,
      action: { label: "I'm good", type: 'dismiss' },
    }
  }

  // ── NOTICE (Level 2) — informational, brief voice ──
  if (level === 'notice') {
    const voiceLines = [
      `${minutesSpent} minutes on ${app}. Just so you know.`,
      `Hey. ${minutesSpent} minutes of scrolling. The algorithm is doing its job.`,
      `Quick heads up. ${minutesSpent} minutes on ${app}. Worth noticing.`,
    ]
    return {
      level,
      trigger,
      appName: app,
      minutesSpent,
      voiceLine: voiceLines[Math.floor(Math.random() * voiceLines.length)],
      headline: `${minutesSpent} minutes on ${app}`,
      explanation: `Your focus capacity has likely dropped since you started. Not the end of the world, but your brain is running on stimulation right now, not intention.`,
      action: { label: "I'm good", type: 'dismiss' },
    }
  }

  // ── REDIRECT (Level 3) — direct, offers alternatives ──
  if (level === 'redirect') {
    const voiceLines = [
      `${minutesSpent} minutes. Your focus capacity dropped about 40% since you started. The algorithm is winning.`,
      `${minutesSpent} minutes on ${app}. Your prefrontal cortex is running on fumes. One tap to break free.`,
      `Hey Boss. ${minutesSpent} minutes now. The content is designed to keep you here. Let's be smarter than the algorithm.`,
    ]
    return {
      level,
      trigger,
      appName: app,
      minutesSpent,
      voiceLine: voiceLines[Math.floor(Math.random() * voiceLines.length)],
      headline: `${minutesSpent} minutes deep`,
      explanation: `Your focus dropped ~40% since you started scrolling. This isn't a character flaw — the algorithm is engineered by thousands of engineers to keep you here. One intentional break resets the loop.`,
      action: { label: 'Break Free — 2 min reset', type: 'break' },
    }
  }

  // ── RESCUE (Level 4) — urgent, caring, full takeover ──
  const voiceLines = [
    `Hey. ${minutesSpent} minutes. I know it doesn't feel like it, but this is where it stops being fun and starts being a habit. One tap and we're out.`,
    `Boss. ${minutesSpent} minutes on ${app}. Your brain is running on dopamine debt right now. Everything after this makes tomorrow harder. Let's stop.`,
    `${minutesSpent} minutes. The algorithm got more of your attention today than anything you actually chose. One tap. That's all it takes.`,
  ]

  return {
    level,
    trigger,
    appName: app,
    minutesSpent,
    voiceLine: voiceLines[Math.floor(Math.random() * voiceLines.length)],
    headline: `${minutesSpent} minutes. Time to go.`,
    explanation: `This session started as a quick check and turned into ${minutesSpent} minutes. That's not your fault — it's by design. But every minute past this point costs more than the last. Your future self will thank you for stopping now.`,
    action: { label: 'End Session', type: 'break' },
  }
}

// ── Manage rescue state in localStorage ──
export function getRescueState(): RescueState {
  if (typeof window === 'undefined') return { rescuesToday: 0, lastRescueTime: null, dismissalsToday: 0 }

  const today = new Date().toDateString()
  const saved = localStorage.getItem('fuel_rescue_state')

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.date === today) return parsed.state
    } catch {}
  }

  return { rescuesToday: 0, lastRescueTime: null, dismissalsToday: 0 }
}

export function updateRescueState(update: Partial<RescueState>) {
  if (typeof window === 'undefined') return

  const current = getRescueState()
  const next = { ...current, ...update }
  const today = new Date().toDateString()

  localStorage.setItem('fuel_rescue_state', JSON.stringify({ date: today, state: next }))
}
