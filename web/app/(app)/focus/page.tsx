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

export default function FocusPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [intention, setIntention] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        <div className="mx-auto h-48 w-full rounded-3xl bg-black/[0.05]" />
      </div>
    )
  }

  // A calm presence, not a stopwatch. Elapsed time is quiet and secondary so the screen
  // invites work instead of clock-watching (the whole point of "just work in the background").
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center py-8 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4CAF50] opacity-20 motion-reduce:animate-none" />
        <span className="relative inline-flex h-4 w-4 rounded-full bg-[#4CAF50]" />
      </span>

      <p className="mt-8 text-xl font-bold tracking-tight text-[#111827]">You&rsquo;re focusing.</p>
      {intention && (
        <p className="mt-2 text-sm italic text-[#6B7280]">&ldquo;{intention}&rdquo;</p>
      )}

      <p className="mt-6 max-w-xs text-sm leading-relaxed text-[#6B7280]">
        Just work like you normally would. SatyaShift is verifying this in the background. There&rsquo;s nothing to watch here.
      </p>

      <p className="mt-6 font-mono text-xs text-[#6B7280]">
        Started {format(new Date(startedAt), 'h:mm a')} &middot; {humanElapsed(elapsed)} so far
      </p>

      <FocusAudio />

      {error && <p className="mt-4 text-sm text-[#B45309]">{error}</p>}

      <button
        onClick={stopSession}
        disabled={busy}
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
        End session
      </button>
    </div>
  )
}
