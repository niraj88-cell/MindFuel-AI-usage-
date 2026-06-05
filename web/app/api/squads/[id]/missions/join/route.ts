// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: squadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mission_id } = await req.json()

    // 1. Verify squad membership
    const { data: membership } = await supabase
      .from('squad_members')
      .select('*')
      .eq('squad_id', squadId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this squad' }, { status: 403 })
    }

    // 2. Insert participation
    const { data: participant, error: joinError } = await supabase
      .from('squad_mission_participants')
      .insert({
        mission_id,
        user_id: user.id
      })
      .select()
      .single()

    if (joinError) throw joinError

    return NextResponse.json({ success: true, participant })
  } catch (error: any) {
    console.error('[Join Mission Error]', error.message)
    return NextResponse.json({ error: 'Failed to join mission' }, { status: 500 })
  }
}
