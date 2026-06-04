// app/api/neuro/route.ts
// GET: Real-time neurochemical state + focus prophecy
// Returns the user's estimated brain chemistry and day prediction

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimateNeuroState } from '@/lib/agents/tools/neuroState'
import { generateFocusProphecy } from '@/lib/agents/tools/focusProphecy'
import { subHours, format } from 'date-fns'

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

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const threeHoursAgo = subHours(now, 3)

    // Fetch all data in parallel
    const [logsResult, moodsResult, focusResult, pulseResult] = await Promise.all([
      // Recent content logs (last 3 hours for neuro state)
      supabase
        .from('mental_logs')
        .select('category, mental_score, duration_minutes, created_at')
        .eq('user_id', user.id)
        .gte('created_at', threeHoursAgo.toISOString())
        .order('created_at', { ascending: false }),

      // Recent moods
      supabase
        .from('mood_logs')
        .select('mood, energy, anxiety, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),

      // Today's focus sessions
      supabase
        .from('focus_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString()),

      // Today's pulse
      supabase
        .from('daily_pulses')
        .select('rating')
        .eq('user_id', user.id)
        .eq('date', format(now, 'yyyy-MM-dd'))
        .maybeSingle(),
    ])

    const logs = logsResult.data || []
    const moods = moodsResult.data || []
    const focusSessions = focusResult.data || []
    const todayPulse = pulseResult.data?.rating || null

    const focusMinutesToday = focusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

    // Compute neuro state
    const neuroState = estimateNeuroState(logs, moods, todayPulse, focusMinutesToday)

    // Compute focus prophecy context
    const todayLogs = logs // already filtered to recent
    const doomscrollMinutes = todayLogs
      .filter(l => l.category === 'doomscroll' || l.category === 'entertainment')
      .reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
    const productiveMinutes = todayLogs
      .filter(l => ['educational', 'productive', 'creative'].includes(l.category))
      .reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
    const shortSessions = todayLogs.filter(l => (l.duration_minutes || 0) < 5).length
    const currentScore = todayLogs.length > 0
      ? Math.round(todayLogs.reduce((sum, l) => sum + l.mental_score, 0) / todayLogs.length)
      : 50
    const latestMood = moods[0]?.mood ?? 5
    const latestEnergy = todayPulse ?? (moods[0]?.energy ?? 3)

    const prophecy = await generateFocusProphecy({
      hour: now.getHours(),
      currentScore,
      totalLogs: todayLogs.length,
      doomscrollMinutes,
      productiveMinutes,
      focusMinutes: focusMinutesToday,
      latestMood,
      latestEnergy,
      shortSessions,
    })

    return NextResponse.json({
      neuroState,
      prophecy,
      meta: {
        focusMinutesToday,
        currentScore,
        totalLogsToday: todayLogs.length,
      }
    })
  } catch (error) {
    console.error('[API /neuro]', error)
    return NextResponse.json({ error: 'Failed to compute neural state' }, { status: 500 })
  }
}
