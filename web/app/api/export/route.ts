// app/api/export/route.ts — Premium data export: JSON or CSV
// Authenticated, rate-limited (5/day), audit-logged

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkExportRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { auditDataExport } from '@/lib/audit-log'
import { format } from 'date-fns'

export const runtime = 'nodejs'

const EXPORT_LIMIT = 5

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit — 5 exports per day
    const rateCheck = await checkExportRateLimit(user.id)
    const rlHeaders = buildRateLimitHeaders(rateCheck, EXPORT_LIMIT)

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Export limit reached (5 per day). Try again tomorrow.' },
        { status: 429, headers: rlHeaders }
      )
    }

    const { searchParams } = new URL(req.url)
    const fmt = searchParams.get('format') || 'json'
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365)

    const since = format(new Date(Date.now() - days * 86400000), 'yyyy-MM-dd')

    // Fetch all user data in parallel
    const [
      { data: logs },
      { data: moods },
      { data: summaries },
      { data: challenges },
      { data: profile },
    ] = await Promise.all([
      supabase.from('mental_logs').select('*').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('daily_summaries').select('*').eq('user_id', user.id).gte('date', since).order('date', { ascending: false }),
      supabase.from('habit_challenges').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('email, full_name, subscription_tier, created_at').eq('id', user.id).maybeSingle(),
    ])

    const totalRecords = (logs?.length || 0) + (moods?.length || 0)
    auditDataExport(user.id, fmt, totalRecords)

    const exportData = {
      exported_at: new Date().toISOString(),
      user: { email: profile?.email, name: profile?.full_name, tier: profile?.subscription_tier, member_since: profile?.created_at },
      period_days: days,
      content_logs: logs || [],
      mood_logs: moods || [],
      daily_summaries: summaries || [],
      challenges: challenges || [],
    }

    if (fmt === 'csv') {
      // Build a flat CSV from content logs
      const headers = ['date', 'content', 'category', 'mental_score', 'duration_minutes', 'mood_before', 'mood_after']
      const rows = (logs || []).map(l => [
        l.created_at,
        `"${String(l.content || '').replace(/"/g, '""')}"`,
        l.category,
        l.mental_score,
        l.duration_minutes,
        l.mood_before ?? '',
        l.mood_after ?? '',
      ].join(','))
      const csv = [headers.join(','), ...rows].join('\n')

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mindfuel-export-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
          ...rlHeaders,
        },
      })
    }

    // Default: JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="mindfuel-export-${format(new Date(), 'yyyy-MM-dd')}.json"`,
        ...rlHeaders,
      },
    })
  } catch (error) {
    console.error('[API /export]', error)
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}
