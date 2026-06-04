import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Simple naive API key validation for the MVP
// In a real system, you'd have an API_KEYS table with hashed keys
function isValidApiKey(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const token = authHeader.split(' ')[1]
  
  // For the MVP, we just check if it matches a known format or master key
  // We'll allow anything that starts with 'mf_live_' for demo purposes
  return token.startsWith('mf_live_')
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    
    if (!isValidApiKey(authHeader)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 })
    }

    const body = await req.json()
    const { event, app, duration_mins, timestamp } = body

    if (!event || !app) {
      return NextResponse.json({ error: 'Missing required fields: event, app' }, { status: 400 })
    }

    const supabase = await createClient()

    // For a real API, the API key would map to a specific user ID.
    // For this prototype, we'll try to extract the user from an active session if one exists,
    // otherwise we just log it anonymously or to a test user.
    const { data: { user } } = await supabase.auth.getUser()

    // Mock processing the event
    let mentalScoreImpact = 0
    let insight = ''
    let category: any = 'neutral'

    if (app.toLowerCase() === 'tiktok' || app.toLowerCase() === 'instagram') {
      mentalScoreImpact = -5
      insight = 'High-stimulation content detected. Cortisol spike likely.'
      category = 'doomscroll'
    } else if (app.toLowerCase() === 'kindle' || app.toLowerCase() === 'notion') {
      mentalScoreImpact = +5
      insight = 'Deep work/learning detected. Dopamine baseline stabilizing.'
      category = 'productive'
    } else {
      insight = 'Neutral digital activity recorded.'
    }

    // In a real app, we would insert this into mental_logs or a new passive_events table
    if (user) {
      await supabase.from('mental_logs').insert({
        user_id: user.id,
        content: `Passive API Event: ${event} on ${app} for ${duration_mins || 0} mins`,
        category: category as any,
        mental_score: 50 + mentalScoreImpact,
        duration_minutes: duration_mins || 0,
        mood_before: null,
        mood_after: null,
        source: 'auto_tracking' as const,
        metadata: { event, app, timestamp: timestamp || new Date().toISOString() }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Event ingested successfully',
      insight: insight,
      computed_impact: mentalScoreImpact
    })

  } catch (err: any) {
    console.error('Fuel API Ingest Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
