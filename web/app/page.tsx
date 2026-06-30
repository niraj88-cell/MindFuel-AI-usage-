import type { Metadata } from 'next'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { WaitlistForm } from '@/components/landing/WaitlistForm'

// Pre-launch validation page (public). The app itself stays private behind auth.
// Four beats only: what it is, why it's different, how to be notified, how data is used.

export const metadata: Metadata = {
  title: 'SatyaShift — Focus you can prove',
  description:
    'Verified focus, not self-reported. A browser extension quietly confirms your focus — and only ever sees the domains you visit, never the page or what you type. Private by default.',
  openGraph: {
    title: 'SatyaShift — Focus you can prove',
    description: 'Verified focus, not self-reported. Private by default.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#111827]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="mb-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-white">
            <SatyaMark size={18} />
          </span>
          <span className="font-semibold">SatyaShift</span>
        </div>

        <h1 className="text-[2rem] font-bold leading-tight tracking-tight">Focus you can prove.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#4B5563]">
          Most focus tools run on what you tell them. SatyaShift runs on what actually happened &mdash; a
          browser extension quietly verifies your focus, so the time is real, not self-reported. It only ever
          sees the domains you visit, never the page or what you type. Private by default.
        </p>

        <WaitlistForm />
      </div>
    </main>
  )
}
