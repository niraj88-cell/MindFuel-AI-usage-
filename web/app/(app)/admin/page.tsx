'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Users, Clock, Lock, ArrowUp, ShieldAlert } from 'lucide-react'
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Lock className="w-8 h-8 text-indigo-500 animate-pulse mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Decrypting Secure Neural Link</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-center max-w-md">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-rose-500 mb-2">ACCESS DENIED</h1>
          <p className="text-sm text-rose-400/80 mb-6">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="px-6 py-2 bg-rose-500/20 text-rose-300 text-sm font-bold rounded-xl hover:bg-rose-500/30 transition-colors">
            Return to Safety
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">CEO Control Center</h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clearance Level: Maximum</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-24 h-24 text-white" />
          </div>
          <p className="text-sm font-bold text-zinc-400 mb-2">Total Active Users</p>
          <div className="text-5xl font-black text-white mb-2">{stats?.totalUsers || 0}</div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <ArrowUp className="w-3 h-3" /> <span>Real-time global sync</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-sm font-bold text-zinc-400 mb-2">Focus Sessions</p>
          <div className="text-5xl font-black text-white mb-2">{stats?.totalSessions || 0}</div>
          <div className="flex items-center gap-1 text-xs font-bold text-zinc-500">
            <span>Verified across all circles</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-24 h-24 text-indigo-500" />
          </div>
          <p className="text-sm font-bold text-zinc-400 mb-2">Total Focus Hours</p>
          <div className="text-5xl font-black text-white mb-2">{stats?.totalFocusHours || 0}</div>
          <div className="flex items-center gap-1 text-xs font-bold text-zinc-500">
            <span>Doomscrolling prevented globally</span>
          </div>
        </div>
      </div>

      {/* Privacy stance — the owner panel deliberately shows no user content. */}
      <div>
        <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-500" /> Privacy by design
        </h2>
        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8 text-sm leading-relaxed text-zinc-400">
          This panel shows aggregate counts only. It does not read domains, session
          content, or any per-user activity — the same domain-only boundary the product
          promises everyone applies to the owner too.
        </div>
      </div>
    </div>
  )
}
