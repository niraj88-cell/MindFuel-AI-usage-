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

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Get all squads the user is a member of
    const { data: memberships } = await supabase
      .from('squad_members')
      .select('squad_id')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ squads: [] })
    }

    const squadIds = memberships.map(m => m.squad_id)

    // 2. Fetch the squad details and their members
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

    // 3. For each member in each squad, fetch their current daily summary (today's score & streak)
    // We do this by fetching all relevant daily summaries for today
    const today = new Date().toISOString().split('T')[0]
    
    const allMemberIds = new Set<string>()
    squadsData.forEach(s => s.squad_members.forEach(m => allMemberIds.add(m.user_id)))

    const { data: summaries } = await supabase
      .from('daily_summaries')
      .select('user_id, total_score, streak_days')
      .eq('date', today)
      .in('user_id', Array.from(allMemberIds))

    const summaryMap = (summaries || []).reduce((acc, curr) => {
      acc[curr.user_id] = { score: curr.total_score, streak: curr.streak_days }
      return acc
    }, {} as Record<string, { score: number, streak: number }>)

    // Format the response
    const formattedSquads = squadsData.map(squad => {
      const members = squad.squad_members.map((m: any) => ({
        id: m.profiles?.id,
        name: m.profiles?.full_name || 'Anonymous User',
        avatar: m.profiles?.avatar_url,
        today_score: summaryMap[m.user_id]?.score || 0,
        streak: summaryMap[m.user_id]?.streak || 0,
      })).sort((a, b) => b.today_score - a.today_score) // Sort by highest score today

      return {
        id: squad.id,
        name: squad.name,
        invite_code: squad.invite_code,
        created_at: squad.created_at,
        members
      }
    })

    return NextResponse.json({ squads: formattedSquads })
  } catch (error: any) {
    console.error('[Fetch Squads Error]', error.message)
    return NextResponse.json({ error: 'Failed to fetch squads' }, { status: 500 })
  }
}
