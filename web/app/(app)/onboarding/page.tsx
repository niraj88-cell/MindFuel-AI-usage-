'use client'

// SatyaShift — onboarding / first open.
// One step, security-forward and calm: welcome + the privacy boundary (what we can
// and can't see), then straight to Today. Asks nothing, because the product is
// ambient — you just start working. (The old step 2 persona picker configured the
// deleted legacy coach; nudge copy is fixed prose in the extension and never read it.)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Lock, X, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SatyaMark } from '@/components/brand/SatyaMark'

export default function OnboardingPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function finish() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id)
      }
      router.push('/dashboard')
    } catch {
      router.push('/dashboard')
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center py-8">
      <div>
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-white"><SatyaMark size={18} /></span>
          <span className="font-semibold text-[#111827]">SatyaShift</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Welcome. Your focus is in good hands.</h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#6B7280]">
          Work the way you always do. SatyaShift quietly turns real focus into proof you can trust &mdash; and keeps everything else to itself.
        </p>

        <div className="mt-6 rounded-2xl border border-black/[0.07] bg-white p-4">
          <div className="flex items-center gap-2.5 border-b border-black/[0.06] pb-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#2E7D32]" />
            <span className="text-sm text-[#111827]">We only ever see the domain &mdash; <span className="font-mono text-[#2E7D32]">github.com</span>, nothing more.</span>
          </div>
          <div className="pt-3">
            <div className="mb-1.5 flex items-center gap-2 text-xs text-[#6B7280]"><Lock className="h-3.5 w-3.5" /> What it never sees</div>
            {['The page you’re on, or its address', 'Anything on it, or what you type', 'Your history or your other tabs'].map((t) => (
              <div key={t} className="flex items-center gap-2 py-0.5 text-[13px] text-[#6B7280]"><X className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" /> {t}</div>
            ))}
          </div>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6B7280]">
          <Lock className="h-3 w-3" /> Private by default. Yours to delete anytime.
        </p>

        <button
          onClick={finish}
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start focusing <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  )
}
