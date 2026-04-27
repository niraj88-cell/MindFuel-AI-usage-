import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const AlternativeSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['educational', 'productive', 'creative', 'social', 'entertainment', 'neutral']),
  estimated_score: z.number().min(50).max(100),
  duration_minutes: z.number().min(5).max(120),
  type: z.enum(['podcast', 'article', 'video', 'activity', 'app', 'book', 'course']),
  url_hint: z.string().optional(),
  why_better: z.string(),
})

const AlternativesResponseSchema = z.object({
  alternatives: z.array(AlternativeSchema).length(3),
  swap_message: z.string(),
  score_improvement: z.number(),
})

export type ContentAlternative = z.infer<typeof AlternativeSchema>
export type AlternativesResponse = z.infer<typeof AlternativesResponseSchema>

export async function findAlternatives(
  junkContent: string,
  category: string,
  userContext?: { top_interests?: string[]; avg_score?: number }
): Promise<AlternativesResponse> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
  
  if (!apiKey || apiKey === 'your_free_gemini_key_here') {
    return {
      alternatives: [
        {
          title: "Listen to Huberman Lab Podcast",
          description: "A deep dive into dopamine regulation and focus.",
          category: "educational",
          estimated_score: 95,
          duration_minutes: 60,
          type: "podcast",
          url_hint: "Spotify or YouTube",
          why_better: "Provides actionable science-based tools for mental health."
        },
        {
          title: "Read 'Atomic Habits'",
          description: "Learn how tiny changes can lead to remarkable results.",
          category: "productive",
          estimated_score: 90,
          duration_minutes: 30,
          type: "book",
          url_hint: "Amazon or Local Library",
          why_better: "Encourages positive action instead of passive scrolling."
        },
        {
          title: "10-Minute Guided Meditation",
          description: "A quick reset to lower cortisol and regain focus.",
          category: "educational",
          estimated_score: 85,
          duration_minutes: 10,
          type: "activity",
          url_hint: "Calm app or YouTube",
          why_better: "Directly counteracts the anxiety caused by doomscrolling."
        }
      ],
      swap_message: "Looks like you're caught in a scrolling loop! Try one of these high-nutrition alternatives instead.",
      score_improvement: 60
    }
  }

  const contextStr = userContext
    ? `User interests: ${userContext.top_interests?.join(', ') || 'general'}. Current avg score: ${userContext.avg_score || 50}/100.`
    : ''

  const Groq = (await import('groq-sdk')).default
  const groq = new Groq({ apiKey })

  const systemPrompt = `You are MindFuel's Content Swap Engine. When a user consumes low-quality content (doomscrolling, mindless entertainment), you suggest 3 genuinely better alternatives.

IMPORTANT: Respond entirely in the same language as the user's input to ensure multi-language compatibility.

RETURN ONLY A VALID JSON OBJECT matching this exact schema (NO MARKDOWN):
{
  "alternatives": [
    {
      "title": "string",
      "description": "string",
      "category": "educational" | "productive" | "creative" | "social" | "entertainment" | "neutral",
      "estimated_score": <number 50-100>,
      "duration_minutes": <number>,
      "type": "podcast" | "article" | "video" | "activity" | "app" | "book" | "course",
      "url_hint": "string",
      "why_better": "string"
    }
  ],
  "swap_message": "string",
  "score_improvement": <number>
}`

  const userPrompt = `User just consumed: "${junkContent}" (category: ${category}).\n${contextStr}`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      response_format: { type: 'json_object' }
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    return AlternativesResponseSchema.parse(parsed)
  } catch (e) {
    console.error("Failed to parse AI response:", e)
    throw new Error("Invalid AI response format")
  }
}
