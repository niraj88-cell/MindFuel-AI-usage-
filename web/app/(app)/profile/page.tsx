'use client'

// SatyaShift — Settings.
// The "I remain in control" surface: plan (honest, no billing yet), the working data
// export/delete flows, and account actions. No vanity stats, and no dead knobs — the
// old persona/nudge-timing preferences were removed because nothing read them (nudge
// policy is fixed prose in the extension; the legacy coach is deleted).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AppWindow,
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
import { unsubscribeBrowserPush } from '@/lib/push/browser'
import { PushNotificationManager } from '@/components/PushNotificationManager'
import { CheckoutButtons } from '@/components/billing/CheckoutButtons'
import { DevCheckout } from '@/components/billing/DevCheckout'
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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)
  const [manageError, setManageError] = useState<string | null>(null)

  const checkoutEnabled = readPaddlePublicEnv().checkoutEnabled

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return null }

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, subscription_plan')
      .eq('id', user.id)
      .maybeSingle()

    const next = {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || 'Member',
      joinedAt: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      subscription: getSubscriptionState(profile),
    }
    setData(next)
    setLoading(false)
    return next
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
  // so "active" appears without a manual refresh. Poll for ~40s (webhooks are usually
  // 1–3s but can lag under provider retries); stop early the moment the plan goes active.
  const pollForActivation = useCallback(() => {
    let tries = 0
    const t = setInterval(async () => {
      tries += 1
      const p = await load()
      if (p?.subscription?.status === 'active' || tries >= 20) clearInterval(t)
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
    // Turn off push for this browser BEFORE we drop the session (see lib/push/browser.ts).
    await unsubscribeBrowserPush()
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function closeDelete() {
    if (deleting) return
    setDeleteOpen(false)
    setConfirmText('')
    setDeleteError(null)
  }

  async function handleDelete() {
    setDeleting(true); setDeleteError(null)
    try {
      const res = await fetch('/api/export/delete', { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not delete account')
      window.location.href = '/login'
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account. Please try again.')
      setDeleting(false)
    }
  }

  // Escape closes the delete dialog, unless a deletion is already in flight.
  useEffect(() => {
    if (!deleteOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDelete() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteOpen, deleting])

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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card text-lg font-semibold text-ink ring-1 ring-line">{initials}</div>
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
              /* Say exactly what the gate does. POST /api/squads runs requirePremium whenever
                 checkout is configured, so "nothing is locked" became false the moment the
                 Paddle env vars landed. Name the ONE thing that costs money, and name the
                 things that never will — the host-pays boundary, out loud. */
              : <>Your trial has ended. Your own sessions, your history, and joining a friend&rsquo;s
                  circle stay free. A plan is only needed to host a circle of your own.</>}
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
          // DevCheckout renders only for the owner (backend-gated); everyone else sees
          // exactly the inert cards below, unchanged.
          <>
            {data && <DevCheckout userId={data.id} email={data.email} onSuccess={pollForActivation} />}
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

      {/* Desktop widget — optional ambient companion window. Opening it is always an
          explicit choice; closing the window is the whole off switch. */}
      <section className="rounded-xl border border-line bg-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <AppWindow className="h-4 w-4 text-green" />
          <h2 className="text-sm font-semibold text-ink">Desktop widget</h2>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-faint">
          A small window that sits beside your work and holds one quiet line — a running
          session, or the week&rsquo;s one noticing. In Chrome, &ldquo;Float on top&rdquo;
          keeps it above every other window, right on your desktop. Nothing to watch,
          nothing to manage; close it whenever you like.
        </p>
        <button
          onClick={() => window.open('/widget', 'satyashift-widget', 'popup=yes,width=360,height=200')}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash"
        >
          <AppWindow className="h-4 w-4" /> Open the widget
        </button>
      </section>

      {/* Account */}
      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Account</h2>
        <div className="mb-3 rounded-lg bg-paper p-3">
          <PushNotificationManager />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/forgot-password" className="focus-ring press flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash">
            <Lock className="h-4 w-4" /> Reset password by email
          </Link>
          <button onClick={handleSignOut} disabled={signingOut} className="focus-ring press flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-60">
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
          </button>
        </div>
        <button onClick={() => setDeleteOpen(true)} className="focus-ring press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-rust-tint text-sm font-semibold text-rust transition-colors hover:bg-rust hover:text-white">
          <Trash2 className="h-4 w-4" /> Delete account
        </button>
      </section>

      {/* Delete confirmation — the product's most irreversible action, kept in the product's
          own voice instead of the browser's grey box. Type-to-confirm guards against a stray
          click; the dark scrim + border give depth without a shadow (design rule). */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <button className="absolute inset-0 bg-ink/40" aria-label="Cancel" onClick={closeDelete} />
          <div className="relative w-full max-w-md rounded-xl border border-line bg-card p-6">
            <h2 id="delete-title" className="font-serif text-[1.4rem] leading-tight tracking-[-0.01em] text-ink">
              Delete your account?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-soft">
              This permanently removes your account, every focus session, and all of your data.
              It can&rsquo;t be undone, and we keep no backup to restore it from.
            </p>
            <label htmlFor="confirm-delete" className="mt-4 block text-xs font-medium text-faint">
              Type <span className="font-mono font-semibold text-ink">DELETE</span> to confirm
            </label>
            <input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="DELETE"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-4 py-2.5 font-mono text-sm uppercase tracking-widest text-ink outline-none transition-colors placeholder:tracking-normal placeholder:text-ghost focus:border-rust"
            />
            {deleteError && <p className="mt-3 text-sm font-medium text-rust">{deleteError}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={closeDelete}
                disabled={deleting}
                className="focus-ring press h-11 flex-1 rounded-lg border border-line bg-paper text-sm font-semibold text-ink transition-colors hover:bg-green-wash disabled:opacity-60"
              >
                Keep my account
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                className="focus-ring press flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-rust text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
