// SatyaShift — privacy policy. Public (listed in proxy.ts isPublicRoute) and linked
// from the Chrome Web Store listing, signup, and the landing page. Written to be
// read, not skimmed past: plain words, the same boundary the product promises.

import type { Metadata } from 'next'
import Link from 'next/link'
import { SatyaMark } from '@/components/brand/SatyaMark'

export const metadata: Metadata = {
  title: 'Privacy — SatyaShift',
  description: 'What SatyaShift sees, what it never sees, and the control you keep.',
}

const SECTIONS: { heading: string; body: (string | { list: string[] })[] }[] = [
  {
    heading: 'The boundary',
    body: [
      'SatyaShift verifies focus using the bare domain of the tab you are on — "github.com", nothing more. That single design decision drives everything below.',
      { list: [
        'We never collect page addresses (URLs), page titles, or page content.',
        'We never collect what you type, click, or read.',
        'We never collect your browsing history or your other tabs.',
      ]},
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Account: your email address and the name you sign up with (via Supabase authentication, including Google sign-in if you choose it).',
      'Focus activity: bare domains with time durations while tracking is on, and your focus sessions (start, end, the optional intention you write). You can pause tracking any time from the extension popup.',
      'Circle: the circles you join and the encouragement pings you send or receive.',
      'Web app analytics: the web app (not the extension) uses Mixpanel for basic product analytics such as page views tied to your account id. The extension contains no analytics, no trackers, and talks only to our own server.',
    ],
  },
  {
    heading: 'What your circle sees',
    body: [
      'Only your verified focus time and the words you chose to share (your intention). Never your domains, never your sites, never a score.',
    ],
  },
  {
    heading: 'Where it lives',
    body: [
      'Data is stored in your account in our database (Supabase) and served through our hosting provider (Vercel). We do not sell your data, we do not share it with advertisers, and we never will.',
    ],
  },
  {
    heading: 'Your control',
    body: [
      'Settings has one-tap export of your data (JSON or CSV) and one-tap account deletion, which permanently removes your rows. Pausing the extension stops collection immediately. No dark patterns, no retention tricks.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'Questions or requests: niraj2055adk@gmail.com. Effective July 2, 2026 — if this policy ever changes, the change will be plainly visible here first.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#111827]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="mb-10 flex w-fit items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-white"><SatyaMark size={18} /></span>
          <span className="font-semibold">SatyaShift</span>
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
          SatyaShift exists to prove focus without surveilling you. This page says exactly
          what we see, what we never see, and the control you keep. It is the same promise
          the product makes on every screen.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
              {s.body.map((b, i) =>
                typeof b === 'string' ? (
                  <p key={i} className="mt-2 text-[15px] leading-relaxed text-[#4B5563]">{b}</p>
                ) : (
                  <ul key={i} className="mt-2 space-y-1.5">
                    {b.list.map((item) => (
                      <li key={item} className="flex gap-2 text-[15px] leading-relaxed text-[#4B5563]">
                        <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#2E7D32]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-black/[0.07] pt-6 text-xs text-[#6B7280]">
          सत्य · truth — the policy is the product.
        </p>
      </div>
    </main>
  )
}
