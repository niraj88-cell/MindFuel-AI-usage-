// lib/rate-limit.ts — Unified rate limiting for SatyaShift.
// Per-USER limits use the Postgres check_rate_limit() function (hourly window per user
// per endpoint) — the single source of truth, replacing Upstash. The edge WAF (per-IP,
// pre-auth, runs in middleware) uses an in-memory sliding window, because it cannot use
// the uuid-keyed Postgres function and must not add a DB round-trip to every request.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  burstLimit?: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  burstBlocked?: boolean
}

// ── Postgres-backed per-user limiter ────────────────────────────────────────

let adminClient: SupabaseClient | null = null
function getAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  }
  return adminClient
}

function nextHourEpoch(): number {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  return d.getTime() + 3_600_000
}

/**
 * Per-user, per-endpoint hourly limit via the Postgres check_rate_limit() function.
 * Fails OPEN on infrastructure error (a DB hiccup must not lock users out) but logs it.
 */
async function pgUserLimit(
  userId: string,
  endpoint: string,
  maxPerHour: number,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await getAdmin().rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_max_calls: maxPerHour,
    })
    if (error) {
      console.error(`[RateLimit] check_rate_limit failed for ${endpoint}:`, error.message)
      return { success: true, remaining: maxPerHour, resetAt: nextHourEpoch() }
    }
    return { success: data === true, remaining: data ? 1 : 0, resetAt: nextHourEpoch() }
  } catch (e) {
    console.error(`[RateLimit] check_rate_limit threw for ${endpoint}:`, e)
    return { success: true, remaining: maxPerHour, resetAt: nextHourEpoch() }
  }
}

// ── In-memory sliding window (edge WAF + pre-login auth only) ────────────────

interface SlidingWindowEntry {
  requests: number[]
}
const store = new Map<string, SlidingWindowEntry>()

// Garbage-collect idle entries every 2 minutes.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.requests.every((t) => now - t > 3_600_000)) store.delete(key)
    }
  }, 2 * 60 * 1000)
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const windowStart = now - windowMs

  let entry = store.get(identifier)
  if (!entry) {
    entry = { requests: [] }
    store.set(identifier, entry)
  }
  entry.requests = entry.requests.filter((t) => t > windowStart)

  if (entry.requests.length >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: (entry.requests[0] ?? now) + windowMs }
  }
  entry.requests.push(now)
  return {
    success: true,
    remaining: config.maxRequests - entry.requests.length,
    resetAt: (entry.requests[0] ?? now) + windowMs,
  }
}

export async function checkIPRateLimit(
  fingerprint: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  return checkRateLimit(`ip:${fingerprint}`, config)
}

// ── Pre-configured per-user limiters (hourly windows via Postgres) ──────────

export async function checkCoachRateLimit(userId: string, tier: 'free' | 'premium') {
  return pgUserLimit(userId, 'coach', tier === 'premium' ? 500 : 50)
}

export async function checkAnalyzeRateLimit(userId: string, tier: 'free' | 'premium') {
  return pgUserLimit(userId, 'analyze', tier === 'premium' ? 200 : 10)
}

export async function checkMoodRateLimit(userId: string) {
  return pgUserLimit(userId, 'mood', 30)
}

export async function checkInsightsRateLimit(userId: string) {
  return pgUserLimit(userId, 'insights', 60)
}

export async function checkChallengesRateLimit(userId: string) {
  return pgUserLimit(userId, 'challenges', 60)
}

export async function checkExportRateLimit(userId: string) {
  return pgUserLimit(userId, 'export', 5)
}

export async function checkMobileCoachRateLimit(userId: string, tier: 'free' | 'premium') {
  return pgUserLimit(userId, 'mobile-coach', tier === 'premium' ? 1000 : 100)
}

// Pre-login (no user id yet) → IP-based in-memory, 5 attempts / 15 min.
export async function checkAuthRateLimit(fingerprint: string) {
  return checkRateLimit(`auth:${fingerprint}`, { maxRequests: 5, windowSeconds: 900 })
}

// ── Response Header Builder ─────────────────────────────────────────────────

export function buildRateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'Retry-After': result.success
      ? '0'
      : String(Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000))),
  }
}
