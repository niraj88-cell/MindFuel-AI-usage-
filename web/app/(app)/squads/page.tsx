'use client'

// SatyaShift — Circle (route stays /squads; "circle" is the product word).
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
  UserPlus,
  Check,
} from 'lucide-react'
import { VerifiedMark } from '@/components/brand/VerifiedMark'
import { ENCOURAGEMENT_PHRASES } from '@/lib/squad/encouragement'

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
// The feed is privacy-shaped at the DB (get_squad_feed): who, active/verified, duration,
// their own intention words. Quality labels and percentages never reach this client.
interface FeedItem {
  id: string
  active: boolean
  verified: boolean
  duration_s: number | null
  intention: string | null
  created_at: string
  member: { id: string; name: string; avatar: string | null }
}

function humanDuration(totalSeconds: number) {
  const m = Math.round(totalSeconds / 60)
  const h = Math.floor(m / 60)
  return h === 0 ? `${m % 60}m` : `${h}h ${m % 60}m`
}
function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}
function initials(name: string) {
  return name.trim()[0]?.toUpperCase() || '?'
}
const AVATAR_COLORS = ['#2D6A3F', '#4A4636', '#3B5C6B', '#8A5A18', '#7A3B2E']
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
      setMessage({ type: 'error', text: 'Could not load your circle.' })
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

  const focusingNow = useMemo(() => feed.filter((f) => f.active), [feed])
  const recent = useMemo(() => feed.filter((f) => !f.active), [feed])

  // session id → 'sending' | 'sent'. One cheer per member per session; the server dedupes,
  // this just keeps the UI honest about it.
  const [cheered, setCheered] = useState<Record<string, 'sending' | 'sent'>>({})

  async function encourage(sessionId: string, phrase: number) {
    setCheered((c) => ({ ...c, [sessionId]: 'sending' }))
    try {
      await fetch('/api/squads/encourage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, phrase }),
      })
    } catch { /* a lost cheer is not an error worth surfacing */ }
    setCheered((c) => ({ ...c, [sessionId]: 'sent' }))
  }

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
      // 402: hosting is the one premium boundary (joining is always free). Say so in
      // plain words with the way forward — never a bare "error".
      if (res.status === 402) {
        throw new Error('Hosting a circle is part of the paid plan — joining one is always free. You can pick a plan in Settings.')
      }
      if (!res.ok) throw new Error(data.error || 'Could not create your circle')
      setNewName('')
      await loadSquads()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not create your circle' })
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
      if (!res.ok) throw new Error(data.error || 'Could not join that circle')
      setCode('')
      await loadSquads()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not join that circle' })
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

  function VerifiedBadge({ verified }: { verified: boolean }) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide ${verified ? 'text-green' : 'text-ghost'}`}
        title={verified ? 'Extension verified' : 'Not verified'}
      >
        <VerifiedMark verified={verified} size={12} /> {verified ? 'verified' : 'unverified'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-green" />
      </div>
    )
  }

  // ── No squad yet — create or join ─────────────────────────
  if (!squad) {
    return (
      <div className="mx-auto max-w-2xl py-4">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight tracking-[-0.01em] text-ink">Focus is easier with someone in it.</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-soft">
            A circle is a few people who see when you&rsquo;re focusing and quietly show up too. No feed to scroll, no rankings.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-lg bg-rust-tint p-3 text-sm font-medium text-rust">{message.text}</div>
        )}

        <form onSubmit={createSquad} className="mt-7 rounded-xl border border-line bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-green">
            <Plus className="h-4 w-4" />
            <span className="text-sm font-semibold text-ink">Create a circle</span>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Evening reset"
            className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm outline-none transition-colors placeholder:text-ghost focus:border-green"
          />
          <button
            type="submit"
            disabled={newName.trim().length < 3 || busy === 'create'}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3 text-sm font-semibold text-white transition-colors hover:bg-green-deep disabled:opacity-50"
          >
            {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Create circle
          </button>
        </form>

        <form onSubmit={joinSquad} className="mt-4 rounded-xl border border-line bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-green">
            <KeyRound className="h-4 w-4" />
            <span className="text-sm font-semibold text-ink">Join with an invite code</span>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="6-CHAR CODE"
            className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-center font-mono text-sm uppercase tracking-[0.3em] outline-none transition-colors placeholder:tracking-normal placeholder:text-ghost focus:border-green"
          />
          <button
            type="submit"
            disabled={!code.trim() || busy === 'join'}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-card py-3 text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-50"
          >
            {busy === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Join circle
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
        <h1 className="font-serif text-[1.9rem] leading-tight tracking-[-0.01em] text-ink">{squad.name}</h1>
        <button
          onClick={copyInvite}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2 font-mono text-xs font-medium tracking-wider text-ink transition-colors hover:bg-green-wash"
        >
          {copied ? <><Check className="h-3.5 w-3.5 text-green" /> copied</> : <>{squad.invite_code} <Copy className="h-3.5 w-3.5" /></>}
        </button>
      </div>

      {/* Members row */}
      <div className="mt-4 flex flex-wrap gap-2">
        {squad.members.map((m) => (
          <div key={m.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
            <Avatar id={m.id} name={m.name} size={24} />
            <span className="text-xs font-medium text-ink">{m.name}</span>
            {m.status === 'checked_in' && <span className="h-1.5 w-1.5 rounded-full bg-green-bright" title="focused today" />}
          </div>
        ))}
      </div>

      {soloSquad && (
        <div className="mt-6 rounded-xl border border-green-line bg-green-tint p-5 text-center">
          <p className="font-serif text-lg text-green-deep">It&rsquo;s just you so far.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-green">
            Share your code with someone who&rsquo;ll keep you company. They&rsquo;ll only ever see your verified time — never your sites.
          </p>
          <button onClick={copyInvite} className="mt-3 inline-flex items-center gap-2 rounded-full bg-green px-4 py-2 font-mono text-xs font-medium tracking-wider text-white transition-colors hover:bg-green-deep">
            {copied ? 'copied' : squad.invite_code} <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* In it right now */}
      {focusingNow.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-bright satya-breathe" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-green">In it right now</span>
          </div>
          <div className="space-y-2">
            {focusingNow.map((f) => (
              <div key={f.id} className="rounded-xl border border-green-line bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar id={f.member.id} name={f.member.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{f.member.name} is focusing</p>
                    <p className="text-xs text-faint">{minutesSince(f.created_at)} min in{f.intention ? ` · “${f.intention}”` : ''}</p>
                  </div>
                </div>
                {/* One quiet cheer — fixed phrases, once per session, no chat, no reply. */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[46px]">
                  {cheered[f.id] === 'sent' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-tint px-2.5 py-1 text-[11px] font-medium text-green">
                      <Check className="h-3 w-3" /> Sent. They&rsquo;ll see it quietly.
                    </span>
                  ) : (
                    ENCOURAGEMENT_PHRASES.map((phrase, i) => (
                      <button
                        key={phrase}
                        onClick={() => encourage(f.id, i)}
                        disabled={cheered[f.id] === 'sending'}
                        className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-soft transition-colors hover:border-green-line hover:bg-green-wash hover:text-green disabled:opacity-50"
                      >
                        {phrase}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent verified sessions */}
      <div className="mt-8">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Recent</div>
        {recent.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-line bg-card">
            {recent.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0">
                <Avatar id={f.member.id} name={f.member.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{f.member.name}</p>
                  <p className="truncate text-xs text-faint">
                    {f.intention ? <span className="italic">&ldquo;{f.intention}&rdquo;</span> : 'Focused'}
                  </p>
                </div>
                <VerifiedBadge verified={f.verified} />
                <span className="font-mono text-sm font-medium text-green-deep">{humanDuration(f.duration_s ?? 0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-card p-8 text-center">
            <p className="text-sm font-medium text-ink">No sessions yet.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-faint">
              When anyone in your circle focuses, their verified time shows up here.
            </p>
          </div>
        )}
      </div>

      <p className="mt-9 text-center text-xs text-faint">
        No streaks, no rankings, no totals — just your people, showing up.
      </p>
    </div>
  )
}
