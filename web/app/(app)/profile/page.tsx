// app/(app)/profile/page.tsx — Premium profile with data export, security info, achievement showcase
'use client'

import React, { useEffect, useState } from 'react'
import {
  User, Mail, Shield, LogOut, Loader2, Award, Download, FileJson,
  FileText, Flame, Brain, Lock, ChevronRight, Sparkles, BarChart3, Clock
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PushNotificationManager } from '@/components/PushNotificationManager'
import { Trash2 } from 'lucide-react'

interface ProfileData {
  email: string
  fullName: string
  joinedAt: string
  totalLogs: number
  highestStreak: number
  avgScore: number
  totalMoodEntries: number
  subscriptionTier: 'free' | 'premium'
}

function StatCard({ icon: Icon, color, bg, value, label }: {
  icon: any; color: string; bg: string; value: number | string; label: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl sm:rounded-3xl ${bg} border border-white/10 text-center`}>
      <div className={`w-11 h-11 rounded-2xl ${bg} border border-white/10 flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-2xl sm:text-3xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [
      { data: profile },
      { data: summaries },
      { data: moodCount },
    ] = await Promise.all([
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle(),
      supabase.from('daily_summaries').select('total_logs, streak_days, average_score').eq('user_id', user.id),
      supabase.from('mood_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    let totalLogs = 0, maxStreak = 0, totalScore = 0, scoreDays = 0
    if (summaries) {
      summaries.forEach(s => {
        totalLogs += s.total_logs
        if (s.streak_days > maxStreak) maxStreak = s.streak_days
        if (s.average_score) { totalScore += s.average_score; scoreDays++ }
      })
    }

    setData({
      email: user.email || '',
      fullName: user.user_metadata?.full_name || 'Explorer',
      joinedAt: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      totalLogs,
      highestStreak: maxStreak,
      avgScore: scoreDays ? Math.round(totalScore / scoreDays) : 0,
      totalMoodEntries: (moodCount as any)?.count || 0,
      subscriptionTier: profile?.subscription_tier || 'free',
    })
    setLoading(false)
  }

  async function handleExport(format: 'json' | 'csv') {
    setExporting(format)
    setExportError(null)
    try {
      const res = await fetch(`/api/export?format=${format}&days=90`)
      if (res.status === 429) {
        const data = await res.json()
        setExportError(data.error || 'Export limit reached.')
        setExporting(null)
        return
      }
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindfuel-export.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setExportError(e.message || 'Export failed. Please try again.')
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

  async function handleDeleteAccount() {
    if (!window.confirm("WARNING: This will permanently delete your account and all associated data. This action cannot be undone.")) return
    
    setDeleting(true)
    try {
      const res = await fetch('/api/export/delete', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete account')
      window.location.href = '/login'
    } catch (e: any) {
      alert(e.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  const initials = data?.fullName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const isPremium = data?.subscriptionTier === 'premium'

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 stagger-children">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
          <User className="w-7 h-7 text-white" />
          Profile
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Your account, stats, and data settings.</p>
      </div>

      {/* Identity Card */}
      <div className="relative">
        <div className="absolute -inset-px bg-gradient-to-r from-white/10 to-white/5 rounded-[28px] blur-sm" />
        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-[28px] p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-zinc-300">
                {initials}
              </div>
              {isPremium && (
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-black text-white truncate">{data?.fullName}</h2>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  isPremium
                    ? 'bg-white/5 text-white border-amber-500/30'
                    : 'bg-zinc-700/50 text-zinc-400 border-white/10'
                }`}>
                  {data?.subscriptionTier}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400 mb-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{data?.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                Member since {data?.joinedAt}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard icon={Brain} color="text-white" bg="bg-white/5" value={data?.totalLogs || 0} label="Logs" />
        <StatCard icon={Flame} color="text-rose-400" bg="bg-rose-500/5" value={data?.highestStreak || 0} label="Best Streak" />
        <StatCard icon={BarChart3} color="text-white" bg="bg-white/5" value={`${data?.avgScore || 0}/100`} label="Avg Score" />
        <StatCard icon={Award} color="text-white" bg="bg-amber-500/5" value={data?.totalMoodEntries || 0} label="Mood Checks" />
      </div>

      {/* Premium Upgrade Teaser */}
      {!isPremium && (
        <Link href="/subscription" className="group block bg-gradient-to-r from-zinc-900 to-black border border-white/10 hover:border-white/20 rounded-3xl p-6 relative overflow-hidden transition-all shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:shadow-[0_0_40px_rgba(255,255,255,0.06)]">
          <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                Elevate your MindFuel <Sparkles className="w-4 h-4 text-white" />
              </h3>
              <p className="text-sm text-zinc-400">Get unlimited entries, bespoke habit challenges, and deep psychological insights.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Link>
      )}

      {/* Data Export */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Download className="w-5 h-5 text-white" />
          <div>
            <h3 className="text-sm font-black text-white">Export My Data</h3>
            <p className="text-xs text-zinc-500">Download your last 90 days of data (5 exports/day)</p>
          </div>
        </div>

        {exportError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400">
            {exportError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="flex items-center gap-2.5 p-4 rounded-2xl bg-zinc-800/50 border border-white/10 hover:border-white/10 hover:bg-indigo-500/5 transition-all cursor-pointer disabled:opacity-50 group"
          >
            {exporting === 'json'
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <FileJson className="w-5 h-5 text-white" />}
            <div className="text-left">
              <div className="text-xs font-black text-white">JSON</div>
              <div className="text-[10px] text-zinc-500">Full data</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="flex items-center gap-2.5 p-4 rounded-2xl bg-zinc-800/50 border border-white/10 hover:border-emerald-500/30 hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50 group"
          >
            {exporting === 'csv'
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <FileText className="w-5 h-5 text-white" />}
            <div className="text-left">
              <div className="text-xs font-black text-white">CSV</div>
              <div className="text-[10px] text-zinc-500">Spreadsheet</div>
            </div>
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-white" />
          <h3 className="text-sm font-black text-white">Security</h3>
        </div>

        <Link href="/forgot-password" className="flex items-center justify-between p-4 rounded-2xl bg-zinc-800/30 border border-white/10 hover:border-white/10 hover:bg-zinc-800/60 transition-all group">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-sm font-bold text-white">Change Password</div>
              <div className="text-xs text-zinc-500">Send a secure reset link to your email</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </Link>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-800/30 border border-white/10 mt-1">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-white" />
            <div>
              <div className="text-sm font-bold text-white">Data Encryption</div>
              <div className="text-xs text-zinc-500">All data encrypted at rest via Supabase</div>
            </div>
          </div>
          <span className="text-[10px] font-black text-white bg-white/5 border border-white/10 px-2 py-1 rounded-full">ACTIVE</span>
        </div>

        <div className="mt-1">
          <PushNotificationManager />
        </div>
      </div>

      {/* Upgrade CTA for free users */}
      {!isPremium && (
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/[0.03]" />
          <div className="relative p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Unlock Premium</p>
              <p className="text-sm font-bold text-white">Unlimited logs, 500 coach messages/hr, priority AI</p>
            </div>
            <Link href="/subscription">
              <Button size="sm" className="shrink-0 bg-white hover:bg-zinc-200 text-black shadow-lg shadow-white/10">
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Sign Out & Danger Zone */}
      <div className="space-y-3 pt-6 border-t border-white/5">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all font-black text-sm cursor-pointer disabled:opacity-50"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>

        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all font-black text-sm cursor-pointer disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {deleting ? 'Deleting account...' : 'Permanently Delete Account'}
        </button>
      </div>

    </div>
  )
}
