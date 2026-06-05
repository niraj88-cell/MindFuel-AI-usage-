import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invite_code } = await req.json()
    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    const formattedCode = invite_code.trim().toUpperCase()

    // 1. Find the squad by invite code using a secure RPC function to bypass RLS for lookups
    const { data: squads, error: squadError } = await (supabase as any)
      .rpc('get_squad_by_invite', { code: formattedCode })
      
    const squad = squads && squads.length > 0 ? squads[0] : null

    if (squadError || !squad) {
      return NextResponse.json({ error: 'Invalid invite code or squad not found' }, { status: 404 })
    }

    // 2. Check if user is already a member
    const { data: existingMember } = await supabase
      .from('squad_members')
      .select('*')
      .eq('squad_id', squad.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({ error: 'You are already in this squad' }, { status: 400 })
    }

    // 3. Join the squad
    const { error: joinError } = await supabase
      .from('squad_members')
      .insert({
        squad_id: squad.id,
        user_id: user.id
      })

    if (joinError) throw joinError

    return NextResponse.json({ success: true, squad })
  } catch (error: any) {
    console.error('[Join Squad Error]', error.message)
    return NextResponse.json({ error: 'Failed to join squad' }, { status: 500 })
  }
}
