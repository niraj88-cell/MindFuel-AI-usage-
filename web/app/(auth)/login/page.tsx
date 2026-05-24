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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      identifyUser(user.id, { $email: user.email });
      trackEvent('User Logged In');
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Panel - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-white/[0.03] blur-[100px] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-white/[0.02] blur-[80px] rounded-full" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-20">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-black" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">MindFuel</span>
            </div>
            
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Your digital diet<br />
              <span className="text-zinc-500">shapes your mind.</span>
            </h2>
            <p className="text-zinc-500 text-lg max-w-md leading-relaxed">
              Join thousands who are already optimizing their screen time for better focus, mood, and mental performance.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <FeatureRow icon={<Zap className="w-4 h-4" />} title="AI Content Analysis" desc="Get instant mental nutrition scores for anything you consume" />
            <FeatureRow icon={<Sparkles className="w-4 h-4" />} title="Mood Intelligence" desc="Understand how your screen time affects your emotional state" />
            <FeatureRow icon={<Shield className="w-4 h-4" />} title="Personal AI Coach" desc="Get guidance to build healthier digital habits" />
          </div>

          {/* Social proof */}
          <div className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <div key={letter} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[10px] font-bold text-zinc-400">
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-sm text-zinc-500">
                <span className="text-white font-bold">500+</span> users tracking their digital wellness
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
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
            <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
            <p className="text-zinc-500">
              Sign in to continue your wellness journey
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-zinc-400">Email</Label>
              <Input
                id="email"
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold text-zinc-400">Password</Label>
                <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-white transition-colors font-medium">
                  Forgot password?
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
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              id="login-button"
              type="submit"
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
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

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-white hover:underline font-bold">
                Create one free →
              </Link>
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex items-center justify-center gap-6 text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
            <span>🔒 Encrypted</span>
            <span>•</span>
            <span>⚡ Free tier</span>
            <span>•</span>
            <span>🧠 AI Powered</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-sm text-zinc-500">{desc}</p>
      </div>
    </div>
  )
}
