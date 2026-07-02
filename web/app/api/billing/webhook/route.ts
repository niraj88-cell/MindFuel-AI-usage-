// app/api/billing/webhook/route.ts — transport shell only. Signature-authed (HMAC),
// so it is exempt from the cookie-CSRF origin gate in proxy.ts. All logic lives in
// lib/billing/service.ts; this handler reads the raw body, delegates, and answers
// with generic statuses (never details — a prober learns nothing here).
// Returns 404 while billing is unconfigured: the endpoint does not exist until keys do.

import { NextResponse } from 'next/server'
import { processWebhook } from '@/lib/billing/service'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text() // raw, unparsed — the signature covers these bytes
    const outcome = await processWebhook(rawBody, req.headers.get('paddle-signature'))
    if (outcome.status === 200) return NextResponse.json(outcome.body, { status: 200 })
    return NextResponse.json({ error: 'Request failed' }, { status: outcome.status })
  } catch (e) {
    console.error('[billing/webhook] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
