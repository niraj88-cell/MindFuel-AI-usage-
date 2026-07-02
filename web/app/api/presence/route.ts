// app/api/presence/route.ts — one quiet answer for the extension popup:
// "is anyone in my circle focusing right now?"
// Bearer-authed (extension) or cookie-authed (web), always under RLS: focus_select only
// exposes co-members' sessions that carry a squad_id the caller belongs to. Returns a
// single first name + start time — never domains, never a feed.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/route-auth'

export const runtime = 'nodejs'

// Matches the focus start/stop cap: anything older was a forgotten session, not presence.
const MAX_SESSION_S = 4 * 60 * 60

export async function GET(req: Request) {
  try {
    const ctx = await getUserContext(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { supabase, userId } = ctx

    // The popup caches for a minute, so a modest per-user ceiling is plenty.
    const admin = createAdminClient()
    const { data: allowed } = await admin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'presence',
      p_max_calls: 120,
    })
    if (allowed === false) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { data: memberships } = await supabase
      .from('squad_members')
      .select('squad_id')
      .eq('user_id', userId)
      .is('left_at', null)

    const squadIds = (memberships ?? []).map((m) => m.squad_id)
    if (squadIds.length === 0) {
      // No circle: the popup shows nothing at all (a presence line would be noise).
      return NextResponse.json({ circle: false, live: null })
    }

    const cutoff = new Date(Date.now() - MAX_SESSION_S * 1000).toISOString()
    const { data: sessions } = await supabase
      .from('focus_sessions')
      .select('user_id, created_at')
      .in('squad_id', squadIds)
      .eq('status', 'active')
      .neq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)

    const live = sessions?.[0]
    if (!live) return NextResponse.json({ circle: true, live: null })

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', live.user_id)
      .maybeSingle()

    // First name only — the popup is a companion, not a roster.
    const name = (profile?.full_name || 'A friend').trim().split(/\s+/)[0]
    return NextResponse.json({ circle: true, live: { name, started_at: live.created_at } })
  } catch (e) {
    console.error('[presence] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
