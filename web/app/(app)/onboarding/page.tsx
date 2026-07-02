'use client'

// SatyaShift — onboarding / first open.
// Two steps, security-forward and calm:
//   1. The privacy boundary — what we can and can't see. Trust before anything.
//   2. Install the extension — the single most important action in the product.
//      One click once the Web Store listing is live (lib/extension.ts); until then
//      an honest founding-preview state with the manual steps, always skippable.
// Then straight to Today. No persona quiz, no tour — the product is ambient.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Lock, X, ArrowRight, Loader2, Puzzle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { EXTENSION_PUBLISHED, EXTENSION_STORE_URL } from '@/lib/extension'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [howOpen, setHowOpen] = useState(false)
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

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6B7280]">
            <Lock className="h-3 w-3" /> Private by default. Yours to delete anytime.
          </p>

          <button
            onClick={() => setStep(2)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628]"
          >
            Sounds right <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">One thing to install, then you&rsquo;re done.</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[#6B7280]">
            The little extension is how focus becomes proof: it verifies your sessions in the
            background so your circle knows your time is real. Nothing to log, ever.
          </p>

          {EXTENSION_PUBLISHED ? (
            <a
              href={EXTENSION_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#256628]"
            >
              <Puzzle className="h-4 w-4" /> Add to Chrome
            </a>
          ) : (
            <div className="mt-6 rounded-2xl border border-black/[0.07] bg-white p-4">
              <div className="flex items-start gap-2.5">
                <Puzzle className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D32]" />
                <p className="text-[13px] leading-relaxed text-[#4B5563]">
                  We&rsquo;re in founding preview &mdash; the Chrome Web Store listing is on its way.
                  For now the install is manual (about a minute):
                </p>
              </div>
              <button
                onClick={() => setHowOpen((v) => !v)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E7D32] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#256628]"
              >
                {howOpen ? 'Hide the steps' : 'Show me the steps'}
              </button>
              {howOpen && (
                <ol className="mt-3 space-y-2 rounded-2xl bg-[#FAF8F4] p-4 text-[13px] leading-relaxed text-[#4B5563]">
                  <li><span className="font-semibold text-[#111827]">1.</span> Open <span className="font-mono text-[12px]">chrome://extensions</span> and turn on <span className="font-semibold">Developer mode</span> (top-right).</li>
                  <li><span className="font-semibold text-[#111827]">2.</span> Click <span className="font-semibold">Load unpacked</span> and choose the SatyaShift <span className="font-mono text-[12px]">extension</span> folder.</li>
                  <li><span className="font-semibold text-[#111827]">3.</span> That&rsquo;s it &mdash; it signs in with this account on its own.</li>
                </ol>
              )}
            </div>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6B7280]">
            <Lock className="h-3 w-3" /> Domain only. Never the page, content, or keystrokes.
          </p>

          <button
            onClick={finish}
            disabled={saving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1F2937] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Take me to Today <ArrowRight className="h-4 w-4" /></>}
          </button>
          <button onClick={() => setStep(1)} className="mt-2 w-full py-2 text-center text-xs font-medium text-[#6B7280] transition-colors hover:text-[#111827]">
            Back
          </button>
        </div>
      )}
    </div>
  )
}
