import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { VerifiedMark } from '@/components/brand/VerifiedMark'
import { SiteFooter } from '@/components/site/SiteFooter'
import { ShareButton } from '@/components/site/ShareButton'
import { PLANS, TRIAL_DAYS } from '@/lib/subscription'

// Price on the front door, derived from the same constants the app bills from —
// the anchor is simply what monthly adds up to over a year.
const YEAR_AT_MONTHLY = PLANS.monthly.priceUsd * 12
const YEARLY_SAVING = YEAR_AT_MONTHLY - PLANS.annual.priceUsd

// Public front door (a statement of belief, not a sales page). A visitor should understand in
// seconds: what it is, why it exists, why it's private, why it can be trusted. One honest
// artifact (exactly what a circle sees) carries the privacy promise better than any claim.
// Both gates are retired as of launch (2026-07-24): no waitlist email, no invite — this
// converts straight to signup, with the demo for anyone not ready to commit.

export const metadata: Metadata = {
  title: 'SatyaShift — Proof you did the work',
  description:
    'Deep work is easier when you are not doing it alone. SatyaShift keeps an honest, verified record of your focus, solo or with friends, and only ever sees the domains you visit, never your screen. Private by default.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'SatyaShift — Proof you did the work',
    description: 'Deep work is easier when you are not doing it alone. Verified focus, solo or with friends. Private by default.',
    url: '/',
    siteName: 'SatyaShift',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SatyaShift — Proof you did the work',
    description: 'Deep work is easier when you are not doing it alone. Verified focus, solo or with friends. Private by default.',
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

        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-soft">
          A Chrome extension &amp; a quiet companion app
        </p>
        {/* The hero leads with the ONE strapline (landing audit 2026-07-14): the H1 gets the
            fixation, so it carries WHAT this is; the belief line follows as the subheadline.
            Tab title, OG card, and hero now repeat one message instead of splitting two. */}
        <h1 className="font-serif text-[2.6rem] leading-[1.08] tracking-[-0.01em] text-ink sm:text-[3rem]">
          Proof you did the work.
        </h1>

        <p className="mt-5 text-[17px] leading-relaxed text-ink">
          Deep work is easier when you&rsquo;re not doing it alone.
        </p>
        <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-soft">
          SatyaShift keeps an honest record of your focus, verified quietly in your browser
          so it can&rsquo;t be faked. On your own, it&rsquo;s a witness you can&rsquo;t fool.
          With friends, you keep each other going.
        </p>

        {/* The one artifact: exactly what a friend in your circle sees. Not a
            mockup for flourish — it is the privacy promise, made concrete. */}
        <figure className="mt-10 rounded-xl border border-line bg-card p-4">
          <figcaption className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            What a friend in your circle sees
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

        {/* OPEN (launch 2026-07-24): the invite gate is retired — anyone can create an
            account. This must stay in step with Supabase Auth "Allow new users to sign up"
            being ON; if that toggle is off, this button leads to an error page. To close
            access again, turn the toggle off AND drop '/signup' from proxy.ts. */}
        <Link
          href="/signup"
          className="focus-ring press mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-hover"
        >
          Create your account <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-center text-xs text-faint">
          {TRIAL_DAYS} days free, no card. Chrome on desktop.
        </p>

        {/* The second thing a visitor can do: see a real finished session, run through the
            actual engine. A visible secondary action, not fine print — it's the proof the
            front door is otherwise only claiming. */}
        <Link
          href="/demo"
          className="focus-ring press mt-4 flex w-full items-center justify-center rounded-lg border border-line bg-card py-3 text-sm font-semibold text-ink transition-colors hover:bg-green-wash"
        >
          See it working &mdash; no account needed
        </Link>

        <p className="mt-5 text-center text-sm text-faint">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
            Sign in
          </Link>
        </p>

        <div className="mt-10 rounded-xl border border-line bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Pricing</span>
            <span className="rounded-full bg-green px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-white">
              Save ${YEARLY_SAVING} a year
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-7 gap-y-2">
            <p>
              <span className="font-mono text-2xl font-medium tracking-tight text-ink">${PLANS.monthly.priceUsd}</span>
              <span className="text-sm text-faint"> / month</span>
            </p>
            <p>
              <span className="mr-1.5 font-mono text-sm text-faint line-through" aria-hidden="true">${YEAR_AT_MONTHLY}</span>
              <span className="font-mono text-2xl font-medium tracking-tight text-ink">${PLANS.annual.priceUsd}</span>
              <span className="text-sm text-faint"> / year</span>
            </p>
          </div>
          <p className="mt-3 border-t border-hairline pt-3 text-xs leading-relaxed text-faint">
            Every account starts with {TRIAL_DAYS} days free — full product, no card.{' '}
            <Link href="/pricing" className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
              Pricing, in plain words
            </Link>
            .
          </p>
        </div>

        <p className="mt-8 text-[14px] leading-relaxed text-faint">
          New here?{' '}
          <Link href="/how-it-works" className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
            See how it works
          </Link>
          .
        </p>

        {/* Word of mouth is the only distribution this product can afford to be proud of.
            One quiet share, at the bottom, for the person who already believes — never a
            popup, never a bribe, never the page's green action. */}
        <div className="mt-6 border-t border-hairline pt-6">
          <ShareButton
            url="https://satyashift.com"
            title="SatyaShift — Proof you did the work"
            text="An honest, verified record of your focus — that only ever sees the domains you visit, never your screen. Private by default."
            label="Pass it on"
            className="w-full"
          />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
