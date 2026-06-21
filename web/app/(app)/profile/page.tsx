// app/(app)/profile/page.tsx — Premium profile with data export, security info, achievement showcase
'use client'

import React, { useEffect, useState } from 'react'
import {
  User, Mail, Shield, LogOut, Loader2, Award, Download, FileJson,
  FileText, Flame, Brain, Lock, ChevronRight, Sparkles, BarChart3, Clock, Mic, Terminal, Key, Copy, Check
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
    <div className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-white border border-black/[0.04] shadow-sm text-center`}>
      <div className={`w-11 h-11 rounded-2xl bg-[#F5F7F6] border border-black/[0.06] flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-2xl sm:text-3xl font-semibold text-[#111827] mb-1">{value}</div>
      <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">{label}</div>
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
  const [voiceMode, setVoiceMode] = useState<'browser' | 'elevenlabs'>('browser')
  const [copiedKey, setCopiedKey] = useState(false)

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
        <Loader2 className="w-8 h-8 animate-spin text-[#111827]" />
      </div>
    )
  }

  const initials = data?.fullName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const isPremium = data?.subscriptionTier === 'premium'

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 stagger-children">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-3 text-[#111827]">
          <User className="w-7 h-7 text-[#111827]" />
          Profile
        </h1>
        <p className="text-[#4B5563] text-sm mt-1">Your account, stats, and data settings.</p>
      </div>

      {/* Identity Card */}
      <div className="relative">
        <div className="bg-white border border-black/[0.04] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#EADBC8] border border-black/[0.06] flex items-center justify-center text-3xl font-semibold text-[#111827]">
                {initials}
              </div>
              {isPremium && (
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-[#FFB74D] flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-[#111827] truncate">{data?.fullName}</h2>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest border ${
                  isPremium
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-[#F5F7F6] text-[#4B5563] border-black/[0.06]'
                }`}>
                  {data?.subscriptionTier}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[#4B5563] mb-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{data?.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                Member since {data?.joinedAt}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard icon={Brain} color="text-[#111827]" bg="bg-[#F5F7F6]" value={data?.totalLogs || 0} label="Logs" />
        <StatCard icon={Flame} color="text-red-500" bg="bg-red-50" value={data?.highestStreak || 0} label="Best Streak" />
        <StatCard icon={BarChart3} color="text-[#111827]" bg="bg-[#F5F7F6]" value={`${data?.avgScore || 0}/100`} label="Avg Score" />
        <StatCard icon={Award} color="text-amber-600" bg="bg-amber-50" value={data?.totalMoodEntries || 0} label="Mood Checks" />
      </div>

      {/* Premium Upgrade Teaser */}
      {!isPremium && (
        <Link href="/subscription" className="group block bg-white border border-black/[0.06] hover:border-black/[0.12] rounded-2xl p-6 relative overflow-hidden transition-all shadow-sm hover:shadow-md">
          <div className="absolute inset-0 bg-black/[0.01] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-[#111827] flex items-center gap-2 mb-1">
                Elevate your MindFuel <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-sm text-[#4B5563]">Get unlimited entries, bespoke habit challenges, and deep psychological insights.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Link>
      )}

      {/* Data Export */}
      <div className="bg-white border border-black/[0.04] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Download className="w-5 h-5 text-[#111827]" />
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">Export My Data</h3>
            <p className="text-xs text-gray-400">Download your last 90 days of data (5 exports/day)</p>
          </div>
        </div>

        {exportError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-500">
            {exportError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
            className="flex items-center gap-2.5 p-4 rounded-2xl bg-[#F5F7F6] border border-black/[0.06] hover:border-black/[0.12] hover:bg-[#4CAF50]/5 transition-all cursor-pointer disabled:opacity-50 group"
          >
            {exporting === 'json'
              ? <Loader2 className="w-5 h-5 text-[#111827] animate-spin" />
              : <FileJson className="w-5 h-5 text-[#111827]" />}
            <div className="text-left">
              <div className="text-xs font-semibold text-[#111827]">JSON</div>
              <div className="text-[10px] text-gray-400">Full data</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="flex items-center gap-2.5 p-4 rounded-2xl bg-[#F5F7F6] border border-black/[0.06] hover:border-[#4CAF50]/30 hover:bg-[#F5F7F6] transition-all cursor-pointer disabled:opacity-50 group"
          >
            {exporting === 'csv'
              ? <Loader2 className="w-5 h-5 text-[#111827] animate-spin" />
              : <FileText className="w-5 h-5 text-[#111827]" />}
            <div className="text-left">
              <div className="text-xs font-semibold text-[#111827]">CSV</div>
              <div className="text-[10px] text-gray-400">Spreadsheet</div>
            </div>
          </button>
        </div>
      </div>

      {/* Developer API */}
      <div className="bg-white border border-black/[0.04] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="w-5 h-5 text-[#4CAF50]" />
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">Fuel API (V3 Beta)</h3>
            <p className="text-xs text-gray-400">Connect MindFuel to external apps and trackers</p>
          </div>
        </div>

        <div className="bg-[#F5F7F6] border border-black/[0.06] rounded-2xl p-4 relative group overflow-hidden">
          <div className="absolute inset-0 bg-[#4CAF50]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <Key className="w-4 h-4 text-gray-400" />
            <div className="text-xs font-bold text-[#4B5563] uppercase tracking-widest">Your Private Key</div>
          </div>
          
          <div className="flex items-center justify-between gap-4 bg-white rounded-xl p-3 border border-black/[0.04] relative z-10">
            <code className="text-sm font-mono text-[#4CAF50]/80 tracking-wider truncate">
              mf_live_xxxxxxxxxxxxxxxxxxxxxxxx
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText('mf_live_demo_key_123')
                setCopiedKey(true)
                setTimeout(() => setCopiedKey(false), 2000)
              }}
              className="shrink-0 w-8 h-8 rounded-lg bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.06] flex items-center justify-center transition-colors"
            >
              {copiedKey ? <Check className="w-4 h-4 text-[#4CAF50]" /> : <Copy className="w-4 h-4 text-[#4B5563] hover:text-[#111827]" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 relative z-10">Keep this key secret. You can use it to POST events to <code className="text-[#4B5563] bg-gray-100 px-1 py-0.5 rounded">/api/fuel/ingest</code>.</p>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-black/[0.04] rounded-2xl p-6 space-y-1 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-[#111827]" />
          <h3 className="text-sm font-semibold text-[#111827]">Security</h3>
        </div>

        <Link href="/forgot-password" className="flex items-center justify-between p-4 rounded-2xl bg-[#F5F7F6] border border-black/[0.04] hover:border-black/[0.08] hover:bg-gray-100 transition-all group">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-[#4B5563]" />
            <div>
              <div className="text-sm font-bold text-[#111827]">Change Password</div>
              <div className="text-xs text-gray-400">Send a secure reset link to your email</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#4B5563] transition-colors" />
        </Link>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F5F7F6] border border-black/[0.04] mt-1">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#111827]" />
            <div>
              <div className="text-sm font-bold text-[#111827]">Data Encryption</div>
              <div className="text-xs text-gray-400">All data encrypted at rest via Supabase</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-[#4CAF50] bg-green-50 border border-green-200 px-2 py-1 rounded-full">ACTIVE</span>
        </div>

        <div className="mt-1">
          <PushNotificationManager />
        </div>
      </div>

      {/* Upgrade CTA for free users */}
      {!isPremium && (
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F5F7F6] to-[#FAF8F4]" />
          <div className="relative p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#111827] uppercase tracking-widest mb-1">Unlock Premium</p>
              <p className="text-sm font-bold text-[#4B5563]">Unlimited logs, 500 coach messages/hr, priority AI</p>
            </div>
            <Link href="/subscription">
              <Button size="sm" className="shrink-0 bg-[#111827] hover:bg-[#1f2937] text-white shadow-sm">
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Sign Out & Danger Zone */}
      <div className="space-y-3 pt-6 border-t border-black/[0.04]">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#F5F7F6] border border-black/[0.04] text-[#4B5563] hover:bg-[#111827] hover:text-white transition-all font-semibold text-sm cursor-pointer disabled:opacity-50"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>

        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {deleting ? 'Deleting account...' : 'Permanently Delete Account'}
        </button>
      </div>

    </div>
  )
}
