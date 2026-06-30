'use client'

// SatyaShift — onboarding / first open.
// Security-forward and calm: welcome, the privacy boundary (what we can and can't
// see), then one quick preference (Satya's voice). Writes coach_persona +
// onboarding_completed to profiles and sends the user to Today. Asks almost nothing,
// because the product is ambient — you just start working.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Lock, X, ArrowRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SatyaMark } from '@/components/brand/SatyaMark'

type Persona = 'gentle' | 'direct' | 'brutal'
const PERSONAS: { id: Persona; label: string; desc: string }[] = [
  { id: 'gentle', label: 'Gentle', desc: 'Kind and encouraging. Never harsh.' },
  { id: 'direct', label: 'Direct', desc: 'Clear and to the point.' },
  { id: 'brutal', label: 'Blunt', desc: 'Unsparing tough love, if that helps.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [persona, setPersona] = useState<Persona>('gentle')
  const [saving, setSaving] = useState(false)

  async function finish() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true, coach_persona: persona })
          .eq('id', user.id)
      }
      router.push('/dashboard')
    } catch {
      router.push('/dashboard')
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center py-8">
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2].map((i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${step >= i ? 'w-8 bg-[#2E7D32]' : 'w-1.5 bg-black/10'}`} />
        ))}
      </div>

      {step === 1 && (
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

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF]">
            <Lock className="h-3 w-3" /> Private by default. Yours to delete anytime.
          </p>

          <button
            onClick={() => setStep(2)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628]"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">How should Satya talk to you?</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6B7280]">Satya is the voice that checks in when you drift. You can change this anytime in settings.</p>

          <div className="mt-6 grid gap-2.5">
            {PERSONAS.map((p) => {
              const active = persona === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${active ? 'border-[#2E7D32] bg-[#E8F5E9]' : 'border-black/[0.08] bg-[#FAF8F4] hover:bg-black/[0.02]'}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${active ? 'text-[#1B5E20]' : 'text-[#111827]'}`}>{p.label}</div>
                    <div className={`mt-0.5 text-xs ${active ? 'text-[#2E7D32]' : 'text-[#6B7280]'}`}>{p.desc}</div>
                  </div>
                  {active && <Check className="h-4 w-4 shrink-0 text-[#2E7D32]" />}
                </button>
              )
            })}
          </div>

          <button
            onClick={finish}
            disabled={saving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Start focusing
          </button>
          <button onClick={() => setStep(1)} className="mt-2 w-full py-2 text-center text-xs font-medium text-[#9CA3AF] transition-colors hover:text-[#6B7280]">
            Back
          </button>
        </div>
      )}
    </div>
  )
}
