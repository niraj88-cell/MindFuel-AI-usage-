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
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10 text-ink">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
              <SatyaMark size={20} />
            </span>
            <span className="text-xl font-semibold tracking-tight">SatyaShift</span>
          </Link>
        </div>

        {sent ? (
          <div className="rounded-xl border border-line bg-card p-6 text-center sm:p-8">
            <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-tint text-green">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="font-serif text-3xl tracking-[-0.01em]">Check your inbox</h1>
            <p className="mt-3 text-sm leading-relaxed text-soft">
              If an account exists for <span className="font-semibold text-ink">{email}</span>, we&apos;ve sent a password reset link.
            </p>
            <p className="mt-2 text-xs text-faint">
              The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
            </p>
            <div className="mt-8 space-y-3">
              <Button
                variant="outline"
                onClick={() => { setSent(false); setEmail('') }}
                className="h-12 w-full rounded-lg"
              >
                Send again
              </Button>
              <Link href="/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-soft transition-colors hover:text-ink">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-serif text-4xl tracking-[-0.01em]">Reset your password</h1>
              <p className="mt-3 text-[15px] text-soft">Enter your email and we&apos;ll send a secure reset link.</p>
            </div>

            <div className="mb-6 flex items-start gap-3 rounded-lg border border-line bg-card p-4">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-green" />
              <p className="text-xs leading-relaxed text-faint">
                For your security, we won&apos;t confirm whether an email is registered. The reset link expires in 1 hour.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-card p-6 sm:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 rounded-lg"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-rust/25 bg-rust-tint p-3 text-sm font-medium text-rust">
                    {error}
                  </div>
                )}

                <Button
                  id="reset-button"
                  type="submit"
                  className="h-12 w-full rounded-lg"
                  disabled={loading || !email}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-faint">
              <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
