// lib/services/aiAnalyzer.ts
// Enhanced AI content analyzer — uses secure centralized API client
// Falls back to improved local heuristic when offline
import { apiPost } from '../api/client';

export type AIAnalysisResult = {
  category: 'educational' | 'productive' | 'creative' | 'social' | 'entertainment' | 'doomscroll' | 'neutral';
  mental_score: number; // 1-100
  summary: string;
  reasoning?: string;
  tags?: string[];
  is_junk?: boolean;
  time_well_spent?: boolean;
};

export async function analyzeContent(contentOrUrl: string): Promise<AIAnalysisResult> {
  const content = contentOrUrl.length > 4000 ? contentOrUrl.substring(0, 4000) + '...' : contentOrUrl;

  try {
    const data = await apiPost('/api/analyze', { content });

    if (data.analysis) {
      return data.analysis as AIAnalysisResult;
    }

    return fallbackAnalysis(content);
  } catch (err) {
    console.error('[Mobile AI Analyzer] API call failed, using local heuristic:', err);
    return fallbackAnalysis(content);
  }
}

// ── Enhanced Local Heuristic with weighted scoring ──────────────────────
function fallbackAnalysis(content: string): AIAnalysisResult {
  const lower = content.toLowerCase();

  // Multi-dimensional weighted pattern matching (matches web contentScanner logic)
  const patterns: Record<string, { keywords: string[]; weight: number }> = {
    doomscroll: {
      keywords: ['tiktok', 'shorts', 'reels', 'drama', 'gossip', 'outrage', 'angry', 'scrolling',
        'mindless', 'hate', 'rage', 'clickbait', 'cringe', 'doomscroll', 'infinite scroll',
        'feed', 'algorithm', 'brain rot', 'addictive', 'doom', 'anxiety', 'negative'],
      weight: 1.5,
    },
    educational: {
      keywords: ['tutorial', 'learn', 'course', 'study', 'research', 'article', 'science',
        'programming', 'wikipedia', 'how to', 'lecture', 'academic', 'textbook', 'knowledge',
        'skill', 'education', 'lesson', 'deep dive', 'analysis', 'documentary'],
      weight: 1.3,
    },
    productive: {
      keywords: ['work', 'meeting', 'email', 'spreadsheet', 'project', 'coding', 'figma',
        'github', 'jira', 'docs', 'presentation', 'deadline', 'task', 'productivity',
        'focus', 'deep work', 'deliverable'],
      weight: 1.2,
    },
    creative: {
      keywords: ['design', 'draw', 'paint', 'write', 'compose', 'blender', 'photoshop',
        'create', 'art', 'music production', 'illustration', 'sketch', 'creative',
        'craft', 'animation', 'photography'],
      weight: 1.2,
    },
    social: {
      keywords: ['chat', 'friend', 'family', 'discord', 'zoom', 'whatsapp', 'messages',
        'talk', 'call', 'hangout', 'conversation', 'catching up', 'video call'],
      weight: 1.0,
    },
    entertainment: {
      keywords: ['netflix', 'movie', 'game', 'play', 'spotify', 'music', 'twitch', 'hulu',
        'funny', 'comedy', 'show', 'series', 'anime', 'stream', 'watching', 'listen'],
      weight: 0.9,
    },
  };

  // Calculate weighted scores
  const scores: Record<string, number> = {};
  let maxCategory = 'neutral';
  let maxScore = 0;

  for (const [category, { keywords, weight }] of Object.entries(patterns)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = lower.match(regex);
      if (matches) matchCount += matches.length;
    }
    scores[category] = matchCount * weight;

    if (scores[category] > maxScore) {
      maxScore = scores[category];
      maxCategory = category;
    }
  }

  // Domain-based URL hints (fast path)
  if (maxScore === 0 && lower.includes('http')) {
    const domainHints: Record<string, { category: string; score: number }> = {
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
    };

    for (const [domain, hint] of Object.entries(domainHints)) {
      if (lower.includes(domain)) {
        return {
          category: hint.category as AIAnalysisResult['category'],
          mental_score: hint.score,
          summary: `Content from ${domain} detected.`,
          reasoning: `Domain-based classification: ${domain} typically falls under ${hint.category} content.`,
          tags: [hint.category, 'auto-detected'],
          is_junk: hint.score < 40,
          time_well_spent: hint.score >= 60,
        };
      }
    }
  }

  // Category-specific result generation with nuanced scores
  const resultMap: Record<string, AIAnalysisResult> = {
    doomscroll: {
      category: 'doomscroll',
      mental_score: Math.max(10, Math.min(35, 30 - Math.floor(maxScore * 2))),
      summary: 'Short-form or engagement-bait content designed for continuous scrolling.',
      reasoning: `Detected ${Math.ceil(maxScore)} indicators of dopamine-loop content patterns. This type of content is engineered for maximum engagement at the expense of your attention and mood.`,
      tags: ['short-form', 'high-dopamine', 'attention-drain'],
      is_junk: true,
      time_well_spent: false,
    },
    educational: {
      category: 'educational',
      mental_score: Math.min(95, Math.max(75, 85 + Math.floor(maxScore))),
      summary: 'Educational or learning-based content with high mental nutrition value.',
      reasoning: `Detected ${Math.ceil(maxScore)} learning-oriented patterns. Educational content strengthens neural pathways and correlates with improved mood and self-efficacy.`,
      tags: ['learning', 'growth', 'deep-content'],
      is_junk: false,
      time_well_spent: true,
    },
    creative: {
      category: 'creative',
      mental_score: Math.min(92, Math.max(78, 85 + Math.floor(maxScore))),
      summary: 'Creative or artistic engagement detected.',
      reasoning: `Detected ${Math.ceil(maxScore)} creative activity indicators. Creative engagement activates flow states and reduces cortisol.`,
      tags: ['creation', 'art', 'flow-state'],
      is_junk: false,
      time_well_spent: true,
    },
    productive: {
      category: 'productive',
      mental_score: Math.min(90, Math.max(70, 82 + Math.floor(maxScore))),
      summary: 'Professional or work-related content.',
      reasoning: `Detected ${Math.ceil(maxScore)} productivity markers. Work-focused content contributes to achievement and purpose.`,
      tags: ['work', 'focus', 'achievement'],
      is_junk: false,
      time_well_spent: true,
    },
    social: {
      category: 'social',
      mental_score: Math.min(80, Math.max(55, 68 + Math.floor(maxScore))),
      summary: 'Social interaction or communication.',
      reasoning: `Detected ${Math.ceil(maxScore)} social interaction patterns. Meaningful social connection is vital for wellbeing.`,
      tags: ['communication', 'social', 'connection'],
      is_junk: false,
      time_well_spent: true,
    },
    entertainment: {
      category: 'entertainment',
      mental_score: Math.min(70, Math.max(40, 55 + Math.floor(maxScore))),
      summary: 'Leisure or entertainment media.',
      reasoning: `Detected ${Math.ceil(maxScore)} entertainment indicators. Moderate entertainment is healthy recovery, but extended passive consumption can reduce motivation.`,
      tags: ['leisure', 'media', 'recovery'],
      is_junk: false,
      time_well_spent: true,
    },
  };

  if (resultMap[maxCategory]) {
    return resultMap[maxCategory];
  }

  return {
    category: 'neutral',
    mental_score: 50,
    summary: 'General digital content consumption.',
    reasoning: 'The content did not match any clear positive or negative mental nutrition patterns. Be more specific about what you consumed for a deeper analysis.',
    tags: ['general', 'unclassified'],
    is_junk: false,
    time_well_spent: true,
  };
}
