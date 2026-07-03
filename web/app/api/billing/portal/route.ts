// app/api/billing/portal/route.ts — mint a Paddle customer portal session so a subscriber
// can update payment details or cancel (the "one-click cancel" the Terms/Pricing pages
// promise). Cookie- or bearer-authed; the API key stays server-side and never reaches the
// client. We return only a short-lived, single-use portal URL (generated on demand, never
// cached, per Paddle guidance). Generic errors by house rule.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/route-auth'
import { getBillingConfig, paddleApiBase } from '@/lib/billing/config'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const ctx = await getUserContext(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { supabase, userId } = ctx

    const cfg = getBillingConfig()
    if (!cfg.enabled || !cfg.apiKey) {
      // Billing not configured — the portal simply doesn't exist yet.
      return NextResponse.json({ error: 'Not available' }, { status: 404 })
    }

    // Modest per-user ceiling (the global edge limiter is the flood guard).
    const admin = createAdminClient()
    const { data: allowed } = await admin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'billing_portal',
      p_max_calls: 30,
    })
    if (allowed === false) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

    // Own mirror row only (RLS also enforces this). No subscription → nothing to manage.
    const { data: sub } = await supabase
      .from('billing_subscriptions')
      .select('provider_customer_id, provider_subscription_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!sub?.provider_customer_id) {
      return NextResponse.json({ error: 'No subscription' }, { status: 404 })
    }

    // POST /customers/{id}/portal-sessions — no body needed; passing the subscription id
    // yields a direct cancel/update deep link in the response.
    const res = await fetch(
      `${paddleApiBase(cfg.environment)}/customers/${encodeURIComponent(sub.provider_customer_id)}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          sub.provider_subscription_id ? { subscription_ids: [sub.provider_subscription_id] } : {},
        ),
      },
    )
    if (!res.ok) {
      console.error('[billing/portal] Paddle API error:', res.status)
      return NextResponse.json({ error: 'Could not open the portal' }, { status: 502 })
    }
    const data = await res.json().catch(() => null)
    // Prefer the direct cancel deep link when present; fall back to the portal overview.
    const url: string | undefined =
      data?.data?.urls?.subscriptions?.[0]?.cancel_subscription ??
      data?.data?.urls?.general?.overview
    if (!url) return NextResponse.json({ error: 'Could not open the portal' }, { status: 502 })

    return NextResponse.json({ url })
  } catch (e) {
    console.error('[billing/portal] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
