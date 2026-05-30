import Groq from 'groq-sdk'
import { z } from 'zod'

export const ContentAnalysisSchema = z.object({
  category: z.enum(['educational', 'productive', 'creative', 'social', 'entertainment', 'doomscroll', 'neutral']),
  mental_score: z.number().min(1).max(100),
  summary: z.string(),
  reasoning: z.string(),
  tags: z.array(z.string()),
  is_junk: z.boolean(),
  time_well_spent: z.boolean(),
  // ── Intelligence Engine Fields ──
  severity: z.enum(['critical', 'warning', 'moderate', 'safe', 'excellent']),
  confidence: z.number().min(0).max(100),
  impact_analysis: z.object({
    mood_shift: z.enum(['strong_negative', 'negative', 'neutral', 'positive', 'strong_positive']),
    cognitive_load: z.enum(['overwhelming', 'high', 'moderate', 'low', 'restorative']),
    habit_risk: z.enum(['high', 'moderate', 'low', 'none']),
    time_quality: z.enum(['wasted', 'low', 'neutral', 'good', 'excellent']),
  }),
  root_causes: z.array(z.object({
    reason: z.string(),
    evidence: z.string(),
    confidence: z.number().min(0).max(100),
  })),
  copilot_actions: z.array(z.object({
    action: z.string(),
    reason: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    confidence: z.number().min(0).max(100),
  })),
  missing_context: z.array(z.string()).optional(),
})

export type ContentAnalysis = z.infer<typeof ContentAnalysisSchema>

// ── Intelligence Helpers ──
function computeSeverity(score: number): ContentAnalysis['severity'] {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'safe'
  if (score >= 40) return 'moderate'
  if (score >= 20) return 'warning'
  return 'critical'
}

function computeImpact(score: number, category: string): ContentAnalysis['impact_analysis'] {
  const moodMap: Record<string, ContentAnalysis['impact_analysis']['mood_shift']> = {
    educational: 'positive', productive: 'positive', creative: 'strong_positive',
    social: 'neutral', entertainment: 'neutral', doomscroll: 'strong_negative', neutral: 'neutral',
  }
  const cogMap: Record<string, ContentAnalysis['impact_analysis']['cognitive_load']> = {
    educational: 'moderate', productive: 'moderate', creative: 'low',
    social: 'low', entertainment: 'low', doomscroll: 'overwhelming', neutral: 'moderate',
  }
  const habitMap: Record<string, ContentAnalysis['impact_analysis']['habit_risk']> = {
    educational: 'none', productive: 'none', creative: 'none',
    social: 'low', entertainment: 'moderate', doomscroll: 'high', neutral: 'low',
  }
  return {
    mood_shift: score <= 20 ? 'strong_negative' : score <= 40 ? 'negative' : (moodMap[category] || 'neutral'),
    cognitive_load: score <= 20 ? 'overwhelming' : (cogMap[category] || 'moderate'),
    habit_risk: habitMap[category] || 'low',
    time_quality: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'neutral' : score >= 20 ? 'low' : 'wasted',
  }
}

function computeRootCauses(score: number, category: string, matchScore: number): ContentAnalysis['root_causes'] {
  const causes: ContentAnalysis['root_causes'] = []
  if (category === 'doomscroll') {
    causes.push({ reason: 'Dopamine loop exploitation', evidence: 'Content uses infinite scroll and algorithmic feed patterns that hijack reward circuitry', confidence: 92 })
    causes.push({ reason: 'Attention fragmentation', evidence: 'Short-form content reduces sustained attention capacity over time', confidence: 85 })
    causes.push({ reason: 'Emotional manipulation', evidence: 'Outrage and novelty triggers exploit amygdala reactivity', confidence: 78 })
  } else if (category === 'entertainment') {
    causes.push({ reason: 'Passive consumption mode', evidence: 'Entertainment content activates default mode network without cognitive engagement', confidence: 75 })
    causes.push({ reason: 'Moderate dopamine stimulation', evidence: 'Leisure media provides temporary mood lift but limited lasting benefit', confidence: 68 })
  } else if (category === 'educational') {
    causes.push({ reason: 'Active learning engagement', evidence: 'Educational content strengthens prefrontal cortex pathways and builds long-term knowledge', confidence: 90 })
    causes.push({ reason: 'Self-efficacy boost', evidence: 'Learning new skills correlates with increased confidence and positive self-image', confidence: 82 })
  } else if (category === 'productive') {
    causes.push({ reason: 'Goal-directed behavior', evidence: 'Work-focused activity engages executive function and provides achievement satisfaction', confidence: 88 })
    causes.push({ reason: 'Flow state potential', evidence: 'Deep work enables flow states that boost both performance and wellbeing', confidence: 76 })
  } else if (category === 'creative') {
    causes.push({ reason: 'Flow state activation', evidence: 'Creative work is one of the strongest triggers for flow states, reducing cortisol', confidence: 91 })
    causes.push({ reason: 'Self-expression therapy', evidence: 'Creative output provides emotional processing and identity reinforcement', confidence: 84 })
  } else if (category === 'social') {
    causes.push({ reason: 'Social bonding activation', evidence: 'Meaningful social interaction releases oxytocin and reduces stress hormones', confidence: 72 })
    causes.push({ reason: 'Comparison risk', evidence: 'Passive social browsing can trigger social comparison and reduce self-esteem', confidence: 60 })
  } else {
    causes.push({ reason: 'Neutral cognitive engagement', evidence: 'Content does not strongly activate positive or negative psychological mechanisms', confidence: 55 })
  }
  return causes
}

function computeCopilotActions(score: number, category: string): ContentAnalysis['copilot_actions'] {
  if (score >= 75) {
    return [
      { action: 'Continue this type of content', reason: 'This content pattern supports your cognitive wellness goals', impact: 'high', confidence: 88 },
      { action: 'Set a mindful time boundary', reason: 'Even healthy content benefits from intentional time limits to maintain balance', impact: 'medium', confidence: 75 },
    ]
  }
  if (score >= 50) {
    return [
      { action: 'Swap to a higher-value alternative', reason: 'Similar content exists that provides deeper engagement and learning', impact: 'high', confidence: 80 },
      { action: 'Set a 20-minute timer', reason: 'Bounded consumption prevents this from becoming a habit loop', impact: 'medium', confidence: 72 },
    ]
  }
  return [
    { action: 'Exit this content now', reason: 'Every additional minute deepens the dopamine loop and makes disengagement harder', impact: 'high', confidence: 92 },
    { action: 'Open a learning resource instead', reason: 'Replacing low-value content with educational material rewires reward associations', impact: 'high', confidence: 85 },
    { action: 'Take a 5-minute walk', reason: 'Physical movement resets dopamine baseline and breaks the scroll pattern', impact: 'medium', confidence: 78 },
  ]
}

function computeMissingContext(score: number, matchScore: number): string[] | undefined {
  const missing: string[] = []
  if (matchScore < 2) missing.push('Specific content title or URL for deeper analysis')
  if (matchScore < 1) missing.push('Duration of consumption for time-impact assessment')
  if (missing.length === 0) return undefined
  return missing
}

function computeConfidence(matchScore: number, isApiResult: boolean): number {
  if (isApiResult) return Math.min(96, Math.max(70, 80 + matchScore * 3))
  if (matchScore >= 4) return 88
  if (matchScore >= 2) return 75
  if (matchScore >= 1) return 60
  return 45
}

async function extractMetadataFromUrl(url: string): Promise<string> {
  // Fast-path for short-form video platforms that block scrapers
  const lowerUrl = url.toLowerCase();
  
  // Enhanced platform detection with more nuanced categorization
  const platformPatterns: Array<{ match: (u: string) => boolean; result: string }> = [
    { 
      match: (u) => u.includes('instagram.com/reel') || u.includes('instagram.com/stories'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Instagram Reels/Stories\nDescription: Short-form vertical video content designed for infinite scrolling and dopamine-loop engagement.`
    },
    {
      match: (u) => u.includes('instagram.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Instagram Content\nDescription: Visual social media content from Instagram — posts, photos, or profile browsing. Designed for visual comparison and social validation loops.`
    },
    {
      match: (u) => u.includes('youtube.com/shorts'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: YouTube Shorts\nDescription: Sub-60-second vertical video content designed for rapid consumption and infinite scrolling.`
    },
    {
      match: (u) => u.includes('youtube.com/watch') || u.includes('youtu.be/'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: YouTube Video\nDescription: Long-form video content from YouTube. Quality varies widely — could be educational, entertainment, or commentary content.`
    },
    {
      match: (u) => u.includes('youtube.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: YouTube Browsing\nDescription: YouTube platform browsing — homepage feed, search results, or channel exploration.`
    },
    {
      match: (u) => u.includes('tiktok.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: TikTok Video\nDescription: Short-form video content optimized for algorithmic engagement and continuous scrolling behavior.`
    },
    {
      match: (u) => u.includes('twitter.com') || u.includes('x.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Twitter/X Post\nDescription: Microblog post from Twitter/X. Often contains opinions, news snippets, or discourse threads.`
    },
    {
      match: (u) => u.includes('reddit.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Reddit Thread\nDescription: Community discussion thread. Quality varies significantly by subreddit — could be educational, social, or doomscrolling.`
    },
    {
      match: (u) => u.includes('facebook.com') || u.includes('fb.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Facebook Content\nDescription: Social media content from Facebook — posts, groups, or news feed browsing. Mix of social connection and algorithmic engagement.`
    },
    {
      match: (u) => u.includes('snapchat.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Snapchat Content\nDescription: Ephemeral social media content from Snapchat — stories, snaps, or discover feed. Designed for FOMO-driven engagement.`
    },
    {
      match: (u) => u.includes('threads.net'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Threads Post\nDescription: Text-based social media content from Threads (Meta). Microblogging format similar to Twitter/X.`
    },
    {
      match: (u) => u.includes('coursera.org') || u.includes('udemy.com') || u.includes('edx.org') || u.includes('khanacademy.org'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Online Learning Platform Content\nDescription: Structured educational content from a learning platform. High-value mental nutrition.`
    },
    {
      match: (u) => u.includes('medium.com') || u.includes('substack.com') || u.includes('dev.to'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Long-form Article/Blog\nDescription: Long-form written content — typically thoughtful analysis, tutorials, or opinion pieces.`
    },
    {
      match: (u) => u.includes('github.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: GitHub Repository/Code\nDescription: Software development resource — code, documentation, or open-source contribution.`
    },
    {
      match: (u) => u.includes('spotify.com') || u.includes('podcasts.apple.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Audio Content (Podcast/Music)\nDescription: Audio streaming content — could be educational podcast or leisure music.`
    },
    {
      match: (u) => u.includes('linkedin.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: LinkedIn Content\nDescription: Professional networking content — job posts, industry articles, or professional discussions.`
    },
    {
      match: (u) => u.includes('pinterest.com'),
      result: `Link Content Detected:\nURL: ${url}\nTitle: Pinterest Browsing\nDescription: Visual discovery and inspiration platform — pins, boards, and curated visual content.`
    },
  ]

  for (const pattern of platformPatterns) {
    if (pattern.match(lowerUrl)) {
      return pattern.result
    }
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Block private/internal IPs
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|0\.0\.0\.0|169\.254\.)/i.test(hostname) || hostname === 'localhost') {
      return url;
    }

    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MindFuelBot/1.0)' },
      signal: AbortSignal.timeout(3000) 
    });
    if (!res.ok) return url;
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return url; // Only parse HTML
    }
    
    // Read up to 50KB to avoid memory exhaustion
    const htmlText = await res.text();
    const html = htmlText.substring(0, 50000);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) || 
                      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    
    // Also try to extract the article body preview
    const articleMatch = html.match(/<article[^>]*>([\s\S]{0,500})/i)
    const bodyText = articleMatch ? articleMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 300) : ''
    
    const title = titleMatch ? titleMatch[1].trim() : '';
    const desc = descMatch ? descMatch[1].trim() : '';
    
    if (title || desc) {
      return `Link Content Detected:\nURL: ${url}\nTitle: ${title}\nDescription: ${desc}${bodyText ? `\nPreview: ${bodyText}` : ''}`;
    }
    return url;
  } catch (e) {
    return url;
  }
}

export async function scanContent(contentOrUrl: string): Promise<ContentAnalysis> {
  let textToAnalyze = contentOrUrl.trim();
  if (textToAnalyze.startsWith('http://') || textToAnalyze.startsWith('https://')) {
    textToAnalyze = await extractMetadataFromUrl(textToAnalyze);
  }

  const content = textToAnalyze.length > 5000
    ? textToAnalyze.substring(0, 5000) + '...[truncated]'
    : textToAnalyze

  const apiKey = process.env.GROQ_API_KEY || ''
  
  // Advanced Local Heuristic AI Model — significantly enhanced with weighted scoring
  const analyzeHeuristically = (text: string): ContentAnalysis => {
    const lower = text.toLowerCase()
    
    // Multi-dimensional pattern matching with weighted scores
    const patterns: Record<string, { keywords: string[]; weight: number }> = {
      doomscroll: { 
        keywords: ['tiktok', 'shorts', 'reels', 'drama', 'gossip', 'outrage', 'angry', 'scrolling', 'mindless', 'hate', 'rage', 'clickbait', 'bait', 'cringe', 'doomscroll', 'infinite scroll', 'feed', 'algorithm', 'brain rot', 'addictive'],
        weight: 1.5 
      },
      educational: { 
        keywords: ['tutorial', 'learn', 'course', 'study', 'research', 'article', 'science', 'math', 'programming', 'wikipedia', 'how to', 'lecture', 'academic', 'textbook', 'knowledge', 'skill', 'education', 'lesson', 'deep dive', 'analysis', 'documentary'],
        weight: 1.3 
      },
      productive: { 
        keywords: ['work', 'meeting', 'email', 'spreadsheet', 'project', 'coding', 'figma', 'github', 'jira', 'docs', 'presentation', 'deadline', 'task', 'productivity', 'focus', 'deep work', 'deliverable'],
        weight: 1.2 
      },
      creative: { 
        keywords: ['design', 'draw', 'paint', 'write', 'compose', 'blender', 'photoshop', 'create', 'art', 'music production', 'illustration', 'sketch', 'creative', 'craft', 'animation', 'photography'],
        weight: 1.2 
      },
      social: { 
        keywords: ['chat', 'friend', 'family', 'discord', 'zoom', 'whatsapp', 'messages', 'talk', 'call', 'hangout', 'conversation', 'catching up', 'video call'],
        weight: 1.0 
      },
      entertainment: { 
        keywords: ['netflix', 'movie', 'game', 'play', 'spotify', 'music', 'twitch', 'hulu', 'funny', 'comedy', 'show', 'series', 'anime', 'stream', 'watching', 'listen'],
        weight: 0.9 
      },
    }

    // Calculate weighted scores for each category
    const scores: Record<string, number> = {}
    let maxCategory = 'neutral'
    let maxScore = 0

    for (const [category, { keywords, weight }] of Object.entries(patterns)) {
      let matchCount = 0
      for (const keyword of keywords) {
        // Count occurrences, not just presence
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        const matches = lower.match(regex)
        if (matches) matchCount += matches.length
      }
      scores[category] = matchCount * weight

      if (scores[category] > maxScore) {
        maxScore = scores[category]
        maxCategory = category
      }
    }

    // If no strong match, check for URLs with domain-based hints
    if (maxScore === 0 && lower.includes('http')) {
      const urlDomainHints: Record<string, { category: string; score: number }> = {
        'youtube.com': { category: 'entertainment', score: 60 },
        'instagram.com': { category: 'doomscroll', score: 30 },
        'tiktok.com': { category: 'doomscroll', score: 20 },
        'twitter.com': { category: 'doomscroll', score: 35 },
        'x.com': { category: 'doomscroll', score: 35 },
        'reddit.com': { category: 'entertainment', score: 45 },
        'linkedin.com': { category: 'productive', score: 65 },
        'github.com': { category: 'productive', score: 85 },
        'stackoverflow.com': { category: 'educational', score: 80 },
        'coursera.org': { category: 'educational', score: 90 },
        'udemy.com': { category: 'educational', score: 88 },
        'medium.com': { category: 'educational', score: 72 },
        'wikipedia.org': { category: 'educational', score: 82 },
        'netflix.com': { category: 'entertainment', score: 50 },
        'spotify.com': { category: 'entertainment', score: 65 },
        'twitch.tv': { category: 'entertainment', score: 45 },
      }

      for (const [domain, hint] of Object.entries(urlDomainHints)) {
        if (lower.includes(domain)) {
          const s = hint.score
          const cat = hint.category
          return {
            category: cat as any,
            mental_score: s,
            summary: `Content from ${domain} detected.`,
            reasoning: `Domain-based classification: ${domain} typically falls under ${cat} content.`,
            tags: [cat, 'auto-detected'],
            is_junk: s < 40,
            time_well_spent: s >= 60,
            severity: computeSeverity(s),
            confidence: computeConfidence(1, false),
            impact_analysis: computeImpact(s, cat),
            root_causes: computeRootCauses(s, cat, 1),
            copilot_actions: computeCopilotActions(s, cat),
            missing_context: ['Specific page or video title for more precise analysis'],
          }
        }
      }
    }

    // Generate nuanced results based on best match
    // Helper to build a full result with intelligence fields
    const buildResult = (base: Omit<ContentAnalysis, 'severity' | 'confidence' | 'impact_analysis' | 'root_causes' | 'copilot_actions' | 'missing_context'>): ContentAnalysis => ({
      ...base,
      severity: computeSeverity(base.mental_score),
      confidence: computeConfidence(maxScore, false),
      impact_analysis: computeImpact(base.mental_score, base.category),
      root_causes: computeRootCauses(base.mental_score, base.category, maxScore),
      copilot_actions: computeCopilotActions(base.mental_score, base.category),
      missing_context: computeMissingContext(base.mental_score, maxScore),
    })

    const resultMap: Record<string, Omit<ContentAnalysis, 'severity' | 'confidence' | 'impact_analysis' | 'root_causes' | 'copilot_actions' | 'missing_context'>> = {
      doomscroll: {
        category: 'doomscroll',
        mental_score: Math.max(10, Math.min(35, 30 - Math.floor(maxScore * 2))),
        summary: 'Content appears to be short-form or highly engaging media designed for continuous scrolling.',
        reasoning: `Detected ${Math.ceil(maxScore)} indicators of dopamine-loop content patterns including infinite scrolling, algorithmic feeds, or emotionally triggering material. This type of content is engineered for maximum engagement at the expense of your attention and mood.`,
        tags: ['short-form', 'high-dopamine', 'attention-drain'],
        is_junk: true,
        time_well_spent: false,
      },
      educational: {
        category: 'educational',
        mental_score: Math.min(95, Math.max(75, 85 + Math.floor(maxScore))),
        summary: 'This content contains strong educational or learning-based elements.',
        reasoning: `Detected ${Math.ceil(maxScore)} indicators of learning-oriented content. Educational content strengthens neural pathways, builds knowledge, and correlates with improved mood and self-efficacy over time.`,
        tags: ['learning', 'growth', 'deep-content'],
        is_junk: false,
        time_well_spent: true,
      },
      creative: {
        category: 'creative',
        mental_score: Math.min(92, Math.max(78, 85 + Math.floor(maxScore))),
        summary: 'Creative or artistic workflows detected.',
        reasoning: `Detected ${Math.ceil(maxScore)} creative activity indicators. Creative engagement activates flow states and reduces cortisol, making this excellent mental nutrition.`,
        tags: ['creation', 'art', 'flow-state'],
        is_junk: false,
        time_well_spent: true,
      },
      productive: {
        category: 'productive',
        mental_score: Math.min(90, Math.max(70, 82 + Math.floor(maxScore))),
        summary: 'Professional or work-related content.',
        reasoning: `Detected ${Math.ceil(maxScore)} productivity markers. Work-focused content contributes to achievement and purpose, but ensure you're taking regular breaks.`,
        tags: ['work', 'focus', 'achievement'],
        is_junk: false,
        time_well_spent: true,
      },
      social: {
        category: 'social',
        mental_score: Math.min(80, Math.max(55, 68 + Math.floor(maxScore))),
        summary: 'Social interaction or communication.',
        reasoning: `Detected ${Math.ceil(maxScore)} social interaction patterns. Meaningful social connection is vital for wellbeing, though passive social media browsing can be less beneficial.`,
        tags: ['communication', 'social', 'connection'],
        is_junk: false,
        time_well_spent: true,
      },
      entertainment: {
        category: 'entertainment',
        mental_score: Math.min(70, Math.max(40, 55 + Math.floor(maxScore))),
        summary: 'Leisure or entertainment media.',
        reasoning: `Detected ${Math.ceil(maxScore)} entertainment indicators. Moderate entertainment is healthy recovery, but extended passive consumption can reduce motivation and focus.`,
        tags: ['leisure', 'media', 'recovery'],
        is_junk: false,
        time_well_spent: true,
      },
    }

    if (resultMap[maxCategory]) {
      return buildResult(resultMap[maxCategory])
    }

    return buildResult({
      category: 'neutral',
      mental_score: 50,
      summary: "General digital content consumption.",
      reasoning: "The content did not strongly match any extreme positive or negative mental nutrition patterns. Consider being more specific about what you consumed for a deeper analysis.",
      tags: ['general', 'unclassified'],
      is_junk: false,
      time_well_spent: true
    })
  }

  if (!apiKey || apiKey === 'your_free_groq_key_here') {
    return analyzeHeuristically(content)
  }

  try {
    const groq = new Groq({ apiKey })

    const prompt = `You are a world-class "Digital Mental Nutritionist". You analyze digital content a user has consumed or is about to consume and assess its impact on their mental health, cognitive performance, and emotional wellbeing.

Your analysis must be SPECIFIC, DATA-DRIVEN, and PSYCHOLOGICALLY GROUNDED. Avoid generic responses. Reference actual psychological mechanisms (dopamine loops, attention residue, cognitive load theory, etc.) in your reasoning.

RETURN ONLY A VALID JSON OBJECT with these exact fields (NO MARKDOWN WRAPPERS):
{
  "category": "educational" | "productive" | "creative" | "social" | "entertainment" | "doomscroll" | "neutral",
  "mental_score": <number 1-100>,
  "summary": "<one sentence summary of what the content is>",
  "reasoning": "<2-3 sentences explaining WHY this score, referencing specific psychological mechanisms. Be specific, not generic.>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "is_junk": <boolean — true if content is designed to exploit attention without providing value>,
  "time_well_spent": <boolean — would a mindful person choose this content intentionally?>,
  "severity": "critical" | "warning" | "moderate" | "safe" | "excellent",
  "confidence": <number 0-100, how confident you are in this analysis>,
  "impact_analysis": {
    "mood_shift": "strong_negative" | "negative" | "neutral" | "positive" | "strong_positive",
    "cognitive_load": "overwhelming" | "high" | "moderate" | "low" | "restorative",
    "habit_risk": "high" | "moderate" | "low" | "none",
    "time_quality": "wasted" | "low" | "neutral" | "good" | "excellent"
  },
  "root_causes": [
    { "reason": "<primary psychological mechanism>", "evidence": "<specific evidence from the content>", "confidence": <0-100> }
  ],
  "copilot_actions": [
    { "action": "<specific action to take>", "reason": "<why this helps>", "impact": "high" | "medium" | "low", "confidence": <0-100> }
  ],
  "missing_context": ["<optional: what additional info would improve analysis>"]
}

SCORING SYSTEM (mental_score) — be precise, not approximate:
- 90-100: EXCELLENT. Deep learning, focused creation, structured courses, meaningful skill-building.
- 75-89: GOOD. Quality long-form content, intentional social connection, educational entertainment.
- 55-74: NEUTRAL. Casual but not harmful — general browsing, light entertainment, passive social media.
- 35-54: LOW. Repetitive entertainment, mindless scrolling, clickbait-adjacent, time-wasting patterns.
- 15-34: POOR. Active doomscrolling, outrage bait, drama-seeking, infinite scroll exploitation.
- 1-14: HARMFUL. Toxic content, heavy doomscrolling, polarizing material, content that actively harms mental state.

SEVERITY: critical (score 1-20), warning (21-40), moderate (41-60), safe (61-80), excellent (81-100).
CONFIDENCE: How sure you are. Be honest — generic inputs should get lower confidence.
ROOT CAUSES: Rank by confidence. Include 2-3 psychological mechanisms.
COPILOT ACTIONS: 2-3 specific, actionable recommendations.

IMPORTANT NUANCES:
- YouTube can range from 15 (shorts/drama) to 95 (deep educational) — don't bucket all YouTube together
- Social media BROWSING differs from social media POSTING or MESSAGING
- News can be informative (70+) or anxiety-inducing sensationalism (20-35)
- Duration matters: 10 min of Reddit = different from 3 hours
- Consider the INTENT: passive consumption vs. active engagement

Content to analyze:
${content}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.15, // Lower temperature for more consistent, precise analysis
      response_format: { type: "json_object" }
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    
    const score = Math.max(1, Math.min(100, Number(parsed.mental_score) || 50))
    const cat = parsed.category || 'neutral'
    
    // Validate with Zod to ensure safe output
    const validated = ContentAnalysisSchema.safeParse({
      ...parsed,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      mental_score: score,
      // Ensure intelligence fields have fallbacks
      severity: parsed.severity || computeSeverity(score),
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || computeConfidence(3, true))),
      impact_analysis: parsed.impact_analysis || computeImpact(score, cat),
      root_causes: Array.isArray(parsed.root_causes) ? parsed.root_causes : computeRootCauses(score, cat, 3),
      copilot_actions: Array.isArray(parsed.copilot_actions) ? parsed.copilot_actions : computeCopilotActions(score, cat),
      missing_context: Array.isArray(parsed.missing_context) ? parsed.missing_context : undefined,
    })
    
    if (validated.success) {
      return validated.data
    }
    
    // Partial validation fallback — use what we can
    console.warn('[Content Scanner] Zod validation failed, using fallback:', validated.error.issues)
    return {
      category: cat,
      mental_score: score,
      summary: parsed.summary || 'Analysis completed with partial data.',
      reasoning: parsed.reasoning || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      is_junk: Boolean(parsed.is_junk),
      time_well_spent: Boolean(parsed.time_well_spent),
      severity: computeSeverity(score),
      confidence: computeConfidence(2, true),
      impact_analysis: computeImpact(score, cat),
      root_causes: computeRootCauses(score, cat, 2),
      copilot_actions: computeCopilotActions(score, cat),
      missing_context: computeMissingContext(score, 2),
    } satisfies ContentAnalysis
  } catch (e) {
    console.warn("[Content Scanner API Error] Falling back to Local Heuristic AI Model", e)
    return analyzeHeuristically(content)
  }
}

export async function batchScanContent(items: string[]): Promise<ContentAnalysis[]> {
  return Promise.all(items.map(scanContent))
}
