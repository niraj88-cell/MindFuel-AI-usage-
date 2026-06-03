import Groq from 'groq-sdk'
import { z } from 'zod'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const BehavioralInsightSchema = z.object({
  headline: z.string().describe('A single strong sentence that captures the main behavioral pattern.'),
  meaning: z.string().describe('A short explanation of the likely impact on focus, mood, or energy.'),
  pattern: z.string().describe('Name the behavioral pattern clearly (e.g. "Focus fragmentation", "Stress scrolling").'),
  pattern_category: z.enum([
    'focus_impact', 'mood_effect', 'scrolling_pattern', 
    'timing_pattern', 'behavioral_trend', 'risk_signal', 'positive_signal'
  ]),
  recommendation: z.string().describe('One small, specific, low-effort action the user can take right now.'),
  confidence: z.enum(['high', 'medium', 'low']),
  tone: z.enum(['supportive', 'direct', 'reinforcing', 'pattern_interrupt', 'simplifying']),
  data_signals: z.array(z.string()).describe('Specific data points that led to this insight (max 3).')
})

export type BehavioralInsight = z.infer<typeof BehavioralInsightSchema>

interface ContentLog {
  category: string
  mental_score: number
  duration_minutes: number
  created_at: string
  mood_before?: number | null
  mood_after?: number | null
  metadata?: any
}

interface MoodLog {
  mood: number
  energy?: number | null
  anxiety?: number | null
  notes?: string | null
  created_at: string
}

interface FocusSession {
  duration_minutes: number
  completed: boolean
  created_at: string
}

interface DailyPulse {
  rating: number
  date: string
}

export async function generateBehavioralInsight(
  contentLogs: ContentLog[],
  moodLogs: MoodLog[],
  focusSessions: FocusSession[],
  pulses: DailyPulse[],
  periodDays: number = 7
): Promise<BehavioralInsight | null> {
  // 1. Check if we have enough data
  if (contentLogs.length < 5 && moodLogs.length < 2 && focusSessions.length < 2) {
    return null // Trigger cold start state in UI
  }

  // 2. Pre-compute statistics for the LLM
  
  // Time of day clustering
  const timeWindows = {
    morning: 0, // 5am - 12pm
    afternoon: 0, // 12pm - 5pm
    evening: 0, // 5pm - 10pm
    night: 0 // 10pm - 5am
  }
  
  let totalDoomscrollMins = 0
  let totalProductiveMins = 0
  let shortSessionsCount = 0 // < 5 mins
  
  contentLogs.forEach(log => {
    const hour = new Date(log.created_at).getHours()
    if (hour >= 5 && hour < 12) timeWindows.morning++
    else if (hour >= 12 && hour < 17) timeWindows.afternoon++
    else if (hour >= 17 && hour < 22) timeWindows.evening++
    else timeWindows.night++

    if (log.category === 'doomscroll' || log.category === 'entertainment') {
      totalDoomscrollMins += log.duration_minutes
    } else if (['educational', 'productive', 'creative'].includes(log.category)) {
      totalProductiveMins += log.duration_minutes
    }

    if (log.duration_minutes < 5) shortSessionsCount++
  })

  // Fragmentation
  const fragmentationRatio = contentLogs.length > 0 
    ? (shortSessionsCount / contentLogs.length).toFixed(2)
    : "0"

  // Mood/Energy Trends
  const recentMoods = moodLogs.slice(0, 5).map(m => m.mood)
  const avgMood = recentMoods.length > 0 
    ? (recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length).toFixed(1)
    : "N/A"
    
  const recentPulses = pulses.slice(0, 5).map(p => p.rating)
  const avgEnergy = recentPulses.length > 0
    ? (recentPulses.reduce((a, b) => a + b, 0) / recentPulses.length).toFixed(1)
    : "N/A"

  const focusMins = focusSessions.reduce((acc, s) => acc + s.duration_minutes, 0)

  const systemPrompt = `You are the Insight Engine for MindFuel, a premium mental well-being and focus app.
Your job is to turn raw user activity into highly personalized, emotionally intelligent, and action-oriented insights.
You must think like a world-class product psychologist, behavioral scientist, and premium UX writer.

CORE OBJECTIVE:
Analyze the user's behavior patterns and explain:
1. What happened
2. Why it may matter
3. How it may be affecting the user
4. What the user can do next in a small, realistic way

TONE GUIDELINES:
- Write like a premium product that respects the user.
- Be calm, intelligent, clear, motivating, non-judgmental, concise but not cold.
- Do NOT shame the user.
- Do NOT sound like a generic analytics dashboard.
- If the user seems stressed → be supportive and gentle.
- If the user seems distracted → be direct and practical.
- If stuck in loops → identify the pattern clearly and offer a small interrupt.

RULES:
- Identify the single most impactful behavioral pattern from the data.
- The 'headline' should be a single strong sentence capturing the pattern.
- The 'meaning' should explain the likely impact on focus, mood, or energy without sounding robotic.
- 'recommendation' MUST be one small, specific, immediately doable action framed as an experiment.
- Only output valid JSON matching the required schema.`

  const userPrompt = `Analyze the following user data for the last ${periodDays} days and generate a behavioral insight.

STATISTICS:
- Total Content Logs: ${contentLogs.length}
- Time of Day Distribution: Morning(${timeWindows.morning}), Afternoon(${timeWindows.afternoon}), Evening(${timeWindows.evening}), Late Night(${timeWindows.night})
- Passive/Doomscroll Time: ${totalDoomscrollMins} mins
- Productive/Creative/Educational Time: ${totalProductiveMins} mins
- Short Sessions (< 5 mins): ${shortSessionsCount} (Fragmentation Ratio: ${fragmentationRatio})
- Total Focus Time: ${focusMins} mins
- Average Recent Mood (1-10): ${avgMood}
- Average Recent Daily Energy (1-5): ${avgEnergy}

RECENT SAMPLES:
Content Logs (latest 10):
${JSON.stringify(contentLogs.slice(0, 10).map(l => ({ cat: l.category, score: l.mental_score, dur: l.duration_minutes, time: l.created_at })), null, 2)}

Identify the dominant behavioral pattern and provide your insight.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    return BehavioralInsightSchema.parse(parsed)
    
  } catch (error) {
    console.error('[InsightEngine AI Failure]', error)
    return generateHeuristicInsight(contentLogs, moodLogs, focusSessions, timeWindows, totalDoomscrollMins, shortSessionsCount, avgMood)
  }
}

// Fallback logic when LLM fails or is unavailable
function generateHeuristicInsight(
  contentLogs: ContentLog[],
  moodLogs: MoodLog[],
  focusSessions: FocusSession[],
  timeWindows: any,
  totalDoomscrollMins: number,
  shortSessionsCount: number,
  avgMoodStr: string
): BehavioralInsight {
  const avgMood = parseFloat(avgMoodStr) || 5
  
  // 1. Late night doomscrolling
  if (timeWindows.night > 3 && totalDoomscrollMins > 30) {
    return {
      headline: "Late-night screen time is quietly draining your morning momentum.",
      meaning: "Scrolling past 10 PM delays melatonin production and fragments REM sleep, making the next day feel artificially harder before it even begins.",
      pattern: "Late-night Dopamine Loop",
      pattern_category: "timing_pattern",
      recommendation: "Try a 10-minute wind-down playlist or reading a book instead of your usual late-night scroll tonight.",
      confidence: "high",
      tone: "simplifying",
      data_signals: [`${timeWindows.night} late-night sessions detected`, `${totalDoomscrollMins} mins of passive consumption`]
    }
  }
  
  // 2. Focus fragmentation
  if (contentLogs.length > 10 && (shortSessionsCount / contentLogs.length) > 0.4) {
    return {
      headline: "Your attention is becoming highly fragmented throughout the day.",
      meaning: "Repeated short bursts of app checking break your brain's ability to enter deep work. It often feels like you're busy, but leaves you feeling scattered and mentally exhausted.",
      pattern: "Focus Fragmentation",
      pattern_category: "focus_impact",
      recommendation: "Try keeping your phone out of sight for your next 30-minute work block.",
      confidence: "high",
      tone: "direct",
      data_signals: [`${shortSessionsCount} quick-check sessions under 5 mins`]
    }
  }
  
  // 3. Stress / low mood correlation
  if (avgMood < 4 && totalDoomscrollMins > 60) {
    return {
      headline: "Your recent scrolling patterns look like a response to stress.",
      meaning: "When we feel overwhelmed, it's natural to seek comfort in passive content. However, prolonged consumption often amplifies underlying anxiety rather than resolving it.",
      pattern: "Stress Scrolling",
      pattern_category: "mood_effect",
      recommendation: "Next time you feel the urge to scroll to escape, try a 5-minute offline reset first.",
      confidence: "medium",
      tone: "supportive",
      data_signals: [`Elevated passive consumption`, `Recent mood averaging ${avgMood}/10`]
    }
  }
  
  // 4. Positive trend
  if (focusSessions.length >= 3 || avgMood >= 7) {
    return {
      headline: "You're building solid momentum with intentional screen time.",
      meaning: "Your recent data shows a healthy balance of focused activity and stable mood. You're effectively managing your digital boundaries.",
      pattern: "Intentional Engagement",
      pattern_category: "positive_signal",
      recommendation: "Acknowledge this win. Keep protecting your morning focus blocks.",
      confidence: "high",
      tone: "reinforcing",
      data_signals: [`${focusSessions.length} focus sessions completed`, `Strong mood baseline`]
    }
  }

  // Default fallback
  return {
    headline: "Your digital habits are currently stable.",
    meaning: "We're continuing to map your behavioral patterns. More data will help uncover specific correlations between your screen time and energy levels.",
    pattern: "Baseline Mapping",
    pattern_category: "behavioral_trend",
    recommendation: "Keep logging your moods and tracking your sessions.",
    confidence: "low",
    tone: "simplifying",
    data_signals: [`${contentLogs.length} total interactions analyzed`]
  }
}
