import type { Metadata } from 'next'

// Auth utility pages (login/signup/forgot/reset) carry no unique content — left
// indexable they inherit the homepage title and surface as thin duplicates next to
// the landing page. noindex keeps them out of search; follow keeps link equity
// flowing back to the public pages. (/reset-password is additionally disallowed in
// robots.ts because it's session-bound.)
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
