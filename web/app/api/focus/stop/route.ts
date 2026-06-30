// app/api/focus/stop/route.ts — end a focus session.
// duration_s, distraction_pct, session_quality, and status are ALL computed server-side:
// duration from the stored start time, the rest from the user's domain_logs during the
// session window. A client cannot fabricate focus length or quality — this is the
// "proof layer" the squad feed depends on.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/route-auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const StopSchema = z.object({ session_id: z.string().uuid().optional() })

const MIN_REAL_SESSION_S = 120          // < 2 min counts as abandoned
const MAX_SESSION_S = 4 * 60 * 60       // > 4h => user forgot to stop; cap + abandon

export async function POST(req: Request) {
  try {
    const ctx = await getUserContext(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { supabase, userId } = ctx

    const parsed = StopSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // Locate the session to stop: an explicit id, or the user's current active session.
    let query = supabase
      .from('focus_sessions')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
    if (parsed.data.session_id) query = query.eq('id', parsed.data.session_id)

    const { data: session } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 404 })
    }

    // 1. Server-measured duration (cannot be faked by the client).
    const startedAt = session.created_at ? new Date(session.created_at).getTime() : Date.now()
    let durationS = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    const forgotten = durationS > MAX_SESSION_S
    if (forgotten) durationS = MAX_SESSION_S

    // 2. Quality from the user's ambient domain activity during the session window.
    const { data: logs } = await supabase
      .from('domain_logs')
      .select('duration_s, category')
      .eq('user_id', userId)
      .gte('created_at', session.created_at ?? new Date(startedAt).toISOString())

    let totalS = 0
    let distractingS = 0
    for (const l of logs ?? []) {
      const d = l.duration_s ?? 0
      totalS += d
      if (l.category === 'doomscroll') distractingS += d
    }
    const distractionPct = totalS > 0 ? Math.round((distractingS / totalS) * 100) : 0

    // No ambient signal (e.g. the extension wasn't running) means we CANNOT verify focus
    // quality — report it honestly as 'unverified' rather than claiming deep focus.
    const hasSignal = totalS > 0
    const sessionQuality =
      !hasSignal ? 'unverified' :
      distractionPct < 15 ? 'deep' :
      distractionPct < 40 ? 'focused' :
      distractionPct < 70 ? 'mixed' : 'distracted'

    // 3. Lifecycle status (server-authoritative): completed / mixed / abandoned.
    const status =
      forgotten || durationS < MIN_REAL_SESSION_S ? 'abandoned' :
      hasSignal && distractionPct >= 50 ? 'mixed' : 'completed'

    const { data: updated, error } = await supabase
      .from('focus_sessions')
      .update({
        status,
        duration_s: durationS,
        session_quality: sessionQuality,
        distraction_pct: distractionPct,
        mf_duration_minutes: Math.round(durationS / 60),
        mf_completed: status === 'completed',
      })
      .eq('id', session.id)
      .eq('user_id', userId)   // defense in depth alongside RLS
      .eq('status', 'active')  // idempotency: a session can only be stopped once
      .select('id, status, duration_s, session_quality, distraction_pct')
      .single()

    if (error || !updated) {
      console.error('[focus/stop] update error:', error)
      return NextResponse.json({ error: 'Failed to stop session' }, { status: 500 })
    }

    return NextResponse.json({ success: true, session: updated })
  } catch (e: any) {
    console.error('[focus/stop] error:', e?.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
