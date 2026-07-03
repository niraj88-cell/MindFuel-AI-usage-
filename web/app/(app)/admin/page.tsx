'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AdminStats {
  totalUsers: number
  totalSessions: number
  totalFocusHours: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAdminData() {
      // 1. Check local session first
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.email !== 'niraj2055adk@gmail.com') {
        setError('Unauthorized. This incident has been logged.')
        setLoading(false)
        return
      }

      // 2. Fetch secure data
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) {
          throw new Error(await res.text())
        }
        const data = await res.json()
        setStats(data.stats)
      } catch (err: any) {
        setError(err.message || 'Failed to load CEO stats')
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="mb-4 h-6 w-6 animate-spin text-green" />
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-faint">Loading</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-line bg-card p-8 text-center">
          <h1 className="font-serif text-2xl text-ink">Not available</h1>
          <p className="mt-2 text-sm text-soft">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-ink-hover">
            Back to today
          </button>
        </div>
      </div>
    )
  }

  const cards = [
    { label: 'Members', value: stats?.totalUsers ?? 0 },
    { label: 'Focus sessions', value: stats?.totalSessions ?? 0 },
    { label: 'Focus hours', value: stats?.totalFocusHours ?? 0 },
  ]

  return (
    <div className="mx-auto max-w-3xl py-2">
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Owner</p>
        <h1 className="mt-2 font-serif text-[2rem] leading-tight tracking-[-0.01em] text-ink">Aggregate counts</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-card p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{c.label}</p>
            <div className="mt-2 font-mono text-4xl font-medium text-ink">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Privacy stance — the owner panel deliberately shows no user content. */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-line bg-card p-5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-green" />
        <p className="text-sm leading-relaxed text-soft">
          This panel shows aggregate counts only. It never reads domains, session content, or
          any per-user activity — the same domain-only boundary the product promises everyone
          applies to the owner too.
        </p>
      </div>
    </div>
  )
}
