import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkIPRateLimit } from '@/lib/rate-limit'
import { getRequestFingerprint } from '@/lib/security'

export async function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    if (!request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/maintenance') && !request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      return NextResponse.rewrite(new URL('/maintenance', request.url))
    }
  }
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Canonical-host redirect (SEO): satyashift.com is the one address. The *.vercel.app
  // aliases serve identical content at 200, which splits ranking signals across hosts —
  // 301 every browser/crawler GET to the canonical domain. API routes are exempt so
  // pre-2.9.3 extension installs that still POST to satyashift.vercel.app keep working.
  const reqHost = request.headers.get('host') || ''
  if (reqHost.endsWith('.vercel.app') && !isApiRoute && ['GET', 'HEAD'].includes(request.method)) {
    const url = request.nextUrl.clone()
    url.protocol = 'https'
    url.host = 'satyashift.com'
    url.port = ''
    return NextResponse.redirect(url, 301)
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Global Edge Rate Limiting for API routes (WAF layer)
  if (isApiRoute) {
    const fingerprint = await getRequestFingerprint(request)
    // 300 requests per 5 minutes per IP as a global flood protection
    const rateCheck = await checkIPRateLimit(fingerprint, { maxRequests: 300, windowSeconds: 300, burstLimit: 50 })
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
  }

  // CSRF protection for mutating API requests.
  // CSRF only threatens COOKIE-authenticated requests, because the browser attaches
  // cookies automatically on cross-site requests. Requests authenticated with a Bearer
  // token (Chrome extension, mobile app, server-to-server) cannot be forged cross-site —
  // an attacker page can neither read the token nor set the Authorization header. It is
  // exempt; everything else (the cookie-based web app) must present a same-origin
  // Origin header.
  if (isApiRoute && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const hasBearer = request.headers.get('authorization')?.startsWith('Bearer ')
    // Billing webhooks are machine-to-machine: no cookies, no Origin header, and they
    // authenticate with an HMAC signature verified in the route itself. CSRF does not
    // apply (nothing is cookie-authed), so exempt them like Bearer requests.
    const isSignedWebhook = request.nextUrl.pathname === '/api/billing/webhook'

    if (!hasBearer && !isSignedWebhook) {
      const origin = request.headers.get('origin')
      const host = request.headers.get('host')

      if (!origin) {
        return NextResponse.json({ error: 'Forbidden: Missing origin' }, { status: 403 })
      }
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ error: 'Forbidden: Origin mismatch' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden: Invalid origin' }, { status: 403 })
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

  // Basic route protection (default-deny: anything not explicitly public requires a session).
  // LAUNCH: public signup is open. '/signup' is a public route at the edge; this must stay in
  // step with Supabase Auth "Allow new users to sign up" being ON (belt-and-suspenders). To
  // return to invite-only, remove '/signup' here AND turn that Supabase toggle off.
  const { pathname } = request.nextUrl
  const isPublicRoute = [
    '/', '/login', '/signup', '/forgot-password',
    '/privacy', '/terms', '/refund', '/pricing', '/how-it-works', '/demo', '/faq',
    '/sitemap.xml', '/robots.txt',
  ].includes(pathname)
  // Metadata file conventions (opengraph-image etc.) serve extensionless URLs — social
  // crawlers fetch them logged-out, so they must bypass the auth redirect like statics.
  const isMetadataImage = /(?:^|\/)(?:opengraph-image|twitter-image|icon|apple-icon)$/.test(pathname)
  const isStatic = pathname.startsWith('/_next') || isMetadataImage || /\.(ico|png|jpg|jpeg|svg|css|js|xml|txt|json|webmanifest|zip)$/.test(pathname)

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
