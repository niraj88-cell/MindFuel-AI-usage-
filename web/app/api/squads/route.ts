import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await req.json()
    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: 'Squad name must be at least 3 characters' }, { status: 400 })
    }

    // Generate a unique 6-character invite code
    const invite_code = crypto.randomBytes(3).toString('hex').toUpperCase()

    // 1. Create the Squad
    const { data: squad, error: squadError } = await supabase
      .from('squads')
      .insert({
        name: name.trim(),
        invite_code,
        created_by: user.id
      })
      .select()
      .single()

    if (squadError) throw squadError

    // 2. Add the creator as the first member
    const { error: memberError } = await supabase
      .from('squad_members')
      .insert({
        squad_id: squad.id,
        user_id: user.id
      })

    if (memberError) throw memberError

    return NextResponse.json({ success: true, squad })
  } catch (error: any) {
    console.error('[Create Squad Error]', error.message)
    return NextResponse.json({ error: 'Failed to create squad' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Squads the user belongs to
    const { data: memberships } = await supabase
      .from('squad_members')
      .select('squad_id')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ squads: [] })
    }

    const squadIds = memberships.map((m) => m.squad_id)

    // 2. Squad details + members
    const { data: squadsData, error: squadsError } = await supabase
      .from('squads')
      .select(`
        id, name, invite_code, created_at,
        squad_members (
          user_id,
          profiles ( id, full_name, avatar_url )
        )
      `)
      .in('id', squadIds)
      .order('created_at', { ascending: false })

    if (squadsError) throw squadsError

    // 3. Supportive status (NOT a leaderboard): who has a verified focus session today.
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const memberIds = [
      ...new Set(squadsData.flatMap((s) => s.squad_members.map((m: any) => m.user_id))),
    ]

    const checkedIn = new Set<string>()
    if (memberIds.length > 0) {
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('user_id, status, created_at')
        .in('user_id', memberIds)
        .gte('created_at', startOfToday.toISOString())

      sessions?.forEach((s) => {
        if (s.status === 'completed' || s.status === 'mixed') checkedIn.add(s.user_id)
      })
    }

    // 4. Format — human statuses, ordered by name. No scores, no ranking.
    const formattedSquads = squadsData.map((squad) => ({
      id: squad.id,
      name: squad.name,
      invite_code: squad.invite_code,
      created_at: squad.created_at,
      members: squad.squad_members
        .map((m: any) => ({
          id: m.user_id,
          name: m.profiles?.full_name || 'Member',
          avatar: m.profiles?.avatar_url ?? null,
          status: checkedIn.has(m.user_id) ? 'checked_in' : 'quiet',
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))

    return NextResponse.json({ squads: formattedSquads })
  } catch (error: any) {
    console.error('[Fetch Squads Error]', error.message)
    return NextResponse.json({ error: 'Failed to fetch squads' }, { status: 500 })
  }
}
