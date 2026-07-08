import type { Metadata } from 'next'
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { PWARegister } from '@/components/PWARegister'
import { JsonLd } from '@/components/seo/JsonLd'
import './globals.css'

// Three voices, self-hosted (no render-blocking Google request, no FOUT flash):
// a quiet grotesque for the interface, a serif reserved for Satya + statements,
// a bookish mono for anything measured (durations, times, domains, labels).
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
})
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument-serif',
})
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://satyashift.vercel.app'),
  title: 'SatyaShift — Proof you did the work',
  description:
    'SatyaShift verifies your focus sessions in the background — no self-reporting, no manual logging. Your domains stay private to you; your circle sees only verified focus.',
  keywords: [
    'focus',
    'verified focus',
    'deep work',
    'productivity app',
    'ambient tracking',
    'focus sessions',
    'accountability',
    'SatyaShift',
  ],
  applicationName: 'SatyaShift',
  category: 'productivity',
  creator: 'SatyaShift',
  publisher: 'SatyaShift',
  alternates: {
    canonical: 'https://satyashift.vercel.app',
  },
  // og:image / twitter:image come from the app/opengraph-image.tsx file convention —
  // one generated card, one strapline, nothing static to drift out of date.
  openGraph: {
    title: 'SatyaShift — Proof you did the work',
    description:
      'Verified focus, not self-reported. Sessions are confirmed in the background, your domains stay private, and your circle sees only that you showed up.',
    type: 'website',
    siteName: 'SatyaShift',
    url: 'https://satyashift.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SatyaShift — Proof you did the work',
    description:
      'Verified focus, not self-reported. Sessions are confirmed in the background, your domains stay private, and your circle sees only that you showed up.',
  },
  verification: {
    google: 'jbQhKcXinwrOHvVws6RQPrPVZl-UXv1QOqNoHH2L1VY',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FAF8F4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <JsonLd />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}
