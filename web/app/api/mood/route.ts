// app/api/mood/route.ts — Mood logging with full validation, rate limiting, sanitization
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkMoodRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeText, validateNumber } from '@/lib/security'

export const runtime = 'nodejs'

const MOOD_LIMIT = 30

export async function POST(req: NextRequest) {
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

    const rateCheck = await checkMoodRateLimit(user.id)
    const rlHeaders = buildRateLimitHeaders(rateCheck, MOOD_LIMIT)

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many mood entries. Please wait before logging again.' },
        { status: 429, headers: rlHeaders }
      )
    }

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { mood, energy, anxiety, notes, context } = body

    // Validate numeric fields
    const moodValidation = validateNumber(mood, 1, 10, 'Mood')
    if (!moodValidation.valid) {
      return NextResponse.json({ error: moodValidation.error }, { status: 400 })
    }

    if (energy !== undefined && energy !== null) {
      const v = validateNumber(energy, 1, 10, 'Energy')
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 })
    }

    if (anxiety !== undefined && anxiety !== null) {
      const v = validateNumber(anxiety, 1, 10, 'Anxiety')
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 })
    }

    // Sanitize text fields
    const sanitizedNotes = notes ? sanitizeText(notes, 2000).value : null
    const sanitizedContext = context ? sanitizeText(context, 200).value : null

    const { data, error } = await supabase
      .from('mood_logs')
      .insert({
        user_id: user.id,
        mood: Math.round(mood),
        energy: energy ? Math.round(energy) : null,
        anxiety: anxiety ? Math.round(anxiety) : null,
        notes: sanitizedNotes || null,
        context: sanitizedContext || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ moodLog: data, remaining: rateCheck.remaining }, { headers: rlHeaders })
  } catch (error) {
    console.error('[API /mood]', error)
    return NextResponse.json({ error: 'Failed to log mood' }, { status: 500 })
  }
}
