
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: squadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the active mission and its participants
    const { data: missions, error } = await supabase
      .from('squad_missions')
      .select(`
        id, type, title, target_value, status, expires_at, created_at,
        squad_mission_participants (
          user_id, progress, completed, updated_at
        )
      `)
      .eq('squad_id', squadId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    return NextResponse.json({ mission: missions && missions.length > 0 ? missions[0] : null })
  } catch (error: any) {
    console.error('[Squad Missions GET Error]', error.message)
    return NextResponse.json({ error: 'Failed to fetch mission' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: squadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, title, target_value, expires_at } = await req.json()

    // Create a new mission
    const { data: mission, error: missionError } = await supabase
      .from('squad_missions')
      .insert({
        squad_id: squadId,
        type,
        title,
        target_value,
        expires_at
      })
      .select()
      .single()

    if (missionError) throw missionError

    // Automatically join the creator to the mission
    await supabase
      .from('squad_mission_participants')
      .insert({
        mission_id: mission.id,
        user_id: user.id
      })

    return NextResponse.json({ success: true, mission })
  } catch (error: any) {
    console.error('[Squad Missions POST Error]', error.message)
    return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 })
  }
}
