'use client'

// SatyaShift — dashboard "Today".
// A rarely-opened reflection home, not a stats panel. It answers three things and
// then gets out of the way: how today's focus went, your recent verified sessions,
// and one honest line from Satya. Everything reads from the real focus_sessions
// proof layer. The extension is the daily surface; this is the calm reflection.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format, startOfDay } from 'date-fns'
import { Play, ShieldCheck, Shield, ChevronRight, Users, Puzzle, Lock, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// The extension isn't on the Chrome Web Store yet. For now the connect card shows
// dev-mode "Load unpacked" steps; when published, set EXTENSION_STORE_URL and flip
// PUBLISHED to render a one-click "Add to Chrome" button instead. One line changes.
const PUBLISHED = false
const EXTENSION_STORE_URL = '' // e.g. https://chrome.google.com/webstore/detail/<id>

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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('there')
  const [today, setToday] = useState<SessionRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  // null = unknown (don't nag on error). true once the extension has ever sent data.
  const [connected, setConnected] = useState<boolean | null>(null)
  const [howOpen, setHowOpen] = useState(false)
  // null = unknown (don't push the invite on error); true = new or only-me circle.
  const [aloneInCircle, setAloneInCircle] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setName(user.user_metadata?.full_name?.split(' ')[0] || 'there')

      const since = startOfDay(new Date()).toISOString()
      const [sessionsRes, ingestRes, squadsData] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('id, created_at, status, duration_s, session_quality, intention')
          .eq('user_id', user.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(20),
        // "Has the extension ever run for this account?" — any owner-readable domain_log
        // means a batch was ingested. Cheap head/count, no rows returned.
        supabase
          .from('domain_logs')
          .select('domain', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // Is the user still on their own? (no squad, or a squad that's only them)
        fetch('/api/squads').then((r) => r.json()).catch(() => null),
      ])

      const rows = (sessionsRes.data as SessionRow[]) || []
      setActiveId(rows.find((r) => r.status === 'active')?.id ?? null)
      setToday(rows.filter((r) => r.status !== 'active'))
      // On query error, leave connected = true (fail-safe: never nag on a false negative).
      setConnected(ingestRes.error ? true : (ingestRes.count ?? 0) > 0)

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

  const totalS = today.reduce((sum, s) => sum + (s.duration_s ?? 0), 0)
  const verifiedCount = today.filter((s) => s.session_quality && s.session_quality !== 'unverified').length

  // One honest, non-punitive reflection derived from the real day.
  const reflection = activeId
    ? 'You’re in a session right now. Stay with it — this page will be here after.'
    : today.length === 0
      ? 'A fresh day. Start a session and your verified focus will show up here.'
      : today.length === 1
        ? `One session, ${humanDuration(totalS)} of focus. A good start.`
        : `${today.length} sessions, ${humanDuration(totalS)} of focus${verifiedCount > 0 ? `, ${verifiedCount} verified` : ''}. Steady work.`

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-6 py-4">
        <div className="h-10 w-64 rounded-2xl bg-black/[0.05]" />
        <div className="h-24 rounded-3xl bg-black/[0.05]" />
        <div className="h-40 rounded-3xl bg-black/[0.04]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl py-2">
      {/* Greeting + today's focus */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{greeting()}, {name}.</h1>
          <p className="mt-1.5 font-mono text-xs text-[#6B7280]">{format(new Date(), 'EEEE, d MMMM')}</p>
        </div>
        {today.length > 0 && (
          <div className="text-right leading-none">
            <div className="font-mono text-[1.9rem] font-bold text-[#1B5E20]">{humanDuration(totalS)}</div>
            <div className="mt-1 text-xs text-[#2E7D32]">of focus today</div>
          </div>
        )}
      </div>

      {/* Satya reflection */}
      <div className="mt-6 rounded-3xl bg-[#E8F5E9] p-5">
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#2E7D32]">Satya</div>
        <p className="text-[15px] leading-relaxed text-[#1B5E20]" style={{ fontFamily: 'var(--font-serif)' }}>
          {reflection}
        </p>
      </div>

      {/* Active session resume / connect-first / start CTA */}
      {activeId ? (
        <Link
          href="/focus"
          className="mt-4 flex items-center justify-between rounded-2xl border border-[#A5D6A7] bg-white px-5 py-4 transition-colors hover:bg-[#F5FBF5]"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-[#2E7D32]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#4CAF50]" /> You&rsquo;re focusing now
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-[#2E7D32]">Resume <ChevronRight className="h-4 w-4" /></span>
        </Link>
      ) : connected === false ? (
        <>
          {/* Not connected — verification is impossible until the extension runs, so lead with it. */}
          <div className="mt-4 rounded-3xl border border-[#A5D6A7] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E8F5E9] text-[#2E7D32]">
                <Puzzle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111827]">Connect SatyaShift to verify your focus</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                  Your focus is verified by the browser extension — it reads only the domain you&rsquo;re on, never the page, content, or what you type. Until it&rsquo;s connected, sessions you start are saved as &ldquo;not verified.&rdquo;
                </p>
              </div>
            </div>

            {PUBLISHED && EXTENSION_STORE_URL ? (
              <a
                href={EXTENSION_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#256628]"
              >
                <Puzzle className="h-4 w-4" /> Add to Chrome
              </a>
            ) : (
              <>
                <button
                  onClick={() => setHowOpen((v) => !v)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#256628]"
                >
                  <Puzzle className="h-4 w-4" /> {howOpen ? 'Hide steps' : 'How to connect'}
                </button>
                {howOpen && (
                  <ol className="mt-3 space-y-2 rounded-2xl bg-[#FAF8F4] p-4 text-[13px] leading-relaxed text-[#4B5563]">
                    <li><span className="font-semibold text-[#111827]">1.</span> Open <span className="font-mono text-[12px]">chrome://extensions</span> and turn on <span className="font-semibold">Developer mode</span> (top-right).</li>
                    <li><span className="font-semibold text-[#111827]">2.</span> Click <span className="font-semibold">Load unpacked</span> and choose the SatyaShift <span className="font-mono text-[12px]">extension</span> folder.</li>
                    <li><span className="font-semibold text-[#111827]">3.</span> Make sure you&rsquo;re signed in here, then reload this page.</li>
                    <li className="text-[#9CA3AF]">It connects on its own — this card disappears once it sends its first activity.</li>
                  </ol>
                )}
              </>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
              <Lock className="h-3 w-3" /> Domain only. Never the page, content, or keystrokes.
            </div>
          </div>

          <Link
            href="/focus"
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
          >
            Start a session without verifying <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </>
      ) : (
        <Link
          href="/focus"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628]"
        >
          <Play className="h-4 w-4" /> Start a focus session
        </Link>
      )}

      {/* Today's sessions */}
      {today.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">Today&rsquo;s sessions</p>
          <div className="rounded-2xl border border-black/[0.07] bg-white">
            {today.map((s) => {
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
                    <p className="text-xs text-[#9CA3AF]">{format(new Date(s.created_at), 'h:mm a')}</p>
                  </div>
                  {verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#2E7D32]">
                      <ShieldCheck className="h-3 w-3" /> verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#6B7280]">
                      <Shield className="h-3 w-3" /> unverified
                    </span>
                  )}
                  <span className="font-mono text-sm font-semibold text-[#2E7D32]">{humanDuration(s.duration_s ?? 0)}</span>
                  <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Squad entry point. Still on your own? Echo the landing promise with a real
          invitation. Already have a circle? A quiet link is enough. */}
      {aloneInCircle ? (
        <div className="mt-6 rounded-3xl border border-black/[0.07] bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E8F5E9] text-[#2E7D32]">
              <UserPlus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111827]">Focus sticks when someone&rsquo;s in it with you</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                Bring one friend into your circle. They see when you&rsquo;re focusing and quietly show up too. They
                only ever see your verified time, never your sites.
              </p>
            </div>
          </div>
          <Link
            href="/squads"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#A5D6A7] bg-[#F5FBF5] py-3 text-sm font-semibold text-[#2E7D32] transition-colors hover:bg-[#E8F5E9]"
          >
            <UserPlus className="h-4 w-4" /> Bring a friend in
          </Link>
        </div>
      ) : (
        <Link
          href="/squads"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-white px-5 py-4 transition-colors hover:bg-black/[0.02]"
        >
          <Users className="h-4 w-4 text-[#2E7D32]" />
          <span className="flex-1 text-sm font-medium text-[#111827]">Your circle</span>
          <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
        </Link>
      )}

      <p className="mt-8 text-center text-xs text-[#9CA3AF]">
        Just keep working — everything here updates on its own.
      </p>
    </div>
  )
}
