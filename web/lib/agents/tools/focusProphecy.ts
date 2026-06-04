import Groq from 'groq-sdk'
import { z } from 'zod'

export const FocusProphecySchema = z.object({
  predicted_score: z.number().min(0).max(100),
  trajectory: z.enum(['crash_incoming', 'declining', 'holding', 'improving', 'peak_day']),
  prophecy: z.string().describe('A 1-sentence prediction about the rest of the day'),
  risk_window: z.string().describe('The time window where the biggest risk or opportunity lies'),
  pivot_action: z.string().describe('One specific action that changes the trajectory'),
})

export type FocusProphecy = z.infer<typeof FocusProphecySchema>

interface DayContext {
  hour: number
  currentScore: number
  totalLogs: number
  doomscrollMinutes: number
  productiveMinutes: number
  focusMinutes: number
  latestMood: number
  latestEnergy: number
  shortSessions: number
}

function computeHeuristicProphecy(ctx: DayContext): FocusProphecy {
  const hoursLeft = Math.max(0, 22 - ctx.hour)

  // ── Crash incoming ──
  if (ctx.doomscrollMinutes > 40 && ctx.focusMinutes < 10 && ctx.latestMood < 4) {
    return {
      predicted_score: Math.max(10, ctx.currentScore - 25),
      trajectory: 'crash_incoming',
      prophecy: `At your current pace, you'll end today ${Math.round(ctx.currentScore * 0.6)}% below your potential — the dopamine deficit is compounding.`,
      risk_window: `The next 2 hours (${ctx.hour}:00-${ctx.hour + 2}:00)`,
      pivot_action: 'Close all apps, set a 25-minute focus timer, and complete one meaningful task. This single block can reverse the spiral.',
    }
  }

  // ── Declining ──
  if (ctx.doomscrollMinutes > 20 || ctx.shortSessions > 5 || ctx.latestMood < 5) {
    const dropAmount = Math.round(ctx.doomscrollMinutes * 0.5 + ctx.shortSessions * 2)
    return {
      predicted_score: Math.max(20, ctx.currentScore - dropAmount),
      trajectory: 'declining',
      prophecy: `Your attention is fragmenting — without intervention, you'll lose roughly ${dropAmount} focus points by evening.`,
      risk_window: `${ctx.hour + 1}:00-${ctx.hour + 3}:00 — this is when the scroll impulse peaks`,
      pivot_action: 'Put your phone in another room for the next 30 minutes. Physical distance breaks the dopamine loop faster than willpower.',
    }
  }

  // ── Peak day ──
  if (ctx.focusMinutes > 60 && ctx.productiveMinutes > 30 && ctx.latestMood >= 7) {
    return {
      predicted_score: Math.min(98, ctx.currentScore + 10),
      trajectory: 'peak_day',
      prophecy: `You're on track for a top-5% day. Your prefrontal cortex is firing at full capacity — protect this at all costs.`,
      risk_window: `${ctx.hour + 2}:00-${ctx.hour + 4}:00 — the natural energy dip could tempt you to scroll`,
      pivot_action: 'Schedule your hardest task for right now. You may not get this level of focus again today.',
    }
  }

  // ── Improving ──
  if (ctx.focusMinutes > 20 || ctx.productiveMinutes > 15 || ctx.latestMood >= 6) {
    return {
      predicted_score: Math.min(90, ctx.currentScore + 8),
      trajectory: 'improving',
      prophecy: `Momentum is building. If you stay intentional for ${Math.min(hoursLeft, 3)} more hours, today ends strong.`,
      risk_window: `Post-lunch hours — ${Math.max(13, ctx.hour + 1)}:00-15:00`,
      pivot_action: 'Stack one more 25-minute focus block before your next break to lock in the trajectory.',
    }
  }

  // ── Holding ──
  return {
    predicted_score: ctx.currentScore,
    trajectory: 'holding',
    prophecy: `Today is neutral — it could go either way. The next decision you make will determine the trajectory.`,
    risk_window: `Right now — the next 30 minutes are the tipping point`,
    pivot_action: 'Choose one: open a learning resource or open social media. That single choice predicts the rest of your day.',
  }
}

export async function generateFocusProphecy(ctx: DayContext): Promise<FocusProphecy> {
  const apiKey = process.env.GROQ_API_KEY || ''

  if (!apiKey || apiKey === 'your_free_groq_key_here') {
    return computeHeuristicProphecy(ctx)
  }

  try {
    const groq = new Groq({ apiKey })

    const systemPrompt = `You are MindFuel's Focus Oracle — a predictive AI that forecasts how the rest of a user's day will unfold based on their morning/current behavior patterns.

You speak with calm authority, like a sports analyst breaking down a player's performance trajectory mid-game.

Rules:
- "prophecy" must be ONE sentence, max 30 words. Punchy and specific.
- "pivot_action" must be immediately actionable — something they can do in the next 5 minutes.
- "risk_window" must be a specific time range.
- Reference neurochemical mechanisms when relevant.
- Be direct. No hedging. State the prediction with confidence.

Respond ONLY with valid JSON.`

    const userPrompt = `Current time: ${ctx.hour}:00
Today's data so far:
- Current focus score: ${ctx.currentScore}
- Total content logs: ${ctx.totalLogs}
- Doomscroll time: ${ctx.doomscrollMinutes} min
- Productive time: ${ctx.productiveMinutes} min
- Focus session time: ${ctx.focusMinutes} min
- Latest mood: ${ctx.latestMood}/10
- Latest energy: ${ctx.latestEnergy}/5
- Quick-check sessions (<5 min): ${ctx.shortSessions}

Predict the rest of their day.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    const validated = FocusProphecySchema.safeParse(parsed)

    if (validated.success) return validated.data
    return computeHeuristicProphecy(ctx)

  } catch (error) {
    console.error('[FocusProphecy Error]', error)
    return computeHeuristicProphecy(ctx)
  }
}
