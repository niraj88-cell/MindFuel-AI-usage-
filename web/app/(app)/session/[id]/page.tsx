'use client'

// SatyaShift — session detail (S-15).
// The reflective payoff a user lands on after a verified focus session.
// Everything shown here is read from the proof layer the /api/focus/stop route
// computes server-side (status, duration_s, session_quality, distraction_pct) plus
// the owner-only domain_logs for the session window.
//
// Design rules enforced here:
//  - The raw domain is PRIVATE. It appears only in "your view"; the squad card never shows it.
//  - 'unverified' is reported honestly (no fake "verified" badge) — that integrity is the product.
//  - green = trust/verified, amber = drift only, the quality label is yours alone.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  Check,
  Lock,
  EyeOff,
  Users,
  ChevronLeft,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { VerifiedMark } from '@/components/brand/VerifiedMark'
import {
  analyzeSession, reflectionFor,
  type AttentionEvent, type BehaviorSignals, type SessionQuality,
} from '@/lib/behavior'
import { sessionNoticing } from '@/lib/intelligence/reflection'
import { emptyProfile } from '@/lib/intelligence/traits'
import type { BehavioralProfile, SessionRecord } from '@/lib/intelligence/types'

interface FocusSession {
  id: string
  created_at: string
  status: string | null
  duration_s: number | null
  session_quality: string | null
  distraction_pct: number | null
  intention: string | null
  squad_id: string | null
  behavior: BehaviorSignals | null
}

interface DomainLog {
  domain: string
  duration_s: number
  category: string
  created_at: string
}

// h:mm clock, e.g. 8040s -> "2:14", 480s -> "0:08"
function clock(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return `${h}:${mm}`
}

// Humanized duration for headline numbers, e.g. 8040s -> "2h 14m", 2700s -> "45m".
// Matches the dashboard's format so one concept reads one way across the app.
function humanDuration(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return h === 0 ? `${mm}m` : `${h}h ${mm}m`
}

// The DB constraint allows category IN ('distraction','productive','neutral').
// 'distraction' is the drift bucket.
const DRIFT_CATEGORY = 'distraction'

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<FocusSession | null>(null)
  const [logs, setLogs] = useState<DomainLog[]>([])
  const [history, setHistory] = useState<BehaviorSignals[]>([])
  const [profile, setProfile] = useState<BehavioralProfile | null>(null)
  const [firstName, setFirstName] = useState<string>('You')

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setFirstName(user.user_metadata?.full_name?.split(' ')[0] || 'You')

      // RLS scopes this to the owner; an id you don't own simply returns nothing.
      const { data: s } = await supabase
        .from('focus_sessions')
        .select('id, created_at, status, duration_s, session_quality, distraction_pct, intention, squad_id, behavior')
        .eq('id', sessionId)
        .maybeSingle()

      if (!s) { setSession(null); return }
      setSession(s as unknown as FocusSession)

      // The ambient activity that happened during this session's window, in true dwell
      // order (seq breaks the tie inside a flush batch — every row shares one created_at).
      const start = s.created_at
      const endMs = new Date(s.created_at).getTime() + (s.duration_s ?? 0) * 1000
      const { data: d } = await supabase
        .from('domain_logs')
        .select('domain, duration_s, category, created_at')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', new Date(endMs + 60_000).toISOString())
        .order('created_at', { ascending: true })
        .order('seq', { ascending: true })
      setLogs((d as DomainLog[]) || [])

      // The user's recent behavioral history (their own rows only), for the one quiet
      // "compared to your recent sessions" line. Derived on the fly, never stored.
      const { data: past } = await supabase
        .from('focus_sessions')
        .select('behavior')
        .eq('user_id', user.id)
        .neq('id', sessionId)
        .not('behavior', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)
      setHistory(((past ?? []).map((r) => r.behavior) as unknown as BehaviorSignals[]).filter(Boolean))

      // The user's evolving behavioral profile (owner-only, domain-free) for the
      // profile-aware noticing. Absent for new users — the noticing falls back gracefully.
      const { data: bp } = await supabase
        .from('behavioral_profiles')
        .select('profile')
        .eq('user_id', user.id)
        .maybeSingle()
      setProfile((bp?.profile as unknown as BehavioralProfile) ?? null)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  // Derive the private view from the real domain_logs.
  const { perDomain, topDomain } = useMemo(() => {
    const map = new Map<string, { focused: number; drift: number }>()
    for (const l of logs) {
      const entry = map.get(l.domain) || { focused: 0, drift: 0 }
      if (l.category === DRIFT_CATEGORY) entry.drift += l.duration_s
      else entry.focused += l.duration_s
      map.set(l.domain, entry)
    }
    const rows = [...map.entries()]
      .map(([domain, v]) => ({ domain, seconds: v.focused + v.drift, drift: v.drift > v.focused }))
      .sort((a, b) => b.seconds - a.seconds)
    return { perDomain: rows, topDomain: rows[0]?.domain ?? null }
  }, [logs])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse py-10">
        <div className="mb-6 h-4 w-24 rounded bg-hairline" />
        <div className="mb-6 h-40 rounded-xl bg-hairline" />
        <div className="h-64 rounded-xl bg-hairline" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="font-serif text-xl text-ink">This session isn&apos;t here.</p>
        <p className="mt-2 text-sm text-soft">It may have been removed, or it isn&apos;t yours to view.</p>
        <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-green hover:underline">
          <ChevronLeft className="h-4 w-4" /> Back to today
        </Link>
      </div>
    )
  }

  const durationS = session.duration_s ?? 0
  const verified = !!session.session_quality && session.session_quality !== 'unverified'
  const start = new Date(session.created_at)
  const end = new Date(start.getTime() + durationS * 1000)
  const quality = session.session_quality ?? 'unverified'
  // Human, non-punitive status. Never surface the raw "abandoned" system word to a person.
  const statusLabel = session.status === 'abandoned' ? 'Short session' : 'Session complete'

  // Honest reflection from the session's behavioral SHAPE (lib/behavior.ts), not just a
  // percentage — a distraction loop is named as one, a recovery is acknowledged as one.
  // Sessions from before the behavior column get the same analysis from their own logs.
  const signals = session.behavior ?? analyzeSession(
    logs.map((l): AttentionEvent => ({
      domain: l.domain,
      category: l.category === 'distraction' || l.category === 'productive' ? l.category : 'neutral',
      duration_s: l.duration_s,
    })),
  )
  const satyaLine = reflectionFor(signals, durationS)
  // At most ONE quiet noticing, chosen against the user's evolving behavioral profile (with
  // a graceful fallback to the numeric baseline for new users). Silence is the default.
  const startLocal = new Date(session.created_at)
  const sessionRecord: SessionRecord = {
    startedAt: session.created_at,
    durationS,
    quality: quality as SessionQuality,
    signals,
    hour: startLocal.getHours(),
    dow: startLocal.getDay(),
  }
  // Seeded by the session's own duration so the phrasing varies between sessions but a
  // given session reads the same on every visit.
  const baselineNote = sessionNoticing(sessionRecord, profile ?? emptyProfile(), history, Date.now(), Math.round(durationS))?.line ?? null

  return (
    <div className="mx-auto max-w-3xl py-2">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-faint transition-colors hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Today
      </Link>

      {/* Verified hero */}
      <div className="rounded-xl border border-green-line bg-green-tint p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold text-green">
            <Check className="h-3.5 w-3.5" /> {statusLabel}
          </span>
          {verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green px-3 py-1 text-xs font-semibold text-white">
              <VerifiedMark verified size={13} className="text-white" /> Extension verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold text-faint">
              <VerifiedMark verified={false} size={13} /> Not verified
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-[1.9rem] leading-tight tracking-[-0.01em] text-ink">
              {session.intention || 'Focus session'}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-green">
              {format(start, 'h:mmaaa')} &ndash; {format(end, 'h:mmaaa')} &middot; {format(start, 'd MMM')}
            </p>
          </div>
          <div className="text-right leading-none">
            <div className="font-mono text-[2.75rem] font-medium text-green-deep">{humanDuration(durationS)}</div>
            <div className="mt-1 text-xs text-green">{verified ? 'of verified focus' : 'of focus time'}</div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-green-line pt-4">
          <Lock className="h-4 w-4 shrink-0 text-green" />
          <span className="text-xs text-green">Domain only. Never the page, the content, or what you typed.</span>
        </div>
      </div>

      {/* Private | Shared seam */}
      <div className="mt-8 grid gap-0 sm:grid-cols-2">
        {/* Your view — private */}
        <div className="sm:pr-7">
          <div className="mb-3 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-ghost" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Private &middot; only you</span>
          </div>

          <div className="rounded-xl border border-line bg-card p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Where the time went</span>
            </div>

            {perDomain.length === 0 ? (
              <p className="py-2 text-xs text-faint">No ambient activity was recorded for this session.</p>
            ) : (
              perDomain.map((row) => (
                <div key={row.domain} className="flex items-center justify-between border-b border-hairline py-2 last:border-0">
                  <span className="font-mono text-[13px] text-ink">{row.domain}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-[13px] text-faint">{clock(row.seconds)}</span>
                    {row.drift ? (
                      <span className="rounded-full bg-clay-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-clay">drift</span>
                    ) : (
                      <span className="rounded-full bg-green-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-green">focused</span>
                    )}
                  </span>
                </div>
              ))
            )}

            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
              <span className="text-xs text-faint">Quality &middot; your eyes only</span>
              <span className="font-mono text-[13px] capitalize text-soft">{quality}</span>
            </div>
          </div>

          <div className="mt-5 border-l-2 border-green pl-4">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-green">Satya</div>
            <p className="font-serif text-[1.2rem] italic leading-snug text-ink">
              {satyaLine}
            </p>
            {baselineNote && (
              <p className="mt-2 text-[13px] leading-relaxed text-faint">{baselineNote}</p>
            )}
          </div>
        </div>

        {/* Shared with your circle */}
        <div className="mt-6 border-l border-line pl-7 sm:mt-0">
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-green" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-green">Shared with your circle</span>
          </div>

          <div className="rounded-xl border border-green-line bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green text-[13px] font-semibold text-white">
                {firstName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">{firstName}</div>
                <div className="truncate text-xs text-faint">
                  {session.intention ? <span className="italic">&ldquo;{session.intention}&rdquo;</span> : 'Focused this session'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[15px] font-medium text-green">{humanDuration(durationS)}</div>
                {verified && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-green-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-green">
                    <VerifiedMark verified size={11} /> verified
                  </span>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-faint">
              That&apos;s all they get — verified time, no site, no score.
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              <EyeOff className="h-3 w-3" /> Stays private
            </div>
            {[
              `Which sites you visited${topDomain ? ` — even ${topDomain}` : ''}`,
              'The nudge, and how long you drifted',
              'Your quality reading',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 py-0.5 text-[13px] text-faint">
                <X className="h-3.5 w-3.5 shrink-0 text-ghost" /> {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
