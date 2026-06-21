// app/(auth)/signup/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, Eye, EyeOff, Check, X, ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, trackEvent } from '@/lib/mixpanel'
import { AnimatedBackground } from '@/components/landing/AnimatedBackground'
import { AnimatedBrain } from '@/components/landing/AnimatedBrain'

function getPasswordStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STR_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
const STR_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-400']

function Rule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-600' : 'text-gray-400'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </li>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = getPasswordStrength(password)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (strength < 3) {
      setError('Password is too weak. Include uppercase, lowercase, and a number.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
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
      identifyUser(data.user.id, { $name: name, $email: email });
      trackEvent('User Signed Up');
    }

    // Only redirect if session was created automatically
    if (data.session) {
      setTimeout(() => {
        window.location.href = '/onboarding'
      }, 400)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center px-4">
        <div className="text-center p-10 max-w-md rounded-2xl bg-white border border-black/[0.04] shadow-sm animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-semibold text-[#111827] mb-3">Check your email! 📧</h2>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            We sent a confirmation link to <span className="text-[#111827] font-bold">{email}</span>. Click the link to activate your account and start your journey.
          </p>
          <div className="mt-8 space-y-3">
            <Button onClick={() => router.push('/login')} className="w-full h-11 bg-[#111827] text-white hover:bg-[#1f2937] rounded-xl font-bold">
              Back to Login
            </Button>
            <p className="text-xs text-gray-400">Didn&apos;t receive it? Check your spam folder.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex relative overflow-hidden">
      {/* Left Panel - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground variant="auth" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-20 w-full h-full">
          <div className="mb-12 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
              <AnimatedBrain size={60} />
              <span className="text-3xl font-semibold tracking-tight text-[#111827]">MindFuel</span>
            </div>
            
            <h2 className="text-5xl font-semibold text-[#111827] leading-tight mb-4">
              Start optimizing your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#111827] to-[#6B7280]">digital nutrition today.</span>
            </h2>
            <p className="text-[#4B5563] text-lg max-w-md leading-relaxed font-medium">
              It takes 30 seconds to create an account. No credit card required.
            </p>
          </div>

          {/* Privacy Promise */}
          <div className="mb-12 stagger-children">
            <div className="p-6 rounded-2xl bg-white/80 border border-black/[0.04] relative overflow-hidden group hover:border-black/[0.08] transition-colors shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/30 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-[#111827] font-bold">Your Privacy Matters</h3>
              </div>
              <p className="text-[#4B5563] text-sm leading-relaxed">
                Our thoughtful AI runs quietly in the background strictly to help you uncover your own patterns. Your thoughts are encrypted, private, and always yours.
              </p>
            </div>
          </div>

          {/* Testimonial */}
          <div className="p-6 rounded-2xl bg-white/80 border border-black/[0.04] shadow-sm animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <p className="text-sm text-[#4B5563] italic leading-relaxed mb-4 font-[var(--font-serif)]">
              &ldquo;MindFuel helped me realize I was spending 4 hours daily on content that drained my energy. Now I&apos;m more intentional about what I consume.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F5F7F6] flex items-center justify-center text-xs font-bold text-[#4B5563]">S</div>
              <div>
                <p className="text-xs font-bold text-[#111827]">Sarah K.</p>
                <p className="text-[10px] text-gray-400">Product Designer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative z-10 bg-[#FAF8F4]">
        <div className="w-full max-w-[420px] animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10 flex flex-col items-center gap-4">
            <AnimatedBrain size={50} />
            <span className="text-2xl font-semibold text-[#111827]">MindFuel</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#111827] mb-2">Create your account</h1>
            <p className="text-[#4B5563] font-medium">
              Free forever. No credit card needed.
            </p>
          </div>

          {/* Google OAuth */}
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
            className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-black/[0.08] rounded-xl text-[#111827] font-bold text-sm hover:bg-[#F5F7F6] hover:border-black/[0.12] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-black/[0.06]" />
            <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">Or</span>
            <div className="flex-1 h-px bg-black/[0.06]" />
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 bg-white border border-black/[0.04] rounded-2xl group focus-within:border-black/[0.08] transition-all shadow-sm">
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-12 bg-[#F5F7F6] border-black/[0.06] rounded-xl text-[#111827] placeholder:text-gray-400 focus:border-black/[0.12] focus:ring-1 focus:ring-black/[0.08] transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 bg-[#F5F7F6] border-black/[0.06] rounded-xl text-[#111827] placeholder:text-gray-400 focus:border-black/[0.12] focus:ring-1 focus:ring-black/[0.08] transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="h-12 bg-[#F5F7F6] border-black/[0.06] rounded-xl text-[#111827] placeholder:text-gray-400 focus:border-black/[0.12] focus:ring-1 focus:ring-black/[0.08] transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111827] transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.03]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              i <= strength ? STR_COLORS[strength] : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                        strength >= 4 ? 'text-emerald-600' : strength >= 3 ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        {STR_LABELS[strength]}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      <Rule met={password.length >= 8} label="At least 8 characters" />
                      <Rule met={/[A-Z]/.test(password)} label="One uppercase letter" />
                      <Rule met={/[a-z]/.test(password)} label="One lowercase letter" />
                      <Rule met={/[0-9]/.test(password)} label="One number" />
                      <Rule met={/[^A-Za-z0-9]/.test(password)} label="One special character (optional)" />
                    </ul>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <Button
                id="signup-button"
                type="submit"
                className="w-full h-12 bg-[#111827] text-white hover:bg-[#1f2937] hover:shadow-md rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Create Free Account <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <p className="text-[10px] text-gray-400 text-center leading-relaxed mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-[#111827] hover:text-[#4B5563] transition-colors font-bold">
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
