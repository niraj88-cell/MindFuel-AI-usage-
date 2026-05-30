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
  title: 'MindFuel — Mental Nutrition Tracker',
  description: 'Track your digital content consumption like a nutritionist tracks food. AI-powered insights to build healthier digital habits.',
  keywords: ['mental health', 'digital wellness', 'content tracker', 'AI coach', 'mindfulness'],
  openGraph: {
    title: 'MindFuel — Mental Nutrition Tracker',
    description: 'Track your digital diet and stop doomscrolling with AI-powered mental wellness tracking.',
    type: 'website',
    images: [
      {
        url: 'https://getmindfuel.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MindFuel — Mental Nutrition Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MindFuel — Mental Nutrition Tracker',
    description: 'Track your digital diet and stop doomscrolling with AI-powered mental wellness tracking.',
    images: [
      {
        url: 'https://getmindfuel.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MindFuel — Mental Nutrition Tracker',
      },
    ],
  },
  verification: {
    google: 'jbQhKcXinwrOHvVws6RQPrPVZl-UXv1QOqNoHH2L1VY',
  },
}

import { Analytics } from '@vercel/analytics/react'
import { PWARegister } from '@/components/PWARegister'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0f1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Analytics />
        <PWARegister />
      </body>
    </html>
  )
}
