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
  PenLine,
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Minus
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from '@/components/dashboard/ScoreRing'
import { NutritionBreakdown } from '@/components/dashboard/NutritionBreakdown'
import { CoachBanner } from '@/components/dashboard/CoachBanner'
import { QuickLogFAB } from '@/components/dashboard/QuickLogFAB'
import { DailyCheckIn } from '@/components/dashboard/DailyCheckIn'
import { PWAInstallPrompt } from '@/components/dashboard/PWAInstallPrompt'
import { ShareButton } from '@/components/share/ShareButton'

import { OnboardingFlow } from '@/components/dashboard/OnboardingFlow'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, getCategoryEmoji, getScoreColor, getScoreContext } from '@/lib/utils'
import { format } from 'date-fns'
import { trackEvent } from '@/lib/mixpanel'

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
}

interface NeuroData {
  neuroState: {
    dopamine: { level: string; percentage: number; trend: string; driver: string }
    cortisol: { level: string; percentage: number; trend: string; driver: string }
    serotonin: { level: string; percentage: number; trend: string; driver: string }
    focus_capacity: { level: string; percentage: number; trend: string; driver: string }
    overall_state: string
    summary: string
  }
  prophecy: {
    predicted_score: number
    trajectory: string
    prophecy: string
    risk_window: string
    pivot_action: string
  }
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
        .select('subscription_tier, onboarding_completed, content_love, content_regret, full_name')
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

    // Proactively generate daily coach insight if we didn't fetch one
    if (!insight) {
      fetch('/api/coach/generate-daily', { method: 'POST' })
        .then(res => res.json())
        .then(resData => {
          if (resData.insight) {
             setData(prev => prev ? { ...prev, coachInsight: { body: resData.insight.body, action_items: resData.insight.action_items } } : prev)
          }
        })
        .catch(err => console.error('Failed to gen coach insight', err))
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
        <div className="h-12 w-64 bg-[#F5F7F6] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-[#F5F7F6] rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const scoreContext = data ? getScoreContext(data.todayScore) : null

  return (
    <div className="relative min-h-[85vh] flex flex-col pb-24 max-w-4xl mx-auto stagger-children animate-fade-in-up">
      {/* Subtle Warm Ambient Background */}
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-1000 ease-in-out -z-10"
        style={{
          background: `radial-gradient(circle at 50% -20%, var(--accent-green-soft, rgba(76,175,80,0.06)) 0%, transparent 60%)`
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


      {/* Welcome Back Banner */}
      {showWelcomeBack && (
        <div className="bg-white border border-black/[0.04] rounded-2xl p-6 relative shadow-sm mb-12">
          <button 
            onClick={() => {
              if (userId) localStorage.setItem(`welcome_dismissed_${userId}`, 'true');
              setShowWelcomeBack(false);
            }} 
            className="absolute top-4 right-4 text-gray-400 hover:text-[#111827] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-12 h-12 bg-[#F5F7F6] rounded-2xl flex items-center justify-center shrink-0 border border-black/[0.04]">
              <Heart className="w-6 h-6 text-[#E57373]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-semibold text-[#111827]">Welcome back.</h3>
              <p className="text-[#4B5563] mt-1 mb-4">No streak to worry about. No guilt. Ready when you are.</p>
              <button 
                onClick={() => router.push('/log')}
                className="px-6 py-2 bg-[#111827] text-white font-bold rounded-xl hover:bg-[#1f2937] transition-colors cursor-pointer"
              >
                Reflect on your day
              </button>
            </div>
          </div>
        </div>
      )}

      {data && data.totalLogs === 0 && data.recentLogs.length === 0 && data.focusSessions === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-24 relative px-4 z-10 animate-fade-in-up">
          <div className="w-24 h-24 bg-[#F5F7F6] rounded-full flex items-center justify-center mb-8 border border-black/[0.04]">
            <Brain className="w-10 h-10 text-gray-300" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-[var(--font-serif)] text-[#111827] tracking-tight text-center mb-4">
            What have you been scrolling today?
          </h1>
          <p className="text-[#4B5563] text-center max-w-md mb-12 leading-relaxed">
            Log your first piece of content and we'll show you how it affects your mood. Takes 10 seconds.
          </p>
          
          <div className="space-y-4 w-full max-w-lg">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider text-center">Quick log</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'instagram', label: 'Instagram', emoji: '📸' },
                { id: 'youtube', label: 'YouTube', emoji: '▶️' },
                { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
                { id: 'twitter', label: 'Twitter/X', emoji: '💬' },
                { id: 'reddit', label: 'Reddit', emoji: '🔗' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/log?preset=${p.id}`)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-black/[0.04] hover:border-black/[0.1] hover:shadow-sm transition-all group cursor-pointer"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{p.emoji}</span>
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-[#111827] transition-colors">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Greeting + Date */}
          <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-8 relative">
            <div className="text-center mb-10 z-10 animate-fade-in-up">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
                {format(new Date(), 'EEEE, MMMM do')}
              </p>
              <h1 className="text-3xl sm:text-4xl font-[var(--font-serif)] text-[#111827] tracking-tight">
                {new Date().getHours() < 12 ? 'Good morning.' : new Date().getHours() < 18 ? 'Good afternoon.' : 'Good evening.'}
              </h1>
            </div>

            {/* Score Ring */}
            <div className="w-full max-w-xs mx-auto mb-6 flex flex-col items-center">
              {data && scoreContext ? (
                <>
                  <div id="dashboard-score-card" className="flex flex-col items-center bg-[#FAF8F4] p-6 rounded-3xl pb-8">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-4">Today's Score</div>
                    <ScoreRing score={data.todayScore} size={200} strokeWidth={16} />
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xl">{scoreContext.emoji}</span>
                      <span 
                        className="text-lg font-semibold"
                        style={{ color: scoreContext.color }}
                      >
                        {data.todayScore} · {scoreContext.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4" data-html2canvas-ignore>
                    <ShareButton 
                      targetId="dashboard-score-card"
                      title="My MindFuel Score"
                      text={`My digital wellness score today is ${data.todayScore} (${scoreContext.label}). Check out MindFuel to track your screen time impact!`}
                    />
                  </div>
                </>
              ) : (
               <div className="w-48 h-48 mx-auto rounded-full bg-[#F5F7F6] animate-pulse" />
              )}
            </div>
          </div>

        {/* AI Insight (The Narrative) */}
        {data?.coachInsight && (
          <div className="mb-10 max-w-xl mx-auto text-center px-4">
            <p className="text-lg sm:text-xl text-[#4B5563] font-[var(--font-serif)] leading-relaxed italic">
              "{data.coachInsight.body}"
            </p>
            <button 
              onClick={() => router.push('/coach')}
              className="mt-6 mx-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F5F7F6] border border-black/[0.04] rounded-full text-xs font-bold text-[#4B5563] hover:bg-[#111827] hover:text-white transition-all cursor-pointer"
            >
              <Brain className="w-4 h-4" /> Go deeper
            </button>
          </div>
        )}

        {/* Quick Log */}
        <div className="space-y-4 mb-10 px-4">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Quick log</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { id: 'instagram', label: 'Instagram', emoji: '📸' },
              { id: 'youtube', label: 'YouTube', emoji: '▶️' },
              { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
              { id: 'twitter', label: 'Twitter/X', emoji: '💬' },
              { id: 'reddit', label: 'Reddit', emoji: '🔗' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => router.push(`/log?preset=${p.id}`)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-black/[0.04] hover:border-black/[0.1] hover:shadow-sm transition-all group cursor-pointer"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{p.emoji}</span>
                <span className="text-[10px] font-medium text-gray-400 group-hover:text-[#111827] transition-colors">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activation Progress Bar ("3 logs -> first insight") */}
        {data && data.totalLogs < 5 && (
          <div className="bg-white border border-black/[0.04] rounded-2xl p-5 shadow-sm mb-10 mx-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#111827]">Unlock your content pattern</p>
              <span className="text-xs font-medium text-gray-400">{data.totalLogs}/5 logs</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#4CAF50] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (data.totalLogs / 5) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {data.totalLogs < 3 
                ? `${3 - data.totalLogs} more log${3 - data.totalLogs === 1 ? '' : 's'} to see your first insight`
                : data.totalLogs < 5 
                ? `${5 - data.totalLogs} more to unlock your weekly report`
                : ''}
            </p>
          </div>
        )}

        {/* PWA Install Prompt */}
        {data && data.totalLogs > 0 && (
          <div className="mb-10 mx-4 max-w-lg">
            <PWAInstallPrompt />
          </div>
        )}

        {/* Behavioral Insight Preview */}
        {data?.behavioralInsight && (
          <div 
            onClick={() => router.push('/insights')}
            className="mb-10 max-w-md w-full mx-auto bg-white border border-black/[0.04] rounded-2xl p-5 text-left cursor-pointer hover:shadow-md transition-all group shadow-sm flex gap-4 items-center"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#F5F7F6] flex items-center justify-center shrink-0 border border-black/[0.04] group-hover:scale-110 transition-transform">
               <Sparkles className="w-5 h-5 text-[#4CAF50]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-[#F5F7F6] px-2 py-0.5 rounded-full border border-black/[0.04]">{data.behavioralInsight.pattern}</span>
              </div>
              <p className="text-sm font-[var(--font-serif)] text-[#111827] leading-snug line-clamp-2">{data.behavioralInsight.headline}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#111827] transition-colors" />
          </div>
        )}

      {/* Spatial Recent Entries */}
      {data && data.recentLogs.length > 0 && (
        <div className="mt-4 max-w-3xl mx-auto w-full space-y-4 px-4">
          <div className="flex items-center justify-between px-2 mb-2">
             <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Recent Clarities</h3>
             <button onClick={() => router.push('/insights')} className="text-xs font-medium text-gray-400 hover:text-[#111827] transition-colors uppercase tracking-wider">See all</button>
          </div>
          <div className="space-y-3">
            {data.recentLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="group p-5 rounded-2xl bg-white border border-black/[0.04] hover:shadow-sm transition-all flex items-start gap-5 cursor-pointer" onClick={() => router.push('/insights')}>
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: getScoreColor(log.mental_score) }} />
                <div className="flex-1">
                  <p className="text-base font-[var(--font-serif)] text-[#4B5563] leading-relaxed group-hover:text-[#111827] transition-colors line-clamp-2">{log.content}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> {formatRelativeTime(log.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Evening Check-In */}
      <div className="mt-12 max-w-3xl mx-auto w-full">
        <DailyCheckIn onComplete={() => loadDashboard()} />
      </div>

      <QuickLogFAB onLogSaved={() => loadDashboard()} />
    </div>
  )
}
