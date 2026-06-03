import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findAlternatives } from '@/lib/agents/tools/alternativeFinder'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const targetUrl = searchParams.get('url') || 'unknown'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let avgScore = 50
    let dropPrediction = 15 // Default drop

    if (user) {
      // Calculate prediction based on past logs
      const { data: logs } = await supabase
        .from('mental_logs')
        .select('mental_score, category')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (logs && logs.length > 0) {
        avgScore = Math.round(logs.reduce((sum, l) => sum + l.mental_score, 0) / logs.length)
        
        // Calculate typical drop after doomscrolling
        const doomscrollLogs = logs.filter(l => l.category === 'doomscroll' || l.category === 'entertainment')
        if (doomscrollLogs.length > 0) {
            const doomscrollAvg = Math.round(doomscrollLogs.reduce((sum, l) => sum + l.mental_score, 0) / doomscrollLogs.length)
            dropPrediction = Math.max(5, avgScore - doomscrollAvg)
        }
      }
    }

    // Get smart swaps
    let contentStr = targetUrl
    try {
      const u = new URL(targetUrl)
      contentStr = `${u.hostname} ${u.pathname.replace(/[-/]/g, ' ')}`
    } catch { /* ignore */ }

    const result = await findAlternatives(contentStr, 'doomscroll', { avg_score: avgScore })

    return NextResponse.json({
      prediction: `Continuing usually drops your focus score by ${dropPrediction}% and leads to longer scrolling sessions.`,
      alternatives: result.alternatives
    })
  } catch (error) {
    console.error('[Predict API Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
