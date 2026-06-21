import Groq from 'groq-sdk'
import { z } from 'zod'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
})

const MoodPatternSchema = z.object({
  overall_trend: z.enum(['improving', 'declining', 'stable', 'volatile']),
  avg_mood: z.number().min(1).max(10),
  anxiety_triggers: z.array(z.object({
    trigger: z.string(),
    category: z.string(),
    frequency: z.number().describe('Times observed in the data'),
    severity: z.enum(['low', 'medium', 'high']),
    recommendation: z.string(),
  })),
  optimal_windows: z.array(z.object({
    time_of_day: z.enum(['morning', 'afternoon', 'evening', 'night']),
    best_categories: z.array(z.string()),
    reasoning: z.string(),
  })),
  correlations: z.array(z.object({
    pattern: z.string().describe('e.g. "Anxiety spikes after 30+ min news consumption"'),
    confidence: z.enum(['low', 'medium', 'high']),
    data_points: z.number(),
  })),
  summary: z.string().describe('2-3 sentence overall mood health summary'),
  action_items: z.array(z.string()).describe('3-5 specific, actionable recommendations'),
})

export type MoodPattern = z.infer<typeof MoodPatternSchema>

interface MoodDataPoint {
  mood: number
  energy?: number | null
  anxiety?: number | null
  notes?: string | null
  context?: string | null
  created_at: string
}

interface ContentDataPoint {
  content: string
  category: string
  mental_score: number
  duration_minutes: number
  mood_before?: number | null
  mood_after?: number | null
  created_at: string
}

export async function analyzeMoodPatterns(
  moodLogs: MoodDataPoint[],
  contentLogs: ContentDataPoint[],
  periodDays: number = 7
): Promise<MoodPattern> {
  const moodSummary = moodLogs.map(m =>
    `[${m.created_at}] Mood: ${m.mood}/10${m.energy ? `, Energy: ${m.energy}/10` : ''}${m.anxiety ? `, Anxiety: ${m.anxiety}/10` : ''}${m.notes ? ` — "${m.notes}"` : ''}${m.context ? ` (${m.context})` : ''}`
  ).join('\n')

  const contentSummary = contentLogs.map(c =>
    `[${c.created_at}] "${c.content}" — ${c.category}, Score: ${c.mental_score}/100, ${c.duration_minutes}min${c.mood_before ? `, Mood: ${c.mood_before}→${c.mood_after}` : ''}`
  ).join('\n')

  // Pre-compute statistical insights to help the AI
  const moodValues = moodLogs.filter(m => m.mood > 0).map(m => m.mood)
  const avgMood = moodValues.length ? (moodValues.reduce((a,b) => a+b, 0) / moodValues.length).toFixed(1) : 'N/A'
  const moodVariance = moodValues.length >= 2 
    ? Math.sqrt(moodValues.reduce((sum, m) => sum + Math.pow(m - parseFloat(avgMood), 2), 0) / moodValues.length).toFixed(1)
    : 'N/A'

  const categoryStats: Record<string, { count: number; totalScore: number; totalDuration: number; moodChanges: number[] }> = {}
  contentLogs.forEach(c => {
    if (!categoryStats[c.category]) {
      categoryStats[c.category] = { count: 0, totalScore: 0, totalDuration: 0, moodChanges: [] }
    }
    const stat = categoryStats[c.category]
    stat.count++
    stat.totalScore += c.mental_score
    stat.totalDuration += c.duration_minutes
    if (c.mood_before && c.mood_after) {
      stat.moodChanges.push(c.mood_after - c.mood_before)
    }
  })

  const categoryReport = Object.entries(categoryStats)
    .map(([cat, s]) => {
      const avgScore = Math.round(s.totalScore / s.count)
      const avgMoodDelta = s.moodChanges.length ? (s.moodChanges.reduce((a,b)=>a+b,0) / s.moodChanges.length).toFixed(1) : 'N/A'
      return `  ${cat}: ${s.count} entries, avg score ${avgScore}/100, total ${s.totalDuration}min, avg mood change: ${avgMoodDelta}`
    })
    .join('\n')

  try {
    const systemPrompt = `You are MindFuel's Mood & Content Pattern Analyzer, designed to identify correlations between digital content consumption and mental wellbeing.

Your analysis must be:
1. DATA-DRIVEN: Only report patterns that the data actually supports. Cite specific numbers.
2. PSYCHOLOGICALLY GROUNDED: Reference mechanisms like dopamine regulation, attention residue, cortisol response, cognitive load, negativity bias, etc.
3. TEMPORALLY AWARE: Look for time-of-day patterns, sequences (e.g., "doomscrolling before bed correlates with lower morning mood")
5. ACTIONABLE: Every recommendation should be something the user can do TODAY

Focus Areas:
- Content categories that correlate with mood CHANGES (not just mood levels)
- Duration thresholds (e.g., >30min of X leads to negative effects)
- Time-of-day × content-type interactions
- Mood trajectory: is the user's baseline shifting over the period?
- High-leverage swaps: which small changes would yield the biggest mood improvement?

IMPORTANT: Respond entirely in the same language that the user's data is written in to ensure multi-language compatibility.

RETURN ONLY A VALID JSON OBJECT matching this exact schema (NO MARKDOWN OR OTHER TEXT):
{
  "overall_trend": "improving" | "declining" | "stable" | "volatile",
  "avg_mood": <number 1-10>,
  "anxiety_triggers": [{"trigger": "string", "category": "string", "frequency": number, "severity": "low"|"medium"|"high", "recommendation": "specific actionable advice"}],
  "optimal_windows": [{"time_of_day": "morning"|"afternoon"|"evening"|"night", "best_categories": ["string"], "reasoning": "string"}],
  "correlations": [{"pattern": "specific pattern description with numbers", "confidence": "low"|"medium"|"high", "data_points": number}],
  "summary": "2-3 sentence clinical summary with specific numbers",
  "action_items": ["specific actionable step 1", "specific actionable step 2", ...]
}`

    const userPrompt = `Analyze the last ${periodDays} days of this user's mood and digital consumption data:

═══ PRE-COMPUTED STATISTICS ═══
Average Mood: ${avgMood}/10
Mood Variance (σ): ${moodVariance}
Total Mood Entries: ${moodLogs.length}
Total Content Entries: ${contentLogs.length}

Category Breakdown:
${categoryReport || '  No content data available'}

═══ RAW MOOD LOGS ═══
${moodSummary || 'No mood logs available'}

═══ RAW CONTENT LOGS ═══
${contentSummary || 'No content logs available'}

Find patterns, triggers, correlations, and generate specific, actionable recommendations.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.15, // Low temperature for consistent analytical output
      response_format: { type: "json_object" }
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    
    // Validate with Zod
    const validated = MoodPatternSchema.parse(parsed)
    return validated
  } catch (error: any) {
    console.error('[MoodAnalyzer AI Failure]', error.message || error)
    
    // Enhanced Fallback Local Heuristic Analysis
    const validMoods = moodLogs.filter(m => m.mood > 0).map(m => m.mood)
    const avg_mood = validMoods.length ? Math.round(validMoods.reduce((a,b)=>a+b,0)/validMoods.length) : 5

    let overall_trend: 'improving' | 'declining' | 'stable' | 'volatile' = 'stable'
    if (validMoods.length >= 2) {
      const firstHalf = validMoods.slice(0, Math.floor(validMoods.length/2))
      const secondHalf = validMoods.slice(Math.floor(validMoods.length/2))
      const avg1 = firstHalf.length ? firstHalf.reduce((a,b)=>a+b,0)/firstHalf.length : 5
      const avg2 = secondHalf.length ? secondHalf.reduce((a,b)=>a+b,0)/secondHalf.length : 5

      // Check for volatility
      const variance = validMoods.reduce((sum, m) => sum + Math.pow(m - avg_mood, 2), 0) / validMoods.length
      if (variance > 4) overall_trend = 'volatile'
      else if (avg2 > avg1 + 0.5) overall_trend = 'improving'
      else if (avg2 < avg1 - 0.5) overall_trend = 'declining'
    }

    const triggers: MoodPattern['anxiety_triggers'] = []
    const correlations: MoodPattern['correlations'] = []

    // Analyze content impact on mood
    Object.entries(categoryStats).forEach(([cat, data]) => {
      const avg = data.totalScore / data.count
      if (avg < 40 && data.count >= 2) {
        triggers.push({
          trigger: `Excessive ${cat} content (${data.count} sessions, avg score ${Math.round(avg)})`,
          category: cat,
          frequency: data.count,
          severity: avg < 25 ? 'high' : 'medium',
          recommendation: `Limit ${cat} sessions to 15 minutes max. Consider replacing with educational or creative content.`
        })
      }

      // Look for mood change correlations
      if (data.moodChanges.length >= 2) {
        const avgDelta = data.moodChanges.reduce((a,b) => a+b, 0) / data.moodChanges.length
        if (Math.abs(avgDelta) > 0.5) {
          correlations.push({
            pattern: `${cat} content ${avgDelta > 0 ? 'improves' : 'decreases'} mood by ${Math.abs(avgDelta).toFixed(1)} points on average`,
            confidence: data.moodChanges.length >= 5 ? 'high' : 'medium',
            data_points: data.moodChanges.length,
          })
        }
      }
    })

    // Duration-based correlation
    const longSessions = contentLogs.filter(c => c.duration_minutes > 30 && c.mental_score < 40)
    if (longSessions.length >= 2) {
      correlations.push({
        pattern: `Extended sessions (>30min) of low-quality content observed ${longSessions.length} times — likely contributing to mood decline`,
        confidence: 'medium',
        data_points: longSessions.length,
      })
    }

    // Time-of-day analysis
    const optimal_windows: MoodPattern['optimal_windows'] = []
    const timeSlots: Record<string, { scores: number[]; categories: string[] }> = {
      morning: { scores: [], categories: [] },
      afternoon: { scores: [], categories: [] },
      evening: { scores: [], categories: [] },
      night: { scores: [], categories: [] },
    }

    contentLogs.forEach(c => {
      const hour = new Date(c.created_at).getHours()
      const slot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
      timeSlots[slot].scores.push(c.mental_score)
      if (!timeSlots[slot].categories.includes(c.category)) {
        timeSlots[slot].categories.push(c.category)
      }
    })

    Object.entries(timeSlots).forEach(([time, data]) => {
      if (data.scores.length >= 2) {
        const avgScore = Math.round(data.scores.reduce((a,b)=>a+b,0) / data.scores.length)
        if (avgScore > 60) {
          optimal_windows.push({
            time_of_day: time as any,
            best_categories: data.categories.filter(c => c !== 'doomscroll'),
            reasoning: `Your ${time} content (avg score ${avgScore}) tends to be higher quality.`,
          })
        }
      }
    })

    // Build actionable items
    const action_items: string[] = []
    if (triggers.length > 0) {
      action_items.push(`Set a 15-minute timer before opening ${triggers[0].category} content`)
    }
    if (longSessions.length > 0) {
      action_items.push('Enable screen-time reminders to prevent sessions over 30 minutes')
    }
    action_items.push('Log at least 3 entries daily to unlock deeper AI pattern analysis')
    if (avg_mood < 5) {
      action_items.push('Your mood average is below baseline — try swapping one doomscroll session with a podcast or walk')
    }
    action_items.push('Check your insights weekly to track mood trajectory changes')

    return {
      overall_trend,
      avg_mood,
      anxiety_triggers: triggers,
      optimal_windows,
      correlations: correlations.length > 0 
        ? correlations 
        : [{ pattern: 'Local statistical analysis applied. Log more data for AI-powered deep correlations.', confidence: 'low' as const, data_points: moodLogs.length + contentLogs.length }],
      summary: `Your average mood over this period is ${avg_mood}/10 (trend: ${overall_trend}). ${triggers.length > 0 ? `${triggers.length} potential trigger pattern${triggers.length > 1 ? 's' : ''} detected.` : 'No strong negative triggers detected.'} ${contentLogs.length < 5 ? 'Log more entries to unlock deeper pattern analysis.' : `Analyzed ${contentLogs.length} content entries across ${Object.keys(categoryStats).length} categories.`}`,
      action_items,
    }
  }
}
