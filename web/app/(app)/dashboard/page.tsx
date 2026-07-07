'use client'

// SatyaShift — dashboard "Today".
// A rarely-opened reflection home, not a stats panel. It answers three things and
// then gets out of the way: how today's focus went, your recent verified sessions,
// and one honest line from Satya. Everything reads from the real focus_sessions
// proof layer. The extension is the daily surface; this is the calm reflection.

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfDay } from 'date-fns'
import { Play, ChevronRight, Users, Puzzle, Lock, UserPlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { VerifiedMark } from '@/components/brand/VerifiedMark'
import { EXTENSION_PUBLISHED, EXTENSION_STORE_URL } from '@/lib/extension'
import { weeklyInsight } from '@/lib/intelligence/insights'
import { recommendSquadSupport } from '@/lib/intelligence/squad'
import { deriveContinuation, workingSet, type ContinuationInvite, type DomainStay } from '@/lib/continuation'
import type { BehavioralProfile } from '@/lib/intelligence/types'

// Shown once, the first time an "unverified" chip appears, then never again.
const VERIFY_NOTE_KEY = 'satya_verified_note_seen'
// "Not now" on a continuation invite is remembered per anchor session, forever.
const CONTINUATION_DISMISSED_KEY = 'satya_continuation_dismissed'
// How far back deriveContinuation may look for an anchor (its own gate is 7 days).
const CONTINUATION_LOOKBACK_DAYS = 14

interface SessionRow {
  id: string
  created_at: string
  status: string | null
  duration_s: number | null
  session_quality: string | null
  intention: string | null
}

// 8040s -> "2h 14m", 0 -> "0m"
function humanDuration(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h === 0) return `${mm}m`
  return `${h}h ${mm}m`
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// useSearchParams needs a Suspense boundary at build time; the page itself is below.
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  )
}

function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('there')
  const [today, setToday] = useState<SessionRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  // null = unknown (don't nag on error). true once the extension has ever sent data.
  const [connected, setConnected] = useState<boolean | null>(null)
  const [howOpen, setHowOpen] = useState(false)
  // null = unknown (don't push the invite on error); true = new or only-me circle.
  const [aloneInCircle, setAloneInCircle] = useState<boolean | null>(null)
  // The user's evolving behavioral profile — feeds the one weekly realization (or nothing).
  const [profile, setProfile] = useState<BehavioralProfile | null>(null)
  // Flow Continuation: one confidence-gated invitation back to previous work, or null.
  // Null is the normal case — the dashboard must look unchanged on most visits.
  const [continuation, setContinuation] = useState<(ContinuationInvite & { domains: string[] }) | null>(null)
  // Whether the last 7 days hold any sessions — gates the quiet /week link so a brand-new
  // account never sees a door to an empty room.
  const [hasWeek, setHasWeek] = useState(false)
  // Inline session start (the old Focus idle screen, folded into Today).
  const [startOpen, setStartOpen] = useState(false)
  const [intention, setIntention] = useState('')
  const [startBusy, setStartBusy] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  // Teach the verified/unverified vocabulary exactly once.
  const [showVerifyNote, setShowVerifyNote] = useState(false)

  useEffect(() => {
    // The mobile start button (and the retired /focus idle screen) land here with
    // ?start=1 — open the intention field directly.
    if (searchParams.get('start')) setStartOpen(true)
  }, [searchParams])

  useEffect(() => {
    setShowVerifyNote(localStorage.getItem(VERIFY_NOTE_KEY) !== '1')
  }, [])

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setName(user.user_metadata?.full_name?.split(' ')[0] || 'there')

      // Two weeks of sessions in one query: today's rows feed the page as before,
      // the rest exist only so deriveContinuation can look for an anchor.
      const lookback = new Date(Date.now() - CONTINUATION_LOOKBACK_DAYS * 86_400_000).toISOString()
      const [sessionsRes, ingestRes, squadsData, profileRes] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('id, created_at, status, duration_s, session_quality, intention')
          .eq('user_id', user.id)
          .gte('created_at', lookback)
          .order('created_at', { ascending: false })
          .limit(40),
        // "Has the extension ever run for this account?" — any owner-readable domain_log
        // means a batch was ingested. Cheap head/count, no rows returned.
        supabase
          .from('domain_logs')
          .select('domain', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // Is the user still on their own? (no squad, or a squad that's only them)
        fetch('/api/squads').then((r) => r.json()).catch(() => null),
        // The domain-free behavioral profile (owner-only) for the weekly realization.
        supabase.from('behavioral_profiles').select('profile').eq('user_id', user.id).maybeSingle(),
      ])
      setProfile((profileRes.data?.profile as unknown as BehavioralProfile) ?? null)

      const rows = (sessionsRes.data as SessionRow[]) || []
      const activeRow = rows.find((r) => r.status === 'active') ?? null
      setActiveId(activeRow?.id ?? null)
      const dayStart = startOfDay(new Date()).getTime()
      setToday(rows.filter((r) => r.status !== 'active' && new Date(r.created_at).getTime() >= dayStart))
      const weekStart = dayStart - 6 * 86_400_000
      setHasWeek(rows.some((r) => r.status !== 'active' && (r.duration_s ?? 0) > 0 && new Date(r.created_at).getTime() >= weekStart))
      // On query error, leave connected = true (fail-safe: never nag on a false negative).
      const isConnected = ingestRes.error ? true : (ingestRes.count ?? 0) > 0
      setConnected(isConnected)

      // Flow Continuation — entirely fail-safe: any error, low confidence, or noise
      // simply means the card never existed. Suppressed until the extension is
      // connected (activation comes first, and there would be no working set anyway).
      try {
        if (!activeRow && isConnected) {
          const invite = deriveContinuation(rows, new Date(), localStorage.getItem(CONTINUATION_DISMISSED_KEY))
          if (invite) {
            // The anchor's own window of activity — the same owner-only read the
            // session page already does. Nothing new is collected or stored.
            const { data: stays } = await supabase
              .from('domain_logs')
              .select('domain, duration_s, category')
              .eq('user_id', user.id)
              .gte('created_at', invite.startIso)
              .lte('created_at', new Date(new Date(invite.endIso).getTime() + 60_000).toISOString())
            setContinuation({ ...invite, domains: workingSet((stays as DomainStay[]) ?? []) })
          } else {
            setContinuation(null)
          }
        } else {
          setContinuation(null)
        }
      } catch {
        setContinuation(null)
      }

      const squads: { members?: unknown[] }[] | null = squadsData?.squads ?? null
      // Unknown on error -> null -> show the plain link, never a false invite.
      setAloneInCircle(
        squads === null
          ? null
          : squads.length === 0
            ? true
            : Math.max(...squads.map((s) => s.members?.length ?? 1)) <= 1,
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Start a session right here — /focus is only the running screen now.
  // `withIntention` lets the continuation card resume under the previous intention
  // in one press; the inline starter passes nothing and uses the typed field.
  async function startSession(withIntention?: string) {
    setStartBusy(true); setStartError(null)
    try {
      const res = await fetch('/api/focus/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intention: (withIntention ?? intention).trim() || undefined }),
      })
      if (!res.ok) throw new Error('Could not start the session. Give it a moment and try again.')
      router.push('/focus')
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Could not start the session.')
      setStartBusy(false)
    }
  }

  // "Not now" is permanent for this anchor — the same invitation never returns.
  function dismissContinuation() {
    if (continuation) localStorage.setItem(CONTINUATION_DISMISSED_KEY, continuation.anchorId)
    setContinuation(null)
  }

  function dismissVerifyNote() {
    localStorage.setItem(VERIFY_NOTE_KEY, '1')
    setShowVerifyNote(false)
  }

  const totalS = today.reduce((sum, s) => sum + (s.duration_s ?? 0), 0)
  const verifiedCount = today.filter((s) => s.session_quality && s.session_quality !== 'unverified').length

  // One weekly realization from the behavioral profile — or nothing. The generator only
  // speaks when a pattern clears the confidence bar, so most weeks this is simply null.
  // Seeded by the calendar week so a persistent pattern doesn't repeat the exact same
  // sentence week after week, while staying stable within a week.
  const insight = profile ? weeklyInsight(profile, Date.now(), Math.floor(Date.now() / (7 * 24 * 3600 * 1000))) : null

  // Squad recommendation: only ever OFFER support, never expose anything. When the profile
  // shows someone sustaining focus well on their own, we quietly leave them be rather than
  // push the invite (privacy/solo can be the better answer). Silent/invite → unchanged UI.
  const squadRec = profile ? recommendSquadSupport({ profile, aloneInCircle: aloneInCircle === true }) : null
  const showInvite = aloneInCircle === true && squadRec?.recommend !== 'solo'

  // One honest, non-punitive reflection derived from the real day.
  const reflection = activeId
    ? 'You’re in a session right now. This page can wait.'
    : today.length === 0
      ? 'A fresh day. Start a session and your verified focus will show up here.'
      : today.length === 1
        ? `One session so far — ${humanDuration(totalS)} of focus.`
        : `${today.length} sessions today — ${humanDuration(totalS)} of focus${verifiedCount > 0 ? `, ${verifiedCount} verified` : ''}.`

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-6 py-4">
        <div className="h-10 w-64 rounded-lg bg-hairline" />
        <div className="h-24 rounded-xl bg-hairline" />
        <div className="h-40 rounded-xl bg-hairline" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl py-2">
      {/* Greeting + today's focus */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{greeting()}, {name}.</h1>
          <p className="mt-1.5 font-mono text-xs text-faint">{format(new Date(), 'EEEE, d MMMM')}</p>
        </div>
        {today.length > 0 && (
          <div className="text-right leading-none">
            <div className="font-mono text-[1.9rem] font-medium text-green-deep">{humanDuration(totalS)}</div>
            <div className="mt-1 text-xs text-green">of focus today</div>
          </div>
        )}
      </div>

      {/* Satya reflection — the serif voice, on paper not a colored card */}
      <div className="mt-7 border-l-2 border-green pl-5">
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-green">Satya</div>
        <p className="font-serif text-[1.35rem] leading-snug text-ink">
          {reflection}
        </p>
      </div>

      {/* One quiet weekly realization from the behavioral profile. Appears only when a
          pattern is confident enough to be worth a person's attention; silent otherwise. */}
      {insight && (
        <div className="mt-6 rounded-xl border border-line bg-card p-5">
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">This week</p>
          <p className="text-[15px] leading-relaxed text-ink">{insight.text}</p>
        </div>
      )}

      {/* Active session resume / connect-first / inline start (the old Focus idle screen) */}
      {activeId ? (
        <Link
          href="/focus"
          className="mt-6 flex items-center justify-between rounded-xl border border-green-line bg-green-wash px-5 py-4 transition-colors hover:bg-green-tint"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-green">
            <span className="h-2 w-2 rounded-full bg-green-bright satya-breathe" /> You&rsquo;re focusing now
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-green">Resume <ChevronRight className="h-4 w-4" /></span>
        </Link>
      ) : (
        <>
          {/* Not connected — verification is impossible until the extension runs, so lead with it. */}
          {connected === false && (
          <div className="mt-6 rounded-xl border border-line bg-card p-5">
            <div className="flex items-center gap-2 text-green">
              <Puzzle className="h-4 w-4" />
              <p className="text-sm font-semibold text-ink">Connect SatyaShift to verify your focus</p>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-soft">
              Your focus is verified by the browser extension — it reads only the domain you&rsquo;re on, never the page, content, or what you type. Until it&rsquo;s connected, sessions you start are saved as &ldquo;not verified.&rdquo;
            </p>

            {EXTENSION_PUBLISHED ? (
              <a
                href={EXTENSION_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3 text-sm font-semibold text-white transition-colors hover:bg-green-deep"
              >
                <Puzzle className="h-4 w-4" /> Add to Chrome
              </a>
            ) : (
              <>
                <button
                  onClick={() => setHowOpen((v) => !v)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3 text-sm font-semibold text-white transition-colors hover:bg-green-deep"
                >
                  <Puzzle className="h-4 w-4" /> {howOpen ? 'Hide steps' : 'How to connect'}
                </button>
                {howOpen && (
                  <ol className="mt-3 space-y-2 rounded-lg bg-paper p-4 text-[13px] leading-relaxed text-soft">
                    <li><span className="font-mono font-medium text-ink">1.</span> Open <span className="font-mono text-[12px]">chrome://extensions</span> and turn on <span className="font-semibold">Developer mode</span> (top-right).</li>
                    <li><span className="font-mono font-medium text-ink">2.</span> Click <span className="font-semibold">Load unpacked</span> and choose the SatyaShift <span className="font-mono text-[12px]">extension</span> folder.</li>
                    <li><span className="font-mono font-medium text-ink">3.</span> Make sure you&rsquo;re signed in here, then reload this page.</li>
                    <li className="text-faint">It connects on its own — this card disappears once it sends its first activity.</li>
                  </ol>
                )}
              </>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
              <Lock className="h-3 w-3" /> Domain only. Never the page, content, or keystrokes.
            </div>
          </div>
          )}

          {/* Inline starter — press once, add an optional intention, begin. */}
          {startOpen ? (
            <div className="mt-6 rounded-xl border border-line bg-card p-5">
              <label htmlFor="intention" className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                What are you working on? <span className="normal-case tracking-normal text-ghost">(optional)</span>
              </label>
              <input
                id="intention"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                maxLength={280}
                autoFocus
                placeholder="Deep work on the redesign"
                className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ghost focus:border-green"
              />
              <p className="mt-2 text-xs text-faint">
                Only your circle sees this — in your words. Your sites stay private either way.
              </p>
              {startError && <p className="mt-3 text-sm text-rust">{startError}</p>}
              <button
                onClick={() => startSession()}
                disabled={startBusy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-deep disabled:opacity-60"
              >
                {startBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />}
                Begin focus
              </button>
            </div>
          ) : connected === false ? (
            <button
              onClick={() => setStartOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 text-[13px] font-medium text-faint transition-colors hover:text-ink"
            >
              Start a session without verifying <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : continuation ? (
            /* Flow Continuation — hands back yesterday's mental context (their own
               intention, the window, the tools) with exactly one decision. Replaces
               the generic start button so the page still has ONE primary action.
               Domains here are the owner's own, same as the session page's private view. */
            <div className="mt-6 rounded-xl border border-line bg-card p-5">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Where you left off</p>
              <p className="text-[15px] leading-relaxed text-ink">
                {continuation.intention ? (
                  <>You were working on <span className="font-medium">&ldquo;{continuation.intention}&rdquo;</span> {continuation.timeLabel}.</>
                ) : (
                  <>Your focus held for {humanDuration(continuation.durationS)} {continuation.timeLabel}.</>
                )}
              </p>
              <p className="mt-1.5 font-mono text-xs text-faint">
                {format(new Date(continuation.startIso), 'h:mm')}&ndash;{format(new Date(continuation.endIso), 'h:mm a')}
                {continuation.domains.map((d) => (
                  <span key={d}> &middot; {d}</span>
                ))}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => startSession(continuation.intention ?? '')}
                  disabled={startBusy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green py-3 text-sm font-semibold text-white transition-colors hover:bg-green-deep disabled:opacity-60"
                >
                  {startBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />}
                  Pick this back up
                </button>
                <button
                  onClick={dismissContinuation}
                  className="shrink-0 px-2 py-3 text-[13px] font-medium text-faint transition-colors hover:text-ink"
                >
                  Not now
                </button>
              </div>
              {startError && <p className="mt-3 text-sm text-rust">{startError}</p>}
            </div>
          ) : (
            <button
              onClick={() => setStartOpen(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-deep"
            >
              <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} /> Start a focus session
            </button>
          )}
        </>
      )}

      {/* Today's sessions */}
      {today.length > 0 && (
        <div className="mt-9">
          <p className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Today&rsquo;s sessions</p>
          <div className="overflow-hidden rounded-xl border border-line bg-card">
            {today.map((s) => {
              const verified = !!s.session_quality && s.session_quality !== 'unverified'
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex items-center gap-3 border-b border-hairline px-4 py-3 transition-colors last:border-0 hover:bg-green-wash"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {s.intention || (s.status === 'abandoned' ? 'Short session' : 'Focus session')}
                    </p>
                    <p className="font-mono text-xs text-faint">{format(new Date(s.created_at), 'h:mm a')}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide ${verified ? 'text-green' : 'text-ghost'}`}
                    title={verified ? 'Extension verified' : 'Not verified'}
                  >
                    <VerifiedMark verified={verified} size={13} /> {verified ? 'verified' : 'unverified'}
                  </span>
                  <span className="font-mono text-sm font-medium text-green-deep">{humanDuration(s.duration_s ?? 0)}</span>
                  <ChevronRight className="h-4 w-4 text-ghost" />
                </Link>
              )
            })}
          </div>
          {/* Teach the vocabulary once: shown until dismissed, only when an unverified chip is on screen. */}
          {showVerifyNote && today.some((s) => !s.session_quality || s.session_quality === 'unverified') && (
            <div className="mt-2 flex items-start gap-3 px-1">
              <p className="flex-1 text-xs leading-relaxed text-faint">
                Verified means the extension confirmed this time. Unverified sessions still count, they are just on trust.
              </p>
              <button
                onClick={dismissVerifyNote}
                className="shrink-0 text-xs font-semibold text-green transition-colors hover:text-green-deep"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      )}

      {/* The week of attention — the one shareable artifact. A quiet door, only once
          there is a week to look at. */}
      {hasWeek && (
        <Link
          href="/week"
          className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-card px-5 py-4 transition-colors hover:bg-green-wash"
        >
          <span className="flex-1 text-sm font-medium text-ink">Your week of attention</span>
          <ChevronRight className="h-4 w-4 text-ghost" />
        </Link>
      )}

      {/* Squad entry point. Still on your own? Echo the landing promise with a real
          invitation. Already have a circle? A quiet link is enough. */}
      {showInvite ? (
        <div className="mt-6 rounded-xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 text-green">
            <UserPlus className="h-4 w-4" />
            <p className="text-sm font-semibold text-ink">Focus sticks when someone&rsquo;s in it with you</p>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-soft">
            Bring one friend into your circle. They see when you&rsquo;re focusing and quietly show up too. They
            only ever see your verified time, never your sites.
          </p>
          <Link
            href="/squads"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-green-line bg-green-wash py-3 text-sm font-semibold text-green transition-colors hover:bg-green-tint"
          >
            <UserPlus className="h-4 w-4" /> Bring a friend in
          </Link>
        </div>
      ) : (
        <Link
          href="/squads"
          className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-card px-5 py-4 transition-colors hover:bg-green-wash"
        >
          <Users className="h-4 w-4 text-green" />
          <span className="flex-1 text-sm font-medium text-ink">Your circle</span>
          <ChevronRight className="h-4 w-4 text-ghost" />
        </Link>
      )}

      <p className="mt-9 text-center text-xs text-faint">
        Just keep working — everything here updates on its own.
      </p>
    </div>
  )
}
