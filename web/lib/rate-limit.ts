// lib/rate-limit.ts — Enterprise sliding-window rate limiter for MindFuel API routes
// Uses Upstash Redis for distributed global rate limiting to scale to millions of users.
// Seamlessly falls back to an in-memory Map if Redis is not configured.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Types ──────────────────────────────────────────────────────────────────

interface SlidingWindowEntry {
  requests: number[]
  burstRequests: number[]
}

interface RateLimitConfig {
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

// ── Redis Setup ────────────────────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const hasRedis = !!(redisUrl && redisToken)
const redis = hasRedis ? new Redis({ url: redisUrl, token: redisToken }) : null

// Cache Ratelimit instances to avoid recreating them per request
const ratelimiters = new Map<string, Ratelimit>()

// ── Memory Fallback Store ──────────────────────────────────────────────────

const store = new Map<string, SlidingWindowEntry>()

// Garbage-collect expired entries every 2 minutes (only runs if Redis is off)
if (!hasRedis && typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.requests.every(t => now - t > 3_600_000)) {
        store.delete(key)
      }
    }
  }, 2 * 60 * 1000)
}

// ── Core Sliding-Window Algorithm ─────────────────────────────────────────

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()

  // 1. DISTRIBUTED REDIS MODE (Production Scale)
  if (hasRedis && redis) {
    try {
      // Determine the burst limit
      const burstLimit = config.burstLimit ?? Math.ceil(config.maxRequests / 6)
      
      // We use two ratelimiters per identifier: one for the main window, one for burst
      const mainKey = `rl_main:${config.maxRequests}:${config.windowSeconds}`
      const burstKey = `rl_burst:${burstLimit}:10`

      // Initialize main ratelimiter if not cached
      if (!ratelimiters.has(mainKey)) {
        ratelimiters.set(mainKey, new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSeconds} s`),
          analytics: true,
        }))
      }

      // Initialize burst ratelimiter if not cached
      if (!ratelimiters.has(burstKey)) {
        ratelimiters.set(burstKey, new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(burstLimit, '10 s'),
          analytics: true,
        }))
      }

      const burstLimiter = ratelimiters.get(burstKey)!
      const mainLimiter = ratelimiters.get(mainKey)!

      // Check burst first
      const burstResult = await burstLimiter.limit(`burst_${identifier}`)
      if (!burstResult.success) {
        return {
          success: false,
          remaining: 0,
          resetAt: burstResult.reset,
          burstBlocked: true,
        }
      }

      // Check main window
      const mainResult = await mainLimiter.limit(`main_${identifier}`)
      return {
        success: mainResult.success,
        remaining: mainResult.remaining,
        resetAt: mainResult.reset,
      }
    } catch (e) {
      console.warn(`[RateLimit] Redis failed for ${identifier}, falling back to memory store`, e)
    }
  }

  // 2. IN-MEMORY FALLBACK MODE (Local Dev / Unconfigured)
  const windowMs = config.windowSeconds * 1000
  const burstWindowMs = 10_000 // 10-second burst window
  const windowStart = now - windowMs
  const burstStart = now - burstWindowMs

  let entry = store.get(identifier)
  if (!entry) {
    entry = { requests: [], burstRequests: [] }
    store.set(identifier, entry)
  }

  entry.requests = entry.requests.filter(t => t > windowStart)
  entry.burstRequests = entry.burstRequests.filter(t => t > burstStart)

  const currentCount = entry.requests.length
  const burstCount = entry.burstRequests.length
  const burstLimit = config.burstLimit ?? Math.ceil(config.maxRequests / 6)

  if (burstCount >= burstLimit) {
    return {
      success: false,
      remaining: 0,
      resetAt: now + burstWindowMs,
      burstBlocked: true,
    }
  }

  if (currentCount >= config.maxRequests) {
    const oldestRequest = entry.requests[0] ?? now
    return {
      success: false,
      remaining: 0,
      resetAt: oldestRequest + windowMs,
    }
  }

  entry.requests.push(now)
  entry.burstRequests.push(now)
  const oldestRequest = entry.requests[0] ?? now

  return {
    success: true,
    remaining: config.maxRequests - entry.requests.length,
    resetAt: oldestRequest + windowMs,
  }
}

// ── IP-Based Rate Limiter (no userId needed) ───────────────────────────────

export async function checkIPRateLimit(fingerprint: string, config: RateLimitConfig): Promise<RateLimitResult> {
  return checkRateLimit(`ip:${fingerprint}`, config)
}

// ── Pre-Configured Limiters ────────────────────────────────────────────────

export async function checkCoachRateLimit(userId: string, tier: 'free' | 'premium'): Promise<RateLimitResult> {
  return checkRateLimit(`coach:${userId}`, {
    maxRequests: tier === 'premium' ? 500 : 50,
    windowSeconds: 3600,
    burstLimit: tier === 'premium' ? 15 : 5,
  })
}

export async function checkAnalyzeRateLimit(userId: string, tier: 'free' | 'premium'): Promise<RateLimitResult> {
  return checkRateLimit(`analyze:${userId}`, {
    maxRequests: tier === 'premium' ? 200 : 10,
    windowSeconds: 3600,
    burstLimit: tier === 'premium' ? 10 : 2,
  })
}

export async function checkMoodRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`mood:${userId}`, {
    maxRequests: 30,
    windowSeconds: 3600,
    burstLimit: 3,
  })
}

export async function checkInsightsRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`insights:${userId}`, {
    maxRequests: 60,
    windowSeconds: 3600,
    burstLimit: 5,
  })
}

export async function checkChallengesRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`challenges:${userId}`, {
    maxRequests: 60,
    windowSeconds: 3600,
    burstLimit: 5,
  })
}

export async function checkExportRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`export:${userId}`, {
    maxRequests: 5,
    windowSeconds: 86400,
    burstLimit: 1,
  })
}

export async function checkAuthRateLimit(fingerprint: string): Promise<RateLimitResult> {
  return checkRateLimit(`auth:${fingerprint}`, {
    maxRequests: 5,
    windowSeconds: 900,
    burstLimit: 2,
  })
}

export async function checkMobileCoachRateLimit(userId: string, tier: 'free' | 'premium'): Promise<RateLimitResult> {
  return checkRateLimit(`mobile-coach:${userId}`, {
    maxRequests: tier === 'premium' ? 1000 : 100,
    windowSeconds: 3600,
    burstLimit: tier === 'premium' ? 20 : 8,
  })
}

// ── Response Header Builder ────────────────────────────────────────────────

export function buildRateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'Retry-After': result.success ? '0' : String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  }
}

