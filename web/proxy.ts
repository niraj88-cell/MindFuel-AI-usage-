import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkIPRateLimit } from '@/lib/rate-limit'
import { getRequestFingerprint } from '@/lib/security'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Global Edge Rate Limiting for API routes (WAF layer)
  if (isApiRoute) {
    const fingerprint = await getRequestFingerprint(request)
    // 300 requests per 5 minutes per IP as a global flood protection
    const rateCheck = await checkIPRateLimit(fingerprint, { maxRequests: 300, windowSeconds: 300, burstLimit: 50 })
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
  }

  // CSRF protection for mutating API requests
  if (isApiRoute && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (origin) {
      // If Origin is present (e.g. from a browser), it MUST match the host
      try {
        const originUrl = new URL(origin)
        if (originUrl.host !== host) {
          return NextResponse.json({ error: 'Forbidden: Origin mismatch' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden: Invalid origin' }, { status: 403 })
      }
    } else {
      // No Origin header (could be mobile app, cURL, or webhook)
      const isStripeWebhook = request.nextUrl.pathname.startsWith('/api/stripe/webhook')
      const authHeader = request.headers.get('authorization')
      const hasBearer = authHeader?.startsWith('Bearer ')
      const isMobileApp = request.headers.get('x-mindfuel-mobile') === 'true'

      // Only allow requests without Origin if it's a Stripe webhook or an authenticated mobile request
      // We rely on 'x-mindfuel-mobile' to verify intent, but authentication is validated below.
      if (!isStripeWebhook && !(isMobileApp && hasBearer)) {
        return NextResponse.json({ error: 'Forbidden: Missing origin' }, { status: 403 })
      }
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh the session if expired and set the new cookies on the response
  const { data: { user } } = await supabase.auth.getUser()

  // Basic route protection
  const { pathname } = request.nextUrl
  const isPublicRoute = ['/', '/login', '/signup', '/forgot-password', '/sitemap.xml', '/robots.txt'].includes(pathname)
  const isAuthCallback = pathname.startsWith('/api/auth/callback')
  const isStatic = pathname.startsWith('/_next') || /\.(ico|png|jpg|jpeg|svg|css|js|xml|txt)$/.test(pathname)

  if (!user && !isPublicRoute && !isApiRoute && !isStatic) {
    // Redirect unauthenticated users to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Inject additional safety headers into the response
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  if (process.env.NODE_ENV === 'production') {
    supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
