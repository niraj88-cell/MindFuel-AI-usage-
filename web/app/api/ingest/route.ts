// app/api/ingest/route.ts — SatyaShift ambient ingest (the core write path).
// The Chrome extension batches domain visits every ~5 min and POSTs them here with
// the user's Supabase JWT. Writes are DOMAIN-ONLY, RLS-enforced, idempotent per
// batch_id, and rate-limited by the Postgres check_rate_limit function.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createJwtClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { z } from 'zod'

export const runtime = 'nodejs'

const MAX_BATCHES_PER_HOUR = 60 // one batch/min is plenty for 5-min batching

const EventSchema = z.object({
  domain: z.string().min(1).max(255),
  duration_s: z.number().int().min(0).max(86_400),
  category: z.string().max(40).optional(),
  jitai_fired: z.boolean().optional(),
  jitai_outcome: z.enum(['close', 'dismiss', 'ignore']).optional(),
})

const BatchSchema = z.object({
  batch_id: z.string().uuid(),
  events: z.array(EventSchema).min(1).max(500),
})

// Defense in depth: even if a full URL slips through, store only the bare domain.
function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase()
  try {
    if (d.includes('/') || d.includes(':')) {
      d = new URL(d.startsWith('http') ? d : `https://${d}`).hostname
    }
  } catch {
    /* keep the raw value if it isn't URL-parseable */
  }
  return d.replace(/^www\./, '').slice(0, 255)
}

export async function POST(req: NextRequest) {
  // 1. Auth — extension forwards the user's Supabase access token as Bearer.
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // User-scoped client: all writes run under RLS as this user (defense in depth).
  const supabase = createJwtClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate payload.
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = BatchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid batch payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { batch_id, events } = parsed.data

  // 3. Rate limit — Postgres limiter, callable only via service role.
  const admin = createAdminClient()
  const { data: allowed, error: rlError } = await admin.rpc('check_rate_limit', {
    p_user_id: user.id,
    p_endpoint: 'ingest',
    p_max_calls: MAX_BATCHES_PER_HOUR,
  })
  if (rlError) {
    console.error('[ingest] rate-limit RPC error:', rlError)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // 4. Idempotency — the batch_id primary key in processed_batches is the lock.
  const { error: batchError } = await supabase
    .from('processed_batches')
    .insert({ id: batch_id, user_id: user.id, row_count: events.length })
  if (batchError) {
    if (batchError.code === '23505') {
      // Duplicate delivery of an already-processed batch — safe no-op.
      return NextResponse.json({ success: true, duplicate: true, inserted: 0 })
    }
    console.error('[ingest] processed_batches insert error:', batchError)
    return NextResponse.json({ error: 'Failed to record batch' }, { status: 500 })
  }

  // 5. Insert the domain-only rows.
  const rows = events.map((e) => ({
    user_id: user.id,
    domain: normalizeDomain(e.domain),
    duration_s: e.duration_s,
    category: e.category ?? 'neutral',
    batch_id,
    jitai_fired: e.jitai_fired ?? false,
    jitai_outcome: e.jitai_outcome ?? null,
  }))

  const { error: insertError } = await supabase.from('domain_logs').insert(rows)
  if (insertError) {
    // Roll back the idempotency marker so the extension can safely retry.
    await supabase.from('processed_batches').delete().eq('id', batch_id)
    console.error('[ingest] domain_logs insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save events' }, { status: 500 })
  }

  return NextResponse.json({ success: true, inserted: rows.length })
}
