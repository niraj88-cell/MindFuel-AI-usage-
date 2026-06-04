import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanContent } from '@/lib/agents/tools/contentScanner'
import { storeMemory } from '@/lib/ai/memory'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // In a real extension, we might use a dedicated API key system, but for now we rely on the session
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { url, title, description, author, platform, contentType, duration_minutes } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // 1. Build context string to scan
    const contextStr = `
      Title: ${title || 'Unknown'}
      Platform: ${platform || 'Unknown'}
      Type: ${contentType || 'webpage'}
      Author: ${author || 'Unknown'}
      Description: ${description || ''}
      URL: ${url}
    `.trim()

    // 2. Scan the content
    const analysis = await scanContent(contextStr)

    // 3. Save to database
    // We add an implicit source="extension" so it can be filtered in insights
    const { error } = await supabase.from('mental_logs').insert({
      user_id: user.id,
      content: contextStr.substring(0, 500),
      category: analysis.category,
      mental_score: analysis.mental_score,
      duration_minutes: duration_minutes || 5,
      mood_before: null,
      mood_after: null,
      source: 'auto_tracking',
      metadata: {
        summary: analysis.summary,
        reasoning: analysis.reasoning,
        tags: analysis.tags,
        is_junk: analysis.is_junk,
        time_well_spent: analysis.time_well_spent,
      }
    })

    if (error) {
      console.error('[Passive Tracking] DB Insert Error:', error)
      return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })
    }

    const memoryText = `Passive tracking recorded ${duration_minutes || 5} minutes on ${platform || 'web'}. Title: "${title}". Impact: ${analysis.mental_score}/100. Category: ${analysis.category}.`
    storeMemory(user.id, memoryText, {
      type: 'log',
      category: analysis.category,
      mental_score: analysis.mental_score,
      original_content: contextStr.substring(0, 500)
    }).catch(e => console.error('Passive Memory Sync Error:', e))

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('[Passive Tracking Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
