// app/(auth)/reset-password/page.tsx — Set a new password after the email link.
// The email link goes through /api/auth/callback, which exchanges the recovery
// code for a session; this page requires that session to show the form.
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SatyaMark } from '@/components/brand/SatyaMark'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(Boolean(user))
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }
    setDone(true)
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

        {checking ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" />
          </div>
        ) : done ? (
          <div className="rounded-3xl border border-black/[0.07] bg-white p-6 text-center shadow-sm sm:p-8">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#4CAF50]">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
              You&apos;re signed in with your new password.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl bg-[#111827] text-sm font-semibold text-white transition-colors hover:bg-[#1F2937]"
            >
              Continue to Today
            </Link>
          </div>
        ) : !hasSession ? (
          <div className="rounded-3xl border border-black/[0.07] bg-white p-6 text-center shadow-sm sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">This link has expired</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
              Reset links work once and expire after an hour. Request a new one and try again.
            </p>
            <Link
              href="/forgot-password"
              className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl bg-[#111827] text-sm font-semibold text-white transition-colors hover:bg-[#1F2937]"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
              <p className="mt-3 text-base text-[#6B7280]">At least 8 characters.</p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="h-12 rounded-2xl border-black/[0.08] bg-[#F9FAF8] pr-12 text-[#111827]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-black/[0.04] hover:text-[#111827]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-12 rounded-2xl border-black/[0.08] bg-[#F9FAF8] text-[#111827]"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[#111827] text-sm font-semibold text-white hover:bg-[#1F2937]"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set new password'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
