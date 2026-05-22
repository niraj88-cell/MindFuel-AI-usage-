// app/(app)/dashboard/page.tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Heart
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from '@/components/dashboard/ScoreRing'
import { NutritionBreakdown } from '@/components/dashboard/NutritionBreakdown'
import { CoachBanner } from '@/components/dashboard/CoachBanner'
import { QuickLogFAB } from '@/components/dashboard/QuickLogFAB'
import { DailyCheckIn } from '@/components/dashboard/DailyCheckIn'
import { OnboardingDemo } from '@/components/dashboard/OnboardingDemo'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, getCategoryEmoji, getScoreColor } from '@/lib/utils'
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
  focusHours: number
  focusSessions: number
  todayPulse: number | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = format(new Date(), 'yyyy-MM-dd')

    // Fetch profile for subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    // Fetch today's summary
    const { data: summary } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    // Fetch recent logs
    const { data: logs } = await supabase
      .from('mental_logs')
      .select('id, content, category, mental_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch latest coach insight
    const { data: insight } = await supabase
      .from('ai_insights')
      .select('body, action_items')
      .eq('user_id', user.id)
      .eq('type', 'daily_coach')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Build category breakdown from today's logs
    const { data: todayLogs } = await supabase
      .from('mental_logs')
      .select('category, mental_score')
      .eq('user_id', user.id)
      .gte('created_at', today)

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

    // Fetch focus stats
    let focusHours = 0
    let focusSessions = 0
    try {
      const { data: focusData } = await supabase
        .from('focus_sessions')
        .select('duration_minutes, completed')
        .eq('user_id', user.id)
        .eq('completed', true)
      if (focusData) {
        focusSessions = focusData.length
        focusHours = Math.round(focusData.reduce((acc, s) => acc + s.duration_minutes, 0) / 60 * 10) / 10
      }
    } catch {}

    // Fetch today's pulse
    let todayPulse: number | null = null
    try {
      const { data: pulseData } = await supabase
        .from('daily_pulses')
        .select('rating')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()
      todayPulse = pulseData?.rating || null
    } catch {}

    setData({
      todayScore: summary?.average_score || 0,
      totalLogs: summary?.total_logs || 0,
      streak: summary?.streak_days || 0,
      subscriptionTier: profile?.subscription_tier || 'free',
      categoryBreakdown,
      recentLogs: logs || [],
      coachInsight: insight || null,
      focusHours,
      focusSessions,
      todayPulse,
    })
    setLoading(false)
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
    <div className="space-y-10 pb-20 stagger-children">
      {/* First-time onboarding */}
      <OnboardingDemo />
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2">
            <Zap className="w-3 h-3" />
            System Status: Online
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3">
             <Flame className="w-5 h-5 text-white" />
             <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Streak</p>
                <p className="text-xl font-black">{data?.streak || 0}d</p>
             </div>
          </div>
          {data?.subscriptionTier === 'premium' && (
            <Badge className="bg-white/5 text-white border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Pro
            </Badge>
          )}
        </div>
      </div>

      {/* Focus + Pulse Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => router.push('/focus')} className="group bg-zinc-900 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:bg-zinc-800 transition-all cursor-pointer text-left">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <Timer className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Focus Time</p>
            <p className="text-2xl font-black text-white">{data?.focusHours || 0}h</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 ml-auto group-hover:text-zinc-400 transition-colors" />
        </button>

        <button onClick={() => router.push('/focus')} className="group bg-zinc-900 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:bg-zinc-800 transition-all cursor-pointer text-left">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sessions</p>
            <p className="text-2xl font-black text-white">{data?.focusSessions || 0}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 ml-auto group-hover:text-zinc-400 transition-colors" />
        </button>

        <button onClick={() => router.push('/pulse')} className="group bg-zinc-900 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:bg-zinc-800 transition-all cursor-pointer text-left">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Today's Pulse</p>
            <p className="text-2xl font-black text-white">{data?.todayPulse ? ['😫','😔','😐','🙂','✨'][data.todayPulse - 1] : '—'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 ml-auto group-hover:text-zinc-400 transition-colors" />
        </button>
      </div>

      {/* Coach Alert (Premium Style) */}
      {data?.coachInsight && (
        <Card className="bg-zinc-900 border-white/10 rounded-2xl overflow-hidden p-8">
          <div className="flex gap-6 items-start">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Coach Message</h3>
              <p className="text-zinc-300 leading-relaxed max-w-3xl">{data.coachInsight.body}</p>
              <div className="flex flex-wrap gap-3">
                {(Array.isArray(data.coachInsight.action_items) ? data.coachInsight.action_items as string[] : []).map((item, i) => (
                  <div key={i} className="bg-zinc-800 px-4 py-2 rounded-full text-xs font-medium border border-white/10">
                    {item}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => router.push('/coach')}
                className="text-white text-sm font-bold flex items-center gap-2 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Open Chat <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Daily Check-In (evening hours) */}
      <DailyCheckIn onComplete={() => loadDashboard()} />

      {/* Web Simulation of App Intercept */}
      <Card className="bg-zinc-900 border-white/10 rounded-2xl overflow-hidden p-6 border-dashed">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h3 className="font-bold text-white mb-1">Simulate Mindful Intercept</h3>
            <p className="text-sm text-zinc-400">Experience the breathing exercise that triggers when you open a distracting app.</p>
          </div>
          <button 
            onClick={() => {
              alert("Wait 3 seconds! Simulating you opening Instagram...");
              setTimeout(() => {
                router.push('/intercept?appName=Instagram');
              }, 3000);
            }}
            className="whitespace-nowrap px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Simulate Now
          </button>
        </div>
      </Card>

      {/* Score + Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Score Card */}
        <Card className="lg:col-span-4 glass-card border-none bg-zinc-900/50 p-10 flex flex-col items-center justify-center text-center">
           <div className="relative mb-8">
              <ScoreRing score={data?.todayScore || 0} subtitle="System Score" />
           </div>
           
           <div className="w-full grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white/5 rounded-3xl p-6">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Entries</p>
                 <p className="text-2xl font-black">{data?.totalLogs || 0}</p>
              </div>
              <div className="bg-white/5 rounded-3xl p-6">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Trend</p>
                 <TrendingUp className="w-6 h-6 text-white mx-auto" />
              </div>
           </div>
           
           <button 
            onClick={() => router.push('/insights')}
            className="w-full mt-8 py-4 bg-white hover:bg-zinc-200 text-black rounded-3xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
           >
             Detailed Analysis <ChevronRight className="w-4 h-4" />
           </button>
        </Card>

        {/* Nutrition Breakdown */}
        <Card className="lg:col-span-8 glass-card border-none bg-zinc-900/50 p-10">
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                 <Trophy className="w-6 h-6 text-white" />
                 Category Breakdown
              </h2>
              <div className="text-xs font-bold text-zinc-500 uppercase">Today's metrics</div>
           </div>
           
           {data && data.categoryBreakdown.length > 0 ? (
              <NutritionBreakdown data={data.categoryBreakdown} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl">
                <p className="text-zinc-500 font-medium text-lg">No logs yet today</p>
                <p className="text-zinc-600 text-sm mt-1">Use the Quick Log button below to get started</p>
                <button
                  onClick={() => router.push('/log')}
                  className="mt-4 bg-white/5 text-white px-6 py-2 rounded-full font-bold hover:bg-white/10 cursor-pointer"
                >
                  Log First Item
                </button>
              </div>
            )}
        </Card>
      </div>

      {/* Recent Feed */}
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Activity Feed</h2>
            <button className="text-zinc-500 font-bold text-sm hover:text-white transition-colors">View Timeline</button>
         </div>
         
         <div className="grid gap-4">
            {data?.recentLogs.map((log) => (
              <div key={log.id} className="group bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/10 p-6 rounded-2xl flex items-center gap-6 transition-all">
                 <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black bg-white/5 text-white"
                 >
                    {log.mental_score}
                 </div>
                 
                 <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                       <span className={`category-pill category-${log.category}`}>
                          {getCategoryEmoji(log.category)} {log.category}
                       </span>
                       <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(log.created_at)}
                       </span>
                    </div>
                    <p className="text-zinc-300 font-medium text-lg group-hover:text-white transition-colors truncate">{log.content}</p>
                 </div>
                 
                 <button className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                 </button>
              </div>
            ))}
         </div>
      </div>

      {/* Quick Log FAB — floating bottom-right */}
      <QuickLogFAB onLogSaved={() => loadDashboard()} />
    </div>
  )
}
