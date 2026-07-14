// app/api/billing/health/route.ts — OWNER-ONLY billing self-check (no money, no secrets).
//
// Purpose: confirm the payment system is wired correctly WITHOUT running a paid transaction.
// A solo founder can open this while logged in as the owner and see, at a glance:
//   - is checkout able to open (client env present)?
//   - is the webhook pipeline armed (secret present) and is the portal ready (api key)?
//   - are webhook events actually ARRIVING and being PROCESSED (from billing_events)?
// It reports only booleans and counts — never a secret value — so it is safe to look at.
// Invisible (404) to anyone who is not the owner, exactly like dev-checkout.
//
// Free end-to-end test it enables: send a simulated event from Paddle's dashboard
// (Developer Tools > Notifications > simulate), then reload this endpoint. If
// `events.total` went up and `events.lastReceivedAt` is recent, your signature secret and
// endpoint URL are correct — proven for $0.

import { NextResponse } from 'next/server'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getBillingConfig } from '@/lib/billing/config'

export const runtime = 'nodejs'

// Same owner identity used by dev-checkout / admin stats.
const OWNER_EMAILS = ['niraj2055adk@gmail.com']

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !OWNER_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const cfg = getBillingConfig()

    // Presence-only view of the environment (never the values themselves).
    const config = {
      PADDLE_WEBHOOK_SECRET: !!cfg.webhookSecret,
      PADDLE_API_KEY: !!cfg.apiKey,
      NEXT_PUBLIC_PADDLE_ENV: cfg.environment,
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: !!cfg.clientToken,
      NEXT_PUBLIC_PADDLE_PRICE_MONTHLY: !!cfg.priceMonthly,
      NEXT_PUBLIC_PADDLE_PRICE_YEARLY: !!cfg.priceYearly,
    }

    // Read the event store + mirror with the service role (billing_events is deny-all RLS).
    const admin = createAdminClient()
    const [{ count: eventsTotal }, { count: unprocessed }, { count: subsTotal }, { data: lastEvent }] =
      await Promise.all([
        admin.from('billing_events').select('*', { count: 'exact', head: true }),
        admin.from('billing_events').select('*', { count: 'exact', head: true }).is('processed_at', null),
        admin.from('billing_subscriptions').select('*', { count: 'exact', head: true }),
        admin.from('billing_events').select('received_at, processed_at, event_type').order('received_at', { ascending: false }).limit(1).maybeSingle(),
      ])

    const warnings: string[] = []
    if (!cfg.webhookSecret) warnings.push('Webhook is OFF: PADDLE_WEBHOOK_SECRET is missing — paid events cannot be recorded.')
    if (!cfg.checkoutEnabled) warnings.push('Checkout cannot open: one or more NEXT_PUBLIC_PADDLE_* client values are missing.')
    if (!cfg.apiKey) warnings.push('Manage/cancel portal is OFF: PADDLE_API_KEY is missing.')
    if (cfg.environment !== 'production') warnings.push('Environment is SANDBOX — real cards will be declined. Set NEXT_PUBLIC_PADDLE_ENV=production to sell for real.')
    if ((unprocessed ?? 0) > 0) warnings.push(`${unprocessed} webhook event(s) received but NOT processed — check server logs.`)
    if ((eventsTotal ?? 0) === 0) warnings.push('No webhook events received yet. Send a simulated event from Paddle to prove the endpoint, or complete one checkout.')

    // "ready" = everything code can control is in place. It does NOT prove the Paddle
    // dashboard facts (identity verified, domain approved, webhook URL registered).
    const ready = cfg.enabled && cfg.checkoutEnabled && !!cfg.apiKey && cfg.environment === 'production'

    return NextResponse.json({
      ready,
      environment: cfg.environment,
      config,
      events: {
        total: eventsTotal ?? 0,
        unprocessed: unprocessed ?? 0,
        lastReceivedAt: lastEvent?.received_at ?? null,
        lastProcessedAt: lastEvent?.processed_at ?? null,
        lastEventType: lastEvent?.event_type ?? null,
      },
      subscriptions: { total: subsTotal ?? 0 },
      warnings,
      // Reminder of what this check CANNOT see (Paddle-side, must be confirmed in the dashboard):
      stillConfirmInPaddle: [
        'Business/identity verification passed',
        'Checkout domain satyashift.com is approved',
        'Webhook destination = https://satyashift.com/api/billing/webhook, subscribed to subscription.* events',
        'The API key + webhook secret are the LIVE ones, not sandbox',
      ],
    })
  } catch (e) {
    console.error('[billing/health] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
