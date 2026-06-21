'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Users, Clock, Brain, Lock, ArrowUp, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AdminStats {
  totalUsers: number
  totalLogs: number
  totalFocusHours: number
}

interface RecentLog {
  content: string
  mental_score: number
  category: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [logs, setLogs] = useState<RecentLog[]>([])
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
        setLogs(data.recentLogs)
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
          <h1 className="text-xl font-semibold text-rose-500 mb-2">ACCESS DENIED</h1>
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
          <h1 className="text-2xl font-semibold text-white">CEO Control Center</h1>
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
          <div className="text-5xl font-semibold text-white mb-2">{stats?.totalUsers || 0}</div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <ArrowUp className="w-3 h-3" /> <span>Real-time global sync</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-sm font-bold text-zinc-400 mb-2">Mental Intercepts Logged</p>
          <div className="text-5xl font-semibold text-white mb-2">{stats?.totalLogs || 0}</div>
          <div className="flex items-center gap-1 text-xs font-bold text-zinc-500">
            <span>Aggregated across all squads</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-24 h-24 text-indigo-500" />
          </div>
          <p className="text-sm font-bold text-zinc-400 mb-2">Total Focus Hours</p>
          <div className="text-5xl font-semibold text-white mb-2">{stats?.totalFocusHours || 0}</div>
          <div className="flex items-center gap-1 text-xs font-bold text-zinc-500">
            <span>Doomscrolling prevented globally</span>
          </div>
        </div>
      </div>

      {/* Global Activity Feed */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" /> Live Global Activity (Anonymized)
        </h2>
        
        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden">
          {logs.map((log, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  log.mental_score >= 70 ? 'bg-emerald-500/10 text-emerald-400' :
                  log.mental_score >= 40 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-rose-500/10 text-rose-400'
                }`}>
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white mb-1 line-clamp-1">"{log.content}"</div>
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{log.category}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 sm:pl-6 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0">
                <div className="text-center">
                  <div className="text-xl font-semibold text-white">{log.mental_score}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Score</div>
                </div>
                <div className="text-xs text-zinc-500 font-medium">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-sm font-medium">No recent logs found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
