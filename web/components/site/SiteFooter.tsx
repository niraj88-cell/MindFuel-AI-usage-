// Quiet footer for the public site: the five trust pages, support contact, brand line.
// Shared by the landing page and every trust page so a visitor (or a payments reviewer)
// can reach policy pages from anywhere without hunting.

import Link from 'next/link'

const LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq', label: 'FAQ' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund', label: 'Refunds' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <nav aria-label="Site" className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-faint transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          {/* Soft-launch member entrance: sign-up is hidden on the front door, so an invited
              early user who didn't bookmark /login still has one quiet way back in. Slightly
              emphasized (ink, not green — nav is never green). Remove at public launch. */}
          <Link
            href="/login"
            className="text-[13px] font-medium text-ink transition-colors hover:text-soft"
          >
            Sign in
          </Link>
        </nav>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          SatyaShift · सत्य · truth — proof you did the work.{' '}
          Questions: <a href="mailto:niraj2055adk@gmail.com" className="underline underline-offset-2 hover:text-ink">niraj2055adk@gmail.com</a>
        </p>
      </div>
    </footer>
  )
}
