import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subDays, format } from 'date-fns'
import { calculatePredictiveHealth } from '@/lib/agents/tools/predictiveHealth'

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

    const predictiveHealth = calculatePredictiveHealth(mentalLogs || [])

    // Calculate dynamic Shift Moment
    const anomalies: { day: string, time: string, event: string, impact: string, score: number }[] = []

    if (mentalLogs) {
      mentalLogs.forEach(log => {
        if (log.category === 'doomscroll' && log.duration_minutes >= 20) {
          anomalies.push({
            day: format(new Date(log.created_at), 'EEEE'),
            time: format(new Date(log.created_at), 'h:mm a'),
            event: `Lost ${log.duration_minutes} minutes to Doomscrolling`,
            impact: 'Broke your focus momentum and pulled your daily average down.',
            score: log.duration_minutes
          })
        }
        
        if (log.mood_before !== null && log.mood_after !== null) {
          const delta = log.mood_after - log.mood_before
          if (delta <= -2) {
             anomalies.push({
               day: format(new Date(log.created_at), 'EEEE'),
               time: format(new Date(log.created_at), 'h:mm a'),
               event: `Logged a significant mood drop after ${log.category} content`,
               impact: 'Triggered a downward emotional spiral for the afternoon.',
               score: Math.abs(delta) * 20
             })
          } else if (delta >= 2) {
             anomalies.push({
               day: format(new Date(log.created_at), 'EEEE'),
               time: format(new Date(log.created_at), 'h:mm a'),
               event: `Experienced a mood boost from ${log.category} content`,
               impact: 'Set a positive, high-energy tone for the rest of the day.',
               score: delta * 20
             })
          }
        }
      })
    }

    if (focusSessions) {
      focusSessions.forEach(session => {
        if (session.duration_minutes >= 30) {
          anomalies.push({
            day: format(new Date(session.created_at), 'EEEE'),
            time: format(new Date(session.created_at), 'h:mm a'),
            event: `Completed a ${session.duration_minutes}-minute Deep Focus Sprint`,
            impact: 'Set a new baseline. Your focus capacity was significantly higher afterwards.',
            score: session.duration_minutes * 1.5
          })
        }
      })
    }

    let shiftMoment = null
    if (anomalies.length > 0) {
      anomalies.sort((a, b) => b.score - a.score)
      const topAnomaly = anomalies[0]
      shiftMoment = {
        day: topAnomaly.day,
        time: topAnomaly.time,
        event: topAnomaly.event,
        impact: topAnomaly.impact
      }
    }

    // Dynamic Advice
    let finalAdvice = "Consistency is building. You're maintaining a stable baseline. Try replacing 15 minutes of scrolling with creative output next week."
    if (predictiveHealth.burnoutRisk === 'Critical' || predictiveHealth.burnoutRisk === 'High') {
      finalAdvice = "The hard truth: your content diet is strongly correlated with reduced focus. Protect your mornings next week to avoid a projected score drop."
    } else if (predictiveHealth.digitalDNA.learner > 40 && predictiveHealth.digitalDNA.creator > 20) {
      finalAdvice = "You are on track for your healthiest digital week this month. High learning and creation patterns detected. Keep this momentum."
    } else if (predictiveHealth.focusTrajectory === 'Declining') {
      finalAdvice = "Your focus dropped in the second half of the week. Try setting a Squad Mission to build accountability for next week."
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
        predictiveHealth,
        shiftMoment,
        finalAdvice
      }
    })
  } catch (error) {
    console.error('[API /weekly-report]', error)
    return NextResponse.json({ error: 'Failed to generate weekly report' }, { status: 500 })
  }
}
