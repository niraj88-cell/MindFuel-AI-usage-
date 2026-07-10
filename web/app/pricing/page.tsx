// SatyaShift — pricing. Public (listed in proxy.ts isPublicRoute).
// One product, two ways to pay, no pressure. Prices come from the same constants the
// app uses (lib/subscription.ts) so this page can never drift from implementation.
// The CTA leads to the EXISTING flow (signup → cardless trial → choose a plan in
// Settings); no checkout happens from this page and no billing logic lives here.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustPage } from '@/components/site/TrustPage'
import { readPaddlePublicEnv } from '@/lib/billing/public-config'
import { PLANS, TRIAL_DAYS } from '@/lib/subscription'

export const metadata: Metadata = {
  title: 'Pricing — SatyaShift',
  description: `One plan, priced simply: ${TRIAL_DAYS}-day free trial with no payment method, then $${PLANS.monthly.priceUsd}/month or $${PLANS.annual.priceUsd}/year.`,
  alternates: { canonical: '/pricing' },
}

// Both plans are the whole product — pricing chooses a cadence, never a feature set.
// Stated once, under the cards, as OUTCOMES first: what a person gains, then the plain
// mechanism that delivers it. No feature-name bingo, nothing the product doesn't do.
const INCLUDED: Array<{ lead: string; detail: string }> = [
  { lead: 'Understand how you actually work.',
    detail: 'A behavioral profile built only from your own sessions — patterns, not generic advice.' },
  { lead: 'Prove your focus.',
    detail: 'Sessions verified quietly in the browser, so the record can’t be fooled — not even by you.' },
  { lead: 'Catch drift while it’s happening.',
    detail: 'One gentle nudge when attention starts circling. Never a guilt trip, never a score.' },
  { lead: 'Keep each other going.',
    detail: 'Host circles for the people you work alongside. They see verified time and your own words — never your sites, never your quality.' },
  { lead: 'Work somewhere calmer.',
    detail: 'Quiet generated environments (rain, fire, waves) and a one-line desktop companion.' },
  { lead: 'Stay free to leave.',
    detail: 'Export and deletion are free, always. Your data is never the hostage.' },
]

// The discount, derived — never hand-typed, so it stays true if prices change.
const YEAR_AT_MONTHLY = PLANS.monthly.priceUsd * 12
const YEARLY_SAVING = YEAR_AT_MONTHLY - PLANS.annual.priceUsd
const ANNUAL_PER_MONTH = PLANS.annual.priceUsd / 12

export default function PricingPage() {
  // Founding offer (50% off the first month) — mentioned ONLY when the matching Paddle
  // discount is configured, so this page can never advertise a price checkout won't honor.
  const foundingOffer = !!readPaddlePublicEnv().discountMonthly
  return (
    <TrustPage
      title="Pricing"
      intro="One product, one plan, two ways to pay it. Every account starts with the full product free for 14 days — no payment method, no hidden commitment, nothing to cancel if it isn't for you."
      footnote="Prices in USD. Taxes, where they apply, are shown at checkout."
    >
      {/* The two ways to pay. Price is the hierarchy; the annual card leads quietly. */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-line bg-card p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            {PLANS.monthly.label}
          </p>
          <p className="mt-5 font-mono text-[2.75rem] font-medium leading-none tracking-tight text-ink">
            ${PLANS.monthly.priceUsd}
            <span className="ml-1 text-base font-normal text-faint">/ month</span>
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-soft">
            The full product, month to month. Cancel any time in one click; access runs to
            the end of what you paid for.
          </p>
          {foundingOffer && (
            <p className="mt-3 text-[13px] leading-relaxed text-soft">
              <span className="font-medium text-ink">Founding thanks:</span> your first month
              is ${PLANS.monthly.priceUsd / 2}, applied automatically at checkout. It renews
              at the plain ${PLANS.monthly.priceUsd} — a thank-you for being early, not a hook.
            </p>
          )}
          <div className="mt-auto pt-7">
            <Link
              href="/signup"
              className="flex h-11 items-center justify-center rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash"
            >
              Start the free trial
            </Link>
            <p className="mt-2.5 text-center text-xs text-faint">
              {TRIAL_DAYS} days, no card. Pick a plan only if it earns it.
            </p>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-green-line bg-green-tint p-7">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-green">
              {PLANS.annual.label}
            </p>
            <span className="rounded-full bg-green px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-white">
              Save ${YEARLY_SAVING} a year
            </span>
          </div>
          <p className="mt-5 font-mono text-[2.75rem] font-medium leading-none tracking-tight text-ink">
            <span className="mr-2 align-middle text-xl font-normal text-faint line-through" aria-hidden="true">
              ${YEAR_AT_MONTHLY}
            </span>
            ${PLANS.annual.priceUsd}
            <span className="ml-1 text-base font-normal text-faint">/ year</span>
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-soft">
            {PLANS.annual.note} That&rsquo;s ${ANNUAL_PER_MONTH} a month instead of the
            ${YEAR_AT_MONTHLY} a year monthly adds up to. We email before any renewal,
            with the renewal price stated plainly — no silent charges.
          </p>
          <div className="mt-auto pt-7">
            <Link
              href="/signup"
              className="flex h-11 items-center justify-center rounded-lg bg-green text-sm font-semibold text-white transition-colors hover:bg-green-deep"
            >
              Start the free trial
            </Link>
            <p className="mt-2.5 text-center text-xs text-faint">
              Same trial, same product — this is just the calmer way to pay.
            </p>
          </div>
        </div>
      </div>

      {/* Trust, stated as fact, next to the decision. */}
      <p className="mt-5 text-center text-xs leading-relaxed text-faint">
        No card for the trial &middot; Cancel in one click &middot; No hidden fees &middot;
        30-day money-back guarantee &middot; Payments by Paddle — card details never touch
        our servers
      </p>
      <p className="mt-1.5 text-center text-xs leading-relaxed text-faint">
        And the product itself: analysis uses domains and time only — never pages,
        content, or what you type.
      </p>

      {/* What the money buys — once, because both plans are the whole product. */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Both plans are the whole product</h2>
        <ul className="mt-4 space-y-3">
          {INCLUDED.map((item) => (
            <li key={item.lead} className="flex gap-2.5 text-[15px] leading-relaxed">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-green" aria-hidden="true" />
              <span className="text-soft">
                <span className="font-medium text-ink">{item.lead}</span> {item.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 space-y-8">
        <section>
          <h2 className="text-lg font-semibold tracking-tight">What stays free, forever</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft">
            Your own record is never the thing you pay for. Tracking, sessions, reflections,
            your behavioral profile, export, and deletion stay free after the trial — and so
            does <span className="font-medium text-ink">joining</span> a circle someone invites
            you to. The paid plan is for <span className="font-medium text-ink">hosting</span>{' '}
            circles and keeping the whole practice running. If you never pay us a cent, your
            data is still yours, still private, still exportable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">How the free trial works</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft">
            Every new account gets the complete product for {TRIAL_DAYS} days. We do not ask for a card,
            so nothing can be charged by surprise and there is nothing to remember to cancel.
            You should know what SatyaShift is worth to you before money enters the picture.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">What happens when the trial ends</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft">
            You choose a plan to keep going — or you don&rsquo;t, and that&rsquo;s fine. Either way your
            data is never held hostage: export and account deletion stay free, always, and
            nothing you created is deleted when a trial lapses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Why the annual plan exists</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft">
            Focus is a practice, not a feature you try for a week. People who commit to a year
            tend to actually build the habit, and a yearly plan costs us less to operate — so
            the saving is passed on rather than kept. The first-year price is a founding
            offer, labeled as exactly that.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Payments and refunds</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft">
            Subscriptions are processed by Paddle.com, our merchant of record — card details go
            to Paddle, never to us. Every purchase carries a 30-day money-back guarantee:{' '}
            <Link href="/refund" className="font-medium text-ink underline underline-offset-2">the refund policy</Link>{' '}
            is one page and written in plain words.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Getting in</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft">
            Accounts are open —{' '}
            <Link href="/signup" className="font-medium text-ink underline underline-offset-2">create one in a minute</Link>.
            The {TRIAL_DAYS}-day trial starts on its own, and no card is asked for along the way.
          </p>
        </section>
      </div>
    </TrustPage>
  )
}
