// app/api/daily-coach/route.ts
// POST: Cron-triggered daily coaching via LangGraph agent (Vercel Cron)

import { NextRequest, NextResponse } from 'next/server'
import { runCoachAgent } from '@/lib/agents/MentalCoachAgent'
import { createAdminClient } from '@/lib/supabase/server'
import { subDays, format } from 'date-fns'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

    // Get all users who logged yesterday
    const { data: summaries } = await supabase
      .from('daily_summaries')
      .select('user_id, average_score, total_logs, category_breakdown, streak_days')
      .eq('date', yesterday)

    if (!summaries || summaries.length === 0) {
      return NextResponse.json({ message: 'No users to coach today' })
    }

    const results = []

    for (const summary of summaries) {
      try {
        // Get recent mood data
        const { data: moods } = await supabase
          .from('mood_logs')
          .select('mood, anxiety, created_at')
          .eq('user_id', summary.user_id)
          .gte('created_at', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
          .order('created_at', { ascending: false })
          .limit(10)

        const userData = {
          avg_score: summary.average_score,
          total_logs: summary.total_logs,
          categories: summary.category_breakdown,
          streak: summary.streak_days,
          recent_moods: moods || [],
        }

        // Run the LangGraph coach agent
        const agentResult = await runCoachAgent(summary.user_id, userData)

        // Store insight in Supabase
        await supabase.from('ai_insights').insert({
          user_id: summary.user_id,
          type: 'daily_coach',
          title: 'Daily Coach Update',
          body: agentResult.coachMessage,
          action_items: agentResult.recommendations,
          metadata: { insights: agentResult.insights },
          is_read: false,
        })

        // Store notification
        if (agentResult.shouldNotify) {
          await supabase.from('notifications').insert({
            user_id: summary.user_id,
            title: 'Daily Coach',
            body: agentResult.coachMessage.substring(0, 200),
            type: 'daily_coach',
            is_read: false,
            metadata: {},
          })
        }

        results.push({ userId: summary.user_id, status: 'ok' })
      } catch (err) {
        console.error(`[DailyCoach] Failed for user ${summary.user_id}:`, err)
        results.push({ userId: summary.user_id, status: 'error' })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error) {
    console.error('[API /daily-coach]', error)
    return NextResponse.json({ error: 'Daily coach failed' }, { status: 500 })
  }
}
