'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { createClient } from '@/lib/supabase/client'
import { humanAuthError } from '@/lib/auth-errors'
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
        // The confirmation link must land on the CODE EXCHANGE, not on the destination.
        // Pointing it straight at /onboarding sent every confirming user to a page the
        // middleware guards, with no session yet — so their first click after signing up
        // bounced them to /login and asked for the password they had just chosen. Same
        // server-side exchange the password reset and Google sign-in already use.
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
      },
    })

    if (authError) {
      setError(humanAuthError(authError.message))
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    if (data.user) {
      // Account id only — the privacy page promises analytics carry no more than that.
      identifyUser(data.user.id)
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
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-ink">
        <div className="w-full max-w-md rounded-xl border border-line bg-card p-8 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-tint text-green">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mb-3 font-serif text-3xl tracking-[-0.01em]">Check your email</h1>
          <p className="text-sm leading-relaxed text-soft">
            We sent a confirmation link to <span className="font-semibold text-ink">{email}</span>. Open it to activate your account.
          </p>
          <div className="mt-8 space-y-3">
            <Button onClick={() => router.push('/login')} className="h-11 w-full rounded-lg">
              Back to login
            </Button>
            <p className="text-xs text-faint">If it is not in your inbox, check spam or promotions.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-line px-16 py-12 lg:flex">
          <Link href="/" className="flex w-fit items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
              <SatyaMark size={20} />
            </span>
            <span className="text-xl font-semibold tracking-tight">SatyaShift</span>
          </Link>

          <div className="max-w-xl">
            <h1 className="mb-6 font-serif text-[3.25rem] leading-[1.05] tracking-[-0.01em]">
              Proof you did the work.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-soft">
              Set it up once. After that there&rsquo;s nothing to start and nothing to log &mdash;
              you do the work, and the proof takes care of itself.
            </p>
          </div>

          <ol className="space-y-4 border-t border-line pt-8">
            {STEPS.map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-green-line font-mono text-xs font-medium text-green">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{step.label}</p>
                  <p className="text-sm text-faint">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-10 lg:hidden">
              <Link href="/" className="flex w-fit items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
                  <SatyaMark size={20} />
                </span>
                <span className="text-xl font-semibold tracking-tight">SatyaShift</span>
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="font-serif text-4xl tracking-[-0.01em]">Create your account</h2>
              <p className="mt-3 text-[15px] text-soft">Start free. No credit card required.</p>
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
                  setError(humanAuthError(oauthError.message))
                  setGoogleLoading(false)
                }
              }}
              disabled={googleLoading}
              className="focus-ring press flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line bg-card text-sm font-semibold text-ink hover:bg-green-wash disabled:opacity-60"
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
              <div className="h-px flex-1 bg-line" />
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-faint">or</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSignup} className="rounded-xl border border-line bg-card p-6 sm:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Password</Label>
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
                      className="h-12 rounded-lg pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-faint transition-colors hover:bg-hairline hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="flex items-center gap-3 pt-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
                        <div
                          className="h-full rounded-full bg-green transition-all"
                          style={{ width: `${Math.min(100, Math.max(20, strength * 20))}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wide text-faint">{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg border border-rust/25 bg-rust-tint p-3 text-sm font-medium text-rust">
                    {error}
                  </div>
                )}

                <Button
                  id="signup-button"
                  type="submit"
                  className="h-12 w-full rounded-lg"
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

                <p className="text-center text-xs leading-relaxed text-faint">
                  By signing up, you agree to our{' '}
                  <Link href="/privacy" className="font-semibold text-ink hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-faint">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-ink hover:underline">
                Sign in
              </Link>
            </p>

            <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ghost">
              No ads · Export anytime · Delete anytime
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
