
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// The curated encouragement vocabulary (matches CuratedInteractionMenu). A closed set on
// purpose: no free-text chat, no arbitrary strings stored or rendered.
const PING_LABELS: Record<string, string> = {
  'motivate': "You've got this",
  'check-in': 'Checking in',
  'focus-flame': 'Lock in',
  'celebrate': 'Proud of you',
}

const PingSchema = z.object({
  to_user: z.string().uuid(),
  ping_type: z.enum(['motivate', 'check-in', 'focus-flame', 'celebrate']),
})

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

    const parsed = PingSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { to_user, ping_type } = parsed.data

    // Rate limit so encouragement can never become spam (RLS already restricts
    // sender + recipient to squad members).
    const admin = createAdminClient()
    const { data: allowed } = await admin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'squad_ping',
      p_max_calls: 30,
    })
    if (allowed === false) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
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

    // Deliver the encouragement to the person it's for. A ping that only lives in a feed the
    // recipient has to open isn't support — surface it on their bell (best-effort, never
    // fails the ping itself). Uses the admin client because the row belongs to the recipient.
    try {
      const { data: sender } = await admin
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const name = (sender?.full_name || 'A squadmate').trim()
      await admin.from('notifications').insert({
        user_id: to_user,
        title: `${name}: “${PING_LABELS[ping_type]}”`,
        body: 'A quiet nudge from your squad.',
        type: 'squad_ping',
        is_read: false,
        metadata: { actor_id: user.id, actor_name: name, squad_id: squadId, ping_type },
      })
    } catch (e) {
      console.error('[Squad Pings] notification insert failed:', e instanceof Error ? e.message : e)
    }

    return NextResponse.json({ success: true, ping })
  } catch (error: any) {
    console.error('[Squad Pings POST Error]', error.message)
    return NextResponse.json({ error: 'Failed to send ping' }, { status: 500 })
  }
}
