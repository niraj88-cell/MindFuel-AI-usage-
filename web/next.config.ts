import type { NextConfig } from 'next'

// ── Content Security Policy ────────────────────────────────────────────────
// Strict CSP — whitelists only what SatyaShift actually uses. No AI/LLM origins: the product
// has no AI integration (all "intelligence" is deterministic local code), so none are allowed.
const CSP = [
  "default-src 'self'",
  // Scripts: self + Next.js inline scripts (hashes preferred over 'unsafe-inline' in prod)
  // Paddle.js (overlay checkout) loads from cdn.paddle.com; *.paddle.com covers sandbox + live.
  `script-src 'self' 'unsafe-inline' https://*.paddle.com ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"}`,
  // Styles: self + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + Supabase storage + data URIs for avatars
  "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://*.paddle.com",
  // API connections: self + Supabase (realtime WebSocket + REST) + Paddle checkout API
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.paddle.com",
  // No plugins, no object embeds
  "object-src 'none'",
  // Media: self only
  "media-src 'self'",
  // Workers: self + blob for Next.js
  "worker-src 'self' blob:",
  // Frames: only Paddle's checkout overlay iframe (sandbox + live). We still refuse to be framed.
  "frame-src https://*.paddle.com",
  "frame-ancestors 'none'",
  // Form actions: self only
  "form-action 'self'",
  // Base URI: self only (prevent base tag hijacking)
  "base-uri 'self'",
  // Upgrade insecure requests in prod
  ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
].join('; ')

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Legacy MindFuel routes (deleted 2026-07-02). Old links and browser history land
  // on Today instead of a 404. Temporary (307) so a path can be reused later.
  async redirects() {
    return [
      ...[
        '/log', '/coach', '/insights', '/pulse', '/challenges', '/weekly-report',
        '/mood-scan', '/intercept', '/subscription', '/promo-simulate',
      ].map((source) => ({ source, destination: '/dashboard', permanent: false })),
      // Common aliases for the trust pages (older docs said /refunds).
      { source: '/refunds', destination: '/refund', permanent: true },
      { source: '/tos', destination: '/terms', permanent: true },
    ]
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // ── Anti-Clickjacking ──
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // ── Referrer Policy ──
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // ── HSTS — force HTTPS for 1 year (preload-ready) ──
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },

          // ── Content Security Policy ──
          { key: 'Content-Security-Policy', value: CSP },

          // ── Permissions Policy — disable unused browser features ──
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=(self)',
              'geolocation=()',
              'payment=()',
              'usb=()',
              'bluetooth=()',
              'ambient-light-sensor=()',
              'accelerometer=()',
              'gyroscope=()',
              'magnetometer=()',
            ].join(', '),
          },

          // ── Cross-Origin Policies (Spectre/Meltdown mitigations) ──
          // NOTE: no Cross-Origin-Embedder-Policy. COEP blocks ANY cross-origin iframe whose
          // document doesn't also send COEP — which breaks Paddle's checkout overlay
          // (buy.paddle.com can't send it). We use no cross-origin-isolated APIs
          // (SharedArrayBuffer etc.), so COEP was inert hardening; dropping it is the
          // documented requirement for embedding Paddle/Stripe checkout. COOP/CORP stay
          // (they govern popups/our-own resources, not the checkout iframe).
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },

          // ── DNS Prefetch Control ──
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
      {
        // Service worker — no cache
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // API routes — additional no-store cache control
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ── Performance Optimizations ──
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@radix-ui/react-icons'],
  },
}

export default nextConfig

