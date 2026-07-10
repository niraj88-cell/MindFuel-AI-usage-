import { PLANS } from '@/lib/subscription'

// Site-wide entity graph: Organization + WebSite + SoftwareApplication.
// Rules that keep this trustworthy (and safe from structured-data penalties):
//  - Everything here must be TRUE and visible somewhere on the public site. Prices come
//    from lib/subscription.ts (the same constants the app bills from).
//  - No aggregateRating / review markup until real users leave real reviews. Faking
//    social proof in schema is the classic spam signal — never add it speculatively.
//  - FAQPage schema lives on /faq (where the questions are actually visible), NOT here:
//    Google requires FAQ markup to mirror on-page content.
//  - sameAs stays absent until the brand's social profiles exist; an empty array says
//    nothing and a wrong link poisons entity resolution in AI search.
export function JsonLd() {
  const baseUrl = 'https://satyashift.com'

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'SatyaShift',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/icon-512x512.png`,
          width: 512,
          height: 512,
        },
        slogan: 'Proof you did the work.',
        description:
          'SatyaShift is an independent, privacy-first accountability product: a Chrome extension that verifies focus sessions using only bare domains, and a companion web app for reflection and small accountability circles.',
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'SatyaShift',
        description:
          'Proof you did the work. SatyaShift verifies focus sessions in the background, keeps your domains private, and shows your circle only that you showed up.',
        publisher: { '@id': `${baseUrl}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#app`,
        name: 'SatyaShift',
        url: baseUrl,
        operatingSystem: 'Chrome (browser extension) + any modern browser (web app)',
        browserRequirements: 'Requires Google Chrome for focus verification',
        applicationCategory: 'ProductivityApplication',
        description:
          'SatyaShift confirms your focus sessions ambiently — no manual logging and no self-reporting. It sees only the bare domain of the active tab, never pages or keystrokes. Your domains stay private to you, while your circle sees only verified focus time.',
        featureList: [
          'Verified focus sessions (server-anchored, cannot be self-reported)',
          'Domain-only tracking — never page URLs, content, or keystrokes',
          'One gentle drift nudge, never a website blocker',
          'Small accountability circles that see verified time, never your sites',
          'A shareable, domain-free week-of-attention picture',
          'Full data export (JSON/CSV) and one-step account deletion',
        ],
        screenshot: `${baseUrl}/opengraph-image`,
        // Must match the real pricing (lib/subscription.ts). A structured-data "Free"
        // that search engines surface next to an $8/mo pricing page is a trust breach.
        offers: [
          {
            '@type': 'Offer',
            name: PLANS.monthly.label,
            price: String(PLANS.monthly.priceUsd),
            priceCurrency: 'USD',
          },
          {
            '@type': 'Offer',
            name: PLANS.annual.label,
            price: String(PLANS.annual.priceUsd),
            priceCurrency: 'USD',
          },
        ],
        author: { '@id': `${baseUrl}/#organization` },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
