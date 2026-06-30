// app/api/focus/start/route.ts — begin a focus session.
// The START TIME is anchored server-side (created_at defaults to now() in the DB), so the
// elapsed duration computed at /stop cannot be inflated by the client.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/route-auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const StartSchema = z.object({
  intention: z.string().max(280).optional(),
  squad_id: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  try {
    const ctx = await getUserContext(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { supabase, userId } = ctx

    const parsed = StartSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Rate limit (Postgres limiter, service-role only).
    const admin = createAdminClient()
    const { data: allowed } = await admin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'focus',
      p_max_calls: 60,
    })
    if (allowed === false) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // One active session at a time — return the existing one rather than duplicating.
    const { data: existing } = await supabase
      .from('focus_sessions')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ session_id: existing.id, started_at: existing.created_at, resumed: true })
    }

    const { data: created, error } = await supabase
      .from('focus_sessions')
      // Cast: the generated type still carries the legacy duration_minutes/completed columns
      // (renamed to mf_* in the DB). We insert the REAL columns here; the cast goes away in
      // the Phase E type cleanup.
      .insert({
        user_id: userId,
        status: 'active',
        intention: parsed.data.intention ?? null,
        squad_id: parsed.data.squad_id ?? null,
        mf_duration_minutes: 0,
        mf_completed: false,
      } as never)
      .select('id, created_at')
      .single()

    if (error) {
      console.error('[focus/start] insert error:', error)
      return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
    }

    return NextResponse.json({ session_id: created.id, started_at: created.created_at })
  } catch (e: any) {
    console.error('[focus/start] error:', e?.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
