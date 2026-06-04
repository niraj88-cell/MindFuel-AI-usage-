import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    // 1. Verify caller is logged in
    const authSupabase = await createServerClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify caller is the CEO
    const ADMIN_EMAILS = [
      'niraj2055adk@gmail.com'
    ]

    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden: CEO Access Only' }, { status: 403 })
    }

    // 3. Connect to Supabase with SERVICE ROLE to bypass RLS and fetch global stats
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Admin keys missing on server' }, { status: 500 })
    }

    const adminDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Aggregate Data
    // a. Total Users
    const { count: totalUsers } = await adminDb
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // b. Total Logs (Doomscrolling intercepts)
    const { count: totalLogs } = await adminDb
      .from('mental_logs')
      .select('*', { count: 'exact', head: true })

    // c. Total Focus Hours
    const { data: focusSessions } = await adminDb
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('completed', true)
    
    const totalFocusMinutes = focusSessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0
    const totalFocusHours = Math.round(totalFocusMinutes / 60)

    // d. Recent Anonymized Logs
    const { data: recentLogs } = await adminDb
      .from('mental_logs')
      .select('content, mental_score, category, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalLogs: totalLogs || 0,
        totalFocusHours,
      },
      recentLogs: recentLogs || []
    })

  } catch (err: any) {
    console.error('Admin API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
