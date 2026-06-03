// app/(app)/dashboard/page.tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  TrendingUp, 
  Flame, 
  Clock, 
  ArrowRight, 
  Zap, 
  Sparkles, 
  Brain,
  Trophy,
  ChevronRight,
  Timer,
  Heart,
  Lock,
  X,
  PenLine
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from '@/components/dashboard/ScoreRing'
import { NutritionBreakdown } from '@/components/dashboard/NutritionBreakdown'
import { CoachBanner } from '@/components/dashboard/CoachBanner'
import { QuickLogFAB } from '@/components/dashboard/QuickLogFAB'
import { DailyCheckIn } from '@/components/dashboard/DailyCheckIn'
import { MindCore } from '@/components/dashboard/MindCore'
import { OnboardingDemo } from '@/components/dashboard/OnboardingDemo'
import { OnboardingFlow } from '@/components/dashboard/OnboardingFlow'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, getCategoryEmoji, getScoreColor } from '@/lib/utils'
import { format } from 'date-fns'
import { trackEvent } from '@/lib/mixpanel'
import { calculatePredictiveHealth, PredictiveHealthMetrics } from '@/lib/agents/tools/predictiveHealth'

interface DashboardData {
  todayScore: number
  totalLogs: number
  streak: number
  subscriptionTier: 'free' | 'premium'
  categoryBreakdown: Array<{ category: string; count: number; percentage: number; avgScore: number }>
  recentLogs: Array<{ id: string; content: string; category: string; mental_score: number; created_at: string }>
  coachInsight: { body: string; action_items: any } | null
  behavioralInsight: { headline: string; pattern: string; pattern_category: string } | null
  focusHours: number
  focusSessions: number
  todayPulse: number | null
  onboardingCompleted: boolean
  contentLove: string | null
  contentRegret: string | null
  predictiveHealth: PredictiveHealthMetrics | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showWelcomeBack, setShowWelcomeBack] = useState(false)
  const [daysSinceLastLog, setDaysSinceLastLog] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = format(new Date(), 'yyyy-MM-dd')

    try {
      // Run ALL independent queries in parallel instead of sequentially
      const [
        { data: profile },
        { data: summary },
        { data: logs },
        { data: insight },
        behavioralResult,
        { data: todayLogs },
        focusResult,
        pulseResult,
        { data: lastLog },
        { data: sevenDayLogs },
      ] = await Promise.all([
      // 1. Profile
      supabase
        .from('profiles')
        .select('subscription_tier, onboarding_completed, content_love, content_regret')
        .eq('id', user.id)
        .maybeSingle(),
      // 2. Daily summary
      supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      // 3. Recent logs
      supabase
        .from('mental_logs')
        .select('id, content, category, mental_score, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      // 4. Coach insight
      supabase
        .from('ai_insights')
        .select('body, action_items')
        .eq('user_id', user.id)
        .eq('type', 'daily_coach')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // 4b. Behavioral insight
      supabase
        .from('ai_insights')
        .select('body')
        .eq('user_id', user.id)
        .eq('type', 'behavioral_insight')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // 5. Today's logs for category breakdown
      supabase
        .from('mental_logs')
        .select('category, mental_score')
        .eq('user_id', user.id)
        .gte('created_at', today),
      // 6. Focus sessions
      supabase
        .from('focus_sessions')
        .select('duration_minutes, completed')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('created_at', format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')),
      // 7. Today's pulse
      supabase
        .from('daily_pulses')
        .select('rating')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      // 8. Last log for welcome back check
      supabase
        .from('mental_logs')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // 9. 7-day logs for predictive health
      supabase
        .from('mental_logs')
        .select('category, mental_score, created_at')
        .eq('user_id', user.id)
        .gte('created_at', format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
    ])

    // Check onboarding status
    const localCompleted = localStorage.getItem(`onboarding_done_${user.id}`)
    if (localCompleted !== 'true' && profile && profile.onboarding_completed === false) {
      setShowOnboarding(true)
      setUserId(user.id)
    } else {
      setUserId(user.id) // Ensure userId is set for welcome banner dismissal
    }

    if (lastLog) {
      const lastDate = new Date(lastLog.created_at)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - lastDate.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays >= 3) {
        const dismissed = localStorage.getItem(`welcome_dismissed_${user.id}`)
        if (dismissed !== 'true') {
          setDaysSinceLastLog(diffDays)
          setShowWelcomeBack(true)
        }
      }
    }

    // Build category breakdown
    const catMap = new Map<string, { count: number; totalScore: number }>()
    const allLogs = (todayLogs || []) as Array<{ category: string; mental_score: number }>
    allLogs.forEach((log) => {
      const existing = catMap.get(log.category) || { count: 0, totalScore: 0 }
      catMap.set(log.category, { count: existing.count + 1, totalScore: existing.totalScore + log.mental_score })
    })

    const totalCount = allLogs.length || 1
    const categoryBreakdown = Array.from(catMap.entries()).map(([category, d]) => ({
      category,
      count: d.count,
      percentage: Math.round((d.count / totalCount) * 100),
      avgScore: Math.round(d.totalScore / d.count),
    }))

    // Process focus stats
    const focusData = focusResult?.data
    let focusHours = 0
    let focusSessions = 0
    if (focusData) {
      focusSessions = focusData.length
      focusHours = Math.round(focusData.reduce((acc: number, s: any) => acc + s.duration_minutes, 0) / 60 * 10) / 10
    }

    const todayPulse = pulseResult?.data?.rating || null

    let behavioralInsight = null
    if (behavioralResult?.data?.body) {
      try {
        behavioralInsight = JSON.parse(behavioralResult.data.body)
      } catch {}
    }

    setData({
      todayScore: summary?.average_score || 0,
      totalLogs: summary?.total_logs || 0,
      streak: summary?.streak_days || 0,
      subscriptionTier: profile?.subscription_tier || 'free',
      categoryBreakdown,
      recentLogs: logs || [],
      coachInsight: insight || null,
      behavioralInsight,
      focusHours,
      focusSessions,
      todayPulse,
      onboardingCompleted: profile?.onboarding_completed || false,
      contentLove: profile?.content_love || null,
      contentRegret: profile?.content_regret || null,
      predictiveHealth: calculatePredictiveHealth(sevenDayLogs || [])
    })
    setLoading(false)
    } catch (err) {
      console.error('[Dashboard Error]', err)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    trackEvent('Dashboard Viewed');
    loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 w-64 bg-zinc-900 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-zinc-900 rounded-[32px]" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[85vh] flex flex-col pb-24 max-w-4xl mx-auto stagger-children animate-fade-in-up">
      {/* Dynamic Ambient Background Glow */}
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 ease-in-out -z-10"
        style={{
          background: `radial-gradient(circle at 50% -20%, ${getScoreColor(data?.todayScore || 50)}15 0%, transparent 60%)`
        }}
      />

      {/* First-time onboarding */}
      {showOnboarding && userId && (
        <OnboardingFlow 
          userId={userId} 
          onComplete={(love, regret) => {
            setShowOnboarding(false)
            if (data) {
              setData({
                ...data,
                onboardingCompleted: true,
                contentLove: love,
                contentRegret: regret,
              })
            }
          }} 
        />
      )}
      <OnboardingDemo />

      {/* Welcome Back Banner */}
      {showWelcomeBack && (
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative shadow-2xl mb-12">
          <button 
            onClick={() => {
              if (userId) localStorage.setItem(`welcome_dismissed_${userId}`, 'true');
              setShowWelcomeBack(false);
            }} 
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-white">Welcome back.</h3>
              <p className="text-zinc-400 mt-1 mb-4">No streak to worry about. No guilt. Ready when you are.</p>
              <button 
                onClick={() => router.push('/log')}
                className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Reflect on your day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section: The Ambient Mirror */}
      <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-16 relative">
        <div className="text-center mb-10 z-10">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif text-white opacity-90 tracking-tight">
            {data?.todayScore ? 'Your mind is active.' : 'A quiet start to the day.'}
          </h1>
        </div>

        {/* The Mind Core (Spatial UI visualization of score) */}
        <div className="w-full max-w-md mx-auto">
          {data ? (
            <MindCore score={data.todayScore} />
          ) : (
             <div className="w-48 h-48 mx-auto rounded-full bg-white/5 animate-pulse" />
          )}
        </div>

        {/* AI Insight (The Narrative) */}
        {data?.coachInsight && (
          <div className="mt-8 max-w-xl mx-auto text-center px-4">
            <p className="text-lg sm:text-xl text-zinc-300 font-serif leading-relaxed italic opacity-80">
              "{data.coachInsight.body}"
            </p>
            <button 
              onClick={() => router.push('/coach')}
              className="mt-6 mx-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <Brain className="w-4 h-4" /> Go deeper
            </button>
          </div>
        )}

        {/* Behavioral Insight Preview */}
        {data?.behavioralInsight && (
          <div 
            onClick={() => router.push('/insights')}
            className="mt-6 max-w-md w-full mx-auto bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-left cursor-pointer hover:bg-zinc-800/60 hover:border-white/20 transition-all group shadow-xl flex gap-4 items-center"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform">
               <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{data.behavioralInsight.pattern}</span>
              </div>
              <p className="text-sm font-serif text-white opacity-90 leading-snug line-clamp-2">{data.behavioralInsight.headline}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
          </div>
        )}
      </div>

      {/* Floating Action Bar (Quick Stats) */}
      <div className="w-full max-w-3xl mx-auto mt-auto grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        <button onClick={() => router.push('/log')} className="group flex flex-col items-center justify-center p-4 rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:bg-zinc-800/60 hover:border-white/10 transition-all cursor-pointer h-28 hover-lift">
          <PenLine className="w-6 h-6 text-zinc-400 group-hover:text-white mb-3 transition-colors" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Reflect</span>
        </button>
        <button onClick={() => router.push('/focus')} className="group flex flex-col items-center justify-center p-4 rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:bg-zinc-800/60 hover:border-white/10 transition-all cursor-pointer h-28 hover-lift">
          <Timer className="w-6 h-6 text-zinc-400 group-hover:text-white mb-3 transition-colors" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{data?.focusHours || 0}h Focus</span>
        </button>
        <button onClick={() => router.push('/pulse')} className="group flex flex-col items-center justify-center p-4 rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:bg-zinc-800/60 hover:border-white/10 transition-all cursor-pointer h-28 hover-lift">
          <Heart className="w-6 h-6 text-zinc-400 group-hover:text-white mb-3 transition-colors" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Pulse</span>
        </button>
        <button onClick={() => router.push('/insights')} className="group flex flex-col items-center justify-center p-4 rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:bg-zinc-800/60 hover:border-white/10 transition-all cursor-pointer h-28 hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent opacity-30" />
          <Flame className="w-6 h-6 text-orange-400 mb-3 relative z-10" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest relative z-10">{data?.streak || 0}d Streak</span>
        </button>
      </div>

      {/* Spatial Recent Entries */}
      {data && data.recentLogs.length > 0 && (
        <div className="mt-12 max-w-3xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
             <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Recent Clarities</h3>
             <button onClick={() => router.push('/insights')} className="text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest">See all</button>
          </div>
          <div className="space-y-3">
            {data.recentLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="group p-6 rounded-3xl bg-zinc-900/20 backdrop-blur-md border border-white/5 hover:bg-zinc-800/40 hover:border-white/10 transition-all flex items-start gap-5 cursor-pointer" onClick={() => router.push('/insights')}>
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: getScoreColor(log.mental_score) }} />
                <div className="flex-1">
                  <p className="text-base font-serif text-zinc-300 leading-relaxed group-hover:text-white transition-colors line-clamp-2">{log.content}</p>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-3 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> {formatRelativeTime(log.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evening Check-In */}
      <div className="mt-12 max-w-3xl mx-auto w-full">
        <DailyCheckIn onComplete={() => loadDashboard()} />
      </div>

      <QuickLogFAB onLogSaved={() => loadDashboard()} />
    </div>
  )
}
