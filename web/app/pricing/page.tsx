// SatyaShift — pricing. Public (listed in proxy.ts isPublicRoute).
// One product, two ways to pay, no pressure. Prices come from the same constants the
// app uses (lib/subscription.ts) so this page can never drift from implementation.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustPage } from '@/components/site/TrustPage'
import { PLANS, TRIAL_DAYS } from '@/lib/subscription'

export const metadata: Metadata = {
  title: 'Pricing — SatyaShift',
  description: `One plan, priced simply: ${TRIAL_DAYS}-day free trial with no payment method, then $${PLANS.monthly.priceUsd}/month or $${PLANS.annual.priceUsd} for your first year.`,
}

export default function PricingPage() {
  return (
    <TrustPage
      title="Pricing"
      intro="One product, one plan, two ways to pay it. Every account starts with the full product free for 14 days — no payment method, no hidden commitment, nothing to cancel if it isn't for you."
      footnote="Prices in USD. Taxes, where they apply, are shown at checkout."
    >
      {/* The two ways to pay */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-black/[0.07] bg-white p-6">
          <p className="text-sm font-semibold text-[#6B7280]">{PLANS.monthly.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            ${PLANS.monthly.priceUsd}
            <span className="text-base font-medium text-[#6B7280]"> / month</span>
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[#4B5563]">
            The full product. Cancel any time in one click; you keep access until the end of the period you paid for.
          </p>
        </div>
        <div className="rounded-3xl border border-[#A5D6A7] bg-white p-6">
          <p className="text-sm font-semibold text-[#2E7D32]">{PLANS.annual.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            ${PLANS.annual.priceUsd}
            <span className="text-base font-medium text-[#6B7280]"> / first year</span>
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[#4B5563]">
            {PLANS.annual.note} That works out under $3 a month. We will email you before any
            renewal, with the renewal price stated plainly — no silent charges.
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="text-lg font-semibold tracking-tight">How the free trial works</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#4B5563]">
            Every new account gets the complete product for {TRIAL_DAYS} days. We do not ask for a card,
            so nothing can be charged by surprise and there is nothing to remember to cancel.
            You should know what SatyaShift is worth to you before money enters the picture.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">What happens when the trial ends</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#4B5563]">
            You choose a plan to keep going — or you don&rsquo;t, and that&rsquo;s fine. Either way your
            data is never held hostage: export and account deletion stay free, always, and
            nothing you created is deleted when a trial lapses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Why the annual plan exists</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#4B5563]">
            Focus is a practice, not a feature you try for a week. People who commit to a year
            tend to actually build the habit, and a yearly plan costs us less to operate — so
            the saving is passed on rather than kept. The first-year price is a founding
            offer, labeled as exactly that.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Payments and refunds</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#4B5563]">
            Subscriptions are processed by Paddle.com, our merchant of record — card details go
            to Paddle, never to us. Every purchase carries a 30-day money-back guarantee:{' '}
            <Link href="/refund" className="font-medium text-[#111827] underline underline-offset-2">the refund policy</Link>{' '}
            is one page and written in plain words.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Getting in</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#4B5563]">
            SatyaShift is currently in founding preview — accounts open from{' '}
            <Link href="/" className="font-medium text-[#111827] underline underline-offset-2">the waitlist on the homepage</Link>.
            Every account starts with the same {TRIAL_DAYS}-day trial described above.
          </p>
        </section>
      </div>
    </TrustPage>
  )
}
