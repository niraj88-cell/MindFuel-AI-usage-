// app/api/analyze/route.ts
// POST: Analyze content → mental nutrition score + alternatives
// Includes input validation, rate limiting, and free tier log enforcement

import { NextRequest, NextResponse } from 'next/server'
import { scanContent } from '@/lib/agents/tools/contentScanner'
import { findAlternatives } from '@/lib/agents/tools/alternativeFinder'
import { analyzeMentalNutrition } from '@/lib/agents/tools/mentalNutrition'
import { createClient } from '@/lib/supabase/server'
import { checkAnalyzeRateLimit } from '@/lib/rate-limit'
import { sanitizeText, inspectPayload } from '@/lib/security'
import { format } from 'date-fns'

export const runtime = 'nodejs'

const MAX_CONTENT_LENGTH = 5000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // ── WAF Payload Inspection ──
    const inspection = inspectPayload(body)
    if (!inspection.safe) {
      console.warn(`[WAF] Blocked malicious payload: ${inspection.threats.join(', ')}`)
      return NextResponse.json({ error: 'Forbidden: Malicious payload detected' }, { status: 403 })
    }

    const { content } = body

    // ── Input validation ──
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters allowed.` },
        { status: 400 }
      )
    }

    if (content.trim().length < 3) {
      return NextResponse.json(
        { error: 'Content too short. Please enter a meaningful description.' },
        { status: 400 }
      )
    }

    // ── Auth + tier check (optional — analyze can work for anonymous demo) ──
    const supabase = await createClient()

    // Support both cookie (web) and Bearer token (mobile)
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    // Allow unauthenticated for demo, but we will rely on strict IP rate limiting if implemented.
    // For now, we'll just allow it without user to support the landing page demo.
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    let tier: 'free' | 'premium' = 'free'
    let dailyLogsRemaining: number | null = null

    if (user) {
      // Rate limiting
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, daily_log_limit')
        .eq('id', user.id)
        .maybeSingle()

      tier = (profile?.subscription_tier || 'free') as 'free' | 'premium'
      const rateCheck = await checkAnalyzeRateLimit(user.id, tier)

      if (!rateCheck.success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait before analyzing more content.' },
          { status: 429 }
        )
      }

      // ── Free tier daily log limit enforcement ──
      if (tier === 'free') {
        const dailyLimit = profile?.daily_log_limit || 3
        const today = format(new Date(), 'yyyy-MM-dd')

        const { data: summary } = await supabase
          .from('daily_summaries')
          .select('total_logs')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()

        const todayLogs = summary?.total_logs || 0

        if (todayLogs >= dailyLimit) {
          return NextResponse.json(
            {
              error: 'Daily log limit reached',
              limitReached: true,
              logsToday: todayLogs,
              dailyLimit,
              message: `Free accounts can log ${dailyLimit} entries per day. Upgrade to Platinum for unlimited logging.`,
            },
            { status: 403 }
          )
        }

      dailyLogsRemaining = dailyLimit - todayLogs - 1 // -1 because this analysis will consume one
    }
  } // <-- MISSING BRACE for if (user) { ... }

  // ── Sanitize content — strip potential prompt injection markers ──
    const sanitized = content
      .replace(/```/g, '')           // Remove code fences that could confuse the model
      .replace(/\[INST\]/gi, '')     // Common prompt injection pattern
      .replace(/<<SYS>>/gi, '')     // Llama-style system prompt injection
      .trim()

    // ── Analyze content ──
    const [analysis, nutrition] = await Promise.all([
      scanContent(sanitized),
      analyzeMentalNutrition(sanitized)
    ])

    // If junk content, find alternatives
    let alternatives = null
    if (analysis.is_junk) {
      let userContext: { avg_score?: number; recent_categories?: string[] } | undefined = undefined
      if (user) {
        const { data: logs } = await supabase
          .from('mental_logs')
          .select('mental_score, category')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (logs && logs.length > 0) {
          const avgScore = Math.round(logs.reduce((sum, l) => sum + l.mental_score, 0) / logs.length)
          const recentCategories = logs.map(l => l.category)
          userContext = { avg_score: avgScore, recent_categories: recentCategories }
        }
      }

      const result = await findAlternatives(sanitized, analysis.category, userContext)
      alternatives = result.alternatives
    }

    return NextResponse.json({
      analysis,
      nutrition,
      alternatives,
      dailyLogsRemaining: dailyLogsRemaining !== null ? Math.max(0, dailyLogsRemaining) : undefined,
    })
  } catch (error) {
    console.error('[API /analyze]', error)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}
