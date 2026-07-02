// SatyaShift — terms of service. Public (listed in proxy.ts isPublicRoute).
// Written to be read: plain words, short sections, nothing hidden in legalese.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustPage, TrustSections, type TrustSection } from '@/components/site/TrustPage'

export const metadata: Metadata = {
  title: 'Terms of Service — SatyaShift',
  description: 'The agreement between you and SatyaShift: the service, subscriptions, acceptable use, cancellation, and your rights.',
}

const SECTIONS: TrustSection[] = [
  {
    heading: '1. Who we are',
    body: [
      'SatyaShift ("SatyaShift", "we", "us") is an independent software product operated by its founder as a sole proprietorship. It consists of a browser extension and a web application at satyashift.vercel.app that together help you maintain deep work through verified focus sessions and gentle accountability.',
      'By creating an account or using SatyaShift you agree to these terms. If you do not agree, please do not use the service.',
    ],
  },
  {
    heading: '2. The service',
    body: [
      'SatyaShift verifies focus using only the bare domain of the browser tab you are attending to. What we process — and the much longer list of what we never process — is described in the Privacy Policy, which is part of these terms. If any marketing wording ever appears to promise more than the product does, the product’s actual behavior and the Privacy Policy govern.',
    ],
  },
  {
    heading: '3. Your account',
    body: [
      'You need an account to use SatyaShift. Keep your sign-in credentials to yourself; you are responsible for activity under your account. You must be at least 16 years old, or the age required in your country to consent to a service like this.',
    ],
  },
  {
    heading: '4. Trials, subscriptions, and billing',
    body: [
      'Every new account includes a 14-day free trial of the full product. We do not collect a payment method for the trial, so it cannot convert into a charge automatically.',
      'Continuing after the trial requires a paid subscription (monthly, or annual at the price shown on the Pricing page). Payments are processed by Paddle.com, acting as merchant of record — Paddle is the seller of record for your purchase, handles payment security, and applies any taxes required in your country. We never see or store your card details.',
      'Subscriptions renew automatically at the end of each billing period until cancelled. Where a price is labeled as a first-year or launch price, we will email you before the renewal with the renewal price stated plainly.',
    ],
  },
  {
    heading: '5. Cancellation and refunds',
    body: [
      'You can cancel any time, in one click, from your subscription management page — no email required, no retention flows. Cancelling stops future charges; you keep access until the end of the period you already paid for.',
      'Every purchase carries a 30-day money-back guarantee. The short version and how to claim it are on the Refund Policy page.',
    ],
  },
  {
    heading: '6. Acceptable use',
    body: [
      'Use SatyaShift for its purpose: your own focus and, if you choose, a small circle of people who consented to be there. Do not:',
      { list: [
        'probe, disrupt, or overload the service, or attempt to access data that is not yours;',
        'reverse the privacy protections of other users (for example, attempting to extract someone else’s activity);',
        'resell, sublicense, or misrepresent the service as your own;',
        'use the service for anything unlawful.',
      ]},
    ],
  },
  {
    heading: '7. Your data',
    body: [
      'Your focus data belongs to you. You can export it (JSON or CSV) and delete your account — which permanently removes your data — at any time from Settings, free, regardless of subscription status. We do not sell personal data. The details live in the Privacy Policy.',
    ],
  },
  {
    heading: '8. Intellectual property',
    body: [
      'The SatyaShift name, mark, software, and design are ours. We grant you a personal, non-exclusive, non-transferable license to use the extension and web app while you have an account. You may not copy, modify, or redistribute the software except where the law explicitly permits it.',
    ],
  },
  {
    heading: '9. Availability and changes',
    body: [
      'We work to keep SatyaShift fast and available, but it is provided "as is" and we cannot promise uninterrupted service. We may improve or change features over time; if a change materially reduces what you paid for, you can cancel and claim a refund for the unused period.',
    ],
  },
  {
    heading: '10. Limitation of liability',
    body: [
      'To the maximum extent permitted by law, SatyaShift is not liable for indirect, incidental, or consequential damages, and our total liability for any claim is limited to the amount you paid us in the twelve months before the claim. Nothing in these terms limits liability that cannot lawfully be limited.',
    ],
  },
  {
    heading: '11. Suspension and termination',
    body: [
      'We may suspend or close an account that violates these terms — particularly the acceptable-use rules — after notice where practical. You may close your account at any time from Settings. Section 5 governs any money side of ending the relationship.',
    ],
  },
  {
    heading: '12. Governing law',
    body: [
      'These terms are governed by the laws of Nepal, where SatyaShift is operated. If you buy through Paddle, your purchase is additionally covered by Paddle’s buyer terms, and nothing here reduces consumer rights that your local law grants you.',
    ],
  },
  {
    heading: '13. Support and changes to these terms',
    body: [
      'Support: niraj2055adk@gmail.com — a real inbox, read by the founder. If these terms change in a way that matters, the change will be visible on this page with an updated date before it takes effect.',
      'Effective July 3, 2026.',
    ],
  },
]

export default function TermsPage() {
  return (
    <TrustPage
      title="Terms of Service"
      intro="The agreement between you and SatyaShift, in plain words. The short version: pay only after a free trial convinces you, cancel in one click, your data is yours, and we behave like the product promises."
    >
      <TrustSections sections={SECTIONS} />
      <p className="mt-8 text-[15px] leading-relaxed text-[#4B5563]">
        Related: <Link href="/privacy" className="font-medium text-[#111827] underline underline-offset-2">Privacy</Link> ·{' '}
        <Link href="/refund" className="font-medium text-[#111827] underline underline-offset-2">Refund Policy</Link> ·{' '}
        <Link href="/pricing" className="font-medium text-[#111827] underline underline-offset-2">Pricing</Link>
      </p>
    </TrustPage>
  )
}
