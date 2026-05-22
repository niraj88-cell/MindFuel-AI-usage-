// lib/agents/tools/moodIntelligenceAnalyzer.ts
// 5-Dimension Mood Intelligence Analyzer — Groq Llama 3.3
import Groq from 'groq-sdk'
import { z } from 'zod'

// ── Schemas ─────────────────────────────────────────────────────────────

export const MoodIntelligenceSchema = z.object({
  emotional_valence: z.object({
    polarity: z.enum(['positive', 'negative', 'mixed']),
    emotions: z.array(z.string()),
    intensity: z.number().min(1).max(10),
  }),
  energy_signature: z.object({
    level: z.number().min(1).max(10),
    descriptors: z.array(z.string()),
    type: z.enum(['high-stimulation', 'moderate', 'low-stimulation', 'variable']),
  }),
  psychological_themes: z.object({
    themes: z.array(z.string()),
    dominant_theme: z.string(),
  }),
  mood_trajectory: z.object({
    effect: z.enum(['elevate', 'deplete', 'neutralize']),
    explanation: z.string(),
    duration: z.enum(['momentary', 'short-term', 'lingering']),
  }),
  consumption_risk: z.object({
    risk_level: z.enum(['none', 'low', 'moderate', 'high']),
    flags: z.array(z.string()),
    warning: z.string().optional(),
  }),
  mood_verdict: z.string(),
  recommended_action: z.string(),
  platform: z.string().optional(),
})

export type MoodIntelligence = z.infer<typeof MoodIntelligenceSchema>

// ── Platform Detection ──────────────────────────────────────────────────

interface PlatformInfo { platform: string; label: string; contentType: string }

function detectPlatform(url: string): PlatformInfo | null {
  const l = url.toLowerCase()
  if (l.includes('youtube.com/shorts')) return { platform: 'youtube-shorts', label: 'YouTube Shorts', contentType: 'Sub-60s vertical video for rapid consumption' }
  if (l.includes('youtube.com') || l.includes('youtu.be')) return { platform: 'youtube', label: 'YouTube', contentType: 'Video content — educational to entertainment' }
  if (l.includes('instagram.com/reel')) return { platform: 'instagram-reels', label: 'Instagram Reels', contentType: 'Short-form vertical video for infinite scrolling' }
  if (l.includes('instagram.com')) return { platform: 'instagram', label: 'Instagram', contentType: 'Visual social media — photos, carousels, feed posts' }
  if (l.includes('tiktok.com')) return { platform: 'tiktok', label: 'TikTok', contentType: 'Short-form video optimized for algorithmic engagement' }
  if (l.includes('twitter.com') || l.includes('x.com')) return { platform: 'twitter', label: 'Twitter/X', contentType: 'Microblog — opinions, news, discourse' }
  if (l.includes('reddit.com')) return { platform: 'reddit', label: 'Reddit', contentType: 'Community discussion threads' }
  if (l.includes('netflix.com')) return { platform: 'netflix', label: 'Netflix', contentType: 'Streaming entertainment' }
  if (l.includes('spotify.com')) return { platform: 'spotify', label: 'Spotify', contentType: 'Audio — music or podcasts' }
  if (l.includes('medium.com') || l.includes('substack.com')) return { platform: 'longform', label: 'Long-form Article', contentType: 'Written long-form content' }
  return null
}

export { detectPlatform }

// ── URL Metadata ────────────────────────────────────────────────────────

async function extractUrlMeta(url: string): Promise<string> {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) { const d = await res.json(); return `Title: "${d.title}" by ${d.author_name}` }
    } catch {}
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MindFuelBot/1.0)' }, signal: AbortSignal.timeout(3000) })
    if (!res.ok) return ''
    const html = await res.text()
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const d = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    return [t && `Title: "${t[1].trim()}"`, d && `Description: ${d[1].trim()}`].filter(Boolean).join('\n')
  } catch { return '' }
}

// ── Main Analyzer ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are MindFuel's Mood Intelligence Engine — a precision tool for analyzing how media content shapes emotional state, mental clarity, and energy.

Analyze content through 5 psychological dimensions. Be psychologically grounded, specific, honest, and actionable.

RETURN ONLY VALID JSON (no markdown):
{
  "emotional_valence": { "polarity": "positive"|"negative"|"mixed", "emotions": ["emotion1",...], "intensity": 1-10 },
  "energy_signature": { "level": 1-10, "descriptors": ["desc1",...], "type": "high-stimulation"|"moderate"|"low-stimulation"|"variable" },
  "psychological_themes": { "themes": ["theme1",...], "dominant_theme": "primary theme" },
  "mood_trajectory": { "effect": "elevate"|"deplete"|"neutralize", "explanation": "why", "duration": "momentary"|"short-term"|"lingering" },
  "consumption_risk": { "risk_level": "none"|"low"|"moderate"|"high", "flags": ["flag1",...], "warning": "optional" },
  "mood_verdict": "One clear sentence about what this content does to your mental state.",
  "recommended_action": "One specific, actionable next step."
}

CALIBRATION:
- YouTube Shorts/TikTok/Reels: high-stim, dopamine-loop risk, often depleting
- YouTube long-form educational: typically elevating, low risk
- Instagram feed: comparison/social-validation, moderate risk
- Twitter/X: outrage/fear themes, depleting, attention fragmentation
- Podcasts/articles: grounding, growth themes, low risk
- Be nuanced: a cooking tutorial on TikTok differs from drama content.`

export async function analyzeMoodIntelligence(contentOrUrl: string): Promise<MoodIntelligence> {
  const isUrl = /^https?:\/\//i.test(contentOrUrl.trim())
  let input = contentOrUrl.trim()
  let platformInfo: PlatformInfo | null = null

  if (isUrl) {
    platformInfo = detectPlatform(contentOrUrl)
    const meta = await extractUrlMeta(contentOrUrl)
    input = [`URL: ${contentOrUrl}`, platformInfo ? `Platform: ${platformInfo.label}` : null, platformInfo ? `Content Type: ${platformInfo.contentType}` : null, meta || null].filter(Boolean).join('\n')
  }
  if (input.length > 5000) input = input.substring(0, 5000) + '...'

  const apiKey = process.env.GROQ_API_KEY || ''
  if (!apiKey || apiKey.startsWith('your_')) return buildHeuristic(contentOrUrl, platformInfo)

  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: `Analyze:\n\n${input}` }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const validated = MoodIntelligenceSchema.safeParse({ ...parsed, platform: platformInfo?.platform || parsed.platform })
    if (validated.success) return validated.data
    console.warn('[MoodIntelligence] Zod partial fail')
    return { ...parsed, platform: platformInfo?.platform } as MoodIntelligence
  } catch (e) {
    console.warn('[MoodIntelligence] AI failed, heuristic fallback:', e)
    return buildHeuristic(contentOrUrl, platformInfo)
  }
}

// ── Heuristic Fallback ──────────────────────────────────────────────────

function buildHeuristic(content: string, platform: PlatformInfo | null): MoodIntelligence {
  const base: Record<string, Omit<MoodIntelligence, 'platform'>> = {
    'youtube-shorts': { emotional_valence: { polarity: 'mixed', emotions: ['excitement', 'restlessness'], intensity: 6 }, energy_signature: { level: 8, descriptors: ['fast cuts', 'autoplay loop'], type: 'high-stimulation' }, psychological_themes: { themes: ['dopamine-loops', 'escapism'], dominant_theme: 'dopamine-loops' }, mood_trajectory: { effect: 'deplete', explanation: 'Rapid-fire shorts create a dopamine treadmill that leaves you emptier afterward.', duration: 'short-term' }, consumption_risk: { risk_level: 'high', flags: ['compulsive-scrolling', 'attention-fragmentation'], warning: 'Shorts are engineered for infinite scroll. Set a 5-min timer.' }, mood_verdict: 'Designed to keep you watching, not to leave you feeling better.', recommended_action: 'Close the app, take 3 deep breaths, then choose something intentional.' },
    'youtube': { emotional_valence: { polarity: 'mixed', emotions: ['curiosity', 'engagement'], intensity: 5 }, energy_signature: { level: 5, descriptors: ['variable pacing'], type: 'variable' }, psychological_themes: { themes: ['growth', 'entertainment', 'curiosity'], dominant_theme: 'curiosity' }, mood_trajectory: { effect: 'neutralize', explanation: 'Long-form YouTube ranges widely — depends on whether you chose this or the algorithm did.', duration: 'short-term' }, consumption_risk: { risk_level: 'low', flags: [] }, mood_verdict: 'Could be nourishing or numbing — it depends on your intentionality.', recommended_action: 'Set an intention before watching: "I want to learn X" — then honor that boundary.' },
    'instagram-reels': { emotional_valence: { polarity: 'mixed', emotions: ['envy', 'inspiration', 'inadequacy'], intensity: 7 }, energy_signature: { level: 8, descriptors: ['fast transitions', 'trending audio'], type: 'high-stimulation' }, psychological_themes: { themes: ['social-validation', 'comparison', 'dopamine-loops'], dominant_theme: 'comparison' }, mood_trajectory: { effect: 'deplete', explanation: 'Reels mix social comparison with dopamine-loop mechanics — uniquely draining.', duration: 'lingering' }, consumption_risk: { risk_level: 'high', flags: ['compulsive-scrolling', 'comparison-trap'], warning: 'Extended Reels use correlates with increased anxiety.' }, mood_verdict: 'Combines the comparison trap of Instagram with the dopamine loop of TikTok.', recommended_action: 'Put your phone in another room for 10 minutes. Do something with your hands.' },
    'instagram': { emotional_valence: { polarity: 'mixed', emotions: ['envy', 'connection', 'inadequacy'], intensity: 6 }, energy_signature: { level: 5, descriptors: ['curated imagery'], type: 'moderate' }, psychological_themes: { themes: ['social-validation', 'comparison'], dominant_theme: 'social-validation' }, mood_trajectory: { effect: 'deplete', explanation: 'Feed browsing triggers upward social comparison — your everyday vs others\' highlights.', duration: 'short-term' }, consumption_risk: { risk_level: 'moderate', flags: ['comparison-trap'] }, mood_verdict: 'Curated highlight reels that can quietly erode your contentment.', recommended_action: 'Switch to posting or messaging a friend — active use beats passive consumption.' },
    'tiktok': { emotional_valence: { polarity: 'mixed', emotions: ['excitement', 'numbness', 'FOMO'], intensity: 7 }, energy_signature: { level: 9, descriptors: ['ultra-fast cuts', 'algorithmic feed'], type: 'high-stimulation' }, psychological_themes: { themes: ['dopamine-loops', 'escapism'], dominant_theme: 'dopamine-loops' }, mood_trajectory: { effect: 'deplete', explanation: 'TikTok exploits variable-ratio reinforcement — each swipe is an unpredictable reward.', duration: 'lingering' }, consumption_risk: { risk_level: 'high', flags: ['compulsive-scrolling', 'doom-loop', 'emotional-numbing'], warning: 'Sessions over 15min strongly correlate with reduced attention span.' }, mood_verdict: 'Digital sugar — sweet in the moment, but depletes mental energy fast.', recommended_action: 'Set a 10-minute timer. When it goes off, switch to something that requires creation, not consumption.' },
    'twitter': { emotional_valence: { polarity: 'negative', emotions: ['anxiety', 'outrage', 'frustration'], intensity: 7 }, energy_signature: { level: 7, descriptors: ['rapid updates', 'controversy'], type: 'high-stimulation' }, psychological_themes: { themes: ['fear', 'outrage', 'social-validation'], dominant_theme: 'outrage' }, mood_trajectory: { effect: 'deplete', explanation: 'Twitter rewards reactive, emotionally charged content. Activates stress without resolution.', duration: 'lingering' }, consumption_risk: { risk_level: 'high', flags: ['doom-loop', 'attention-fragmentation'], warning: 'Rage-scrolling triggers cortisol that takes hours to normalize.' }, mood_verdict: 'Twitter thrives on outrage — your anger is the product.', recommended_action: 'Unfollow 5 accounts that make you feel worse. Replace with one that teaches you something.' },
  }

  if (platform?.platform && base[platform.platform]) {
    return { ...base[platform.platform], platform: platform.platform }
  }

  // Generic fallback
  const lower = content.toLowerCase()
  const neg = /doom|rage|hate|outrage|drama|gossip|clickbait|toxic|anxiety/i.test(lower)
  const pos = /learn|tutorial|course|meditat|mindful|growth|create|inspire|calm|podcast|book/i.test(lower)
  const stim = /shorts|reels|tiktok|scroll|feed|trending|viral/i.test(lower)

  return {
    emotional_valence: { polarity: neg ? 'negative' : pos ? 'positive' : 'mixed', emotions: neg ? ['anxiety', 'restlessness'] : pos ? ['curiosity', 'inspiration'] : ['neutral engagement'], intensity: neg ? 6 : pos ? 5 : 4 },
    energy_signature: { level: stim ? 8 : pos ? 4 : 5, descriptors: stim ? ['fast-paced', 'algorithmic'] : pos ? ['steady pacing'] : ['moderate pacing'], type: stim ? 'high-stimulation' : pos ? 'low-stimulation' : 'moderate' },
    psychological_themes: { themes: neg ? ['escapism', 'fear'] : pos ? ['growth', 'creativity'] : ['entertainment'], dominant_theme: neg ? 'escapism' : pos ? 'growth' : 'entertainment' },
    mood_trajectory: { effect: neg ? 'deplete' : pos ? 'elevate' : 'neutralize', explanation: neg ? 'Negative emotional triggers deplete mental reserves.' : pos ? 'Growth-oriented content builds mental capital.' : 'Unlikely to significantly shift your mood.', duration: neg ? 'lingering' : 'short-term' },
    consumption_risk: { risk_level: stim ? 'high' : neg ? 'moderate' : 'low', flags: stim ? ['compulsive-scrolling'] : neg ? ['emotional-numbing'] : [], warning: stim ? 'High-stimulation content fragments attention. Set a timer.' : undefined },
    mood_verdict: neg ? 'More likely to drain than replenish your mental energy.' : pos ? 'Quality mental nutrition — consume with intention.' : 'Not harmful, but not particularly nourishing either.',
    recommended_action: neg ? 'Swap for a 10-minute podcast on something you\'re genuinely curious about.' : pos ? 'Engage actively — take notes or discuss what you learn.' : 'Ask yourself: "Is this what I actually want to be doing right now?"',
    platform: platform?.platform,
  }
}
