'use client'

// Waitlist signup. Inserts into the public.waitlist table via the anon client.
// RLS allows INSERT only — no SELECT policy exists, so emails can't be read back.

import { useState } from 'react'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'submitting' | 'done' | 'error'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<Status>('idle')
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
    const { error } = await supabase.from('waitlist').insert({ email: clean, note: note.trim() || null })
    // 23505 = already on the list; treat as success rather than an error.
    if (error && error.code !== '23505') {
      setStatus('error')
      setErr('Something went wrong. Please try again.')
      return
    }
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div className="mt-8 rounded-2xl border border-[#A5D6A7] bg-[#E8F5E9] p-5">
        <div className="flex items-center gap-2 text-[#1B5E20]">
          <Check className="h-4 w-4" />
          <span className="text-sm font-semibold">You&rsquo;re on the list.</span>
        </div>
        <p className="mt-1 text-[13px] text-[#2E7D32]">We&rsquo;ll email you once, when it&rsquo;s ready. Nothing else.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="email" className="sr-only">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="w-full rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2E7D32]"
      />
      <label htmlFor="note" className="sr-only">What makes focus hard for you (optional)</label>
      <input
        id="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder="What makes focus hard for you? (optional)"
        className="mt-2 w-full rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2E7D32]"
      />
      {status === 'error' && <p className="mt-2 text-[13px] text-[#B42318]">{err}</p>}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628] disabled:opacity-60"
      >
        {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Notify me
      </button>
      <p className="mt-3 text-center text-xs text-[#9CA3AF]">We&rsquo;ll email you once, when it&rsquo;s ready. Nothing else.</p>
    </form>
  )
}
