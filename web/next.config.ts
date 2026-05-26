import type { NextConfig } from 'next'

// ── Content Security Policy ────────────────────────────────────────────────
// Strict CSP — whitelists only what MindFuel actually uses.
// Gemini API calls happen server-side so no client-side AI API origins needed.
const CSP = [
  "default-src 'self'",
  // Scripts: self + Next.js inline scripts (hashes preferred over 'unsafe-inline' in prod)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval required by Next.js dev mode
  // Styles: self + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + Supabase storage + data URIs for avatars
  "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
  // API connections: self + Supabase (realtime WebSocket + REST)
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
  // No plugins, no object embeds
  "object-src 'none'",
  // Media: self only
  "media-src 'self'",
  // Workers: self + blob for Next.js
  "worker-src 'self' blob:",
  // Frames: deny all
  "frame-src 'none'",
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
              'microphone=()',
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
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },

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

  serverExternalPackages: ['@langchain/langgraph', '@langchain/anthropic', '@langchain/core'],
  
  // ── Performance Optimizations ──
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@radix-ui/react-icons'],
  },
}

export default nextConfig

