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
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center bg-white border border-black/[0.04] rounded-2xl p-8 sm:p-10 shadow-sm animate-fade-in-up">
            {/* Success icon */}
            <div className="w-20 h-20 rounded-full bg-[#F5F7F6] border border-black/[0.06] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#4CAF50]" />
            </div>

            <h2 className="text-2xl font-semibold text-[#111827] mb-3">Check your inbox</h2>
            <p className="text-[#4B5563] text-sm leading-relaxed mb-2">
              If an account exists for <span className="text-[#111827] font-medium">{email}</span>, we&apos;ve sent a password reset link.
            </p>
            <p className="text-gray-400 text-xs mb-8">
              The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => { setSent(false); setEmail('') }}
                className="w-full bg-[#F5F7F6] text-[#111827] border border-black/[0.06] hover:bg-gray-100 hover:border-black/[0.1]"
              >
                Send again
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-[#4B5563] hover:text-[#111827] hover:bg-black/[0.03]">
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
    <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Brain className="w-8 h-8 text-[#111827]" />
            <span className="text-2xl font-bold text-[#111827]">
              MindFuel
            </span>
          </Link>
          <h1 className="text-2xl font-semibold text-[#111827] mt-4">Reset your password</h1>
          <p className="text-sm text-[#4B5563] mt-1">
            Enter your email and we&apos;ll send a secure reset link
          </p>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 p-4 bg-[#F5F7F6] border border-black/[0.06] rounded-2xl mb-6">
          <Shield className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-[#4B5563] leading-relaxed">
            For your security, we won&apos;t confirm whether an email is registered. The reset link expires in 1 hour.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-black/[0.04] rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 h-12 bg-[#F5F7F6] border-black/[0.06] rounded-xl text-[#111827] placeholder:text-gray-400 focus:border-black/[0.12] focus:ring-1 focus:ring-black/[0.08] transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button id="reset-button" type="submit" className="w-full h-11 bg-[#111827] text-white hover:bg-[#1f2937] hover:shadow-md rounded-xl font-bold transition-all" disabled={loading || !email}>
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Send Reset Link'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          <Link href="/login" className="text-[#111827] hover:text-[#4B5563] font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
