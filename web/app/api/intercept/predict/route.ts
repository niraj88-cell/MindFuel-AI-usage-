import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findAlternatives } from '@/lib/agents/tools/alternativeFinder'
import { generateIntervention } from '@/lib/agents/tools/interceptor'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const targetUrl = searchParams.get('url') || 'unknown'
    const timeSpent = parseInt(searchParams.get('time') || '0', 10)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let avgScore = 50
    let dropPrediction = 15
    let interceptCount = 0

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
        
        const doomscrollLogs = logs.filter(l => l.category === 'doomscroll' || l.category === 'entertainment')
        if (doomscrollLogs.length > 0) {
            const doomscrollAvg = Math.round(doomscrollLogs.reduce((sum, l) => sum + l.mental_score, 0) / doomscrollLogs.length)
            dropPrediction = Math.max(5, avgScore - doomscrollAvg)
        }
      }

      // Count today's intercepts for severity scaling
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('intercept_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())

      interceptCount = count || 0
    }

    // Generate intervention and smart swaps in parallel
    let contentStr = targetUrl
    try {
      const u = new URL(targetUrl)
      contentStr = `${u.hostname} ${u.pathname.replace(/[-/]/g, ' ')}`
    } catch { /* ignore */ }

    const [intervention, swapResult] = await Promise.all([
      generateIntervention(targetUrl, timeSpent, interceptCount),
      findAlternatives(contentStr, 'doomscroll', { avg_score: avgScore })
    ])

    return NextResponse.json({
      prediction: `Continuing usually drops your focus score by ${dropPrediction}% and leads to longer scrolling sessions.`,
      intervention,
      alternatives: swapResult.alternatives
    })
  } catch (error) {
    console.error('[Predict API Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
