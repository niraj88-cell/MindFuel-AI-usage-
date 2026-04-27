// lib/agents/tools/recipeGenerator.ts
// Generates personalized "mental nutrition recipes" — multi-day plans

import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

const DayPlanSchema = z.object({
  day: z.number().min(1).max(30),
  morning: z.object({
    activity: z.string(),
    duration_minutes: z.number(),
    category: z.string(),
    description: z.string(),
  }),
  afternoon: z.object({
    activity: z.string(),
    duration_minutes: z.number(),
    category: z.string(),
    description: z.string(),
  }),
  evening: z.object({
    activity: z.string(),
    duration_minutes: z.number(),
    category: z.string(),
    description: z.string(),
  }),
  daily_goal: z.string(),
  target_score: z.number().min(50).max(100),
})

const RecipeSchema = z.object({
  title: z.string().describe('Catchy recipe title e.g. "7-Day Focus Boost Plan"'),
  description: z.string().describe('What this recipe helps with'),
  goal: z.enum(['focus', 'calm', 'creativity', 'energy', 'detox', 'balance']),
  duration_days: z.number(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  daily_plans: z.array(DayPlanSchema),
  expected_improvement: z.string(),
  tips: z.array(z.string()).describe('3-4 quick tips for success'),
})

export type MentalRecipe = z.infer<typeof RecipeSchema>
export type DayPlan = z.infer<typeof DayPlanSchema>

interface UserContext {
  avg_score: number
  top_categories: string[]
  weak_areas: string[]
  current_mood_trend: string
  preferred_content_types?: string[]
}

export async function generateRecipe(
  goal: string,
  durationDays: number = 7,
  userContext: UserContext
): Promise<MentalRecipe> {
  const { object } = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: RecipeSchema,
    system: `You are MindFuel's Mental Recipe Chef. You create personalized multi-day content consumption plans like a nutritionist creates meal plans. Each plan is specific, actionable, and progressively challenges the user.

Guidelines:
- Activities should be real, specific things (e.g., "Listen to Huberman Lab podcast on focus", not "listen to a podcast")
- Match difficulty to the user's current level
- Include variety across categories
- Build progressively (day 1 = easy, later = more challenging)
- Each day plan should be achievable in 60-90 min total screen time`,
    prompt: `Create a ${durationDays}-day mental nutrition recipe for goal: "${goal}"

USER CONTEXT:
- Current average score: ${userContext.avg_score}/100
- Top content categories: ${userContext.top_categories.join(', ')}
- Weak areas: ${userContext.weak_areas.join(', ')}
- Current mood trend: ${userContext.current_mood_trend}
${userContext.preferred_content_types ? `- Preferred formats: ${userContext.preferred_content_types.join(', ')}` : ''}

Make it progressively challenging and personally relevant.`,
  })

  return object
}

export async function generateDailyFeedRecipe(
  userContext: UserContext
): Promise<{ morning: string; afternoon: string; evening: string; message: string }> {
  const { object } = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: z.object({
      morning: z.string().describe('Specific content recommendation for morning'),
      afternoon: z.string().describe('Specific content recommendation for afternoon'),
      evening: z.string().describe('Specific content recommendation for evening'),
      message: z.string().describe('Short motivational message for the day'),
    }),
    system: 'You are MindFuel\'s Daily Feed Curator. Generate a "Better Feed Recipe" — 3 specific content items for today based on the user\'s needs. Be specific (real podcasts, channels, activities).',
    prompt: `Create today's "Better Feed Recipe":
- User avg score: ${userContext.avg_score}/100
- Trending categories: ${userContext.top_categories.join(', ')}
- Areas to improve: ${userContext.weak_areas.join(', ')}
- Mood trend: ${userContext.current_mood_trend}`,
  })

  return object
}
