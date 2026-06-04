// app/api/nutrition/route.ts
// POST: Standalone Mental Nutrition neurochemical analysis
// Returns a focused neuropsychological evaluation of content

import { NextRequest, NextResponse } from 'next/server'
import { analyzeMentalNutrition } from '@/lib/agents/tools/mentalNutrition'
import { createClient } from '@/lib/supabase/server'
import { checkAnalyzeRateLimit } from '@/lib/rate-limit'
import { inspectPayload } from '@/lib/security'

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

    // ── Auth ──
    const supabase = await createClient()
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Rate limit ──
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.subscription_tier || 'free') as 'free' | 'premium'
    const rateCheck = await checkAnalyzeRateLimit(user.id, tier)

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before analyzing more content.' },
        { status: 429 }
      )
    }

    // ── Sanitize ──
    const sanitized = content
      .replace(/```/g, '')
      .replace(/\[INST\]/gi, '')
      .replace(/<<SYS>>/gi, '')
      .trim()

    // ── Analyze ──
    const nutrition = await analyzeMentalNutrition(sanitized)

    return NextResponse.json({ nutrition })
  } catch (error) {
    console.error('[API /nutrition]', error)
    return NextResponse.json(
      { error: 'Mental nutrition analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}
