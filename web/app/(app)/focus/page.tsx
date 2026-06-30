'use client'

// SatyaShift — focus session control (start / running / stop).
// Ambient model: the user starts a session, works normally while the extension
// verifies in the background, then stops. Duration and quality are measured
// SERVER-SIDE (/api/focus/start anchors the start time, /api/focus/stop computes
// the rest from domain_logs) — the client never fabricates focus data. On stop we
// route to the session-detail screen for the verified result.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Play, Square, ShieldCheck, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SessionRow {
  id: string
  created_at: string
  status: string | null
  duration_s: number | null
  session_quality: string | null
  intention: string | null
}

// count-up clock: 754s -> "12:34", 3754s -> "1:02:34"
function elapsedClock(totalSeconds: number) {
  const s = Math.max(0, totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// completed-duration clock: 8040s -> "2:14"
function durationClock(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

export default function FocusPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [intention, setIntention] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SessionRow[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadState = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: active } = await supabase
        .from('focus_sessions')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (active) {
        setActiveId(active.id)
        setStartedAt(new Date(active.created_at).getTime())
      }

      const { data: past } = await supabase
        .from('focus_sessions')
        .select('id, created_at, status, duration_s, session_quality, intention')
        .eq('user_id', user.id)
        .neq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8)
      setHistory((past as SessionRow[]) || [])
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { loadState() }, [loadState])

  // Tick the live count-up while a session is active.
  useEffect(() => {
    if (startedAt == null) {
      if (tickRef.current) clearInterval(tickRef.current)
      return
    }
    const update = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    update()
    tickRef.current = setInterval(update, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [startedAt])

  async function startSession() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/focus/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intention: intention.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start')
      setActiveId(data.session_id)
      setStartedAt(new Date(data.started_at).getTime())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start')
    } finally {
      setBusy(false)
    }
  }

  async function stopSession() {
    if (!activeId) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/focus/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not stop')
      router.push(`/session/${activeId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not stop')
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg animate-pulse py-16">
        <div className="mx-auto h-48 w-full rounded-3xl bg-black/[0.05]" />
      </div>
    )
  }

  // ── Running ───────────────────────────────────────────────
  if (activeId && startedAt != null) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center py-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-semibold text-[#2E7D32]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#4CAF50]" /> Focusing
        </span>

        <div className="mt-8 font-mono text-6xl font-bold tracking-tight text-[#111827] tabular-nums">
          {elapsedClock(elapsed)}
        </div>
        {intention.trim() && (
          <p className="mt-3 text-sm italic text-[#6B7280]">&ldquo;{intention.trim()}&rdquo;</p>
        )}

        <p className="mt-8 max-w-xs text-sm leading-relaxed text-[#9CA3AF]">
          Just work like you normally would. SatyaShift is verifying this in the background — nothing to manage.
        </p>

        {error && <p className="mt-4 text-sm text-[#B45309]">{error}</p>}

        <button
          onClick={stopSession}
          disabled={busy}
          className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          End session
        </button>
      </div>
    )
  }

  // ── Idle / start ──────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Start a focus session</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6B7280]">
          Begin, then work as usual. We measure the real time and verify it in the background — there&apos;s nothing to log.
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-black/[0.07] bg-white p-5">
        <label htmlFor="intention" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
          What are you working on? <span className="font-normal normal-case tracking-normal text-[#9CA3AF]">(optional)</span>
        </label>
        <input
          id="intention"
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          maxLength={280}
          placeholder="Deep work on the redesign"
          className="w-full rounded-2xl border border-black/[0.08] bg-[#FAF8F4] px-4 py-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#4CAF50]"
        />
        <p className="mt-2 text-xs text-[#9CA3AF]">
          Only your squad sees this — in your words. Your sites stay private either way.
        </p>

        {error && <p className="mt-3 text-sm text-[#B45309]">{error}</p>}

        <button
          onClick={startSession}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Begin focus
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">Recent sessions</p>
          <div className="rounded-2xl border border-black/[0.07] bg-white">
            {history.map((s) => {
              const verified = !!s.session_quality && s.session_quality !== 'unverified'
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3 transition-colors last:border-0 hover:bg-black/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">
                      {s.intention || (s.status === 'abandoned' ? 'Short session' : 'Focus session')}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">{format(new Date(s.created_at), 'd MMM · h:mm a')}</p>
                  </div>
                  {verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#2E7D32]">
                      <ShieldCheck className="h-3 w-3" /> verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#B45309]">
                      <ShieldAlert className="h-3 w-3" /> unverified
                    </span>
                  )}
                  <span className="font-mono text-sm font-semibold text-[#2E7D32]">{durationClock(s.duration_s ?? 0)}</span>
                  <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
