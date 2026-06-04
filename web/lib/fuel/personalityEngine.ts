// lib/fuel/personalityEngine.ts
// The brain of Fuel — determines personality state, generates contextual voice lines

export type FuelState = 'energized' | 'focused' | 'gentle' | 'alert' | 'celebratory' | 'reflective'

export interface FuelContext {
  hour: number
  mood: number | null        // 1-10
  energy: number | null      // 1-5
  focusMinutes: number
  doomscrollMinutes: number
  streak: number
  todayScore: number
  isFocusActive: boolean
  totalLogsToday: number
}

// ── Determine Fuel's current personality state ──
export function getFuelState(ctx: FuelContext): FuelState {
  // During focus sessions, Fuel is always minimal and focused
  if (ctx.isFocusActive) return 'focused'

  // Alert if doomscroll detected
  if (ctx.doomscrollMinutes > 15) return 'alert'

  // Gentle if mood is low
  if (ctx.mood !== null && ctx.mood < 4) return 'gentle'

  // Reflective in the evening
  if (ctx.hour >= 20) return 'reflective'

  // Celebratory on milestones
  if (ctx.streak > 0 && ctx.streak % 7 === 0) return 'celebratory'
  if (ctx.todayScore >= 80 && ctx.totalLogsToday >= 3) return 'celebratory'

  // Energized in the morning with decent mood
  if (ctx.hour < 12 && (ctx.mood === null || ctx.mood >= 6)) return 'energized'

  return 'energized' // default
}

// ── Voice line templates ──

interface ScanVerdict {
  category: string
  score: number
  summary: string
}

export function getScanVoiceLine(verdict: ScanVerdict, state: FuelState): string {
  const { category, score, summary } = verdict

  if (score >= 80) {
    const lines = [
      `Nice. That's high-quality input. Your brain actually benefits from content like this.`,
      `Good choice. This is the kind of content that builds focus over time.`,
      `Solid. This feeds your prefrontal cortex, not just your dopamine receptors.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  }

  if (score >= 55) {
    const lines = [
      `Interesting. Not harmful, not great either. Neutral fuel for the brain.`,
      `That's fine in moderation. Just notice if it turns into a pattern.`,
      `Middle of the road. No damage done, but it's not building anything either.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  }

  if (score >= 35) {
    if (state === 'gentle') {
      return `That scored a ${score}. No judgment. Just worth noticing how you feel after.`
    }
    const lines = [
      `Okay, that's high-stimulation content. Fun in the moment, but your brain treats it like candy. Energy spike, then crash.`,
      `That scored a ${score}. The algorithm optimized that content to keep you watching, not to help you think.`,
      `Worth knowing: content like this trains your brain to need more stimulation. The bar keeps going up.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  }

  // Low score (< 35)
  if (state === 'gentle') {
    return `That one scored pretty low. We all end up there sometimes. No judgment, just data.`
  }

  const lines = [
    `That's a ${score}. Your brain will forget that content in 5 minutes, but the dopamine debt lasts longer. Worth noticing.`,
    `That scored a ${score}. The algorithm is having a great day. Your prefrontal cortex? Not so much.`,
    `Straight up — that's brain junk food. Not the end of the world, but your focus just took a hit.`,
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

export function getFocusStartLine(minutes: number, state: FuelState): string {
  if (state === 'gentle') {
    return `${minutes} minutes. No pressure. Just you and the work.`
  }

  const lines = [
    `${minutes} minutes. No distractions. Let's earn it.`,
    `${minutes} minutes starting now. I've got your back.`,
    `Let's go. ${minutes} minutes of real focus. The algorithm can wait.`,
    `${minutes} minutes. Your prefrontal cortex is about to get a workout.`,
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

export function getFocusCompleteLine(minutes: number, state: FuelState): string {
  const lines = [
    `Done. ${minutes} minutes of uninterrupted focus. That's rare. Your brain just got stronger.`,
    `${minutes} minutes. Locked in. That's the kind of session most people can't do anymore.`,
    `Mission complete. ${minutes} minutes of deep work. Your focus capacity just leveled up.`,
    `That's ${minutes} minutes you chose intentionally. The algorithm got nothing from you.`,
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

export function getMoodResponseLine(mood: number, state: FuelState): string {
  if (mood >= 8) {
    const lines = [
      `Great energy. Let's use this momentum while it lasts.`,
      `That's a strong day. Worth noting what got you here.`,
      `Feeling good. Your content diet today is probably a factor.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  }

  if (mood >= 5) {
    const lines = [
      `Solid baseline. Not every day needs to be a 10.`,
      `Got it. Middle of the road. Keep an eye on what shifts it.`,
      `Noted. You're stable. One intentional choice could tip it up.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  }

  // Low mood
  const lines = [
    `Rough one. No judgment. Just here.`,
    `Heard. These days happen. I'll keep things light.`,
    `Got it. I'll back off on the suggestions today. Just monitoring.`,
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

export function getStreakLine(days: number): string {
  if (days === 7) return `One week straight. Most people don't make it past 3 days. You're built different.`
  if (days === 14) return `Two weeks. This isn't a streak anymore. It's becoming who you are.`
  if (days === 30) return `30 days. A month of intentional living. That genuinely changes neural pathways.`
  if (days % 7 === 0) return `${days} days. Every week you do this, the default gets easier.`
  return `Day ${days}. Keep building.`
}

export function getDashboardGreeting(ctx: FuelContext, prophecy: string): string {
  const state = getFuelState(ctx)

  if (state === 'gentle') {
    return `Hey Boss. ${prophecy}`
  }

  if (state === 'celebratory') {
    return `Welcome back, Boss. You're on fire. ${prophecy}`
  }

  if (state === 'reflective') {
    return `Evening, Boss. ${prophecy}`
  }

  if (state === 'alert') {
    return `Hey Boss. Heads up — ${prophecy}`
  }

  // Energized default
  return `Welcome back, Boss. ${prophecy}`
}
