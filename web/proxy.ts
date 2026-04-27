// middleware.ts — Auth protection + session refresh for all app routes
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST be called before any route check
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Public routes (no auth required) ──
  // Landing page, auth pages, and specific public API endpoints
  const PUBLIC_ROUTES = ['/', '/login', '/signup']
  const PUBLIC_API_ROUTES = ['/api/analyze', '/api/coach/mobile']

  const isPublicPage = PUBLIC_ROUTES.includes(pathname)
  const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname === r)
  const isStaticAsset = pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|js|css)$/.test(pathname)

  // Static assets and public pages/APIs pass through
  if (isStaticAsset || isPublicPage || isPublicApi) {
    // But redirect authenticated users away from login/signup
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  // ── Protected routes — require authentication ──
  // All /api/* (except public ones above), all /dashboard, /log, /coach, etc.
  if (!user) {
    // API routes return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Page routes redirect to login
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Rate limiting headers (informational) ──
  supabaseResponse.headers.set('X-User-ID', user.id)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
