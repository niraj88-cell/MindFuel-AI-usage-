// SatyaShift — how it works, for someone who has never seen the product.
// Public (listed in proxy.ts isPublicRoute). Plain English, no jargon, and every
// sentence matches the implementation — the extension code is the source of truth.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustPage, TrustSections, type TrustSection } from '@/components/site/TrustPage'

export const metadata: Metadata = {
  title: 'How it works — SatyaShift',
  description: 'What happens after you install SatyaShift, how focus verification works, and exactly what the extension can and cannot see.',
}

const SECTIONS: TrustSection[] = [
  {
    heading: 'What SatyaShift is',
    body: [
      'Two small pieces. A Chrome extension that quietly verifies your focus while you work, and a web app where you look back on it — alone, or with a few friends who are trying to focus too.',
      'There is nothing to log and no timer to babysit. You work the way you already work.',
    ],
  },
  {
    heading: 'What happens after you install',
    body: [
      'You sign in once with your SatyaShift account. The extension connects itself — no setup screens, no configuration. From then on it sits in the background and does one narrow job: it notes which website domain you are actually paying attention to, and for how long.',
      'A small welcome page explains each browser permission the moment you install, so nothing is asked for without a reason.',
    ],
  },
  {
    heading: 'How focus verification works',
    body: [
      'When you start a focus session, the clock starts on our server — not in your browser — so the length of a session cannot be faked. While the session runs, the extension keeps its quiet record of domains and minutes. When you end the session, the server compares that record against the session window and marks the result honestly: verified when the extension could confirm your time, and simply "on trust" when it could not (for example, if the extension was not running).',
      'A session that was mostly focused says so. A session that drifted says so, gently. The point is an honest record, not a grade.',
    ],
  },
  {
    heading: 'What the extension actually sees',
    body: [
      'The bare domain of the tab you are on — "github.com", "docs.google.com" — plus whether the tab is playing sound (so watching a lecture still counts) and whether you have stepped away from the computer.',
      { list: [
        'It never reads page addresses, page titles, or anything on the page.',
        'It never sees what you type, click, or read.',
        'It never tracks incognito windows.',
        'Banking, email, password manager, and health sites are skipped entirely, by design.',
      ]},
    ],
  },
  {
    heading: 'What never leaves your browser',
    body: [
      'To find the domain, the extension has to look at the address of your active tab. It extracts the domain and immediately discards the rest — the full address is never stored and never sent anywhere. The only focus data that leaves your browser is the list of bare domains with time totals, delivered to our own server and no one else. The extension contains no analytics and no third-party code.',
    ],
  },
  {
    heading: 'What your circle sees',
    body: [
      'If you invite friends into a circle, they see that you are focusing right now, your verified focus time, and the words you chose to share about what you are working on. They can send one fixed encouragement phrase per session — there is no chat, no feed to scroll, no streaks, and no leaderboard.',
      'They never see your domains, your sites, or any score. That is enforced in the database itself, not just hidden in the interface.',
    ],
  },
  {
    heading: 'Gentle nudges, never blocking',
    body: [
      'If you have been on a distracting site for a sustained stretch, the extension shows one calm notification and asks — without judgment — whether that is where you want your attention. You choose. SatyaShift never blocks a site, never shames you, and stays quiet for a long while after each nudge.',
    ],
  },
  {
    heading: 'You stay in control',
    body: [
      { list: [
        'Pause tracking any time with one click in the extension popup — the icon shows OFF and collection stops immediately.',
        'Export your data (JSON or CSV) from Settings whenever you like.',
        'Delete your account in one step; it permanently removes your data.',
      ]},
    ],
  },
]

export default function HowItWorksPage() {
  return (
    <TrustPage
      title="How it works"
      intro="SatyaShift keeps an honest, verified record of your focus without watching you. This page walks through exactly what happens after you install it — and exactly where the line is."
    >
      <TrustSections sections={SECTIONS} />
      <p className="mt-8 text-[15px] leading-relaxed text-soft">
        The full privacy promise, in writing: <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">Privacy</Link>.
        What it costs: <Link href="/pricing" className="font-medium text-ink underline underline-offset-2">Pricing</Link>.
      </p>
    </TrustPage>
  )
}
