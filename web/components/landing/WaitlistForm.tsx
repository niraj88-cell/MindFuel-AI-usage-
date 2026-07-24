'use client'

// NOT MOUNTED since launch (2026-07-24): signup is open, so the homepage converts straight
// to /signup and nothing renders this. Kept — with its tables (waitlist, waitlist_notes,
// migration 025) — because closing access again is a one-import change, not a rebuild.
//
// Invite-request form (soft launch). Two quiet steps, per the landing audit 2026-07-14:
//   1. Say the gate out loud (invite-only early access), then take ONLY the email —
//      a visible pre-commit field cuts completion, so the form asks nothing else.
//   2. AFTER the request is in, the success card asks the one founder question
//      ("what makes focus hard for you?") — answers arrive at a higher rate post-commit.
// Storage: waitlist (INSERT-only RLS, rows can't be read back) for the request;
// waitlist_notes (migration 025, same posture) for the optional answer — waitlist has a
// unique lower(email) index and anon has no UPDATE policy, so the note is its own insert.

import { useState } from 'react'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'submitting' | 'done' | 'error'
type NoteStatus = 'idle' | 'submitting' | 'done'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [noteStatus, setNoteStatus] = useState<NoteStatus>('idle')
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      setErr('Enter a valid email.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.from('waitlist').insert({ email: clean, note: null })
    // 23505 = already on the list; treat as success rather than an error.
    if (error && error.code !== '23505') {
      setStatus('error')
      setErr('Something went wrong. Please try again.')
      return
    }
    setStatus('done')
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    const clean = note.trim()
    if (!clean || noteStatus !== 'idle') return
    setNoteStatus('submitting')
    const supabase = createClient()
    await supabase
      .from('waitlist_notes')
      .insert({ email: email.trim().toLowerCase(), note: clean.slice(0, 500) })
    // The invite request already stands — a failed note must never look like a failure.
    setNoteStatus('done')
  }

  if (status === 'done') {
    return (
      <div className="mt-8 rounded-xl border border-green-line bg-green-tint p-5">
        <div className="flex items-center gap-2 text-green-deep">
          <Check className="h-4 w-4" />
          <span className="text-sm font-semibold">You&rsquo;re on the list.</span>
        </div>
        <p className="mt-1 text-[13px] text-green">We&rsquo;ll email you your invite. Nothing else.</p>
        {noteStatus === 'done' ? (
          <p className="mt-4 border-t border-green-line pt-3 text-[13px] leading-relaxed text-green-deep">
            Noted — thank you. It genuinely shapes what gets built.
          </p>
        ) : (
          <form onSubmit={submitNote} className="mt-4 border-t border-green-line pt-4">
            <label htmlFor="note" className="block text-[13px] font-medium leading-relaxed text-ink">
              One question, if you have a minute: what makes focus hard for you?
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="In your own words"
                className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-ghost focus:border-green"
              />
              <button
                type="submit"
                disabled={noteStatus === 'submitting' || !note.trim()}
                className="focus-ring press shrink-0 rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-60"
              >
                {noteStatus === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8">
      {/* Say the gate BEFORE the ask — an unexplained "notify me" reads as a bait-and-switch
          on a page that just described a usable product. */}
      <p className="mb-3 text-[14px] leading-relaxed text-soft">
        <span className="font-medium text-ink">SatyaShift is in invite-only early access.</span>{' '}
        Leave your email and we&rsquo;ll send you an invite.
      </p>
      <label htmlFor="email" className="sr-only">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="w-full rounded-lg border border-line bg-card px-4 py-3 text-sm outline-none transition-colors placeholder:text-ghost focus:border-green"
      />
      {status === 'error' && <p className="mt-2 text-[13px] text-rust">{err}</p>}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="focus-ring press mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-hover disabled:opacity-60"
      >
        {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Request an invite
      </button>
      {/* faint, not ghost: ghost is ~2.5:1 on paper — below WCAG AA for readable text. */}
      <p className="mt-3 text-center text-xs text-faint">We&rsquo;ll email you your invite. Nothing else.</p>
    </form>
  )
}
