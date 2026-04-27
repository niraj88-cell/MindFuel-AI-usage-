// app/(auth)/forgot-password/page.tsx — Secure password reset request page
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Brain, Loader2, Mail, ArrowLeft, CheckCircle2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setError('Too many attempts. Please wait a few minutes before trying again.')
        setLoading(false)
        return
      }

      // Always show success (even if email doesn't exist — prevents enumeration)
      setSent(true)
    } catch {
      setSent(true) // Still show success to prevent enumeration
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center glass-card p-10 animate-fade-in-up">
            {/* Success icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-black mb-3">Check your inbox</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-2">
              If an account exists for <span className="text-white font-medium">{email}</span>, we&apos;ve sent a password reset link.
            </p>
            <p className="text-slate-500 text-xs mb-8">
              The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => { setSent(false); setEmail('') }}
                className="w-full"
              >
                Send again
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-slate-400">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
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
          <h1 className="text-2xl font-black mt-4">Reset your password</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enter your email and we&apos;ll send a secure reset link
          </p>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl mb-6">
          <Shield className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            For your security, we won&apos;t confirm whether an email is registered. The reset link expires in 1 hour.
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button id="reset-button" type="submit" className="w-full h-11" disabled={loading || !email}>
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Send Reset Link'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
