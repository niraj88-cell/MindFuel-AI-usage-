// app/layout.tsx — Root layout with providers, fonts, metadata
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://getmindfuel.vercel.app'),
  title: 'MindFuel — AI-Powered Focus & Productivity App | Track Your Digital Wellness',
  description:
    'MindFuel is the AI-powered focus and productivity app that tracks your digital content consumption, builds healthier habits, and provides personalized coaching. Focus timer, mood tracking, habit streaks & AI insights. Start free today.',
  keywords: [
    'focus app',
    'productivity app',
    'digital wellness',
    'AI coaching',
    'focus timer',
    'mood tracking',
    'habit tracker',
    'content tracker',
    'mental health app',
    'digital nutrition',
    'screen time tracker',
    'mindfulness app',
    'digital detox',
    'AI insights',
    'productivity tracker',
    'wellness app',
    'digital habits',
    'MindFuel',
  ],
  applicationName: 'MindFuel',
  category: 'productivity',
  creator: 'MindFuel',
  publisher: 'MindFuel',
  alternates: {
    canonical: 'https://getmindfuel.vercel.app',
  },
  openGraph: {
    title: 'MindFuel — AI-Powered Focus & Productivity App | Track Your Digital Wellness',
    description:
      'MindFuel is the AI-powered focus and productivity app that tracks your digital content consumption, builds healthier habits, and provides personalized coaching. Focus timer, mood tracking, habit streaks & AI insights. Start free today.',
    type: 'website',
    siteName: 'MindFuel',
    url: 'https://getmindfuel.vercel.app',
    images: [
      {
        url: 'https://getmindfuel.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MindFuel — AI-Powered Focus & Productivity App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MindFuel — AI-Powered Focus & Productivity App | Track Your Digital Wellness',
    description:
      'MindFuel is the AI-powered focus and productivity app that tracks your digital content consumption, builds healthier habits, and provides personalized coaching. Focus timer, mood tracking, habit streaks & AI insights. Start free today.',
    images: [
      {
        url: 'https://getmindfuel.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MindFuel — AI-Powered Focus & Productivity App',
      },
    ],
  },
  verification: {
    google: 'jbQhKcXinwrOHvVws6RQPrPVZl-UXv1QOqNoHH2L1VY',
  },
}

import { Analytics } from '@vercel/analytics/react'
import { PWARegister } from '@/components/PWARegister'
import { JsonLd } from '@/components/seo/JsonLd'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0f1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <JsonLd />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}
