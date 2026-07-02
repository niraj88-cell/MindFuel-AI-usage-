'use client'

// SatyaShift — Settings.
// The "I remain in control" surface: plan (honest, no billing yet), the working data
// export/delete flows, and account actions. No vanity stats, and no dead knobs — the
// old persona/nudge-timing preferences were removed because nothing read them (nudge
// policy is fixed prose in the extension; the legacy coach is deleted).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileJson,
  FileText,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PushNotificationManager } from '@/components/PushNotificationManager'
import { PLANS, getSubscriptionState, type SubscriptionState } from '@/lib/subscription'

interface Profile {
  email: string
  fullName: string
  joinedAt: string
  subscription: SubscriptionState
}

export default function SettingsPage() {
  const [data, setData] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, subscription_plan')
      .eq('id', user.id)
      .maybeSingle()

    setData({
      email: user.email || '',
      fullName: user.user_metadata?.full_name || 'Member',
      joinedAt: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      subscription: getSubscriptionState(profile),
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => { if (!cancelled) await load() })()
    return () => { cancelled = true }
  }, [load])

  async function handleExport(format: 'json' | 'csv') {
    setExporting(format); setExportError(null)
    try {
      const res = await fetch(`/api/export?format=${format}&days=90`)
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setExportError(body.error || 'Export limit reached.')
        return
      }
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `satyashift-export.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleDelete() {
    if (!window.confirm('This permanently deletes your SatyaShift account and data. Continue?')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/export/delete', { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not delete account')
      window.location.href = '/login'
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete account')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#2E7D32]" />
      </div>
    )
  }

  const initials = data?.fullName?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const sub = data?.subscription

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111827] text-lg font-semibold text-white">{initials}</div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-[#111827]">{data?.fullName}</h1>
          <p className="flex items-center gap-1.5 text-sm text-[#6B7280]"><Mail className="h-3.5 w-3.5" /> {data?.email}</p>
        </div>
      </div>

      {/* Plan — honest: billing is not live, nothing can be charged. */}
      <section className="rounded-3xl border border-black/[0.07] bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <Sparkles className="h-4 w-4 text-[#2E7D32]" /> Plan
          </h2>
          <span className="rounded-full bg-[#E8F5E9] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-[#2E7D32]">
            {sub?.status === 'active' ? 'active' : sub?.status === 'trialing' ? 'free trial' : 'free'}
          </span>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-[#6B7280]">
          {sub?.status === 'trialing'
            ? <>Everything is included in your trial — {sub.trialDaysLeft} day{sub.trialDaysLeft === 1 ? '' : 's'} left.</>
            : sub?.status === 'active'
              ? <>You&rsquo;re on the {sub.plan === 'annual' ? 'annual' : 'monthly'} plan. Thank you for keeping this independent.</>
              : <>Your trial has ended, but nothing is locked while billing is being set up.</>}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.values(PLANS)).map((p) => (
            <div key={p.id} className={`rounded-2xl border p-4 ${sub?.plan === p.id ? 'border-[#2E7D32] bg-[#E8F5E9]' : 'border-black/[0.08] bg-[#FAF8F4]'}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#111827]">{p.label}</span>
                <span className="font-mono text-sm font-semibold text-[#111827]">${p.priceUsd}<span className="text-xs font-normal text-[#6B7280]">/{p.period}</span></span>
              </div>
              <p className="mt-1 text-xs leading-snug text-[#6B7280]">
                {p.note ?? 'Verified sessions, your circle, gentle nudges — all of it.'}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#6B7280]">
          Billing isn&rsquo;t switched on yet, so you can&rsquo;t be charged and nothing happens
          automatically. Every new account starts with a 14-day trial; when billing opens,
          choosing a plan will always be an explicit step you take.
        </p>
      </section>

      {/* Your data */}
      <section className="rounded-3xl border border-black/[0.07] bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#2E7D32]" />
          <h2 className="text-sm font-semibold text-[#111827]">Your data</h2>
        </div>
        <div className="space-y-2 text-sm text-[#4B5563]">
          {[
            'We only ever see the domains you visit — never the page, your typing, or your history.',
            'Your sites are never shown to your circle.',
            'Stored only on your account. Yours to export or delete, anytime.',
          ].map((t) => (
            <div key={t} className="rounded-2xl bg-[#FAF8F4] p-3 leading-snug">{t}</div>
          ))}
        </div>

        {exportError && <div className="mt-3 rounded-2xl bg-[#FEF3F2] p-3 text-sm font-medium text-[#B42318]">{exportError}</div>}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button onClick={() => handleExport('json')} disabled={exporting !== null} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-[#FAF8F4] text-sm font-semibold text-[#111827] transition-colors hover:bg-black/[0.02] disabled:opacity-60">
            {exporting === 'json' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />} Export JSON
          </button>
          <button onClick={() => handleExport('csv')} disabled={exporting !== null} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-[#FAF8F4] text-sm font-semibold text-[#111827] transition-colors hover:bg-black/[0.02] disabled:opacity-60">
            {exporting === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Export CSV
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="rounded-3xl border border-black/[0.07] bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-[#111827]">Account</h2>
        <div className="mb-3 rounded-2xl bg-[#FAF8F4] p-3">
          <PushNotificationManager />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/forgot-password" className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-[#FAF8F4] text-sm font-semibold text-[#111827] transition-colors hover:bg-black/[0.02]">
            <Lock className="h-4 w-4" /> Change password
          </Link>
          <button onClick={handleSignOut} disabled={signingOut} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-[#FAF8F4] text-sm font-semibold text-[#111827] transition-colors hover:bg-black/[0.02] disabled:opacity-60">
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
          </button>
        </div>
        <button onClick={handleDelete} disabled={deleting} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#FEF3F2] text-sm font-semibold text-[#B42318] transition-colors hover:bg-[#FDE8E6] disabled:opacity-60">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete account
        </button>
      </section>
    </div>
  )
}
