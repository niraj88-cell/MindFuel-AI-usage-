'use client'

// SatyaShift — the running focus screen. Starting now lives on Today (the intention
// field folded into the dashboard), so this route is only the full-screen state you are
// placed into while a session runs — not a destination you browse to. Arriving here with
// no active session sends you back to Today with the starter open.
// Duration and quality remain SERVER-side (/api/focus/start anchors the start time,
// /api/focus/stop computes the rest from domain_logs) — the client never fabricates focus.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Square, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FocusAudio } from '@/components/focus/FocusAudio'

// Quiet, minute-level elapsed for the running screen. Deliberately NOT a ticking
// seconds stopwatch — the product's promise is "just work", not "watch the clock".
function humanElapsed(totalSeconds: number) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60)
  if (m < 1) return 'just started'
  const h = Math.floor(m / 60)
  return h === 0 ? `${m} min` : `${h}h ${String(m % 60).padStart(2, '0')}m`
}

// A cheer someone in the circle sent for THIS session (their name + a fixed phrase).
type Cheer = { id: string; from: string; phrase: string }

export default function FocusPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [intention, setIntention] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cheers, setCheers] = useState<Cheer[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadState = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: active } = await supabase
        .from('focus_sessions')
        .select('id, created_at, intention')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) {
        // Nothing running — this screen has no idle state anymore.
        router.replace('/dashboard?start=1')
        return
      }
      setActiveId(active.id)
      setStartedAt(new Date(active.created_at).getTime())
      setIntention(active.intention ?? null)
    } finally {
      setReady(true)
    }
  }, [router])

  useEffect(() => { loadState() }, [loadState])

  // Encouragements from the circle, for THIS session only. Own notifications rows under
  // RLS — polled gently (45s), because a cheer arriving a moment late is still a cheer,
  // and this screen must never become something to watch.
  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    const supabase = createClient()
    async function poll() {
      // Newest 20 encouragement rows, then keep the ones for this session in arrival order.
      const { data } = await supabase
        .from('notifications')
        .select('id, metadata')
        .eq('type', 'squad_encouragement')
        .order('created_at', { ascending: false })
        .limit(20)
      if (cancelled || !data) return
      const mine = data
        .filter((n) => (n.metadata as Record<string, unknown> | null)?.session_id === activeId)
        .map((n) => {
          const m = n.metadata as Record<string, string>
          return { id: n.id, from: m.from_name || 'A friend', phrase: m.phrase || 'With you' }
        })
        .reverse()
      setCheers(mine)
    }
    poll()
    const t = setInterval(poll, 45_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [activeId])

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

  if (!ready || activeId == null || startedAt == null) {
    return (
      <div className="mx-auto max-w-lg animate-pulse py-16">
        <div className="mx-auto h-48 w-full rounded-xl bg-hairline" />
      </div>
    )
  }

  // A calm presence, not a stopwatch. Elapsed time is quiet and secondary so the screen
  // invites work instead of clock-watching (the whole point of "just work in the background").
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center py-8 text-center">
      <span className="flex h-3 w-3 rounded-full bg-green-bright satya-breathe" />

      <p className="mt-8 font-serif text-[2rem] leading-tight text-ink">You&rsquo;re focusing.</p>
      {intention && (
        <p className="mt-2 font-serif text-lg italic text-soft">&ldquo;{intention}&rdquo;</p>
      )}

      <p className="mt-6 max-w-xs text-sm leading-relaxed text-soft">
        Just work like you normally would. SatyaShift is verifying this in the background. There&rsquo;s nothing to watch here.
      </p>

      <p className="mt-6 font-mono text-xs text-faint">
        Started {format(new Date(startedAt), 'h:mm a')} &middot; {humanElapsed(elapsed)} so far
      </p>

      {/* Cheers from the circle — quiet, unanimated, nothing to respond to. */}
      {cheers.length > 0 && (
        <div className="mt-5 flex max-w-sm flex-wrap items-center justify-center gap-1.5">
          {cheers.map((c) => (
            <span key={c.id} className="rounded-full bg-green-tint px-3 py-1 text-[12px] text-green-deep">
              {c.from}: {c.phrase}
            </span>
          ))}
        </div>
      )}

      <FocusAudio />

      {error && <p className="mt-4 text-sm text-rust">{error}</p>}

      <button
        onClick={stopSession}
        disabled={busy}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-ink px-7 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-hover disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
        End session
      </button>
    </div>
  )
}
