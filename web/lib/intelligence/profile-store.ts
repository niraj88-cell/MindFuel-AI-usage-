// lib/intelligence/profile-store.ts — the server edge between the pure intelligence core
// and the owner-only behavioral_profiles row. NOT pure (touches the DB, Date/Intl); the
// math stays in traits.ts. Timezone-aware hour/day-of-week is computed HERE so the pure
// modules never import Intl and stay trivially testable.
//
// Everything here is best-effort by contract: callers wrap it so a profile hiccup can never
// break the request it rides on (e.g. stopping a focus session).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'
import type { BehaviorSignals, SessionQuality } from '@/lib/behavior'
import { emptyProfile, updateProfile } from './traits.ts'
import type { BehavioralProfile, SessionRecord } from './types.ts'

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Local hour (0..23) and day-of-week (0=Sun) of an instant in the user's timezone. Falls
// back to UTC if the timezone is missing or unrecognized.
export function localHourDow(iso: string, timezone: string | null): { hour: number; dow: number } {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour12: false,
      hour: '2-digit',
      weekday: 'short',
    })
    let hour = 0
    let dow = 0
    for (const part of dtf.formatToParts(new Date(iso))) {
      if (part.type === 'hour') hour = parseInt(part.value, 10) % 24
      else if (part.type === 'weekday') dow = WEEKDAY[part.value] ?? 0
    }
    return { hour, dow }
  } catch {
    const d = new Date(iso)
    return { hour: d.getUTCHours(), dow: d.getUTCDay() }
  }
}

// A stored profile is trusted only if it has the expected shape and version; otherwise we
// rebuild from empty (the row is a cache, so discarding a malformed one is always safe).
function coerceProfile(raw: unknown): BehavioralProfile {
  const p = raw as BehavioralProfile | null
  if (p && p.v === emptyProfile().v && p.traits && p.rhythm && p.acc) return p
  return emptyProfile()
}

/**
 * Fold one finished session into the user's behavioral profile and persist it. Uses the
 * USER-SCOPED client (owner RLS) — the service role never touches this cache.
 */
export async function updateBehavioralProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  raw: { startedAt: string; durationS: number; quality: SessionQuality; signals: BehaviorSignals | null },
): Promise<void> {
  const [{ data: prof }, { data: bp }] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', userId).maybeSingle(),
    supabase.from('behavioral_profiles').select('profile').eq('user_id', userId).maybeSingle(),
  ])

  const { hour, dow } = localHourDow(raw.startedAt, prof?.timezone ?? null)
  const record: SessionRecord = {
    startedAt: raw.startedAt,
    durationS: raw.durationS,
    quality: raw.quality,
    signals: raw.signals,
    hour,
    dow,
  }

  const next = updateProfile(coerceProfile(bp?.profile), record)
  await supabase.from('behavioral_profiles').upsert({
    user_id: userId,
    profile: next as unknown as Json,
    sessions_seen: next.sessionsSeen,
    version: next.v,
    updated_at: new Date().toISOString(),
  })
}
