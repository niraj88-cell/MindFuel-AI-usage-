'use client'

// SatyaShift — Settings.
// The "I remain in control" surface. Two real preferences write to profiles
// (coach_persona, jitai_threshold_minutes), plus the working data export/delete
// flows and account actions. No vanity stats — this page is about control, not scores.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  FileJson,
  FileText,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Trash2,
  Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PushNotificationManager } from '@/components/PushNotificationManager'

type Persona = 'gentle' | 'direct' | 'brutal'
const THRESHOLDS = [3, 5, 8, 15, 30] as const

const PERSONAS: { id: Persona; label: string; desc: string }[] = [
  { id: 'gentle', label: 'Gentle', desc: 'Kind and encouraging. Never harsh.' },
  { id: 'direct', label: 'Direct', desc: 'Clear and to the point.' },
  { id: 'brutal', label: 'Blunt', desc: 'Unsparing tough love, if that helps you.' },
]

function SavedTick({ savedField, k }: { savedField: string | null; k: string }) {
  return savedField === k ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2E7D32]"><Check className="h-3.5 w-3.5" /> Saved</span>
  ) : null
}

interface Profile {
  email: string
  fullName: string
  joinedAt: string
  subscriptionTier: 'free' | 'premium'
  coachPersona: Persona
  jitaiThreshold: number
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [data, setData] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedField, setSavedField] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, coach_persona, jitai_threshold_minutes')
      .eq('id', user.id)
      .maybeSingle()

    setData({
      email: user.email || '',
      fullName: user.user_metadata?.full_name || 'Member',
      joinedAt: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      subscriptionTier: (profile?.subscription_tier as 'free' | 'premium') || 'free',
      coachPersona: (profile?.coach_persona as Persona) || 'gentle',
      jitaiThreshold: profile?.jitai_threshold_minutes ?? 8,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => { if (!cancelled) await load() })()
    return () => { cancelled = true }
  }, [load])

  async function savePref(field: 'coach_persona' | 'jitai_threshold_minutes', value: string | number, key: string) {
    if (!userId || !data) return
    const prev = data
    // optimistic
    setData({
      ...data,
      coachPersona: field === 'coach_persona' ? (value as Persona) : data.coachPersona,
      jitaiThreshold: field === 'jitai_threshold_minutes' ? (value as number) : data.jitaiThreshold,
    })
    const supabase = createClient()
    const patch = field === 'coach_persona'
      ? { coach_persona: value as Persona }
      : { jitai_threshold_minutes: value as number }
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    if (error) {
      setData(prev) // revert
      return
    }
    setSavedField(key)
    setTimeout(() => setSavedField((s) => (s === key ? null : s)), 1600)
  }

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

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111827] text-lg font-semibold text-white">{initials}</div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-[#111827]">{data?.fullName}</h1>
          <p className="flex items-center gap-1.5 text-sm text-[#6B7280]"><Mail className="h-3.5 w-3.5" /> {data?.email}</p>
        </div>
        <Link href="/subscription" className="inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.08] bg-white px-3.5 py-2 text-xs font-semibold text-[#111827] transition-colors hover:bg-black/[0.02]">
          <span className="capitalize">{data?.subscriptionTier}</span> plan <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Satya's voice */}
      <section className="rounded-3xl border border-black/[0.07] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111827]">How should Satya talk to you?</h2>
          <SavedTick savedField={savedField} k="persona" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {PERSONAS.map((p) => {
            const active = data?.coachPersona === p.id
            return (
              <button
                key={p.id}
                onClick={() => savePref('coach_persona', p.id, 'persona')}
                className={`rounded-2xl border p-3 text-left transition-colors ${active ? 'border-[#2E7D32] bg-[#E8F5E9]' : 'border-black/[0.08] bg-[#FAF8F4] hover:bg-black/[0.02]'}`}
              >
                <div className={`text-sm font-semibold ${active ? 'text-[#1B5E20]' : 'text-[#111827]'}`}>{p.label}</div>
                <div className={`mt-1 text-xs leading-snug ${active ? 'text-[#2E7D32]' : 'text-[#6B7280]'}`}>{p.desc}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Nudge timing */}
      <section className="rounded-3xl border border-black/[0.07] bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111827]">Nudge me after I&rsquo;ve drifted for</h2>
          <SavedTick savedField={savedField} k="threshold" />
        </div>
        <p className="mb-3 text-xs text-[#6B7280]">Lower is more watchful. Higher gives you more room before Satya checks in.</p>
        <div className="flex flex-wrap gap-2">
          {THRESHOLDS.map((t) => {
            const active = data?.jitaiThreshold === t
            return (
              <button
                key={t}
                onClick={() => savePref('jitai_threshold_minutes', t, 'threshold')}
                className={`rounded-full border px-4 py-2 font-mono text-sm transition-colors ${active ? 'border-[#2E7D32] bg-[#2E7D32] text-white' : 'border-black/[0.08] bg-[#FAF8F4] text-[#111827] hover:bg-black/[0.02]'}`}
              >
                {t} min
              </button>
            )
          })}
        </div>
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
            'Your sites are never shown to your squad.',
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
