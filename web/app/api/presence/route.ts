// app/api/presence/route.ts — one quiet answer for the extension popup:
// "is anyone in my circle focusing right now?"
// Bearer-authed (extension) or cookie-authed (web). Since migration 019 focus_sessions RLS
// is owner-only; co-member presence flows through the SECURITY DEFINER get_squad_live,
// which enforces membership and the 4h forgotten-session cap in SQL. Returns a single
// first name + start time — never domains, never a feed.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/route-auth'

export const runtime = 'nodejs'

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

    // focus_sessions RLS is owner-only (migration 019); co-member presence comes through
    // the SECURITY DEFINER get_squad_live, which returns at most one safe row.
    const { data: rows } = await supabase.rpc('get_squad_live')
    const live = rows?.[0]
    if (!live) return NextResponse.json({ circle: true, live: null })

    // First name only — the popup is a companion, not a roster.
    const name = (live.full_name || 'A friend').trim().split(/\s+/)[0]
    return NextResponse.json({ circle: true, live: { name, started_at: live.started_at } })
  } catch (e) {
    console.error('[presence] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
