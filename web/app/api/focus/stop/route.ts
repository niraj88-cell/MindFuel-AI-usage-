// app/api/focus/stop/route.ts — end a focus session.
// duration_s, distraction_pct, session_quality, status, AND the behavioral signals are ALL
// computed server-side: duration from the stored start time, the rest from the user's
// ORDERED domain_logs during the session window (created_at, then seq within a batch).
// A client cannot fabricate focus length or quality — this is the "proof layer".
//
// The analysis itself is the pure lib/behavior.ts: quality is pattern-aware (loops,
// fragmentation, unbroken stretches), not just a distraction percentage, and the stored
// `behavior` jsonb contains counts/durations only — never a domain.

import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/supabase/route-auth'
import { analyzeSession, qualityOf, type AttentionEvent } from '@/lib/behavior'
import { updateBehavioralProfile } from '@/lib/intelligence/profile-store'
import type { Json } from '@/lib/supabase/types'
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

    // 2. The ordered attention timeline during the session window. seq breaks the tie
    //    inside a batch (all rows of one flush share a created_at); the extension flushes
    //    before calling stop, so the final chunk is included.
    const { data: logs } = await supabase
      .from('domain_logs')
      .select('domain, duration_s, category, seq, created_at')
      .eq('user_id', userId)
      .gte('created_at', session.created_at ?? new Date(startedAt).toISOString())
      .order('created_at', { ascending: true })
      .order('seq', { ascending: true })

    const events: AttentionEvent[] = (logs ?? []).map((l) => ({
      domain: l.domain,
      category: (l.category === 'distraction' || l.category === 'productive' ? l.category : 'neutral'),
      duration_s: l.duration_s ?? 0,
    }))

    // No ambient signal (e.g. the extension wasn't running) means we CANNOT verify focus
    // quality — analyzeSession reports it honestly as unverified rather than claiming depth.
    const signals = analyzeSession(events)
    const sessionQuality = qualityOf(signals)
    const distractionPct = signals.distraction_pct
    const hasSignal = signals.verified

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
        // The session's behavioral shape (counts/durations only — verified in behavior.test.mjs
        // to contain zero domains). Owner-only via RLS; squads can never read it.
        behavior: signals as unknown as Json,
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

    // Fold this session into the user's longitudinal behavioral profile (domain-free EWMA
    // cache, owner-only). Best-effort ON PURPOSE: a profile hiccup must never fail a stop,
    // and the profile is always rebuildable from focus_sessions if it ever drifts.
    try {
      await updateBehavioralProfile(supabase, userId, {
        startedAt: session.created_at ?? new Date(startedAt).toISOString(),
        durationS,
        quality: sessionQuality,
        signals,
      })
    } catch (profileErr) {
      console.error('[focus/stop] behavioral profile update skipped:', profileErr instanceof Error ? profileErr.message : profileErr)
    }

    return NextResponse.json({ success: true, session: updated })
  } catch (e) {
    console.error('[focus/stop] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
