import Groq from 'groq-sdk'
import { z } from 'zod'

// ── Schema ──
export const MentalNutritionSchema = z.object({
  nutrition_score: z.number().min(0).max(100),
  primary_neuro_impact: z.enum([
    'dopamine_hit',
    'cortisol_spike',
    'serotonin_boost',
    'flow_state',
    'numbing'
  ]),
  cognitive_cost: z.string(),
  behavioral_insight: z.string(),
  actionable_detox: z.string()
})

export type MentalNutrition = z.infer<typeof MentalNutritionSchema>

// ── Heuristic fallback ──
function computeHeuristic(content: string): MentalNutrition {
  const lower = content.toLowerCase()

  // Doomscroll / toxic patterns
  const doomPatterns = [
    'tiktok', 'reels', 'shorts', 'drama', 'gossip', 'outrage',
    'rage', 'clickbait', 'doomscroll', 'brain rot', 'hate', 'cringe',
    'infinite scroll', 'addictive', 'feed'
  ]
  const eduPatterns = [
    'tutorial', 'learn', 'course', 'study', 'research', 'article',
    'documentary', 'lecture', 'wikipedia', 'textbook', 'deep dive',
    'programming', 'science'
  ]
  const productivePatterns = [
    'work', 'coding', 'github', 'figma', 'project', 'meeting',
    'presentation', 'deadline', 'deep work', 'focus'
  ]
  const creativePatterns = [
    'design', 'draw', 'paint', 'write', 'compose', 'create',
    'art', 'photography', 'blender', 'music production'
  ]

  const countMatches = (patterns: string[]) =>
    patterns.filter(p => lower.includes(p)).length

  const doomScore = countMatches(doomPatterns)
  const eduScore = countMatches(eduPatterns)
  const prodScore = countMatches(productivePatterns)
  const creativeScore = countMatches(creativePatterns)

  // Determine dominant category
  const scores = [
    { type: 'doom', score: doomScore * 2 },
    { type: 'edu', score: eduScore * 1.5 },
    { type: 'prod', score: prodScore * 1.3 },
    { type: 'creative', score: creativeScore * 1.4 }
  ].sort((a, b) => b.score - a.score)

  const dominant = scores[0].score > 0 ? scores[0].type : 'neutral'

  const resultMap: Record<string, MentalNutrition> = {
    doom: {
      nutrition_score: Math.max(5, 25 - doomScore * 4),
      primary_neuro_impact: 'dopamine_hit',
      cognitive_cost: 'This content hijacked your dopamine reward circuitry with rapid-fire novelty, leaving your prefrontal cortex in a depleted state that makes sustained focus feel physically painful.',
      behavioral_insight: 'You likely reached for this during a low-energy or emotionally uncomfortable moment — the brain defaults to high-stimulation, low-effort content as a coping mechanism.',
      actionable_detox: 'Stand up, walk to a window, and stare at something at least 20 feet away for 60 seconds — this resets your visual focus and breaks the dopamine-scroll loop.'
    },
    edu: {
      nutrition_score: Math.min(95, 78 + eduScore * 3),
      primary_neuro_impact: 'serotonin_boost',
      cognitive_cost: 'This content strengthened prefrontal cortex pathways and activated your brain\'s knowledge-consolidation circuits — the neurological equivalent of a nutrient-dense meal.',
      behavioral_insight: 'You chose this content intentionally, likely driven by curiosity or a desire for self-improvement — this correlates strongly with long-term life satisfaction.',
      actionable_detox: 'Spend 2 minutes writing down one key takeaway from what you just learned — this converts short-term encoding into durable long-term memory.'
    },
    prod: {
      nutrition_score: Math.min(90, 72 + prodScore * 4),
      primary_neuro_impact: 'flow_state',
      cognitive_cost: 'Goal-directed work activated your executive function network, providing the satisfying neurochemical cocktail of norepinephrine and dopamine that comes from purposeful effort.',
      behavioral_insight: 'You engaged in task-oriented behavior, which suggests your internal motivation system is aligned with your goals — this is a strong indicator of psychological wellbeing.',
      actionable_detox: 'Take a 5-minute micro-break before your next task — brief rest between focused blocks actually improves total output and prevents decision fatigue.'
    },
    creative: {
      nutrition_score: Math.min(95, 82 + creativeScore * 3),
      primary_neuro_impact: 'flow_state',
      cognitive_cost: 'Creative engagement activated your default mode network in a productive way, lowering cortisol and generating the deeply satisfying state that psychologists call "autotelic experience."',
      behavioral_insight: 'You gravitated toward creation over consumption — this is one of the strongest predictors of sustained mental wellbeing and reduced anxiety.',
      actionable_detox: 'Capture this creative momentum — set a 15-minute timer and continue creating, even imperfectly. Flow states are precious and worth protecting.'
    },
    neutral: {
      nutrition_score: 50,
      primary_neuro_impact: 'numbing',
      cognitive_cost: 'This content occupied cognitive bandwidth without meaningfully engaging any reward or learning pathways — the mental equivalent of empty calories.',
      behavioral_insight: 'Neutral browsing often signals low-level boredom or avoidance — the brain is seeking stimulation but hasn\'t found a compelling direction yet.',
      actionable_detox: 'Set a specific intention for the next 10 minutes — even something small like "I will read one article about X" converts aimless browsing into purposeful action.'
    }
  }

  return resultMap[dominant]
}

// ── Main Analysis Function ──
export async function analyzeMentalNutrition(content: string): Promise<MentalNutrition> {
  const apiKey = process.env.GROQ_API_KEY || ''
  const text = content.length > 3000
    ? content.substring(0, 3000) + '...[truncated]'
    : content

  if (!apiKey || apiKey === 'your_free_groq_key_here') {
    return computeHeuristic(text)
  }

  try {
    const groq = new Groq({ apiKey })

    const systemPrompt = `You are the MindFuel Core Engine, a world-class behavioral psychologist and neuroscientist AI.
Your objective is to analyze a user's digital consumption log (text or voice transcript) and evaluate its "Mental Nutrition."

You do not judge the user, but you are ruthlessly objective about the neurochemical impact of their digital diet (e.g., dopamine spiking, cortisol inducing, educational, flow-state).

You must respond ONLY with a valid JSON object matching this exact schema. Do not include markdown formatting or conversational text.

{
  "nutrition_score": <int 0-100, where 100 is deeply fulfilling/educational and 0 is toxic brain-rot>,
  "primary_neuro_impact": <string, one of: ["dopamine_hit", "cortisol_spike", "serotonin_boost", "flow_state", "numbing"]>,
  "cognitive_cost": <string, a 1-sentence brutally honest summary of what this content just did to their brain>,
  "behavioral_insight": <string, a 1-sentence psychological observation on WHY they likely consumed this>,
  "actionable_detox": <string, a highly specific, 1-step action they should take right now to recover focus>
}

SCORING GUIDELINES:
- 90-100: Deep learning, creative flow, structured skill-building. Serotonin/flow.
- 70-89: Intentional consumption — quality articles, focused work, meaningful social.
- 45-69: Mixed or neutral — passive but not harmful. Mild numbing.
- 20-44: Low-value — repetitive entertainment, mindless scrolling, clickbait.
- 0-19: Toxic — doomscrolling, outrage bait, rage content, infinite-scroll traps.

NEURO IMPACT GUIDE:
- dopamine_hit: Short-form, algorithmically-fed, novelty-seeking content. Spikes reward circuitry.
- cortisol_spike: Anxiety-inducing news, outrage content, social comparison, FOMO triggers.
- serotonin_boost: Educational, self-improvement, creative fulfillment, meaningful connection.
- flow_state: Deep work, creative immersion, focused learning, coding, writing, building.
- numbing: Passive scrolling, idle browsing, background noise consumption, zone-out media.

Be SPECIFIC. Reference actual neurochemical mechanisms. No generic advice.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze the following user input and generate the JSON payload:\n\n${text}` }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)

    const validated = MentalNutritionSchema.safeParse({
      ...parsed,
      nutrition_score: Math.max(0, Math.min(100, Number(parsed.nutrition_score) || 50)),
    })

    if (validated.success) {
      return validated.data
    }

    console.warn('[MentalNutrition] Zod validation failed, falling back to heuristic:', validated.error.issues)
    return computeHeuristic(text)

  } catch (error) {
    console.error('[MentalNutrition API Error] Falling back to heuristic', error)
    return computeHeuristic(text)
  }
}
