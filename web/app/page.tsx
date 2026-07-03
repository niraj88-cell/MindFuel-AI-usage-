import type { Metadata } from 'next'
import Link from 'next/link'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { VerifiedMark } from '@/components/brand/VerifiedMark'
import { WaitlistForm } from '@/components/landing/WaitlistForm'
import { SiteFooter } from '@/components/site/SiteFooter'

// Pre-launch page (public). Not a sales page — a statement of belief.
// A visitor should understand in seconds: what it is, why it exists, why it's
// private, why it can be trusted. One honest artifact (what a circle actually
// sees) carries the privacy promise better than any claim.

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
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <div className="mb-14 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
            <SatyaMark size={18} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-semibold">SatyaShift</span>
            <span className="mt-1 font-mono text-[11px] tracking-wide text-faint">&#2360;&#2340;&#2381;&#2351; &middot; truth</span>
          </span>
        </div>

        <h1 className="font-serif text-[2.6rem] leading-[1.08] tracking-[-0.01em] text-ink sm:text-[3rem]">
          Deep work is easier when you&rsquo;re not doing it alone.
        </h1>

        <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-soft">
          SatyaShift keeps an honest record of your focus, verified quietly in your browser
          so it can&rsquo;t be faked. On your own, it&rsquo;s a witness you can&rsquo;t fool.
          With friends, you keep each other going.
        </p>

        {/* The one artifact: exactly what a friend in your circle sees. Not a
            mockup for flourish — it is the privacy promise, made concrete. */}
        <figure className="mt-10 rounded-xl border border-line bg-card p-4">
          <figcaption className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            What your circle sees
          </figcaption>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green text-[13px] font-semibold text-white">
              A
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">Anaya</p>
              <p className="truncate text-xs text-faint">&ldquo;Thesis, chapter two&rdquo;</p>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-sm text-green">
              <VerifiedMark verified size={14} /> 1h 40m
            </span>
          </div>
          <p className="mt-3 border-t border-hairline pt-3 text-xs leading-relaxed text-faint">
            Verified time and her own words. Never which sites she was on. Never a score.
          </p>
        </figure>

        <p className="mt-8 text-[14px] leading-relaxed text-faint">
          It only ever sees the domains you visit. Never your screen, never what you type.{' '}
          <Link href="/privacy" className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
            Read the full promise
          </Link>
          .
        </p>

        <WaitlistForm />

        <p className="mt-8 text-[14px] leading-relaxed text-faint">
          New here?{' '}
          <Link href="/how-it-works" className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
            See how it works
          </Link>{' '}
          and{' '}
          <Link href="/pricing" className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
            what it costs
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </main>
  )
}
