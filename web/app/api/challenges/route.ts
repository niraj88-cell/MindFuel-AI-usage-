// app/api/challenges/route.ts — Challenges API with full validation, rate limiting, per-user limits
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkChallengesRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/security'

export const runtime = 'nodejs'

const CHALLENGES_LIMIT = 60
const MAX_ACTIVE_CHALLENGES = 10
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const VALID_CATEGORIES = ['educational', 'productive', 'creative', 'social', 'entertainment', 'doomscroll', 'neutral', 'general'] as const

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rateCheck = await checkChallengesRateLimit(user.id)
    const rlHeaders = buildRateLimitHeaders(rateCheck, CHALLENGES_LIMIT)
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: rlHeaders })
    }

    const { data: challenges, error } = await supabase
      .from('habit_challenges')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ challenges: challenges || [] }, { headers: rlHeaders })
  } catch (error) {
    console.error('[API /challenges GET]', error)
    return NextResponse.json({ error: 'Failed to load challenges' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rateCheck = await checkChallengesRateLimit(user.id)
    const rlHeaders = buildRateLimitHeaders(rateCheck, CHALLENGES_LIMIT)
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: rlHeaders })
    }

    // Enforce max active challenges per user
    const { count } = await supabase
      .from('habit_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if ((count || 0) >= MAX_ACTIVE_CHALLENGES) {
      return NextResponse.json(
        { error: `You can have at most ${MAX_ACTIVE_CHALLENGES} active challenges. Complete or remove some first.` },
        { status: 400, headers: rlHeaders }
      )
    }

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { title, description, target_days, difficulty, category, target_category } = body

    // Validate & sanitize inputs
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400, headers: rlHeaders })
    }

    const sanitizedTitle = sanitizeText(title, 100)
    const sanitizedDescription = description ? sanitizeText(description, 500) : null
    const safeTargetDays = Math.max(1, Math.min(90, parseInt(target_days) || 7))

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400, headers: rlHeaders })
    }

    const { data, error } = await supabase
      .from('habit_challenges')
      .insert({
        user_id: user.id,
        title: sanitizedTitle.value,
        description: sanitizedDescription?.value || '',
        target_days: safeTargetDays,
        completed_days: 0,
        difficulty: (VALID_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium') as any,
        category: VALID_CATEGORIES.includes(category) ? category : 'general',
        target_category: VALID_CATEGORIES.includes(target_category) ? target_category : 'educational',
        is_active: true,
        completed_at: null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ challenge: data }, { headers: rlHeaders })
  } catch (error: any) {
    console.error('[API /challenges POST]', error)
    return NextResponse.json({ 
      error: 'Failed to create challenge',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rateCheck = await checkChallengesRateLimit(user.id)
    const rlHeaders = buildRateLimitHeaders(rateCheck, CHALLENGES_LIMIT)
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: rlHeaders })
    }

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { id, action, difficulty } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Challenge ID required' }, { status: 400, headers: rlHeaders })
    }

    if (action === 'complete_day') {
      const { data: current } = await supabase
        .from('habit_challenges')
        .select('completed_days, target_days, is_active')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!current) return NextResponse.json({ error: 'Challenge not found' }, { status: 404, headers: rlHeaders })
      if (!current.is_active) return NextResponse.json({ error: 'Challenge already completed' }, { status: 400, headers: rlHeaders })

      const newCompleted = current.completed_days + 1
      const isFinished = newCompleted >= current.target_days

      const { data, error } = await supabase
        .from('habit_challenges')
        .update({
          completed_days: newCompleted,
          is_active: !isFinished,
          completed_at: isFinished ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ challenge: data, completed: isFinished }, { headers: rlHeaders })
    }

    if (action === 'adjust_difficulty' && difficulty) {
      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400, headers: rlHeaders })
      }

      const { data, error } = await supabase
        .from('habit_challenges')
        .update({ difficulty })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ challenge: data }, { headers: rlHeaders })
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('habit_challenges')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      return NextResponse.json({ success: true }, { headers: rlHeaders })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: rlHeaders })
  } catch (error: any) {
    console.error('[API /challenges PATCH]', error)
    return NextResponse.json({ 
      error: 'Failed to update challenge',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    }, { status: 500 })
  }
}
