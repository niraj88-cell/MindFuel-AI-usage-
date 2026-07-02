// app/api/admin/stats/route.ts — owner-only aggregate stats.
// Security posture: gated to a hard-coded owner email, uses the service role ONLY to
// COUNT rows (never to read user content). Deliberately exposes NO per-user content —
// the product is domain-only and privacy-first, so an admin panel must not become a
// content-surveillance surface. Errors are logged server-side and returned generic.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ADMIN_EMAILS = ['niraj2055adk@gmail.com']

export async function GET() {
  try {
    // 1. Caller must be signed in.
    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Caller must be the owner.
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[admin/stats] service credentials missing')
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    // 3. Service role, used only for aggregate COUNTs — never to read content.
    const adminDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const [{ count: totalUsers }, { count: totalSessions }, completed] = await Promise.all([
      adminDb.from('profiles').select('*', { count: 'exact', head: true }),
      adminDb.from('focus_sessions').select('*', { count: 'exact', head: true }),
      adminDb.from('focus_sessions').select('duration_s').eq('status', 'completed'),
    ])

    const totalFocusSeconds = (completed.data || []).reduce(
      (acc, s: { duration_s: number | null }) => acc + (s.duration_s || 0),
      0,
    )

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalSessions: totalSessions || 0,
        totalFocusHours: Math.round(totalFocusSeconds / 3600),
      },
      // Intentionally empty: the owner panel never reads user content.
      recentLogs: [],
    })
  } catch (err) {
    console.error('[admin/stats] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
