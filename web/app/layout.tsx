// app/layout.tsx — Root layout with providers, fonts, metadata
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'MindFuel — Mental Nutrition Tracker',
  description: 'Track your digital content consumption like a nutritionist tracks food. AI-powered insights to build healthier digital habits.',
  keywords: ['mental health', 'digital wellness', 'content tracker', 'AI coach', 'mindfulness'],
  openGraph: {
    title: 'MindFuel — Mental Nutrition Tracker',
    description: 'AI-powered mental wellness tracking for your digital diet',
    type: 'website',
  },
}

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
      </body>
    </html>
  )
}
