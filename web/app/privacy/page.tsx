// SatyaShift — privacy policy. Public (listed in proxy.ts isPublicRoute) and linked
// from the Chrome Web Store listing, signup, and the landing page. Written to be
// read, not skimmed past: plain words, the same boundary the product promises.
// Every statement here must match the implementation — if they ever disagree,
// fix the code or fix this page, never let them drift.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustPage, TrustSections, type TrustSection } from '@/components/site/TrustPage'

export const metadata: Metadata = {
  title: 'Privacy — SatyaShift',
  description: 'What SatyaShift sees, what it never sees, and the control you keep.',
}

const SECTIONS: TrustSection[] = [
  {
    heading: 'The boundary',
    body: [
      'SatyaShift verifies focus using the bare domain of the tab you are on — "github.com", nothing more. That single design decision drives everything below.',
      { list: [
        'We never collect page addresses (URLs), page titles, or page content.',
        'We never collect what you type, click, or read — no keystrokes, no messages, no passwords.',
        'We never collect your browsing history or your other tabs.',
        'Incognito windows are never tracked.',
        'Banking, email, password manager, and health domains are skipped entirely — they are on a built-in never-track list.',
      ]},
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Account: your email address and the name you sign up with (via Supabase authentication, including Google sign-in if you choose it).',
      'Focus activity: bare domains with time durations while tracking is on, and your focus sessions (start, end, the optional intention you write). You can pause tracking any time from the extension popup.',
      'Circle: the circles you join and the encouragements you send or receive (fixed phrases — there is no free-text messaging to collect).',
      'Web app analytics: the web app (not the extension) uses Mixpanel for basic product analytics such as page views tied to your account id. The extension contains no analytics, no trackers, and talks only to our own server.',
      'Waitlist: if you join the waitlist on the homepage, we store that email address and use it for one thing — inviting you. Ask and it is deleted.',
    ],
  },
  {
    heading: 'Browser permissions, and why each exists',
    body: [
      { list: [
        'Tabs — to read the domain of your active tab. The full address is discarded the moment the domain is extracted.',
        'Storage and alarms — to keep the extension’s own state locally and sync your focus record every few minutes.',
        'Idle — to notice when you step away, so time you did not spend is never counted.',
        'Notifications — for the occasional gentle nudge. Never marketing.',
        'Cookies — read only on our own website, to keep you signed in to your own account.',
        'The extension runs no code on the pages you visit. Its only site access is our own website, where a small bridge keeps your sign-in connected.',
      ]},
    ],
  },
  {
    heading: 'What your circle sees',
    body: [
      'Only your verified focus time, that a session is happening, and the words you chose to share (your intention). Never your domains, never your sites, never a score or percentage. This is enforced by database-level rules, not just hidden in the interface.',
    ],
  },
  {
    heading: 'Where it lives',
    body: [
      'Data is stored in your account in our database (Supabase) and served through our hosting provider (Vercel). Payments, when you subscribe, are handled by Paddle.com as merchant of record — your card details go to Paddle and never touch our servers. We do not sell your data, we do not share it with advertisers, and we never will.',
    ],
  },
  {
    heading: 'Retention and deletion',
    body: [
      'Your data is kept while your account exists, so your own history keeps working for you. It is not mined, profiled, or shared. Deleting your account permanently removes your data — the deletion cascades through the database, and there is no soft-delete limbo. Pausing the extension stops collection immediately; uninstalling it stops collection entirely.',
    ],
  },
  {
    heading: 'Your control',
    body: [
      { list: [
        'Export everything from Settings, any time, as JSON or CSV.',
        'Delete your account in one step — permanent, immediate, free, regardless of subscription status.',
        'Pause tracking in one click from the extension popup; the icon shows OFF while paused.',
      ]},
      'No dark patterns, no retention tricks.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'Questions or requests: niraj2055adk@gmail.com — read directly by the founder. Effective July 3, 2026; if this policy ever changes, the change will be plainly visible here first.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <TrustPage
      title="Privacy"
      intro="SatyaShift exists to prove focus without surveilling you. This page says exactly what we see, what we never see, and the control you keep. It is the same promise the product makes on every screen."
    >
      <TrustSections sections={SECTIONS} />
      <p className="mt-8 text-[15px] leading-relaxed text-soft">
        For the plain-English walkthrough of the product itself, see{' '}
        <Link href="/how-it-works" className="font-medium text-ink underline underline-offset-2">How it works</Link>.
      </p>
    </TrustPage>
  )
}
