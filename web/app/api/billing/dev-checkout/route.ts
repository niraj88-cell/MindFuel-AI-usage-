// app/api/billing/dev-checkout/route.ts — DEVELOPER-ONLY checkout config (pre-launch testing).
//
// WHY THIS EXISTS: to go live, checkout needs the Paddle client token + price ids. If those
// are set as NEXT_PUBLIC_* they light up the overlay for EVERY trialing/free user (see the
// profile page's `checkoutEnabled` branch) — an unwanted pre-launch exposure. This route lets
// exactly one account (the owner) drive the REAL Paddle pipeline while the public UI stays
// inert: the owner's browser receives the checkout config from the SERVER only, never from the
// public bundle. It grants NOTHING — it just hands back the config the owner is allowed to see.
// Entitlement still flips only through the signed webhook + entitlement engine, untouched.
//
// Backend is the sole decider (never a client flag/cookie/query param): the caller must be
// authenticated AS the owner email, and the server-only PADDLE_CLIENT_TOKEN must be present.
// For anyone else — or when the dev env is unset — this endpoint answers 404 and does not
// exist. Remove at launch in one commit (see docs). GET only: no state change, CSRF-exempt.

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { readPaddlePublicEnv } from '@/lib/billing/public-config'

export const runtime = 'nodejs'

// Same owner identity used by app/api/admin/stats/route.ts. Kept local (house style).
const OWNER_EMAILS = ['niraj2055adk@gmail.com']

export async function GET() {
  try {
    // 1. Must be signed in (cookie session — this is called from the web profile page).
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !OWNER_EMAILS.includes(user.email)) {
      // Invisible to everyone else: as far as they can tell, the endpoint isn't here.
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2. The client token is SERVER-ONLY (never NEXT_PUBLIC pre-launch) so it is never in the
    //    public bundle. Price ids + environment come from the same env the webhook already
    //    reads, so the test exercises the exact production price → plan mapping. If the dev
    //    Paddle env isn't configured, dev checkout simply doesn't exist yet.
    const clientToken = process.env.PADDLE_CLIENT_TOKEN || null
    const pub = readPaddlePublicEnv()
    if (!clientToken || !pub.priceMonthly || !pub.priceYearly) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      environment: pub.environment,
      clientToken,
      priceMonthly: pub.priceMonthly,
      priceYearly: pub.priceYearly,
    })
  } catch (e) {
    console.error('[billing/dev-checkout] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
