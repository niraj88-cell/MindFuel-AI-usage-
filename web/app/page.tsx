import type { Metadata } from 'next'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { WaitlistForm } from '@/components/landing/WaitlistForm'

// Pre-launch validation page (public). The app itself stays private behind auth.
// Four beats only: what it is, why it's different, how to be notified, how data is used.

export const metadata: Metadata = {
  title: 'SatyaShift — Focus you can prove',
  description:
    'Deep work is easier when you are not doing it alone. SatyaShift keeps an honest, verified record of your focus, solo or with friends, and only ever sees the domains you visit, never your screen. Private by default.',
  openGraph: {
    title: 'SatyaShift — Focus you can prove',
    description: 'Deep work is easier when you are not doing it alone. Verified focus, solo or with friends. Private by default.',
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
          <span className="flex flex-col leading-none">
            <span className="font-semibold">SatyaShift</span>
            <span className="mt-1 text-[11px] font-medium tracking-wide text-[#9CA3AF]">&#2360;&#2340;&#2381;&#2351; &middot; truth</span>
          </span>
        </div>

        <h1 className="text-[2rem] font-bold leading-tight tracking-tight">
          Deep work is easier when you&rsquo;re not doing it alone.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#4B5563]">
          SatyaShift keeps an honest record of your focus, verified quietly in your browser so it can&rsquo;t be faked.
          On your own, it&rsquo;s a witness you can&rsquo;t fool. With friends, you keep each other going.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
          It only ever sees the domains you visit. Never your screen, never what you type.
        </p>

        <WaitlistForm />
      </div>
    </main>
  )
}
