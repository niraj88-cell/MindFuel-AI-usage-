// app/(auth)/forgot-password/page.tsx — Secure password reset request page
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, CheckCircle2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SatyaMark } from '@/components/brand/SatyaMark'

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

      await res.json().catch(() => null)

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-5 py-10 text-[#111827]">
      <div className="w-full max-w-[430px]">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <SatyaMark size={20} />
            </span>
            <span className="text-2xl font-bold tracking-tight">SatyaShift</span>
          </Link>
        </div>

        {sent ? (
          <div className="rounded-3xl border border-black/[0.07] bg-white p-6 text-center shadow-sm sm:p-8">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#4CAF50]">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
              If an account exists for <span className="font-semibold text-[#111827]">{email}</span>, we&apos;ve sent a password reset link.
            </p>
            <p className="mt-2 text-xs text-[#6B7280]">
              The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
            </p>
            <div className="mt-8 space-y-3">
              <Button
                onClick={() => { setSent(false); setEmail('') }}
                className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#111827] shadow-none hover:bg-[#F5F7F6]"
              >
                Send again
              </Button>
              <Link href="/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-[#4B5563] transition-colors hover:text-[#111827]">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
              <p className="mt-3 text-base text-[#6B7280]">Enter your email and we&apos;ll send a secure reset link.</p>
            </div>

            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white/70 p-4">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#4CAF50]" />
              <p className="text-xs leading-relaxed text-[#6B7280]">
                For your security, we won&apos;t confirm whether an email is registered. The reset link expires in 1 hour.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 rounded-2xl border-black/[0.08] bg-[#F9FAF8] text-[#111827] placeholder:text-[#9CA3AF]"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  id="reset-button"
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[#111827] text-sm font-semibold text-white hover:bg-[#1F2937]"
                  disabled={loading || !email}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-[#6B7280]">
              <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[#111827] hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
