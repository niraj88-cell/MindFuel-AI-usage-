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
  // Supabase's wording when "Allow new users to sign up" is off. The front door invites
  // people to create an account, so this WILL be seen whenever that toggle is closed —
  // it has to read as a deliberate state, not as the product being broken.
  'Signups not allowed for this instance':
    'New accounts aren’t open just yet. If you already have one, you can sign in below.',
}

const RATE_LIMITED = /rate limit|too many/i
const INFRASTRUCTURE = /database|unexpected|internal|fetch|network|timeout|failed to/i
// Matched loosely on purpose: the exact string above is the current wording, but this is
// the one error whose phrasing we cannot afford to have drift back into raw provider voice.
const SIGNUP_DISABLED = /signups? (are )?not allowed|signup_disabled|signups disabled/i

export function humanAuthError(message?: string | null): string {
  const m = (message ?? '').trim()
  if (EXACT[m]) return EXACT[m]
  if (SIGNUP_DISABLED.test(m)) return EXACT['Signups not allowed for this instance']
  if (RATE_LIMITED.test(m)) {
    return 'Too many attempts in a short time. Give it a minute, then try again.'
  }
  if (!m || INFRASTRUCTURE.test(m)) {
    return 'That didn’t go through on our side — nothing wrong with your details. Please try again in a moment.'
  }
  return m
}
