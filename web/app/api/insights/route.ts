// app/api/insights/route.ts
// GET: Fetch weekly insights with mood correlations, rate limiting, caching

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { analyzeMoodPatterns } from '@/lib/agents/tools/moodAnalyzer'
import { generateBehavioralInsight } from '@/lib/agents/tools/insightEngine'
import { checkInsightsRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { subDays, format } from 'date-fns'

export const runtime = 'nodejs'

const INSIGHTS_LIMIT = 60

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Support both cookie (web) and Bearer token (mobile)
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateCheck = await checkInsightsRateLimit(user.id)
    const rlHeaders = buildRateLimitHeaders(rateCheck, INSIGHTS_LIMIT)

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before refreshing insights.' },
        { status: 429, headers: rlHeaders }
      )
    }

    const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

    // Fetch mood logs
    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true })

    // Fetch content logs
    const { data: contentLogs } = await supabase
      .from('mental_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true })

    // Fetch daily summaries for trend
    const { data: dailySummaries } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true })

    // Fetch focus sessions
    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo)

    // Fetch daily pulses
    const { data: dailyPulses } = await supabase
      .from('daily_pulses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo)

    // Fetch user profile for subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    // Generate AI mood analysis if we have enough data
    let moodAnalysis = null
    let behavioralInsight = null
    const hasEnoughData = (moodLogs && moodLogs.length >= 2) || (contentLogs && contentLogs.length >= 3)
    
    if (hasEnoughData) {
      const adminClient = createAdminClient()
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      
      const { data: cachedInsight } = await adminClient
        .from('ai_insights')
        .select('body, action_items')
        .eq('user_id', user.id)
        .eq('type', 'mood_correlation')
        .gte('created_at', sixHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cachedInsight && cachedInsight.body) {
        try {
          moodAnalysis = JSON.parse(cachedInsight.body)
        } catch {
          // ignore parse error
        }
      }

      if (!moodAnalysis) {
        moodAnalysis = await analyzeMoodPatterns(
          moodLogs || [],
          contentLogs || [],
          7
        )
        
        // Save to cache
        await adminClient.from('ai_insights').insert({
          user_id: user.id,
          type: 'mood_correlation',
          title: 'Mood Correlation Cache',
          body: JSON.stringify(moodAnalysis),
          action_items: moodAnalysis.action_items || [],
          metadata: {},
          is_read: true
        })
      }

      // Generate Behavioral Insight
      const { data: cachedBehavioral } = await adminClient
        .from('ai_insights')
        .select('body, action_items, metadata')
        .eq('user_id', user.id)
        .eq('type', 'behavioral_insight')
        .gte('created_at', sixHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cachedBehavioral && cachedBehavioral.body) {
        try {
          behavioralInsight = JSON.parse(cachedBehavioral.body)
        } catch {
          // ignore parse error
        }
      }

      if (!behavioralInsight) {
        behavioralInsight = await generateBehavioralInsight(
          contentLogs || [],
          moodLogs || [],
          focusSessions || [],
          dailyPulses || [],
          7
        )

        if (behavioralInsight) {
          await adminClient.from('ai_insights').insert({
            user_id: user.id,
            type: 'behavioral_insight',
            title: 'Behavioral Insight',
            body: JSON.stringify(behavioralInsight),
            action_items: [behavioralInsight.recommendation],
            metadata: {},
            is_read: true
          })
        }
      }
    } else {
      // Return a "Cold Start" analysis
      moodAnalysis = {
        overall_trend: 'stable',
        avg_mood: 5,
        anxiety_triggers: [],
        optimal_windows: [],
        correlations: [],
        summary: "MindFuel is currently collecting your neural patterns. Log at least 3 content entries and 2 mood checks to unlock deep AI correlations.",
        action_items: ["Complete your first 3 content scans", "Perform a mood check-in", "Explore the AI Coach"]
      }
    }

    // Build trend data for chart
    const trendData = (dailySummaries || [])
      .filter(s => s && s.date)
      .map((s) => {
        try {
          return {
            date: format(new Date(s.date), 'MMM d'),
            score: s.average_score || 0,
            logs: s.total_logs || 0,
          }
        } catch (e) {
          return null
        }
      })
      .filter(item => item !== null)
    
    // If no trend data, provide a mock point so the chart isn't empty
    if (trendData.length === 0) {
      trendData.push({ date: format(new Date(), 'MMM d'), score: 0, logs: 0 })
    }

    return NextResponse.json(
      {
        trendData,
        moodAnalysis,
        stats: {
          totalLogs: contentLogs?.length || 0,
          avgScore: contentLogs?.length
            ? Math.round(contentLogs.reduce((sum, l) => sum + l.mental_score, 0) / contentLogs.length)
            : 0,
          moodEntries: moodLogs?.length || 0,
        },
        behavioralInsight,
        subscriptionTier: profile?.subscription_tier || 'free',
        remaining: rateCheck.remaining,
      },
      { headers: rlHeaders }
    )
  } catch (error: any) {
    console.error('[API /insights Critical Error]', error.message || error)
    return NextResponse.json({ 
      error: 'Cognitive analysis failed. Verify your data and API credentials.',
      // Obscure internal error details in production to prevent DB schema leaks
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
