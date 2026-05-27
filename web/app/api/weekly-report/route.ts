import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subDays, format } from 'date-fns'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')

    // Fetch data
    const [
      { data: mentalLogs },
      { data: moodLogs },
      { data: dailySummaries },
      { data: focusSessions }
    ] = await Promise.all([
      supabase.from('mental_logs').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo),
      supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo),
      supabase.from('daily_summaries').select('*').eq('user_id', user.id).gte('date', sevenDaysAgo).order('date', { ascending: false }),
      supabase.from('focus_sessions').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo).eq('completed', true)
    ])

    // Calculate metrics
    let doomscrollMinutes = 0
    let focusMinutes = 0
    let totalMoodDelta = 0
    let logsWithMood = 0
    const categoryScores: Record<string, { total: number, count: number }> = {}

    if (mentalLogs) {
      mentalLogs.forEach(log => {
        if (log.category === 'doomscroll') {
          doomscrollMinutes += log.duration_minutes || 0
        }
        
        if (log.mood_after !== null && log.mood_before !== null) {
          totalMoodDelta += (log.mood_after - log.mood_before)
          logsWithMood++
        }

        if (!categoryScores[log.category]) {
          categoryScores[log.category] = { total: 0, count: 0 }
        }
        categoryScores[log.category].total += log.mental_score
        categoryScores[log.category].count++
      })
    }

    if (focusSessions) {
      focusSessions.forEach(session => {
        focusMinutes += session.duration_minutes || 0
      })
    }

    const averageMoodDelta = logsWithMood > 0 ? (totalMoodDelta / logsWithMood).toFixed(1) : 0
    const timeSaved = Math.max(0, focusMinutes - doomscrollMinutes)

    const categories = Object.keys(categoryScores).map(c => ({
      category: c,
      avgScore: categoryScores[c].total / categoryScores[c].count
    })).sort((a, b) => b.avgScore - a.avgScore)

    const topStrengths = categories.slice(0, 3)
    const topTriggers = categories.slice().reverse().slice(0, 3)
    
    // Check if the first summary is from today or yesterday to get current streak
    let streakCount = 0
    if (dailySummaries && dailySummaries.length > 0) {
       const latest = dailySummaries[0]
       if (latest.date === today || latest.date === format(subDays(new Date(), 1), 'yyyy-MM-dd')) {
         streakCount = latest.streak_days || 0
       }
    }

    return NextResponse.json({
      success: true,
      report: {
        timeSavedMinutes: timeSaved,
        focusMinutes,
        doomscrollMinutes,
        averageMoodDelta: Number(averageMoodDelta),
        topStrengths,
        topTriggers,
        streakCount,
        logsCount: mentalLogs?.length || 0,
        moodChecksCount: moodLogs?.length || 0,
      }
    })
  } catch (error) {
    console.error('[API /weekly-report]', error)
    return NextResponse.json({ error: 'Failed to generate weekly report' }, { status: 500 })
  }
}
