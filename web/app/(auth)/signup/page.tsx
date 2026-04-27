// app/(auth)/signup/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, Eye, EyeOff, Check, X } from 'lucide-react'
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
    <li className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
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
      <div className="min-h-screen bg-mesh flex items-center justify-center px-4">
        <div className="text-center glass-card p-10 max-w-md animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email! 📧</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            We sent a confirmation link to your email address. Please click the link to activate your account.
          </p>
          <div className="mt-6">
            <Button variant="outline" onClick={() => router.push('/login')} className="w-full">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Brain className="w-8 h-8 text-indigo-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              MindFuel
            </span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Start your journey</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Create an account to track your mental nutrition
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
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
                      strength >= 4 ? 'text-emerald-400' : strength >= 3 ? 'text-yellow-400' : 'text-slate-500'
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
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button id="signup-button" type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
