import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { storeMemory } from '@/lib/ai/memory'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { content, category, mental_score, duration_minutes, mood_before, mood_after, source, metadata } = body

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    }

    // Insert into mental_logs
    const { error: insertError } = await supabase.from('mental_logs').insert({
      user_id: user.id,
      content,
      category,
      mental_score,
      duration_minutes: duration_minutes || 15,
      mood_before,
      mood_after,
      source: source || 'manual',
      metadata,
    })

    if (insertError) {
      console.error('Mental Log Insert Error:', insertError)
      return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })
    }

    // 🔥 PHASE 10: Store Semantic Perfect Memory in the background
    // We don't await this so it doesn't block the UI response
    const memoryText = `User logged ${duration_minutes} minutes of ${category}. Content: "${content}". Mood before: ${mood_before}/100. Mood after: ${mood_after}/100. Impact Score: ${mental_score}/100.`
    storeMemory(user.id, memoryText, {
      type: 'log',
      category,
      mental_score,
      original_content: content
    }).catch(e => console.error('Memory Sync Error:', e))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Save Log Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
