// app/(auth)/signup/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, Eye, EyeOff, Check, X, ArrowRight, Zap, BarChart3, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const STR_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
const STR_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-400']

function Rule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-400' : 'text-zinc-600'}`}>
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
        emailRedirectTo: `${window.location.origin}/dashboard`,
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
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center p-10 max-w-md rounded-3xl bg-zinc-900/50 border border-white/10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Check your email! 📧</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We sent a confirmation link to <span className="text-white font-bold">{email}</span>. Click the link to activate your account and start your journey.
          </p>
          <div className="mt-8 space-y-3">
            <Button onClick={() => router.push('/login')} className="w-full h-11 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold">
              Back to Login
            </Button>
            <p className="text-xs text-zinc-600">Didn&apos;t receive it? Check your spam folder.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Panel - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
        <div className="absolute top-[30%] left-[15%] w-[350px] h-[350px] bg-white/[0.03] blur-[100px] rounded-full" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-20">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-black" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">MindFuel</span>
            </div>
            
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Start optimizing your<br />
              <span className="text-zinc-500">digital nutrition today.</span>
            </h2>
            <p className="text-zinc-500 text-lg max-w-md leading-relaxed">
              It takes 30 seconds to create an account. No credit card required.
            </p>
          </div>

          {/* What you get */}
          <div className="space-y-4 mb-12">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Free account includes</p>
            <div className="space-y-3">
              {[
                { icon: <Zap className="w-4 h-4" />, text: '3 AI content analyses per day' },
                { icon: <BarChart3 className="w-4 h-4" />, text: 'Daily mental nutrition dashboard' },
                { icon: <MessageCircle className="w-4 h-4" />, text: 'AI wellness coach access' },
                { icon: <Brain className="w-4 h-4" />, text: 'Mood scan & insights' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white">
                    {item.icon}
                  </div>
                  <span className="text-sm text-zinc-400">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <p className="text-sm text-zinc-400 italic leading-relaxed mb-4">
              &ldquo;MindFuel helped me realize I was spending 4 hours daily on content that drained my energy. Now I&apos;m more intentional about what I consume.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">S</div>
              <div>
                <p className="text-xs font-bold text-white">Sarah K.</p>
                <p className="text-[10px] text-zinc-600">Product Designer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-black" />
              </div>
              <span className="text-xl font-black text-white">MindFuel</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Create your account</h1>
            <p className="text-zinc-500">
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
            className="w-full h-12 flex items-center justify-center gap-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white font-bold text-sm hover:bg-zinc-800/80 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-zinc-600 font-bold">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold text-zinc-400">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-12 bg-zinc-900/50 border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:border-white/20 focus:ring-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-sm font-bold text-zinc-400">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 bg-zinc-900/50 border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:border-white/20 focus:ring-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-sm font-bold text-zinc-400">Password</Label>
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
                  className="h-12 bg-zinc-900/50 border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:border-white/20 focus:ring-white/10 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            i <= strength ? STR_COLORS[strength] : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      strength >= 4 ? 'text-emerald-400' : strength >= 3 ? 'text-yellow-400' : 'text-zinc-600'
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
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              id="signup-button"
              type="submit"
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
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

            <p className="text-[10px] text-zinc-700 text-center leading-relaxed">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-600">
              Already have an account?{' '}
              <Link href="/login" className="text-white hover:underline font-bold">
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
