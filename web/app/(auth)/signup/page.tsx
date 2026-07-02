'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Shield, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, trackEvent } from '@/lib/mixpanel'

function getPasswordStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STEPS = [
  { label: 'Create your account', detail: 'Private from the very first second.' },
  { label: 'Add the focus extension', detail: 'It runs ambiently in your browser — nothing to start.' },
  { label: 'See your first verified session', detail: 'Confirmed in the background, not self-reported.' },
]

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = getPasswordStrength(password)
  const strengthLabel = password.length === 0 ? '' : strength >= 4 ? 'Strong' : strength >= 3 ? 'Good' : strength >= 2 ? 'Fair' : 'Weak'

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (strength < 2) {
      setError('Password needs at least 8 characters with a mix of letters and numbers.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    if (data.user) {
      identifyUser(data.user.id, { $email: email })
      trackEvent('User Signed Up')
    }

    if (data.session) {
      setTimeout(() => {
        window.location.href = '/onboarding'
      }, 400)
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-5 text-[#111827]">
        <div className="w-full max-w-md rounded-3xl border border-black/[0.07] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#4CAF50]">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm leading-relaxed text-[#6B7280]">
            We sent a confirmation link to <span className="font-semibold text-[#111827]">{email}</span>. Open it to activate your account.
          </p>
          <div className="mt-8 space-y-3">
            <Button onClick={() => router.push('/login')} className="h-11 w-full rounded-2xl bg-[#111827] text-white hover:bg-[#1F2937]">
              Back to login
            </Button>
            <p className="text-xs text-[#6B7280]">If it is not in your inbox, check spam or promotions.</p>
          </div>
        </div>
      </main>
    )
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
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#4CAF50]">Start in seconds</p>
            <h1 className="mb-6 text-5xl font-semibold leading-[1.05] tracking-tight">
              Focus you can actually prove.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-[#4B5563]">
              Create your account, add the extension, and your first verified focus session appears on its own.
            </p>
          </div>

          <div className="rounded-3xl border border-black/[0.06] bg-white/75 p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#4CAF50]">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Private by default</p>
                <p className="text-sm text-[#6B7280]">No ads. Export anytime. Delete your data anytime.</p>
              </div>
            </div>
            <div className="space-y-4">
              {STEPS.map((step, index) => (
                <div key={step.label} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5F7F6] text-xs font-semibold text-[#4CAF50]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{step.label}</p>
                    <p className="text-sm text-[#6B7280]">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
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
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create your account</h2>
              <p className="mt-3 text-base text-[#6B7280]">Start free. No credit card required.</p>
            </div>

            <button
              id="google-signup-button"
              type="button"
              onClick={async () => {
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
              }}
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

            <form onSubmit={handleSignup} className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Email</Label>
                  <Input
                    id="signup-email"
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
                  <Label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      minLength={8}
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

                  {password.length > 0 && (
                    <div className="flex items-center gap-3 pt-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0EC]">
                        <div
                          className="h-full rounded-full bg-[#4CAF50] transition-all"
                          style={{ width: `${Math.min(100, Math.max(20, strength * 20))}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#6B7280]">{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  id="signup-button"
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[#111827] text-sm font-semibold text-white hover:bg-[#1F2937]"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Create account <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs leading-relaxed text-[#6B7280]">
                  By signing up, you agree to the Terms of Service and Privacy Policy.
                </p>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-[#6B7280]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#111827] hover:underline">
                Sign in
              </Link>
            </p>

            <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-[#6B7280]">
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> No ads</span>
              <span className="h-1 w-1 rounded-full bg-[#D1D5DB]" />
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Export anytime</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
