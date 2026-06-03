// components/seo/JsonLd.tsx — Structured data (JSON-LD) for rich SERP results
export function JsonLd() {
  const baseUrl = 'https://getmindfuel.vercel.app'

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      // ── Organization ──
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'MindFuel',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/icon-512x512.png`,
          width: 512,
          height: 512,
        },
        sameAs: [],
      },

      // ── WebSite ──
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'MindFuel',
        description:
          'AI-powered focus & productivity app with digital wellness tracking',
        publisher: { '@id': `${baseUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },

      // ── SoftwareApplication ──
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#app`,
        name: 'MindFuel',
        operatingSystem: 'Web, iOS, Android',
        applicationCategory: 'ProductivityApplication',
        description:
          'MindFuel is the AI-powered focus and productivity app that tracks your digital content consumption, builds healthier habits, and provides personalized coaching. Features include focus timer, mood tracking, habit streaks, AI insights, mindful intercept, and weekly wellness reports.',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'USD',
          },
          {
            '@type': 'Offer',
            name: 'Pro',
            price: '9.99',
            priceCurrency: 'USD',
            billingIncrement: 1,
            unitCode: 'MON',
          },
        ],
        author: { '@id': `${baseUrl}/#organization` },
      },

      // ── FAQPage ──
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is MindFuel?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'MindFuel is an AI-powered focus and productivity app that works as a mental nutrition tracker. It monitors your digital content consumption and provides personalized insights to help you build healthier digital habits.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is MindFuel free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! MindFuel offers a free plan with core features including content tracking, basic insights, and the focus timer. A Pro plan is available at $9.99/month for advanced AI coaching, detailed analytics, and premium features.',
            },
          },
          {
            '@type': 'Question',
            name: 'What features does MindFuel offer?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'MindFuel includes a focus timer, mood tracking, AI-powered insights, personalized AI coaching, habit challenges with streaks, mindful intercept notifications, digital content consumption logging, and weekly wellness reports.',
            },
          },
          {
            '@type': 'Question',
            name: "How does MindFuel's AI coaching work?",
            acceptedAnswer: {
              '@type': 'Answer',
              text: "MindFuel's AI coaching analyzes your digital consumption patterns, focus sessions, and mood data to deliver personalized recommendations. It helps you identify unhealthy habits, suggests better alternatives, and provides actionable tips to improve your digital wellness and productivity.",
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
