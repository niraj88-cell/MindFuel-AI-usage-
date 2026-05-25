import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/profile', '/insights', '/coach'],
    },
    sitemap: 'https://getmindfuel.vercel.app/sitemap.xml',
  }
}
