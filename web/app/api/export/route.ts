// app/api/export/route.ts — "Download my data" (JSON or CSV).
//
// Privacy contract: SatyaShift stores DOMAINS ONLY. This export returns everything we hold
// about the user, in its stored, minimized form — bare domains, durations, categories, and the
// domain-free session signals. It contains NO full URLs, page paths, query parameters, video
// ids, titles, search terms, page content, or keystrokes, because none of that is ever
// collected or stored. Named columns only (never select('*')) so a new column can never
// silently widen the export. Authenticated, RLS-scoped, rate-limited (5/day), audit-logged
// (counts only). It reads only the two live SatyaShift tables — focus_sessions and domain_logs
// — and never the deleted MindFuel tables.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkExportRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { auditDataExport } from '@/lib/audit-log'
import { format } from 'date-fns'

export const runtime = 'nodejs'

const EXPORT_LIMIT = 5

// Neutralize spreadsheet formula injection: a CSV cell that begins with one of these could be
// executed by Excel/Sheets, so we prefix it with an apostrophe. Real hostnames never start with
// these characters — this is pure defense in depth for the downloaded file. Everything is also
// quoted with doubled inner quotes.
function csvCell(value: string | number | boolean | null | undefined): string {
  let s = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit — 5 exports per day.
    const rateCheck = await checkExportRateLimit(user.id)
    const rlHeaders = buildRateLimitHeaders(rateCheck, EXPORT_LIMIT)
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Export limit reached (5 per day). Try again tomorrow.' },
        { status: 429, headers: rlHeaders },
      )
    }

    const { searchParams } = new URL(req.url)
    const fmt = searchParams.get('format') || 'json'
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)
    const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString()

    // The user's real data. RLS restricts every row to this user; the explicit user_id filter is
    // defense in depth. Domain-free session signals live in `behavior` (counts/durations only,
    // proven to hold zero domains); domain_logs carries the BARE domain and nothing path-shaped.
    const [{ data: sessions }, { data: logs }, { data: profile }] = await Promise.all([
      supabase
        .from('focus_sessions')
        .select('created_at, duration_s, session_quality, distraction_pct, intention, status, behavior')
        .eq('user_id', user.id)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false }),
      supabase
        .from('domain_logs')
        .select('created_at, domain, category, duration_s')
        .eq('user_id', user.id)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .order('seq', { ascending: false }),
      supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    const focus_sessions = (sessions ?? []).map((s) => ({
      started_at: s.created_at,
      duration_s: s.duration_s ?? null,
      quality: s.session_quality ?? 'unverified',
      distraction_pct: s.distraction_pct ?? null,
      intention: s.intention ?? null,       // the user's own words, if they set one
      status: s.status ?? null,
      behavior: s.behavior ?? null,          // counts / durations / shares only — zero domains
    }))

    const attention_log = (logs ?? []).map((l) => ({
      at: l.created_at,
      domain: l.domain,                      // bare domain only — never a path, query, or full URL
      category: l.category,                  // distraction | productive | neutral
      duration_s: l.duration_s,
    }))

    // Audit trail: counts only — never a domain or any user content.
    auditDataExport(user.id, fmt, focus_sessions.length + attention_log.length)

    if (fmt === 'csv') {
      // The attention timeline, one row per domain dwell. Bare domain, no URL, no content.
      const headers = ['time', 'domain', 'category', 'duration_seconds']
      const rows = attention_log.map((r) =>
        [csvCell(r.at), csvCell(r.domain), csvCell(r.category), csvCell(r.duration_s)].join(','),
      )
      const csv = [headers.join(','), ...rows].join('\n')

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="satyashift-export-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
          ...rlHeaders,
        },
      })
    }

    // Default: JSON — the complete record we hold, with a plain statement of what it can't contain.
    const exportData = {
      exported_at: new Date().toISOString(),
      privacy_notice:
        'SatyaShift records domains only. This file contains no full URLs, page paths, query ' +
        'parameters, video ids, titles, searches, page content, or keystrokes — none of that is ' +
        'ever collected or stored.',
      account: {
        email: user.email ?? null,
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        member_since: user.created_at ?? null,
        plan: profile?.subscription_plan ?? 'free',
      },
      period_days: days,
      focus_sessions,
      attention_log,
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="satyashift-export-${format(new Date(), 'yyyy-MM-dd')}.json"`,
        ...rlHeaders,
      },
    })
  } catch (error) {
    console.error('[API /export]', error)
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}
