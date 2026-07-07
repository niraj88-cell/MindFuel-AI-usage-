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
import { Check, Lock, X, ArrowRight, Loader2, Puzzle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { InstallGuide } from '@/components/extension/InstallGuide'
import { EXTENSION_PUBLISHED, EXTENSION_STORE_URL } from '@/lib/extension'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
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
      <div className="mb-8 flex items-center gap-2">
        {[1, 2].map((i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${step >= i ? 'w-8 bg-green' : 'w-4 bg-line'}`} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white"><SatyaMark size={18} /></span>
            <span className="font-semibold text-ink">SatyaShift</span>
          </div>

          <h1 className="font-serif text-[2rem] leading-tight tracking-[-0.01em] text-ink">Welcome. Your focus is in good hands.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-soft">
            Work the way you always do. SatyaShift quietly turns real focus into proof you can trust &mdash; and keeps everything else to itself.
          </p>

          <div className="mt-6 rounded-xl border border-line bg-card p-4">
            <div className="flex items-center gap-2.5 border-b border-hairline pb-3">
              <Check className="h-4 w-4 shrink-0 text-green" />
              <span className="text-sm text-ink">We only ever see the domain &mdash; <span className="font-mono text-green">github.com</span>, nothing more.</span>
            </div>
            <div className="pt-3">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-faint"><Lock className="h-3.5 w-3.5" /> What it never sees</div>
              {['The page you’re on, or its address', 'Anything on it, or what you type', 'Your history or your other tabs'].map((t) => (
                <div key={t} className="flex items-center gap-2 py-0.5 text-[13px] text-soft"><X className="h-3.5 w-3.5 shrink-0 text-ghost" /> {t}</div>
              ))}
            </div>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-faint">
            <Lock className="h-3 w-3" /> Private by default. Yours to delete anytime.
          </p>

          <button
            onClick={() => setStep(2)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-deep"
          >
            Sounds right <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="font-serif text-[2rem] leading-tight tracking-[-0.01em] text-ink">One thing to install, then you&rsquo;re done.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-soft">
            The little extension is how focus becomes proof: it verifies your sessions in the
            background so your circle knows your time is real. Nothing to log, ever.
          </p>

          {EXTENSION_PUBLISHED ? (
            <>
              <a
                href={EXTENSION_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-deep"
              >
                <Puzzle className="h-4 w-4" /> Add to Chrome
              </a>
              {/* Pre-empt Chrome's scariest words at the exact moment they'll appear. */}
              <p className="mt-2.5 text-[12px] leading-relaxed text-faint">
                Chrome will warn <span className="font-medium text-soft">&ldquo;Read your browsing history&rdquo;</span> —
                that&rsquo;s the one permission that lets it see which site you&rsquo;re on. The domain, nothing more.{' '}
                <a href="/demo" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink">
                  See exactly what it records
                </a>
                .
              </p>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-line bg-card p-4">
              <div className="mb-3 flex items-start gap-2.5">
                <Puzzle className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                <p className="text-[13px] leading-relaxed text-soft">
                  We&rsquo;re in founding preview &mdash; the Chrome Web Store listing is on its way.
                  Until then, the install is a download and one click:
                </p>
              </div>
              <InstallGuide />
            </div>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-faint">
            <Lock className="h-3 w-3" /> Domain only. Never the page, content, or keystrokes.
          </p>

          <button
            onClick={finish}
            disabled={saving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-hover disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Take me to Today <ArrowRight className="h-4 w-4" /></>}
          </button>
          <button onClick={() => setStep(1)} className="mt-2 w-full py-2 text-center text-xs font-medium text-faint transition-colors hover:text-ink">
            Back
          </button>
        </div>
      )}
    </div>
  )
}
