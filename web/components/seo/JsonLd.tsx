export function JsonLd() {
  const baseUrl = 'https://satyashift.vercel.app'

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
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'SatyaShift',
        description:
          'Focus you can prove. SatyaShift verifies focus sessions in the background, keeps your domains private, and shows your squad only that you showed up.',
        publisher: { '@id': `${baseUrl}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#app`,
        name: 'SatyaShift',
        operatingSystem: 'Web',
        applicationCategory: 'ProductivityApplication',
        description:
          'SatyaShift confirms your focus sessions ambiently — no manual logging and no self-reporting. Your browsing domains stay private to you, while your squad sees only verified focus.',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'USD',
          },
        ],
        author: { '@id': `${baseUrl}/#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is SatyaShift?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'SatyaShift is an ambient focus tracker. It verifies your focus sessions in the background so they can’t be faked, while keeping the sites you visit private to you.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does SatyaShift protect my privacy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The specific sites you visit are owner-only telemetry. Your squad never sees which domains you focused on — only that you completed a verified session.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I have to log anything manually?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. SatyaShift runs ambiently through a browser extension. Focus sessions appear on their own — there is nothing to start or log.',
            },
          },
          {
            '@type': 'Question',
            name: 'What does “verified focus” mean?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A session is confirmed in the background rather than self-reported, so the focus your squad sees is real and cannot be gamed.',
            },
          },
        ],
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
