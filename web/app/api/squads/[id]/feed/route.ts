// app/api/squads/[id]/feed/route.ts — the squad PROOF FEED.
// Returns recent extension-verified focus sessions for a squad, newest first.
// This is the supportive accountability surface: states (completed/mixed/abandoned),
// not scores or rankings. RLS (focus_select) ensures only squad members see this; a
// non-member simply gets an empty feed.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: squadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sessions, error } = await supabase
      .from('focus_sessions')
      .select('id, user_id, status, duration_s, intention, session_quality, created_at')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ feed: [] })
    }

    // Attach member basics (separate query — no FK embed assumptions).
    const userIds = [...new Set(sessions.map((s) => s.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const feed = sessions.map((s) => ({
      id: s.id,
      status: s.status,
      duration_s: s.duration_s,
      intention: s.intention,
      session_quality: s.session_quality,
      created_at: s.created_at,
      member: {
        id: s.user_id,
        name: profileMap.get(s.user_id)?.full_name || 'Member',
        avatar: profileMap.get(s.user_id)?.avatar_url ?? null,
      },
    }))

    return NextResponse.json({ feed })
  } catch (error: any) {
    console.error('[Squad Feed Error]', error.message)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}
