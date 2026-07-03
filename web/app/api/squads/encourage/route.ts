// app/api/squads/encourage/route.ts — the ONLY thing a circle can send: one fixed phrase
// of encouragement to a co-member who is in an active session right now.
//
// Deliberately narrow: no free text (no chat to moderate, no pressure to reply), one per
// member per session (support, not a stream), and every rule is enforced inside the
// SECURITY DEFINER encourage_session function (membership, active session, 4h cap, dedupe,
// phrase allowlist) — the route only rate-limits, relays, and pushes best-effort.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/route-auth'
import { sendPushTo } from '@/lib/squad/push'
import { ENCOURAGEMENT_PHRASES } from '@/lib/squad/encouragement'
import { z } from 'zod'

export const runtime = 'nodejs'

const EncourageSchema = z.object({
  session_id: z.string().uuid(),
  phrase: z.number().int().min(0).max(ENCOURAGEMENT_PHRASES.length - 1),
})

export async function POST(req: Request) {
  try {
    const ctx = await getUserContext(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { supabase, userId } = ctx

    const parsed = EncourageSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const admin = createAdminClient()
    const { data: allowed } = await admin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'encourage',
      p_max_calls: 30,
    })
    if (allowed === false) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { data: rows, error } = await supabase.rpc('encourage_session', {
      p_session_id: parsed.data.session_id,
      p_phrase: parsed.data.phrase,
    })
    if (error) {
      console.error('[encourage] rpc error:', error)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const result = rows?.[0]
    if (!result?.ok || !result.recipient) {
      // Duplicate, ended session, or not a co-member — all read the same to the caller.
      return NextResponse.json({ ok: false })
    }

    // Best-effort push so the cheer can reach a focused person who isn't looking at the app.
    // The in-app notification row (written by the function) is the source of truth.
    const { data: me } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle()
    const first = (me?.full_name || 'A friend').trim().split(/\s+/)[0]
    await sendPushTo(admin, [result.recipient], {
      title: `${first}: ${ENCOURAGEMENT_PHRASES[parsed.data.phrase]}`,
      body: 'Sent while you were in your session.',
      url: '/focus',
      tag: 'squad_encouragement',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[encourage] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
