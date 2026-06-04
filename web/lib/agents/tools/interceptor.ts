import Groq from 'groq-sdk'
import { z } from 'zod'

// ── Schema ──
export const InterventionSchema = z.object({
  message: z.string().describe('The punchy 1-2 sentence intervention message'),
  command: z.string().describe('The authoritative closing command'),
  severity: z.enum(['mild', 'moderate', 'severe', 'critical']),
  algorithm_callout: z.string().describe('A specific callout about how the algorithm is exploiting them'),
})

export type Intervention = z.infer<typeof InterventionSchema>

// ── App name normalizer ──
function normalizeAppName(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('tiktok')) return 'TikTok'
  if (lower.includes('instagram')) return 'Instagram'
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'X'
  if (lower.includes('reddit')) return 'Reddit'
  if (lower.includes('youtube.com/shorts')) return 'YouTube Shorts'
  if (lower.includes('youtube')) return 'YouTube'
  if (lower.includes('facebook') || lower.includes('fb.com')) return 'Facebook'
  if (lower.includes('snapchat')) return 'Snapchat'
  if (lower.includes('threads')) return 'Threads'
  if (lower.includes('pinterest')) return 'Pinterest'
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    return hostname.charAt(0).toUpperCase() + hostname.slice(1)
  } catch {
    return url
  }
}

// ── Time formatting ──
function formatTime(minutes: number): string {
  if (minutes < 1) return 'less than a minute'
  if (minutes < 60) return `${Math.round(minutes)} minutes`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}

// ── Severity based on time ──
function computeSeverity(minutes: number, interceptCount: number): Intervention['severity'] {
  if (minutes > 45 || interceptCount >= 4) return 'critical'
  if (minutes > 25 || interceptCount >= 3) return 'severe'
  if (minutes > 10 || interceptCount >= 2) return 'moderate'
  return 'mild'
}

// ── Heuristic interventions ──
const INTERVENTIONS: Record<string, Intervention[]> = {
  critical: [
    {
      message: "You've been feeding the algorithm for over 45 minutes. Every second you stay, an ad auction is running on your attention — you are the product being sold.",
      command: "Lock the phone. Walk away. Now.",
      severity: 'critical',
      algorithm_callout: "The app just ran hundreds of A/B tests on you to find exactly what keeps you paralyzed. You lost."
    },
    {
      message: "An hour ago you had plans. Right now you're generating ad revenue for a company that designed this feed to be impossible to leave.",
      command: "Put the phone face-down and don't touch it for 10 minutes.",
      severity: 'critical',
      algorithm_callout: "Every swipe trained the algorithm to exploit your specific psychological vulnerabilities more precisely."
    }
  ],
  severe: [
    {
      message: "You're 25+ minutes deep into content you won't remember tomorrow. The algorithm is calibrating in real-time to keep you exactly here.",
      command: "Close the app. Set a timer for 5 minutes of silence.",
      severity: 'severe',
      algorithm_callout: "This feed was A/B tested on millions of people to find the exact sequence that prevents you from stopping."
    },
    {
      message: "Your cortisol is elevated, your attention span is fragmenting, and the app is monetizing every second of it.",
      command: "Screen off. Three deep breaths. Move your body.",
      severity: 'severe',
      algorithm_callout: "The engagement team at this company gets bonuses when people like you can't stop scrolling."
    }
  ],
  moderate: [
    {
      message: "You're 10 minutes in and the dopamine hits are getting weaker — that's why you keep scrolling faster. The algorithm noticed.",
      command: "Put the phone down for 2 minutes. See if you actually want to come back.",
      severity: 'moderate',
      algorithm_callout: "The feed just shifted to more provocative content because your engagement was dropping. You're being manipulated."
    },
    {
      message: "Nothing you've seen in the last 10 minutes will matter in 24 hours. But the focus you're burning right now? That was real.",
      command: "Close the app. Open something you'll be proud of in an hour.",
      severity: 'moderate',
      algorithm_callout: "Your scroll velocity just told the algorithm exactly what emotional state you're in. It's exploiting that."
    }
  ],
  mild: [
    {
      message: "You opened this on autopilot. The algorithm was waiting — it already queued content designed to keep you here.",
      command: "Close the app before it hooks you. You have 5 seconds.",
      severity: 'mild',
      algorithm_callout: "Opening this app sent a signal that you're available to be monetized. The content you see first was chosen to maximize that."
    },
    {
      message: "Quick check or rabbit hole? Be honest. This app is designed to turn the first into the second.",
      command: "State your reason out loud. If you can't, close it.",
      severity: 'mild',
      algorithm_callout: "The first 3 posts were hand-picked to trigger your specific engagement patterns. It's not random."
    }
  ]
}

function getHeuristicIntervention(appName: string, minutes: number, interceptCount: number): Intervention {
  const severity = computeSeverity(minutes, interceptCount)
  const pool = INTERVENTIONS[severity]
  const intervention = pool[Math.floor(Math.random() * pool.length)]
  
  return {
    ...intervention,
    message: intervention.message
      .replace(/the app/gi, appName)
      .replace(/this app/gi, appName)
      .replace(/this feed/gi, `${appName}'s feed`)
  }
}

// ── Main function ──
export async function generateIntervention(
  targetUrl: string,
  timeSpentMinutes: number = 0,
  interceptCount: number = 0
): Promise<Intervention> {
  const appName = normalizeAppName(targetUrl)
  const timeStr = formatTime(timeSpentMinutes)
  const severity = computeSeverity(timeSpentMinutes, interceptCount)
  const apiKey = process.env.GROQ_API_KEY || ''

  if (!apiKey || apiKey === 'your_free_groq_key_here') {
    return getHeuristicIntervention(appName, timeSpentMinutes, interceptCount)
  }

  try {
    const groq = new Groq({ apiKey })

    const systemPrompt = `You are the MindFuel Interceptor, an aggressive, brutally honest accountability coach.
The user has just triggered a "Doomscroll Alert" by spending too much time on a high-dopamine app.

Your objective is to physically break their dopamine loop and snap them out of their algorithmic trance.

Guidelines:
1. Be punchy, jarring, and direct. No corporate speak.
2. Call out the algorithm: remind them they are being monetized and manipulated.
3. The "message" field must be 1-2 sentences maximum.
4. The "command" field must be a short, authoritative command to stop.
5. The "algorithm_callout" must be a specific, factual statement about how the algorithm is exploiting them.
6. Reference specific neurochemical or psychological mechanisms when possible.
7. NEVER be preachy or use phrases like "studies show" or "research suggests". Just state the truth directly.
8. Match the severity level: mild = firm nudge, moderate = direct wake-up, severe = urgent alarm, critical = emergency extraction.

Examples of your tone:
- "You're 15 minutes deep into content you'll forget in 5 seconds. The algorithm is winning. Put the phone face down."
- "Your anxiety isn't random, it's being engineered right now. Close the app."
- "Every scroll just taught the AI exactly what keeps you paralyzed. You're training your own trap."

Respond ONLY with valid JSON matching this schema:
{
  "message": "<1-2 sentence intervention>",
  "command": "<authoritative closing command>",
  "severity": "${severity}",
  "algorithm_callout": "<specific callout about algorithmic exploitation>"
}`

    const userPrompt = `Generate an intervention for a user who has been scrolling ${appName} for ${timeStr}. This is intercept #${interceptCount + 1} today. Severity level: ${severity}.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    const validated = InterventionSchema.safeParse({ ...parsed, severity })

    if (validated.success) return validated.data

    console.warn('[Interceptor] Zod validation failed, using heuristic')
    return getHeuristicIntervention(appName, timeSpentMinutes, interceptCount)

  } catch (error) {
    console.error('[Interceptor API Error]', error)
    return getHeuristicIntervention(appName, timeSpentMinutes, interceptCount)
  }
}
