// app/api/mood-scan/route.ts
// POST: Deep 5-dimension mood intelligence analysis for content URLs
import { NextRequest, NextResponse } from 'next/server'
import { analyzeMoodIntelligence } from '@/lib/agents/tools/moodIntelligenceAnalyzer'
import { createClient } from '@/lib/supabase/server'
import { checkAnalyzeRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_CONTENT_LENGTH = 5000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const content = (body.url || body.content || '').trim()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'A URL or content description is required.' }, { status: 400 })
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters.` }, { status: 400 })
    }
    if (content.length < 3) {
      return NextResponse.json({ error: 'Please enter a meaningful URL or description.' }, { status: 400 })
    }

    // Auth
    const supabase = await createClient()
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    // Rate limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.subscription_tier || 'free') as 'free' | 'premium'
    const rateCheck = await checkAnalyzeRateLimit(user.id, tier)

    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait before scanning more content.' }, { status: 429 })
    }

    // Sanitize
    const sanitized = content
      .replace(/```/g, '')
      .replace(/\[INST\]/gi, '')
      .replace(/<<SYS>>/gi, '')
      .trim()

    // Analyze
    const analysis = await analyzeMoodIntelligence(sanitized)

    // Persist to mood_scans table (best effort — don't fail if table doesn't exist yet)
    try {
      await supabase.from('mood_scans').insert({
        user_id: user.id,
        url: /^https?:\/\//i.test(sanitized) ? sanitized : null,
        content: sanitized,
        platform: analysis.platform || null,
        emotional_valence: analysis.emotional_valence,
        energy_signature: analysis.energy_signature,
        psychological_themes: analysis.psychological_themes,
        mood_trajectory: analysis.mood_trajectory,
        consumption_risk: analysis.consumption_risk,
        mood_verdict: analysis.mood_verdict,
        recommended_action: analysis.recommended_action,
      })
    } catch (dbErr) {
      console.warn('[mood-scan] Failed to persist scan (table may not exist yet):', dbErr)
    }

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('[API /mood-scan]', error.message || error)
    return NextResponse.json({ error: 'Mood scan failed. Please try again.' }, { status: 500 })
  }
}

// GET: Fetch scan history
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: scans } = await supabase
      .from('mood_scans')
      .select('id, url, content, platform, mood_verdict, mood_trajectory, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ scans: scans || [] })
  } catch (error: any) {
    console.error('[API /mood-scan GET]', error.message || error)
    return NextResponse.json({ scans: [] })
  }
}
