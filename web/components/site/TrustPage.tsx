// Shared shell for the public trust pages (/privacy, /terms, /refund, /pricing,
// /how-it-works). One visual language — cream, quiet, readable — so every policy page
// feels like the product: minimal, professional, nothing to decode.

import Link from 'next/link'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { SiteFooter } from '@/components/site/SiteFooter'

export type TrustSection = {
  heading: string
  body: (string | { list: string[] })[]
}

export function TrustSections({ sections }: { sections: TrustSection[] }) {
  return (
    <div className="mt-10 space-y-8">
      {sections.map((s) => (
        <section key={s.heading}>
          <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
          {s.body.map((b, i) =>
            typeof b === 'string' ? (
              <p key={i} className="mt-2 text-[15px] leading-relaxed text-soft">{b}</p>
            ) : (
              <ul key={i} className="mt-2 space-y-1.5">
                {b.list.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-soft">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-green" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            )
          )}
        </section>
      ))}
    </div>
  )
}

export function TrustPage({
  title,
  intro,
  children,
  footnote,
}: {
  title: string
  intro: string
  children: React.ReactNode
  footnote?: string
}) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="mb-10 flex w-fit items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white"><SatyaMark size={18} /></span>
          <span className="font-semibold">SatyaShift</span>
        </Link>

        <h1 className="font-serif text-[2.25rem] leading-tight tracking-[-0.01em]">{title}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-soft">{intro}</p>

        {children}

        <p className="mt-12 border-t border-line pt-6 font-mono text-xs text-faint">
          {footnote ?? 'सत्य · truth — the policy is the product.'}
        </p>
      </div>
      <SiteFooter />
    </main>
  )
}
