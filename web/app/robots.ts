import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/profile',
        '/focus',
        '/squads',
        '/session/',
        '/onboarding',
        '/notifications',
        '/api/',
        '/auth/',
      ],
    },
    sitemap: 'https://satyashift.com/sitemap.xml',
  }
}
