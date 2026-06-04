import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { storeMemory } from '@/lib/ai/memory'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // Support Bearer token for Shortcuts/Automations
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user }, error: authError } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      provider, 
      sleep_score, 
      hrv, 
      readiness_score, 
      resting_heart_rate, 
      date,
      metadata 
    } = body

    if (!provider) {
      return NextResponse.json({ error: 'Provider (e.g. oura, apple_health) is required' }, { status: 400 })
    }

    const logDate = date || new Date().toISOString().split('T')[0]

    // 1. Insert or update the biometric log
    const { data: log, error: insertError } = await supabase
      .from('biometric_logs')
      .upsert(
        {
          user_id: user.id,
          provider,
          sleep_score,
          hrv,
          readiness_score,
          resting_heart_rate,
          date: logDate,
          metadata
        },
        { onConflict: 'user_id,provider,date' }
      )
      .select()
      .single()

    if (insertError) {
      console.error('[Biometrics Sync] Insert Error:', insertError)
      return NextResponse.json({ error: 'Failed to sync biometrics' }, { status: 500 })
    }

    // 2. Generate Semantic Memory for extreme states
    let memoryContext = []
    if (sleep_score && sleep_score < 70) memoryContext.push(`poor sleep (${sleep_score}/100)`)
    if (readiness_score && readiness_score < 70) memoryContext.push(`low readiness (${readiness_score}/100)`)
    if (hrv && hrv < 30) memoryContext.push(`low HRV (${hrv}ms)`)

    if (memoryContext.length > 0) {
      const memoryText = `User experienced physical exhaustion on ${logDate}: ${memoryContext.join(', ')}. Sourced from ${provider}.`
      
      // Store this in the background
      storeMemory(user.id, memoryText, {
        type: 'log',
        provider,
        date: logDate,
        sleep_score,
        hrv,
        readiness_score
      }).catch(e => console.error('[Biometrics Sync] Memory Error:', e))
    }

    return NextResponse.json({ success: true, log })
  } catch (error) {
    console.error('[Biometrics Sync] Critical Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
