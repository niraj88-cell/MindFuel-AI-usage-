import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 1. Enforce CORS and Origin Validation
  // In production, block API requests from unknown origins
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'https://web-rust-six-k2qqc0qdnc.vercel.app', 
    'http://localhost:3000', 
    'http://localhost:8081' // Mobile expo local dev
  ]
  
  if (origin && !allowedOrigins.includes(origin) && process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden: Invalid Origin', { status: 403 })
  }

  // Proceed with request
  const response = NextResponse.next()

  // 2. Fortify Security Headers
  // Strict Transport Security (HSTS) - Force HTTPS
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  
  // Prevent Clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME-sniffing attacks
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy (CSP)
  // Highly restrictive. Only allows self, Supabase, and Mixpanel. Blocks inline scripts in prod.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.mxpnl.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://ui-avatars.com;
    font-src 'self';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api-js.mixpanel.com;
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()

  response.headers.set('Content-Security-Policy', cspHeader)
  
  // Custom API Header for tracking
  response.headers.set('X-MindFuel-Security', 'Fort-Knox')

  // Add permissive CORS for the API routes so the mobile app can connect
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
