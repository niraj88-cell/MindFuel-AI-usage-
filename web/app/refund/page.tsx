// SatyaShift — refund policy. Public (listed in proxy.ts isPublicRoute).
// Deliberately one short page: a refund policy you can read in a minute is itself
// a trust feature, and clarity here is what prevents chargebacks.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustPage, TrustSections, type TrustSection } from '@/components/site/TrustPage'

const TITLE = 'Refund Policy — SatyaShift'
const DESCRIPTION = '30-day money-back guarantee on every purchase, a free trial with no payment method, and one-click cancellation.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/refund' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/refund', siteName: 'SatyaShift', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const SECTIONS: TrustSection[] = [
  {
    heading: 'Try before any money moves',
    body: [
      'Every account starts with a 14-day free trial of the full product, with no payment method on file. Nothing can be charged during the trial and nothing converts automatically — the safest refund is the charge that never happens.',
    ],
  },
  {
    heading: '30-day money-back guarantee',
    body: [
      'If you subscribe and SatyaShift is not what you hoped, tell us within 30 days of the charge and you get a full refund. Monthly or annual, first charge or a renewal — same rule, no forms to justify yourself, no "have you tried…" hoops.',
    ],
  },
  {
    heading: 'How to get a refund',
    body: [
      'Email niraj2055adk@gmail.com from your account email with the word "refund" — that is genuinely all it takes. Purchases are processed by Paddle.com as merchant of record, so you can also request the refund through the receipt Paddle emailed you. Refunds go back to the original payment method, usually within 5–10 business days depending on your bank.',
    ],
  },
  {
    heading: 'Cancelling is not the same as refunding',
    body: [
      'Cancel any time in one click from your subscription page. Cancelling stops all future charges and you keep access until the end of the period you already paid for. If you are inside the 30-day window and want the money back too, just ask.',
    ],
  },
  {
    heading: 'After 30 days',
    body: [
      'Past the 30-day window we generally do not refund the current period, but if something on our side went wrong — you were double-charged, or a labeled price was not honored — we will make it right regardless of the calendar.',
    ],
  },
]

export default function RefundPage() {
  return (
    <TrustPage
      title="Refund Policy"
      intro="Short on purpose: a free trial with no card, a 30-day money-back guarantee on every purchase, and cancellation that takes one click."
      footnote="Effective July 3, 2026 · Questions: niraj2055adk@gmail.com"
    >
      <TrustSections sections={SECTIONS} />
      <p className="mt-8 text-[15px] leading-relaxed text-soft">
        See also <Link href="/pricing" className="font-medium text-ink underline underline-offset-2">Pricing</Link> and{' '}
        <Link href="/terms" className="font-medium text-ink underline underline-offset-2">Terms of Service</Link>.
      </p>
    </TrustPage>
  )
}
