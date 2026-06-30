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
  ShieldCheck,
  ShieldAlert,
  Lock,
  EyeOff,
  Users,
  ChevronLeft,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FocusSession {
  id: string
  created_at: string
  status: string | null
  duration_s: number | null
  session_quality: string | null
  distraction_pct: number | null
  intention: string | null
  squad_id: string | null
}

interface DomainLog {
  domain: string
  duration_s: number
  category: string
  jitai_fired: boolean
  created_at: string
}

// h:mm clock, e.g. 8040s -> "2:14", 480s -> "0:08"
function clock(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return `${h}:${mm}`
}

// The DB constraint allows category IN ('distraction','productive','neutral').
// 'distraction' is the drift bucket. (Note: the /api/focus/stop route checks for
// 'doomscroll' here, which the constraint forbids — a backend bug worth fixing.)
const DRIFT_CATEGORY = 'distraction'

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<FocusSession | null>(null)
  const [logs, setLogs] = useState<DomainLog[]>([])
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
        .select('id, created_at, status, duration_s, session_quality, distraction_pct, intention, squad_id')
        .eq('id', sessionId)
        .maybeSingle()

      if (!s) { setSession(null); return }
      setSession(s as FocusSession)

      // The ambient activity that happened during this session's window.
      const start = s.created_at
      const endMs = new Date(s.created_at).getTime() + (s.duration_s ?? 0) * 1000
      const { data: d } = await supabase
        .from('domain_logs')
        .select('domain, duration_s, category, jitai_fired, created_at')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', new Date(endMs + 60_000).toISOString())
        .order('created_at', { ascending: true })
      setLogs((d as DomainLog[]) || [])
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  // Derive the private view from the real domain_logs.
  const { perDomain, topDomain, nudges } = useMemo(() => {
    const map = new Map<string, { focused: number; drift: number }>()
    let nudgeCount = 0
    for (const l of logs) {
      if (l.jitai_fired) nudgeCount++
      const entry = map.get(l.domain) || { focused: 0, drift: 0 }
      if (l.category === DRIFT_CATEGORY) entry.drift += l.duration_s
      else entry.focused += l.duration_s
      map.set(l.domain, entry)
    }
    const rows = [...map.entries()]
      .map(([domain, v]) => ({ domain, seconds: v.focused + v.drift, drift: v.drift > v.focused }))
      .sort((a, b) => b.seconds - a.seconds)
    return { perDomain: rows, topDomain: rows[0]?.domain ?? null, nudges: nudgeCount }
  }, [logs])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse py-10">
        <div className="mb-6 h-4 w-24 rounded bg-black/[0.06]" />
        <div className="mb-6 h-40 rounded-3xl bg-black/[0.05]" />
        <div className="h-64 rounded-3xl bg-black/[0.04]" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-lg font-semibold text-[#111827]">This session isn&apos;t here.</p>
        <p className="mt-2 text-sm text-[#6B7280]">It may have been removed, or it isn&apos;t yours to view.</p>
        <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2E7D32] hover:underline">
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
  const distraction = session.distraction_pct ?? 0

  // Honest, non-punitive reflection derived from the real result.
  const satyaLine = !verified
    ? `We couldn't verify this one — the extension wasn't watching. It still counts as time you set aside.`
    : distraction < 15
      ? `${clock(durationS)} of focus, barely a detour. A clean session.`
      : distraction < 50
        ? `${clock(durationS)} in, a couple of detours you caught. Steady work.`
        : `Some drift in there — but you showed up and put in the time. That counts.`

  return (
    <div className="mx-auto max-w-3xl py-2">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111827]">
        <ChevronLeft className="h-4 w-4" /> Today
      </Link>

      {/* Verified hero */}
      <div className="rounded-3xl bg-[#E8F5E9] p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2E7D32]">
            <Check className="h-3.5 w-3.5" /> Session {session.status || 'complete'}
          </span>
          {verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2E7D32] px-3 py-1 text-xs font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5" /> Extension verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#B45309]">
              <ShieldAlert className="h-3.5 w-3.5" /> Unverified
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
              {topDomain || session.intention || 'Focus session'}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-[#2E7D32]">
              {format(start, 'h:mmaaa')} &ndash; {format(end, 'h:mmaaa')} &middot; {format(start, 'd MMM')}
            </p>
          </div>
          <div className="text-right leading-none">
            <div className="font-mono text-[2.75rem] font-bold text-[#1B5E20]">{clock(durationS)}</div>
            <div className="mt-1 text-xs text-[#2E7D32]">hours of verified focus</div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-[#2E7D32]/15 pt-4">
          <Lock className="h-4 w-4 shrink-0 text-[#2E7D32]" />
          <span className="text-xs text-[#2E7D32]">Domain only. Never the page, the content, or what you typed.</span>
        </div>
      </div>

      {/* Private | Shared seam */}
      <div className="mt-6 grid gap-0 sm:grid-cols-2">
        {/* Your view — private */}
        <div className="sm:pr-7">
          <div className="mb-3 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#9CA3AF]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">Private &middot; only you</span>
          </div>

          <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">Where the time went</span>
              {nudges > 0 && <span className="text-[11px] text-[#9CA3AF]">{nudges} gentle nudge{nudges > 1 ? 's' : ''}</span>}
            </div>

            {perDomain.length === 0 ? (
              <p className="py-2 text-xs text-[#9CA3AF]">No ambient activity was recorded for this session.</p>
            ) : (
              perDomain.map((row) => (
                <div key={row.domain} className="flex items-center justify-between border-b border-black/[0.05] py-2 last:border-0">
                  <span className="font-mono text-[13px] text-[#111827]">{row.domain}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-[13px] text-[#6B7280]">{clock(row.seconds)}</span>
                    {row.drift ? (
                      <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#B45309]">drift</span>
                    ) : (
                      <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#2E7D32]">focused</span>
                    )}
                  </span>
                </div>
              ))
            )}

            <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3">
              <span className="text-xs text-[#9CA3AF]">Quality &middot; your eyes only</span>
              <span className="font-mono text-[13px] capitalize text-[#6B7280]">{quality}{verified ? ` · ${distraction}% drift` : ''}</span>
            </div>
          </div>

          <div className="mt-4 border-l-2 border-[#4CAF50] pl-4">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">Satya</div>
            <p className="text-[15px] italic leading-relaxed text-[#111827]" style={{ fontFamily: 'var(--font-serif)' }}>
              {satyaLine}
            </p>
          </div>
        </div>

        {/* Shared with squad */}
        <div className="mt-6 border-l-2 border-[#A5D6A7] pl-7 sm:mt-0">
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#2E7D32]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#2E7D32]">Shared with your squad</span>
          </div>

          <div className="rounded-2xl border border-[#A5D6A7] bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2E7D32] text-[13px] font-semibold text-white">
                {firstName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#111827]">{firstName}</div>
                <div className="truncate text-xs text-[#6B7280]">
                  {session.intention ? <span className="italic">&ldquo;{session.intention}&rdquo;</span> : 'Focused this session'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[15px] font-semibold text-[#2E7D32]">{clock(durationS)}</div>
                {verified && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#2E7D32]">
                    <ShieldCheck className="h-3 w-3" /> verified
                  </span>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#9CA3AF]">
              That&apos;s all they get — verified time, no site, no score.
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">
              <EyeOff className="h-3 w-3" /> Stays private
            </div>
            {[
              `Which sites you visited${topDomain ? ` — even ${topDomain}` : ''}`,
              'The nudge, and how long you drifted',
              'Your quality reading',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 py-0.5 text-[13px] text-[#6B7280]">
                <X className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" /> {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
