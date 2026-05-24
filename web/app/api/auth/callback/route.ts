// app/api/auth/callback/route.ts
// Handles OAuth callback from Supabase (Google sign-in)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Use the origin from the request (works on both localhost and production)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
