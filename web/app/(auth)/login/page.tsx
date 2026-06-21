// app/(auth)/login/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, Eye, EyeOff, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, trackEvent } from '@/lib/mixpanel'
import { AnimatedBackground } from '@/components/landing/AnimatedBackground'
import { AnimatedBrain } from '@/components/landing/AnimatedBrain'

export default function LoginPage() {
  const router = useRouter()
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
      identifyUser(data.user.id, { $email: data.user.email });
      trackEvent('User Logged In');
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
              Your digital diet<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#111827] to-[#6B7280]">shapes your mind.</span>
            </h2>
            <p className="text-[#4B5563] text-lg max-w-md leading-relaxed font-medium">
              Join thousands who are already optimizing their screen time for better focus, mood, and mental performance.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 stagger-children">
            <FeatureRow icon={<Zap className="w-4 h-4 text-[#4CAF50]" />} title="Pattern Discovery" desc="Gently uncover hidden patterns in your daily thoughts" />
            <FeatureRow icon={<Sparkles className="w-4 h-4 text-[#5DADE2]" />} title="Mood Intelligence" desc="Understand how your screen time affects your emotional state" />
            <FeatureRow icon={<Shield className="w-4 h-4 text-[#4CAF50]" />} title="Personal AI Coach" desc="Get guidance to build healthier digital habits" />
          </div>

          {/* Social proof */}
          <div className="mt-12 pt-8 border-t border-black/[0.06] animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {['A', 'B', 'C', 'D'].map((letter, i) => (
                  <div key={letter} className="w-10 h-10 rounded-full bg-[#F5F7F6] border-2 border-[#FAF8F4] flex items-center justify-center text-xs font-semibold text-[#4B5563] shadow-sm" style={{ zIndex: 10 - i }}>
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400 font-medium">
                <span className="text-[#111827] font-bold">500+</span> users tracking their digital wellness
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative z-10 bg-[#FAF8F4]">
        <div className="w-full max-w-[420px] animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10 flex flex-col items-center gap-4">
            <AnimatedBrain size={50} />
            <span className="text-2xl font-semibold text-[#111827]">MindFuel</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#111827] mb-2">Welcome back</h1>
            <p className="text-[#4B5563] font-medium">
              Sign in to continue your wellness journey
            </p>
          </div>

          {/* Google OAuth */}
          <button
            id="google-login-button"
            type="button"
            onClick={handleGoogleLogin}
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
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email</Label>
                <Input
                  id="email"
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-[#111827] transition-colors font-medium">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <Button
                id="login-button"
                type="submit"
                className="w-full h-12 bg-[#111827] text-white hover:bg-[#1f2937] hover:shadow-md rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400 font-medium">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#111827] hover:text-[#4B5563] transition-colors font-bold">
                Create one free →
              </Link>
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex justify-center">
            <div className="inline-flex items-center gap-6 px-4 py-2 rounded-full bg-[#F5F7F6] border border-black/[0.04] text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              <span>🔒 Private</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>🛡️ Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-5 group">
      <div className="w-12 h-12 rounded-2xl bg-[#F5F7F6] border border-black/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm group-hover:scale-110 transition-all">
        {icon}
      </div>
      <div>
        <p className="text-base font-bold text-[#111827] mb-1">{title}</p>
        <p className="text-sm text-[#4B5563] leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
