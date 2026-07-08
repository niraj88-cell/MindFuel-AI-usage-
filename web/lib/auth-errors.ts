// lib/auth-errors.ts — Supabase auth errors, translated to the product's voice.
// Raw provider messages are mostly human, but the exceptions ("Database error saving
// new user", "email rate limit exceeded") surface exactly at the moment of most
// friction and puncture the product's otherwise controlled voice. Known messages map
// to plain words; anything that smells like infrastructure gets a calm generic line;
// everything else (already human, e.g. password-length guidance) passes through.

const EXACT: Record<string, string> = {
  'Invalid login credentials':
    'That email and password don’t match our records. Check both and try again.',
  'Email not confirmed':
    'This email hasn’t been confirmed yet — the confirmation link is waiting in your inbox.',
  'User already registered':
    'An account with this email already exists. Try signing in instead.',
}

const RATE_LIMITED = /rate limit|too many/i
const INFRASTRUCTURE = /database|unexpected|internal|fetch|network|timeout|failed to/i

export function humanAuthError(message?: string | null): string {
  const m = (message ?? '').trim()
  if (EXACT[m]) return EXACT[m]
  if (RATE_LIMITED.test(m)) {
    return 'Too many attempts in a short time. Give it a minute, then try again.'
  }
  if (!m || INFRASTRUCTURE.test(m)) {
    return 'That didn’t go through on our side — nothing wrong with your details. Please try again in a moment.'
  }
  return m
}
