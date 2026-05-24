import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Basic API Origin Security for mutating requests
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  if (isApiRoute && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    // Ensure the origin matches our host (protect against CSRF from malicious sites)
    if (origin && host) {
      const originUrl = new URL(origin)
      if (originUrl.host !== host) {
        return NextResponse.json({ error: 'Forbidden: Origin mismatch' }, { status: 403 })
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
  const isPublicRoute = ['/', '/login', '/signup', '/forgot-password'].includes(pathname)
  const isAuthCallback = pathname.startsWith('/api/auth/callback')
  const isStatic = pathname.startsWith('/_next') || /\.(ico|png|jpg|jpeg|svg|css|js)$/.test(pathname)

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
