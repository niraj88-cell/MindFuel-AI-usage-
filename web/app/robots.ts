import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/profile',
        '/insights',
        '/coach',
        '/focus',
        '/log',
        '/mood-scan',
        '/challenges',
        '/intercept',
        '/pulse',
        '/weekly-report',
        '/onboarding',
        '/subscription',
        '/notifications',
        '/promo-simulate',
        '/api/',
        '/auth/',
      ],
    },
    sitemap: 'https://getmindfuel.vercel.app/sitemap.xml',
  }
}
