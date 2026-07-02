import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch live map radar data
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify membership
    const { data: membership } = await supabase
      .from('squad_members')
      .select('id')
      .eq('squad_id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch the *latest* checkin for each user in the squad within the last 24 hours
    // Since we don't have a direct "distinct by user_id" in simple postgrest without RPC, 
    // we'll fetch all from the last 24h and deduplicate in code.
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: checkins, error } = await supabase
      .from('squad_checkins' as any)
      .select(`
        id,
        user_id,
        activity,
        location,
        lat,
        lng,
        privacy,
        mood,
        created_at,
        profiles ( id, full_name, avatar_url )
      `)
      .eq('squad_id', params.id)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Deduplicate to keep only the latest check-in per user
    const latestCheckins = new Map()
    checkins.forEach((c: any) => {
      if (!latestCheckins.has(c.user_id) && c.privacy !== 'hidden') {
        latestCheckins.set(c.user_id, c)
      }
    })

    const pins = Array.from(latestCheckins.values()).map((c: any) => {
      // Handle privacy abstracting
      let renderLat = c.lat
      let renderLng = c.lng

      if (c.privacy === 'approximate') {
        // Jitter (~1-2km) seeded by the checkin id, NOT Math.random(): random-per-request
        // jitter lets a squadmate refetch repeatedly and average back to the true location.
        // A deterministic offset reveals nothing more on the second request than the first.
        const seed = c.id.split('').reduce((a: number, b: string) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        renderLat += (((Math.abs(seed) % 1000) / 1000) - 0.5) * 0.02
        renderLng += (((Math.abs(seed * 13) % 1000) / 1000) - 0.5) * 0.02
      } else if (c.privacy === 'abstract' || !c.lat || !c.lng) {
        // Purely abstract positioning based on user id hash to keep it stable
        const hash = c.user_id.split('').reduce((a: number, b: string) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        
        // Convert hash to stable percentages for CSS top/left
        renderLat = 20 + Math.abs(hash % 60) // 20% to 80% top
        renderLng = 20 + Math.abs((hash * 13) % 60) // 20% to 80% left
      }

      return {
        id: c.id,
        user_id: c.user_id,
        name: c.profiles?.full_name?.split(' ')[0] || 'Member',
        avatar: c.profiles?.avatar_url,
        activity: c.activity,
        locationName: c.location || 'Unknown',
        mood: c.mood,
        lat: renderLat,
        lng: renderLng,
        privacy: c.privacy || 'abstract',
        timeAgo: c.created_at
      }
    })

    return NextResponse.json({ pins })
  } catch (error: any) {
    console.error('[Radar API Error]', error.message)
    return NextResponse.json({ error: 'Failed to fetch radar data' }, { status: 500 })
  }
}
