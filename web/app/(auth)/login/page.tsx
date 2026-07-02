'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, Loader2, Shield, ShieldCheck, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, trackEvent } from '@/lib/mixpanel'

const TRUST_ITEMS = [
  { icon: Shield, title: 'Private by default', desc: 'Your domains stay on your account — never shown to your circle.' },
  { icon: ShieldCheck, title: 'Verified, not self-reported', desc: 'Focus sessions are confirmed in the background, so they can’t be faked.' },
  { icon: Activity, title: 'Ambient by design', desc: 'Nothing to start or log — your sessions appear on their own.' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      identifyUser(data.user.id, { $email: data.user.email })
      trackEvent('User Logged In')
    }

    window.location.href = '/dashboard'
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between border-r border-black/[0.06] px-16 py-12">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <SatyaMark size={20} />
            </span>
            <span className="text-2xl font-bold tracking-tight">SatyaShift</span>
          </Link>

          <div className="max-w-xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#4CAF50]">Welcome back</p>
            <h1 className="mb-6 text-5xl font-semibold leading-[1.05] tracking-tight">
              Welcome back to your focus.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-[#4B5563]">
              Sign in to see your verified focus sessions and check in with your circle.
            </p>
          </div>

          <div className="grid gap-4">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="flex gap-4 rounded-2xl border border-black/[0.06] bg-white/70 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#4CAF50]">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[430px]">
            <div className="mb-10 lg:hidden">
              <Link href="/" className="flex items-center gap-3 w-fit">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] text-white">
                  <SatyaMark size={20} />
                </span>
                <span className="text-2xl font-bold tracking-tight">SatyaShift</span>
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sign in</h2>
              <p className="mt-3 text-base text-[#6B7280]">Continue to your verified focus sessions and your circle.</p>
            </div>

            <button
              id="google-login-button"
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111827] shadow-sm transition-colors hover:bg-[#F5F7F6] disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-black/[0.08]" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">or</span>
              <div className="h-px flex-1 bg-black/[0.08]" />
            </div>

            <form onSubmit={handleLogin} className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 rounded-2xl border-black/[0.08] bg-[#F9FAF8] text-[#111827] placeholder:text-[#9CA3AF]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Password</Label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-[#4B5563] hover:text-[#111827]">Forgot?</Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-12 rounded-2xl border-black/[0.08] bg-[#F9FAF8] pr-12 text-[#111827] placeholder:text-[#9CA3AF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  id="login-button"
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[#111827] text-sm font-semibold text-white hover:bg-[#1F2937]"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign in <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-[#6B7280]">
              New to SatyaShift?{' '}
              <Link href="/signup" className="font-semibold text-[#111827] hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
