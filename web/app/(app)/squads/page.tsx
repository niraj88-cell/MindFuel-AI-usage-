'use client'

// SatyaShift — Squad.
// A supportive circle, not a scoreboard. Presence first (who's focusing now), then a
// chronological feed of extension-verified sessions. No streaks, no rankings, no totals,
// and never a domain — the feed shows verified TIME plus each person's own words (intention).
// Data: GET /api/squads (members + checked_in/quiet) and /api/squads/[id]/feed (proof feed).

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Copy,
  Loader2,
  Plus,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Check,
} from 'lucide-react'

interface Member {
  id: string
  name: string
  avatar: string | null
  status: 'checked_in' | 'quiet'
}
interface Squad {
  id: string
  name: string
  invite_code: string
  members: Member[]
}
interface FeedItem {
  id: string
  status: string | null
  duration_s: number | null
  intention: string | null
  session_quality: string | null
  created_at: string
  member: { id: string; name: string; avatar: string | null }
}

function clock(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}
function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}
function initials(name: string) {
  return name.trim()[0]?.toUpperCase() || '?'
}
const AVATAR_COLORS = ['#2E7D32', '#534AB7', '#185FA5', '#993C1D', '#72243E']
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function SquadsPage() {
  const [loading, setLoading] = useState(true)
  const [squad, setSquad] = useState<Squad | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [newName, setNewName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const loadSquads = useCallback(async () => {
    try {
      const res = await fetch('/api/squads')
      const data = await res.json()
      const first: Squad | null = data.squads?.[0] ?? null
      setSquad(first)
      if (first) {
        const fres = await fetch(`/api/squads/${first.id}/feed`)
        const fdata = await fres.json()
        setFeed(fdata.feed || [])
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not load your squad.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!cancelled) await loadSquads()
    })()
    return () => { cancelled = true }
  }, [loadSquads])

  const focusingNow = useMemo(() => feed.filter((f) => f.status === 'active'), [feed])
  const recent = useMemo(() => feed.filter((f) => f.status !== 'active'), [feed])

  async function createSquad(e: React.FormEvent) {
    e.preventDefault()
    if (newName.trim().length < 3) return
    setBusy('create'); setMessage(null)
    try {
      const res = await fetch('/api/squads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create squad')
      setNewName('')
      await loadSquads()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not create squad' })
    } finally { setBusy(null) }
  }

  async function joinSquad(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy('join'); setMessage(null)
    try {
      const res = await fetch('/api/squads/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not join squad')
      setCode('')
      await loadSquads()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not join squad' })
    } finally { setBusy(null) }
  }

  async function copyInvite() {
    if (!squad) return
    await navigator.clipboard.writeText(squad.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function Avatar({ id, name, size = 34 }: { id: string; name: string; size?: number }) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
        style={{ width: size, height: size, background: avatarColor(id), fontSize: size * 0.38 }}
      >
        {initials(name)}
      </div>
    )
  }

  function VerifiedBadge({ quality }: { quality: string | null }) {
    const verified = !!quality && quality !== 'unverified'
    return verified ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#2E7D32]">
        <ShieldCheck className="h-3 w-3" /> verified
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#B45309]">
        <ShieldAlert className="h-3 w-3" /> unverified
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#2E7D32]" />
      </div>
    )
  }

  // ── No squad yet — create or join ─────────────────────────
  if (!squad) {
    return (
      <div className="mx-auto max-w-2xl py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Focus is easier with someone in it.</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6B7280]">
            A squad is a small circle that sees when you&rsquo;re focusing and quietly shows up too. No feed to scroll, no rankings.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl bg-[#FEF3F2] p-3 text-sm font-medium text-[#B42318]">{message.text}</div>
        )}

        <form onSubmit={createSquad} className="mt-7 rounded-3xl border border-black/[0.07] bg-white p-5">
          <div className="mb-2 flex items-center gap-2 text-[#2E7D32]">
            <Plus className="h-4 w-4" />
            <span className="text-sm font-semibold text-[#111827]">Create a squad</span>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Evening reset"
            className="w-full rounded-2xl border border-black/[0.08] bg-[#FAF8F4] px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#4CAF50]"
          />
          <button
            type="submit"
            disabled={newName.trim().length < 3 || busy === 'create'}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#256628] disabled:opacity-50"
          >
            {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Create squad
          </button>
        </form>

        <form onSubmit={joinSquad} className="mt-4 rounded-3xl border border-black/[0.07] bg-white p-5">
          <div className="mb-2 flex items-center gap-2 text-[#2E7D32]">
            <KeyRound className="h-4 w-4" />
            <span className="text-sm font-semibold text-[#111827]">Join with an invite code</span>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="6-CHAR CODE"
            className="w-full rounded-2xl border border-black/[0.08] bg-[#FAF8F4] px-4 py-3 text-center font-mono text-sm uppercase tracking-[0.3em] outline-none transition-colors placeholder:tracking-normal placeholder:text-[#9CA3AF] focus:border-[#4CAF50]"
          />
          <button
            type="submit"
            disabled={!code.trim() || busy === 'join'}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-white py-3 text-sm font-semibold text-[#111827] transition-colors hover:bg-black/[0.02] disabled:opacity-50"
          >
            {busy === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Join squad
          </button>
        </form>
      </div>
    )
  }

  const soloSquad = squad.members.length <= 1

  // ── Has a squad ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{squad.name}</h1>
        <button
          onClick={copyInvite}
          className="inline-flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white px-3.5 py-2 font-mono text-xs font-semibold tracking-wider text-[#111827] transition-colors hover:bg-black/[0.02]"
        >
          {copied ? <><Check className="h-3.5 w-3.5 text-[#2E7D32]" /> copied</> : <>{squad.invite_code} <Copy className="h-3.5 w-3.5" /></>}
        </button>
      </div>

      {/* Members row */}
      <div className="mt-4 flex flex-wrap gap-2">
        {squad.members.map((m) => (
          <div key={m.id} className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white py-1 pl-1 pr-3">
            <Avatar id={m.id} name={m.name} size={24} />
            <span className="text-xs font-medium text-[#111827]">{m.name}</span>
            {m.status === 'checked_in' && <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50]" title="focused today" />}
          </div>
        ))}
      </div>

      {soloSquad && (
        <div className="mt-6 rounded-3xl bg-[#E8F5E9] p-5 text-center">
          <UserPlus className="mx-auto h-6 w-6 text-[#2E7D32]" />
          <p className="mt-2 text-sm font-semibold text-[#1B5E20]">It&rsquo;s just you so far.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#2E7D32]">
            Share your code with someone who&rsquo;ll keep you company. They&rsquo;ll only ever see your verified time — never your sites.
          </p>
          <button onClick={copyInvite} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2E7D32] px-4 py-2 font-mono text-xs font-semibold tracking-wider text-white">
            {copied ? 'copied' : squad.invite_code} <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* In it right now */}
      {focusingNow.length > 0 && (
        <div className="mt-7">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#4CAF50]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#2E7D32]">In it right now</span>
          </div>
          <div className="space-y-2">
            {focusingNow.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-[#A5D6A7] bg-white px-4 py-3">
                <Avatar id={f.member.id} name={f.member.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#111827]">{f.member.name} is focusing</p>
                  <p className="text-xs text-[#6B7280]">{minutesSince(f.created_at)} min in{f.intention ? ` · “${f.intention}”` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent verified sessions */}
      <div className="mt-7">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#9CA3AF]">Recent</div>
        {recent.length > 0 ? (
          <div className="rounded-2xl border border-black/[0.07] bg-white">
            {recent.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3 last:border-0">
                <Avatar id={f.member.id} name={f.member.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#111827]">{f.member.name}</p>
                  <p className="truncate text-xs text-[#9CA3AF]">
                    {f.intention ? <span className="italic">&ldquo;{f.intention}&rdquo;</span> : 'Focused'}
                  </p>
                </div>
                <VerifiedBadge quality={f.session_quality} />
                <span className="font-mono text-sm font-semibold text-[#2E7D32]">{clock(f.duration_s ?? 0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/[0.07] bg-white p-8 text-center">
            <p className="text-sm font-medium text-[#111827]">No sessions yet.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#9CA3AF]">
              When anyone in your circle focuses, their verified time shows up here.
            </p>
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-[#9CA3AF]">
        No streaks, no rankings, no totals — just your people, showing up.
      </p>
    </div>
  )
}
