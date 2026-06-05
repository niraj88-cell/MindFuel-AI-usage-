
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: squadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: pings, error } = await supabase
      .from('squad_pings')
      .select(`
        id, ping_type, created_at,
        from_user ( id, full_name, avatar_url ),
        to_user ( id, full_name, avatar_url )
      `)
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ pings })
  } catch (error: any) {
    console.error('[Squad Pings GET Error]', error.message)
    return NextResponse.json({ error: 'Failed to fetch pings' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: squadId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { to_user, ping_type } = await req.json()

    if (!to_user || !ping_type) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const { data: ping, error: pingError } = await supabase
      .from('squad_pings')
      .insert({
        squad_id: squadId,
        from_user: user.id,
        to_user,
        ping_type
      })
      .select()
      .single()

    if (pingError) throw pingError

    return NextResponse.json({ success: true, ping })
  } catch (error: any) {
    console.error('[Squad Pings POST Error]', error.message)
    return NextResponse.json({ error: 'Failed to send ping' }, { status: 500 })
  }
}
