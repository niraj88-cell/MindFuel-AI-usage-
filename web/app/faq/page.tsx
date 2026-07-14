// SatyaShift — /faq: plain answers to the questions people (and AI engines) actually ask.
//
// Public (listed in proxy.ts isPublicRoute). Every answer is checked against the
// implementation — the same honesty rule as /how-it-works. The ONE source of truth is
// the FAQS array below: it renders the visible page AND the FAQPage JSON-LD, so the
// structured data can never say something the page doesn't (Google's requirement, and
// ours). Keep answers self-contained: AI search engines quote them verbatim.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustPage } from '@/components/site/TrustPage'
import { PLANS, TRIAL_DAYS } from '@/lib/subscription'

const TITLE = 'FAQ — SatyaShift'
const DESCRIPTION =
  'Plain answers about SatyaShift: what the extension can and cannot see, how focus verification works, what your circle sees, pricing, and your data rights.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/faq' },
  // Child openGraph/twitter REPLACE the root layout's (Next merges per level, not deep),
  // so each carries its full shape — otherwise the root twitter.title would override
  // this page's og:title in X unfurls.
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/faq', siteName: 'SatyaShift', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

type Faq = { q: string; a: string; link?: { href: string; label: string } }

const FAQS: Faq[] = [
  {
    q: 'What is SatyaShift?',
    a: 'SatyaShift is a Chrome extension and companion web app that keeps a verified record of your focus. The extension quietly confirms your focus sessions in the background — using only the bare domain of your active tab — so "I did two hours of deep work" becomes something you can actually show, to yourself or to a small circle of friends.',
    link: { href: '/how-it-works', label: 'How it works, step by step' },
  },
  {
    q: 'How does focus verification work?',
    a: 'When you start a focus session, the clock starts on the SatyaShift server, not in your browser, so a session’s length cannot be faked. While it runs, the extension keeps a record of which domains held your attention and for how long. When you end the session, the server compares that record against the session window and marks it verified — or honestly "on trust" if the extension could not confirm it.',
  },
  {
    q: 'What exactly can the extension see?',
    a: 'Only the bare domain of the tab you are on — like "github.com" — plus whether the tab is playing sound and whether you have stepped away. It never reads page addresses, titles, or content; never sees what you type; never tracks incognito windows; and skips banking, email, password-manager, and health sites entirely by design.',
    link: { href: '/privacy', label: 'The full privacy promise' },
  },
  {
    q: 'Is SatyaShift a website blocker?',
    a: 'No. SatyaShift never blocks a site. If your attention sits on distracting sites for a sustained stretch, it shows one calm notification asking whether that is where you want to be — then stays quiet for a long while. You always choose; nothing is forbidden and nothing shames you.',
  },
  {
    q: 'What do friends in my circle see?',
    a: 'Only that you are focusing right now, your verified focus time, and the words you chose to share about what you are working on. They never see your sites, your domains, or any score — and that boundary is enforced in the database itself, not just hidden in the interface.',
  },
  {
    q: 'Do I have to log anything manually?',
    a: 'No. There is nothing to log and no timer to babysit. Tracking is passive: you work the way you already work, and your verified sessions appear on their own.',
  },
  {
    q: 'What does "unverified" mean on a session?',
    a: 'It means the extension could not confirm that session — usually because it was not installed or not running — so the time is recorded on trust instead. Unverified sessions still count; they are just labeled honestly rather than given a badge they did not earn.',
  },
  {
    q: 'How much does SatyaShift cost?',
    a: `Every account starts with a ${TRIAL_DAYS}-day free trial — full product, no payment method required. After that it is $${PLANS.monthly.priceUsd} per month or $${PLANS.annual.priceUsd} per year. Joining a friend’s circle is always free.`,
    link: { href: '/pricing', label: 'Pricing, in plain words' },
  },
  {
    q: 'Which browsers does it support?',
    a: 'Google Chrome. The extension is built on Chrome’s current extension platform (Manifest V3), ships with no third-party code, and requests the minimum permissions it can function with.',
  },
  {
    q: 'Can I export or delete my data?',
    a: 'Yes, both, from Settings. Export everything as JSON or CSV whenever you like, and delete your account in one step — it permanently removes your data.',
  },
  {
    q: 'Does SatyaShift sell my data or use third-party trackers?',
    a: 'No. The extension contains no analytics and no third-party code, and it talks only to SatyaShift’s own server. The only focus data that ever leaves your browser is a list of bare domains with time totals, stored on your account and yours to export or delete.',
  },
  {
    q: 'Why is it called SatyaShift?',
    a: 'Satya (सत्य) is the Sanskrit word for truth. The product is built around one idea: an honest, verified record of your focus — no self-reporting, no vanity streaks, no gaming it.',
  },
  {
    q: 'How do I get access?',
    a: 'SatyaShift is currently in an invite-only founding preview. Leave your email on the homepage and we’ll send you an invite; if you are curious first, the live demo shows a real session with no account needed.',
    link: { href: '/demo', label: 'See a real session — no account' },
  },
]

// The schema is derived from the SAME array the page renders — visible content and
// structured data cannot disagree. Links are page-only; schema text stands alone.
function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://satyashift.com/faq#faq',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export default function FaqPage() {
  return (
    <TrustPage
      title="Questions, answered plainly"
      intro="Everything here is checked against the shipped code — if the product changes, this page changes. The short version: SatyaShift verifies your focus using only bare domains, your sites stay private, and nothing is ever blocked or logged by hand."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <div className="mt-10 space-y-8">
        {FAQS.map((f) => (
          <section key={f.q}>
            <h2 className="text-lg font-semibold tracking-tight">{f.q}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-soft">{f.a}</p>
            {f.link && (
              <p className="mt-1.5 text-[14px]">
                <Link href={f.link.href} className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
                  {f.link.label}
                </Link>
              </p>
            )}
          </section>
        ))}
      </div>
      <p className="mt-10 text-[15px] leading-relaxed text-soft">
        Something we didn&rsquo;t answer? Write to us — the address is in the footer, and a
        person reads it.
      </p>
    </TrustPage>
  )
}
