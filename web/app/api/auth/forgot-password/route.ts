// app/api/auth/forgot-password/route.ts — Secure password reset flow
// Rate-limited by IP fingerprint to prevent account enumeration attacks

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAuthRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { getRequestFingerprint, validateEmail } from '@/lib/security'
import { auditLog } from '@/lib/audit-log'

export const runtime = 'nodejs'

const AUTH_LIMIT = 5

export async function POST(req: NextRequest) {
  try {
    const fingerprint = getRequestFingerprint(req)
    const rateCheck = await checkAuthRateLimit(fingerprint)
    const rlHeaders = buildRateLimitHeaders(rateCheck, AUTH_LIMIT)

    if (!rateCheck.success) {
      // Always return 200 to prevent timing attacks / enumeration
      // but include rate limit headers for legitimate clients
      return NextResponse.json(
        { message: 'If that email exists, a reset link has been sent.' },
        { status: 200, headers: rlHeaders }
      )
    }

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { email } = body
    const emailValidation = validateEmail(email)

    if (!emailValidation.valid) {
      // Return generic message to prevent email enumeration
      return NextResponse.json(
        { message: 'If that email exists, a reset link has been sent.' },
        { status: 200, headers: rlHeaders }
      )
    }

    const supabase = await createClient()

    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = req.headers.get('host')
    const origin = `${protocol}://${host}`

    // Supabase sends the password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    // Log the attempt (not the result — we don't want to reveal if email exists)
    auditLog({
      type: 'auth.password_reset',
      fingerprint,
      metadata: { email_domain: email.split('@')[1] || 'unknown' },
      severity: 'info',
    })

    if (error) {
      console.error('[Forgot Password]', error.message)
      // Still return 200 — don't reveal internal errors
    }

    return NextResponse.json(
      { message: 'If that email exists, a reset link has been sent.' },
      { status: 200, headers: rlHeaders }
    )
  } catch (error) {
    console.error('[API /auth/forgot-password]', error)
    return NextResponse.json(
      { message: 'If that email exists, a reset link has been sent.' },
      { status: 200 }
    )
  }
}
