import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { PWARegister } from '@/components/PWARegister'
import { JsonLd } from '@/components/seo/JsonLd'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://satyashift.vercel.app'),
  title: 'SatyaShift — Focus you can prove',
  description:
    'SatyaShift verifies your focus sessions in the background — no self-reporting, no manual logging. Your domains stay private to you; your squad sees only verified focus.',
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
  openGraph: {
    title: 'SatyaShift — Focus you can prove',
    description:
      'Verified focus, not self-reported. Sessions are confirmed in the background, your domains stay private, and your squad sees only that you showed up.',
    type: 'website',
    siteName: 'SatyaShift',
    url: 'https://satyashift.vercel.app',
    images: [
      {
        url: 'https://satyashift.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SatyaShift — focus you can prove',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SatyaShift — Focus you can prove',
    description:
      'Verified focus, not self-reported. Sessions are confirmed in the background, your domains stay private, and your squad sees only that you showed up.',
    images: [
      {
        url: 'https://satyashift.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SatyaShift — focus you can prove',
      },
    ],
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
    <html lang="en" suppressHydrationWarning>
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
