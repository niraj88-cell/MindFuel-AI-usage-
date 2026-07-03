// app/api/squads/[id]/feed/route.ts — the circle feed.
// Reads through the SECURITY DEFINER get_squad_feed (migration 019), which is the ONLY
// path to a co-member's sessions since focus_sessions RLS went owner-only. What a squad
// sees is exactly: who, active/verified, duration, the member's own intention words, when.
// Never a quality label, never a distraction percentage, never behavioral signals — those
// are the private reflection, and RLS makes them unreadable, not merely un-rendered.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: squadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Membership is enforced inside the function; a non-member simply gets an empty feed.
    const { data: rows, error } = await supabase.rpc('get_squad_feed', { p_squad_id: squadId })
    if (error) throw error

    const feed = (rows ?? []).map((r) => ({
      id: r.id,
      active: r.active,
      verified: r.verified,
      duration_s: r.duration_s,
      intention: r.intention,
      created_at: r.created_at,
      member: {
        id: r.user_id,
        name: r.full_name || 'Member',
        avatar: r.avatar_url ?? null,
      },
    }))

    return NextResponse.json({ feed })
  } catch (error) {
    console.error('[Squad Feed Error]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}
