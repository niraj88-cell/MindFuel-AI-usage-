// app/api/quick-log/route.ts
// POST: Quick-log endpoint — one-tap logging with preset categories + instant AI insight
// Designed for minimal friction: just category + optional mood = full log with AI enrichment

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanContent } from '@/lib/agents/tools/contentScanner'
import { checkAnalyzeRateLimit } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/security'
import { format, subDays } from 'date-fns'

export const runtime = 'nodejs'

// Preset quick-log sources with sensible defaults
const QUICK_PRESETS: Record<string, {
  content: string
  category: string
  defaultScore: number
  defaultDuration: number
  tags: string[]
}> = {
  instagram_scroll: {
    content: 'Scrolling Instagram feed/reels',
    category: 'doomscroll',
    defaultScore: 25,
    defaultDuration: 20,
    tags: ['short-form', 'social-media', 'high-dopamine'],
  },
  tiktok_scroll: {
    content: 'Watching TikTok videos',
    category: 'doomscroll',
    defaultScore: 20,
    defaultDuration: 25,
    tags: ['short-form', 'infinite-scroll', 'high-dopamine'],
  },
  youtube_video: {
    content: 'Watching YouTube video',
    category: 'entertainment',
    defaultScore: 60,
    defaultDuration: 20,
    tags: ['video', 'mixed-content'],
  },
  youtube_shorts: {
    content: 'Watching YouTube Shorts',
    category: 'doomscroll',
    defaultScore: 22,
    defaultDuration: 15,
    tags: ['short-form', 'infinite-scroll'],
  },
  news_article: {
    content: 'Reading news articles',
    category: 'neutral',
    defaultScore: 55,
    defaultDuration: 15,
    tags: ['news', 'information'],
  },
  twitter_scroll: {
    content: 'Scrolling Twitter/X feed',
    category: 'doomscroll',
    defaultScore: 28,
    defaultDuration: 20,
    tags: ['social-media', 'outrage-bait'],
  },
  reddit_browse: {
    content: 'Browsing Reddit threads',
    category: 'entertainment',
    defaultScore: 45,
    defaultDuration: 25,
    tags: ['forum', 'mixed-content'],
  },
  podcast_listen: {
    content: 'Listening to podcast',
    category: 'educational',
    defaultScore: 85,
    defaultDuration: 30,
    tags: ['audio', 'deep-content', 'learning'],
  },
  reading_book: {
    content: 'Reading a book',
    category: 'educational',
    defaultScore: 92,
    defaultDuration: 30,
    tags: ['reading', 'deep-focus', 'growth'],
  },
  online_course: {
    content: 'Taking an online course/tutorial',
    category: 'educational',
    defaultScore: 90,
    defaultDuration: 45,
    tags: ['learning', 'skill-building'],
  },
  gaming: {
    content: 'Playing video games',
    category: 'entertainment',
    defaultScore: 50,
    defaultDuration: 45,
    tags: ['gaming', 'leisure'],
  },
  work_focus: {
    content: 'Focused work session',
    category: 'productive',
    defaultScore: 88,
    defaultDuration: 60,
    tags: ['deep-work', 'focus', 'productivity'],
  },
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth: Support both cookie (web) and Bearer token (mobile)
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { preset, mood, duration, notes, voiceText } = body

    // Validate preset
    if (!preset || !QUICK_PRESETS[preset]) {
      // If no preset, allow freeform voice/text quick log
      if (!voiceText && !notes) {
        return NextResponse.json({ 
          error: 'Either a preset or voiceText/notes is required',
          availablePresets: Object.keys(QUICK_PRESETS),
        }, { status: 400 })
      }
    }

    // Rate check
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.subscription_tier || 'free') as 'free' | 'premium'
    const rateCheck = await checkAnalyzeRateLimit(user.id, tier)
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Free tier daily limit
    if (tier === 'free') {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: summary } = await supabase
        .from('daily_summaries')
        .select('total_logs')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()
      
      const dailyLimit = 5 // Slightly higher for quick logs
      if ((summary?.total_logs || 0) >= dailyLimit) {
        return NextResponse.json({
          error: 'Daily log limit reached',
          limitReached: true,
          message: `Free accounts can log ${dailyLimit} quick entries per day. Upgrade for unlimited.`,
        }, { status: 403 })
      }
    }

    let logData: {
      content: string
      category: string
      mental_score: number
      duration_minutes: number
      tags: string[]
      summary: string
    }

    if (preset && QUICK_PRESETS[preset]) {
      const p = QUICK_PRESETS[preset]
      logData = {
        content: notes ? `${p.content} — ${sanitizeText(notes, 500).value}` : p.content,
        category: p.category,
        mental_score: p.defaultScore,
        duration_minutes: duration || p.defaultDuration,
        tags: p.tags,
        summary: p.content,
      }
    } else {
      // Voice/freeform input — run through AI analyzer for categorization
      const textToAnalyze = voiceText || notes || ''
      const sanitized = sanitizeText(textToAnalyze, 2000).value

      try {
        const analysis = await scanContent(sanitized)
        logData = {
          content: sanitized,
          category: analysis.category,
          mental_score: analysis.mental_score,
          duration_minutes: duration || 15,
          tags: analysis.tags,
          summary: analysis.summary,
        }
      } catch {
        logData = {
          content: sanitized,
          category: 'neutral',
          mental_score: 50,
          duration_minutes: duration || 15,
          tags: ['quick-log'],
          summary: 'Quick logged content',
        }
      }
    }

    // Insert the mental log
    const { data: insertedLog, error: insertError } = await supabase
      .from('mental_logs')
      .insert({
        user_id: user.id,
        content: logData.content,
        category: logData.category as any,
        mental_score: logData.mental_score,
        duration_minutes: logData.duration_minutes,
        mood_before: mood || null,
        mood_after: null,
        source: 'manual' as any,
        metadata: { 
          summary: logData.summary, 
          tags: logData.tags,
          preset: preset || 'freeform',
        },
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Update daily summary
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: existing } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (existing) {
      const newTotal = existing.total_logs + 1
      const newTotalScore = existing.total_score + logData.mental_score
      const breakdown = existing.category_breakdown as Record<string, number>
      breakdown[logData.category] = (breakdown[logData.category] || 0) + 1

      await supabase.from('daily_summaries').update({
        total_logs: newTotal,
        total_score: newTotalScore,
        average_score: Math.round(newTotalScore / newTotal),
        category_breakdown: breakdown,
      }).eq('id', existing.id)
    } else {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const { data: yesterdaySummary } = await supabase
        .from('daily_summaries')
        .select('streak_days')
        .eq('user_id', user.id)
        .eq('date', yesterday)
        .single()

      const newStreak = yesterdaySummary ? (yesterdaySummary.streak_days || 0) + 1 : 1

      await supabase.from('daily_summaries').insert({
        user_id: user.id,
        date: today,
        total_score: logData.mental_score,
        average_score: logData.mental_score,
        total_logs: 1,
        category_breakdown: { [logData.category]: 1 },
        streak_days: newStreak,
      })
    }

    // Generate instant insight based on the log
    const instantInsight = generateInstantInsight(logData.category, logData.mental_score, logData.tags)

    return NextResponse.json({
      success: true,
      log: insertedLog,
      analysis: {
        category: logData.category,
        mental_score: logData.mental_score,
        summary: logData.summary,
        tags: logData.tags,
      },
      instantInsight,
    })

  } catch (error) {
    console.error('[API /quick-log]', error)
    return NextResponse.json({ error: 'Quick log failed' }, { status: 500 })
  }
}

// Generate an instant, rewarding micro-insight after logging
function generateInstantInsight(category: string, score: number, tags: string[]): {
  message: string
  emoji: string
  suggestion: string
  scoreLabel: string
} {
  const insights: Record<string, { message: string; emoji: string; suggestion: string }[]> = {
    doomscroll: [
      { message: "Infinite scroll detected — your brain deserves better fuel.", emoji: "🌀", suggestion: "Try swapping 10 minutes for a quick podcast episode" },
      { message: "Short-form content spikes dopamine but crashes focus.", emoji: "⚡", suggestion: "Step away and take 3 deep breaths before continuing" },
      { message: "Your brain just ran a dopamine marathon — time to cool down.", emoji: "🧊", suggestion: "A 5-minute walk can reset your attention span" },
    ],
    educational: [
      { message: "Brain-fuel mode activated! Quality content absorbed.", emoji: "🧠", suggestion: "Journal one key takeaway to solidify memory" },
      { message: "Your mental nutrition score is thriving with this choice!", emoji: "🌿", suggestion: "Keep building on this momentum" },
    ],
    productive: [
      { message: "Productive streak! You're in the zone.", emoji: "⚡", suggestion: "Take a 5-min break after 90 mins to sustain flow" },
      { message: "High-value activity logged. Your future self thanks you.", emoji: "🎯", suggestion: "Batch similar tasks to maximize deep work" },
    ],
    creative: [
      { message: "Creative energy flowing — this fuels your best self.", emoji: "🎨", suggestion: "Schedule regular creative blocks to maintain this state" },
    ],
    social: [
      { message: "Meaningful connection logged.", emoji: "💬", suggestion: "Quality social time beats passive scrolling every time" },
    ],
    entertainment: [
      { message: "Leisure time logged — moderation is key.", emoji: "🎬", suggestion: "Set a timer to keep entertainment intentional" },
    ],
    neutral: [
      { message: "Activity logged. Consider whether this moved the needle.", emoji: "➖", suggestion: "Ask yourself: 'Was this fueling or draining me?'" },
    ],
  }

  const pool = insights[category] || insights.neutral
  const picked = pool[Math.floor(Math.random() * pool.length)]
  
  const scoreLabel = score >= 85 ? 'Excellent' 
    : score >= 65 ? 'Good' 
    : score >= 45 ? 'Neutral' 
    : score >= 25 ? 'Low' 
    : 'Harmful'

  return { ...picked, scoreLabel }
}

// GET: Return available quick-log presets
export async function GET() {
  return NextResponse.json({
    presets: Object.entries(QUICK_PRESETS).map(([key, val]) => ({
      id: key,
      label: val.content,
      category: val.category,
      defaultDuration: val.defaultDuration,
      estimatedScore: val.defaultScore,
    }))
  })
}
