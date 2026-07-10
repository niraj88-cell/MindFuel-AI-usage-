import { MetadataRoute } from 'next'

// The public pages, honestly dated. lastModified is a real signal — hand-bump the date
// when a page's CONTENT meaningfully changes (a new Date() on every build claims daily
// freshness the pages don't have, which teaches crawlers to ignore the field).
// /login is deliberately absent: an auth wall is not a search result.
const PAGES: { path: string; lastModified: string; changeFrequency: 'weekly' | 'monthly'; priority: number }[] = [
  { path: '', lastModified: '2026-07-10', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/how-it-works', lastModified: '2026-07-08', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/demo', lastModified: '2026-07-08', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/faq', lastModified: '2026-07-10', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/pricing', lastModified: '2026-07-07', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy', lastModified: '2026-07-08', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/terms', lastModified: '2026-07-02', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/refund', lastModified: '2026-07-02', changeFrequency: 'monthly', priority: 0.5 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://satyashift.com'
  return PAGES.map((p) => ({
    url: `${baseUrl}${p.path}`,
    lastModified: new Date(p.lastModified),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
