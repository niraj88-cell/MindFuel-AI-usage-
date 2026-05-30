import { z } from 'zod'

// ── Smart Swap Schema ──
const AlternativeSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['educational', 'productive', 'creative', 'social', 'entertainment', 'neutral']),
  estimated_score: z.number().min(50).max(100),
  duration_minutes: z.number().min(5).max(120),
  type: z.enum(['podcast', 'article', 'video', 'activity', 'app', 'book', 'course']),
  url: z.string(),
  provider: z.string(),
  why_better: z.string(),
  relevance_score: z.number().min(0).max(100),
  expected_outcome: z.string(),
})

const AlternativesResponseSchema = z.object({
  alternatives: z.array(AlternativeSchema).min(1).max(5),
  swap_message: z.string(),
  score_improvement: z.number(),
})

export type ContentAlternative = z.infer<typeof AlternativeSchema>
export type AlternativesResponse = z.infer<typeof AlternativesResponseSchema>

// ── Verified Resource Library ──
// Real, hand-verified URLs that actually exist. Grouped by what they help with.
interface Resource {
  title: string
  type: 'podcast' | 'article' | 'video' | 'activity' | 'app' | 'book' | 'course'
  provider: string
  url: string
  category: 'educational' | 'productive' | 'creative' | 'social' | 'entertainment' | 'neutral'
  estimated_score: number
  duration_minutes: number
  description: string
  why_better: string
  expected_outcome: string
  tags: string[] // For matching
}

const VERIFIED_RESOURCES: Resource[] = [
  // ── Focus & Productivity ──
  { title: 'How to Get Your Brain to Focus', type: 'video', provider: 'TEDx · YouTube', url: 'https://www.youtube.com/watch?v=Hu4Yvq-g7_Y', category: 'educational', estimated_score: 88, duration_minutes: 15, description: 'Chris Bailey explains the science of focus and attention.', why_better: 'Teaches practical techniques to regain your attention span.', expected_outcome: 'Better ability to focus after screen time', tags: ['focus', 'attention', 'productivity', 'science'] },
  { title: 'Deep Work by Cal Newport', type: 'book', provider: 'Amazon / Library', url: 'https://www.calnewport.com/books/deep-work/', category: 'productive', estimated_score: 92, duration_minutes: 30, description: 'Rules for focused success in a distracted world.', why_better: 'Builds a framework for replacing shallow scrolling with deep work habits.', expected_outcome: 'Long-term shift toward meaningful productivity', tags: ['focus', 'work', 'productivity', 'habits'] },

  // ── Mental Wellness ──
  { title: '10-Minute Mindfulness Meditation', type: 'video', provider: 'Goodful · YouTube', url: 'https://www.youtube.com/watch?v=U9YKY7fdwyg', category: 'educational', estimated_score: 85, duration_minutes: 10, description: 'A gentle guided meditation to reset your mental state.', why_better: 'Directly lowers cortisol and anxiety caused by doomscrolling.', expected_outcome: 'Reduced anxiety and calmer mental state', tags: ['meditation', 'anxiety', 'calm', 'wellness', 'doomscroll'] },
  { title: 'Why We Procrastinate', type: 'video', provider: 'TED · YouTube', url: 'https://www.youtube.com/watch?v=arj7oStGLkU', category: 'educational', estimated_score: 86, duration_minutes: 14, description: 'Tim Urban hilariously explains the procrastination mind.', why_better: 'Understanding why you scroll helps you stop the pattern.', expected_outcome: 'Self-awareness about procrastination triggers', tags: ['procrastination', 'habits', 'self-awareness', 'humor'] },
  { title: 'The Happiness Lab Podcast', type: 'podcast', provider: 'Pushkin Industries', url: 'https://www.pushkin.fm/podcasts/the-happiness-lab-with-dr-laurie-santos', category: 'educational', estimated_score: 90, duration_minutes: 40, description: 'Yale professor explores what actually makes us happier.', why_better: 'Evidence-based strategies for genuine wellbeing, not dopamine hits.', expected_outcome: 'Better understanding of what truly makes you happy', tags: ['happiness', 'psychology', 'wellness', 'science'] },

  // ── Learning & Growth ──
  { title: 'Crash Course: Psychology', type: 'video', provider: 'CrashCourse · YouTube', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOPRKzVLY0jJY-uHOH9KVU6', category: 'educational', estimated_score: 91, duration_minutes: 12, description: 'Engaging animated psychology lessons.', why_better: 'Learn about your own mind instead of passively consuming content.', expected_outcome: 'Foundational knowledge about how your brain works', tags: ['psychology', 'learning', 'science', 'education'] },
  { title: 'Harvard CS50 — Intro to Computer Science', type: 'course', provider: 'Harvard · YouTube', url: 'https://www.youtube.com/watch?v=LfaMVlDaQ24', category: 'educational', estimated_score: 95, duration_minutes: 45, description: 'World-class computer science education, completely free.', why_better: 'Builds real-world skills instead of consuming disposable content.', expected_outcome: 'Foundation in computational thinking', tags: ['coding', 'technology', 'skills', 'education', 'career'] },
  { title: 'Atomic Habits by James Clear', type: 'book', provider: 'jamesclear.com', url: 'https://jamesclear.com/atomic-habits', category: 'productive', estimated_score: 93, duration_minutes: 30, description: 'Tiny changes, remarkable results — the science of habit formation.', why_better: 'Gives you a practical system to build better digital habits.', expected_outcome: 'Clear framework for replacing bad habits with good ones', tags: ['habits', 'productivity', 'self-improvement', 'behavior'] },

  // ── Creative ──
  { title: 'Draw with Jazza — Beginner Drawing', type: 'video', provider: 'Jazza · YouTube', url: 'https://www.youtube.com/watch?v=ewMksAbgZBU', category: 'creative', estimated_score: 84, duration_minutes: 20, description: 'Fun, beginner-friendly drawing tutorial.', why_better: 'Creating something activates flow state — the opposite of passive scrolling.', expected_outcome: 'Sense of accomplishment and creative expression', tags: ['art', 'drawing', 'creative', 'hobby'] },
  { title: 'Write Your First Short Story', type: 'article', provider: 'MasterClass', url: 'https://www.masterclass.com/articles/how-to-write-a-short-story', category: 'creative', estimated_score: 82, duration_minutes: 25, description: 'Step-by-step guide to writing a compelling short story.', why_better: 'Channels your energy into creating instead of consuming.', expected_outcome: 'A completed creative piece you can be proud of', tags: ['writing', 'creative', 'storytelling'] },

  // ── Physical & Activity ──
  { title: '7-Minute Full Body Workout', type: 'video', provider: 'JEFIT · YouTube', url: 'https://www.youtube.com/watch?v=U6etLKswjq8', category: 'productive', estimated_score: 88, duration_minutes: 7, description: 'Quick, effective workout you can do anywhere.', why_better: 'Physical movement resets dopamine baseline and breaks scroll addiction.', expected_outcome: 'Immediate mood boost and energy increase', tags: ['exercise', 'physical', 'energy', 'wellness', 'quick'] },
  { title: 'Nature Walk Meditation', type: 'activity', provider: 'Self-guided', url: 'https://www.headspace.com/meditation/walking-meditation', category: 'educational', estimated_score: 86, duration_minutes: 15, description: 'A guided walking meditation to reconnect with the present.', why_better: 'Breaks the screen cycle by engaging your body and senses.', expected_outcome: 'Mental clarity and reduced screen fatigue', tags: ['walking', 'nature', 'meditation', 'break'] },

  // ── Entertainment alternatives (higher quality) ──
  { title: 'Kurzgesagt — In a Nutshell', type: 'video', provider: 'Kurzgesagt · YouTube', url: 'https://www.youtube.com/c/inanutshell', category: 'educational', estimated_score: 90, duration_minutes: 12, description: 'Beautiful animated science explainers.', why_better: 'Same dopamine hit as social media, but you learn something real.', expected_outcome: 'Knowledge about science, space, biology, and society', tags: ['science', 'animation', 'learning', 'entertainment', 'youtube'] },
  { title: 'Veritasium — Science Videos', type: 'video', provider: 'Veritasium · YouTube', url: 'https://www.youtube.com/c/veritasium', category: 'educational', estimated_score: 89, duration_minutes: 18, description: 'Mind-bending science experiments and explanations.', why_better: 'Engaging like social media, but genuinely educational and thought-provoking.', expected_outcome: 'Deeper understanding of the physical world', tags: ['science', 'physics', 'learning', 'entertainment', 'youtube'] },
  { title: '3Blue1Brown — Math Explained Visually', type: 'video', provider: '3Blue1Brown · YouTube', url: 'https://www.youtube.com/c/3blue1brown', category: 'educational', estimated_score: 94, duration_minutes: 20, description: 'Beautiful visual explanations of math concepts.', why_better: 'Turns abstract concepts into stunning visual stories that stick with you.', expected_outcome: 'New appreciation and understanding of mathematics', tags: ['math', 'learning', 'visual', 'education'] },

  // ── Social alternatives ──
  { title: 'Call a Friend or Family Member', type: 'activity', provider: 'Self-guided', url: 'https://www.psychologytoday.com/us/blog/the-art-of-closeness/201901/why-you-should-pick-up-the-phone', category: 'social', estimated_score: 88, duration_minutes: 15, description: 'Real human connection instead of parasocial scrolling.', why_better: 'Authentic social bonding releases oxytocin and genuinely improves mood.', expected_outcome: 'Stronger relationships and genuine emotional connection', tags: ['social', 'connection', 'relationships', 'communication'] },

  // ── Podcasts ──
  { title: 'Huberman Lab — Focus & Productivity', type: 'podcast', provider: 'Huberman Lab', url: 'https://hubermanlab.com/category/focus/', category: 'educational', estimated_score: 93, duration_minutes: 60, description: 'Neuroscience-based tools for optimizing focus and health.', why_better: 'Actionable science you can apply immediately to improve your life.', expected_outcome: 'Practical neuroscience tools for better habits', tags: ['neuroscience', 'focus', 'health', 'science', 'habits'] },
  { title: 'How I Built This', type: 'podcast', provider: 'NPR', url: 'https://www.npr.org/series/490248027/how-i-built-this', category: 'productive', estimated_score: 87, duration_minutes: 45, description: 'Inspiring stories of entrepreneurs who built iconic companies.', why_better: 'Inspires action and ambition instead of passive consumption.', expected_outcome: 'Motivation and practical business insights', tags: ['business', 'entrepreneurship', 'inspiration', 'career'] },
]

// ── Matching Engine ──
function scoreResource(resource: Resource, context: SwapContext): number {
  let score = 0

  // Base relevance from category opposition (doomscroll → educational = high)
  if (context.detected_category === 'doomscroll' && ['educational', 'productive', 'creative'].includes(resource.category)) score += 30
  if (context.detected_category === 'entertainment' && resource.category === 'educational') score += 20
  if (context.detected_category === 'social' && ['creative', 'productive'].includes(resource.category)) score += 15

  // Tag matching with content keywords
  const contentLower = context.content.toLowerCase()
  for (const tag of resource.tags) {
    if (contentLower.includes(tag)) score += 8
  }

  // Time of day matching
  const hour = context.hour
  if (hour >= 22 || hour < 6) {
    // Late night — suggest calm/short content
    if (resource.duration_minutes <= 15) score += 10
    if (resource.tags.includes('meditation') || resource.tags.includes('calm')) score += 15
  } else if (hour >= 6 && hour < 12) {
    // Morning — productive/educational
    if (['productive', 'educational'].includes(resource.category)) score += 10
  } else if (hour >= 17 && hour < 22) {
    // Evening — creative/entertainment alternatives
    if (['creative', 'entertainment'].includes(resource.category)) score += 8
  }

  // Duration match — prefer shorter when score is very low (urgent swap)
  if (context.severity === 'critical' && resource.duration_minutes <= 15) score += 12
  if (context.severity === 'warning' && resource.duration_minutes <= 30) score += 8

  // Avg score consideration — if user usually scores low, suggest easier content
  if (context.avg_score && context.avg_score < 40 && resource.duration_minutes <= 20) score += 10

  // Boost by resource quality
  score += Math.floor(resource.estimated_score / 10)

  return score
}

interface SwapContext {
  content: string
  detected_category: string
  severity: string
  hour: number
  avg_score?: number
  recent_categories?: string[]
}

function selectBestSwaps(context: SwapContext): ContentAlternative[] {
  // Score all resources
  const scored = VERIFIED_RESOURCES.map(r => ({
    resource: r,
    score: scoreResource(r, context),
  }))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Diversity filter — pick top but ensure different types/categories
  const selected: ContentAlternative[] = []
  const usedTypes = new Set<string>()
  const usedProviders = new Set<string>()

  for (const item of scored) {
    if (selected.length >= 3) break

    // Skip if same type AND same provider already picked
    const typeKey = item.resource.type
    const provKey = item.resource.provider
    if (usedTypes.has(typeKey) && usedProviders.has(provKey)) continue

    usedTypes.add(typeKey)
    usedProviders.add(provKey)

    selected.push({
      title: item.resource.title,
      description: item.resource.description,
      category: item.resource.category,
      estimated_score: item.resource.estimated_score,
      duration_minutes: item.resource.duration_minutes,
      type: item.resource.type,
      url: item.resource.url,
      provider: item.resource.provider,
      why_better: item.resource.why_better,
      relevance_score: Math.min(100, item.score),
      expected_outcome: item.resource.expected_outcome,
    })
  }

  // Fallback if somehow empty
  if (selected.length === 0) {
    const fallback = VERIFIED_RESOURCES[0]
    selected.push({
      title: fallback.title,
      description: fallback.description,
      category: fallback.category,
      estimated_score: fallback.estimated_score,
      duration_minutes: fallback.duration_minutes,
      type: fallback.type,
      url: fallback.url,
      provider: fallback.provider,
      why_better: fallback.why_better,
      relevance_score: 50,
      expected_outcome: fallback.expected_outcome,
    })
  }

  return selected
}

// ── Main Export ──
export async function findAlternatives(
  junkContent: string,
  category: string,
  userContext?: { avg_score?: number; recent_categories?: string[] }
): Promise<AlternativesResponse> {
  const hour = new Date().getHours()

  const severity = category === 'doomscroll' ? 'critical' : 'warning'

  const context: SwapContext = {
    content: junkContent,
    detected_category: category,
    severity,
    hour,
    avg_score: userContext?.avg_score,
    recent_categories: userContext?.recent_categories,
  }

  const alternatives = selectBestSwaps(context)

  const avgImprovement = alternatives.length > 0
    ? Math.round(alternatives.reduce((s, a) => s + a.estimated_score, 0) / alternatives.length) - 30
    : 50

  return {
    alternatives,
    swap_message: severity === 'critical'
      ? "This content is working against you. Here are 3 alternatives that will actually help:"
      : "You can do better. These alternatives will leave you feeling more fulfilled:",
    score_improvement: avgImprovement,
  }
}
