'use client'

// SatyaShift — Settings.
// The "I remain in control" surface: plan (honest, no billing yet), the working data
// export/delete flows, and account actions. No vanity stats, and no dead knobs — the
// old persona/nudge-timing preferences were removed because nothing read them (nudge
// policy is fixed prose in the extension; the legacy coach is deleted).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  FileJson,
  FileText,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PushNotificationManager } from '@/components/PushNotificationManager'
import { CheckoutButtons } from '@/components/billing/CheckoutButtons'
import { readPaddlePublicEnv } from '@/lib/billing/public-config'
import { PLANS, getSubscriptionState, type SubscriptionState } from '@/lib/subscription'

interface Profile {
  id: string
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
  const [managing, setManaging] = useState(false)
  const [manageError, setManageError] = useState<string | null>(null)

  const checkoutEnabled = readPaddlePublicEnv().checkoutEnabled

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
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || 'Member',
      joinedAt: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      subscription: getSubscriptionState(profile),
    })
    setLoading(false)
  }, [])

  // Open the Paddle customer portal (manage payment method / cancel).
  async function handleManage() {
    setManaging(true); setManageError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) throw new Error(body.error || 'Could not open the portal')
      window.location.href = body.url
    } catch (err) {
      setManageError(err instanceof Error ? err.message : 'Could not open the portal')
      setManaging(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => { if (!cancelled) await load() })()
    return () => { cancelled = true }
  }, [load])

  // Entitlement flips via the webhook a beat after checkout. When we return from a
  // successful checkout (?upgraded=1) or the overlay reports success, re-poll the profile
  // a few times so "active" appears without a manual refresh, then stop.
  const pollForActivation = useCallback(() => {
    let tries = 0
    const t = setInterval(async () => {
      tries += 1
      await load()
      if (tries >= 5) clearInterval(t)
    }, 2000)
  }, [load])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('upgraded')) {
      window.history.replaceState(null, '', '/profile')
      pollForActivation()
    }
  }, [pollForActivation])

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
        <Loader2 className="h-7 w-7 animate-spin text-green" />
      </div>
    )
  }

  const initials = data?.fullName?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const sub = data?.subscription

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink text-lg font-semibold text-white">{initials}</div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{data?.fullName}</h1>
          <p className="flex items-center gap-1.5 text-sm text-faint"><Mail className="h-3.5 w-3.5" /> {data?.email}</p>
        </div>
      </div>

      {/* Plan — honest: billing is not live, nothing can be charged. */}
      <section className="rounded-xl border border-line bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Plan</h2>
          <span className="rounded-full bg-green-tint px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-green">
            {sub?.status === 'active' ? 'active' : sub?.status === 'trialing' ? 'free trial' : 'free'}
          </span>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-faint">
          {sub?.status === 'trialing'
            ? <>Everything is included in your trial — {sub.trialDaysLeft} day{sub.trialDaysLeft === 1 ? '' : 's'} left.</>
            : sub?.status === 'active'
              ? <>You&rsquo;re on the {sub.plan === 'annual' ? 'annual' : 'monthly'} plan. Thank you for keeping this independent.</>
              : <>Your trial has ended, but nothing is locked while billing is being set up.</>}
        </p>

        {/* Active subscriber: manage / cancel through Paddle's portal. */}
        {sub?.status === 'active' ? (
          <>
            <button
              onClick={handleManage}
              disabled={managing}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-60"
            >
              {managing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage subscription
            </button>
            <p className="mt-2 text-xs leading-relaxed text-faint">
              Update your payment method or cancel any time — you keep access until the end of the
              period you paid for. Card details are handled by Paddle, never stored by us.
            </p>
            {manageError && <p className="mt-2 text-sm font-medium text-rust">{manageError}</p>}
          </>
        ) : checkoutEnabled && data ? (
          // Trial or free, billing live: let them choose a plan (Paddle overlay checkout).
          <>
            <CheckoutButtons userId={data.id} email={data.email} onSuccess={pollForActivation} />
            <p className="mt-3 text-xs leading-relaxed text-faint">
              Secure checkout by Paddle, our merchant of record. 30-day money-back guarantee;
              cancel any time in one click. Your card details never touch our servers.
            </p>
          </>
        ) : (
          // Billing not configured yet: the honest, inert state.
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.values(PLANS)).map((p) => (
                <div key={p.id} className={`rounded-lg border p-4 ${sub?.plan === p.id ? 'border-green-line bg-green-tint' : 'border-line bg-paper'}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-ink">{p.label}</span>
                    <span className="font-mono text-sm font-medium text-ink">${p.priceUsd}<span className="text-xs font-normal text-faint">/{p.period}</span></span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-faint">
                    {p.note ?? 'Verified sessions, your circle, gentle nudges — all of it.'}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-faint">
              Billing isn&rsquo;t switched on yet, so you can&rsquo;t be charged and nothing happens
              automatically. Every new account starts with a 14-day trial; when billing opens,
              choosing a plan will always be an explicit step you take.
            </p>
          </>
        )}
      </section>

      {/* Your data */}
      <section className="rounded-xl border border-line bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-green" />
          <h2 className="text-sm font-semibold text-ink">Your data</h2>
        </div>
        <div className="space-y-2 text-sm text-soft">
          {[
            'We only ever see the domains you visit — never the page, your typing, or your history.',
            'Your sites are never shown to your circle.',
            'Stored only on your account. Yours to export or delete, anytime.',
          ].map((t) => (
            <div key={t} className="rounded-lg bg-paper p-3 leading-snug">{t}</div>
          ))}
        </div>

        {exportError && <div className="mt-3 rounded-lg bg-rust-tint p-3 text-sm font-medium text-rust">{exportError}</div>}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button onClick={() => handleExport('json')} disabled={exporting !== null} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-60">
            {exporting === 'json' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />} Export JSON
          </button>
          <button onClick={() => handleExport('csv')} disabled={exporting !== null} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-60">
            {exporting === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Export CSV
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Account</h2>
        <div className="mb-3 rounded-lg bg-paper p-3">
          <PushNotificationManager />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/forgot-password" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash">
            <Lock className="h-4 w-4" /> Change password
          </Link>
          <button onClick={handleSignOut} disabled={signingOut} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-60">
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
          </button>
        </div>
        <button onClick={handleDelete} disabled={deleting} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-rust-tint text-sm font-semibold text-rust transition-colors hover:bg-rust hover:text-white disabled:opacity-60">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete account
        </button>
      </section>
    </div>
  )
}
