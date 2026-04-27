// app/api/coach/mobile/route.ts — Mobile coach endpoint with auth + rate limiting
// Previously fully open — now secured with Supabase JWT verification

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkMobileCoachRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeText, sanitizeForAI } from '@/lib/security'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are MindFuel's AI Mental Wellness Coach. Help users understand their digital content consumption patterns and improve mental health through better "mental nutrition."

Your personality:
- Warm, encouraging, but honest
- Use food/nutrition metaphors
- Give specific, actionable advice
- Keep responses under 150 words
- Use markdown formatting sparingly`

const MOBILE_LIMITS = { free: 100, premium: 1000 }

export async function POST(req: NextRequest) {
  try {
    // ── Auth — supports both cookie (web) and Bearer token (mobile) ──
    const supabase = await createClient()

    // Mobile sends Bearer token in Authorization header
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ── Tier + Rate Limit ──
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.subscription_tier || 'free') as 'free' | 'premium'
    const rateCheck = await checkMobileCoachRateLimit(user.id, tier)
    const rlHeaders = buildRateLimitHeaders(rateCheck, MOBILE_LIMITS[tier])

    if (!rateCheck.success) {
      const secs = Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Rate limit reached. Retry in ${Math.ceil(secs / 60)} min.`, resetAt: rateCheck.resetAt },
        { status: 429, headers: rlHeaders }
      )
    }

    const { message } = await req.json()
    const sanitized = sanitizeText(message, 2000)
    const safeMessage = sanitizeForAI(sanitized.value || 'Hello')

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey || apiKey.startsWith('your_')) {
      return NextResponse.json(
        { response: "Hi! I'm in demo mode. Add a Groq API key to enable full AI coaching! 🌿" },
        { headers: rlHeaders }
      )
    }

    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: safeMessage }
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    return NextResponse.json(
      { response: completion.choices[0]?.message?.content || '', remaining: rateCheck.remaining },
      { headers: rlHeaders }
    )
  } catch (error: any) {
    console.error('[API /coach/mobile]', error.message)
    return NextResponse.json({
      response: "Brief issue connecting — try again in a moment! 🌿"
    })
  }
}
