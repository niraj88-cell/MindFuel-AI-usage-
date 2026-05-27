// app/(app)/insights/page.tsx — Ultra-Premium Insights Page
'use client'

import React, { useEffect, useState } from 'react'
import { 
  BarChart3, 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  AlertTriangle, 
  Sparkles,
  ArrowUpRight,
  Activity,
  Calendar,
  Lock
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendChart } from '@/components/insights/TrendChart'
import { MoodCorrelation } from '@/components/insights/MoodCorrelation'
import { Loader2 } from 'lucide-react'
import { trackEvent } from '@/lib/mixpanel'

interface InsightsData {
  trendData: Array<{ date: string; score: number; mood?: number }>
  moodAnalysis: {
    overall_trend: string
    avg_mood: number
    anxiety_triggers: Array<{ trigger: string; severity: string; recommendation: string }>
    correlations: Array<{ pattern: string; confidence: 'low' | 'medium' | 'high'; data_points: number }>
    summary: string
    action_items: string[]
  } | null
  stats: { totalLogs: number; avgScore: number; moodEntries: number }
  subscriptionTier: 'free' | 'premium'
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trackEvent('Insights Viewed');

    async function load() {
      try {
        const res = await fetch('/api/insights')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          const errData = await res.json()
          setError(errData.error || 'Failed to retrieve intelligence data.')
        }
      } catch (err) {
        console.error('Failed to load insights:', err)
        setError('Connection interrupted. Please verify your neural link.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
        <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs">Gathering your reflections...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 bg-rose-500/10 rounded-[32px] flex items-center justify-center border border-rose-500/20">
           <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        <div className="text-center">
           <h2 className="text-xl font-black text-white mb-2 tracking-tight">Insights Unavailable</h2>
           <p className="text-zinc-500 text-sm max-w-xs">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 stagger-children">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-3">
             <BarChart3 className="w-8 h-8 text-white" />
             Your <span className="text-white">Insights</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-2 font-medium">See how your screen time affects your mood.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-white/10">
           <div className="px-4 py-2 bg-white text-black rounded-xl flex items-center gap-2 shadow-lg shadow-none">
              <Calendar className="w-4 h-4 text-black" />
              <span className="text-xs font-black text-black uppercase tracking-widest">Last 7 Days</span>
           </div>
           <div className="pr-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data Synced</span>
           </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightStatCard 
          label="Cumulative Logs" 
          value={data?.stats.totalLogs || 0} 
          icon={Activity} 
          color="text-white" 
          desc="Total items logged"
        />
        <InsightStatCard 
          label="Avg Wellness Score" 
          value={data?.stats.avgScore || 0} 
          icon={Zap} 
          color="text-white" 
          desc="Overall mental score"
        />
        <InsightStatCard 
          label="State Checks" 
          value={data?.stats.moodEntries || 0} 
          icon={Heart} 
          color="text-rose-400" 
          desc="Mood data points"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Trend Visualization */}
        <Card className="lg:col-span-8 bg-zinc-900/50 border-white/10 rounded-[20px] md:rounded-[40px] overflow-hidden shadow-2xl group">
          <CardHeader className="p-4 md:p-8 pb-0 md:pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-3">
                 <TrendingUp className="w-5 h-5 text-white" />
                 Score Velocity
              </CardTitle>
              <ArrowUpRight className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-8 pt-4">
            <TrendChart data={data?.trendData || []} />
          </CardContent>
        </Card>

        {/* Correlations Side-panel */}
        <Card className="lg:col-span-4 bg-zinc-900/50 border-white/10 rounded-[20px] md:rounded-[40px] shadow-2xl flex flex-col">
          <CardHeader className="p-4 md:p-8">
             <CardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-3">
                <Target className="w-5 h-5 text-white" />
                Detected Patterns
             </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8 pt-0 md:pt-0 flex-1 overflow-y-auto custom-scrollbar">
            <MoodCorrelation correlations={data?.moodAnalysis?.correlations || []} />
          </CardContent>
        </Card>
      </div>

      {/* AI Deep Analysis Section */}
      {data?.moodAnalysis && (
        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-[40px] blur opacity-50 group-hover:opacity-100 transition-opacity" />
           <Card className="relative bg-zinc-900 border-white/10 rounded-[24px] md:rounded-[40px] overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8">
                 <Sparkles className="w-12 h-12 text-white/20 animate-float" />
              </div>
              <CardHeader className="p-6 md:p-10 pb-4 md:pb-6 border-b border-white/10 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center shadow-lg shadow-none">
                     <Brain className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tight text-white">AI Wellness Report</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">{data.moodAnalysis.overall_trend} baseline</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-10 space-y-10">
                <p className="text-base md:text-lg text-zinc-300 leading-relaxed font-medium">
                  {data.moodAnalysis.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Triggers */}
                  {data.moodAnalysis.anxiety_triggers.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" /> Your Triggers
                      </h4>
                      <div className="space-y-4">
                        {data.moodAnalysis.anxiety_triggers.map((t, i) => (
                          <div key={i} className="p-6 rounded-[28px] bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors">
                            <p className="text-white font-black text-sm mb-2">{t.trigger}</p>
                            <p className="text-zinc-400 text-xs leading-relaxed">{t.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {data.moodAnalysis.action_items.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> AI Recommendations
                      </h4>
                      <div className="space-y-4">
                        {data.moodAnalysis.action_items.map((item, i) => (
                          <div key={i} className="flex items-start gap-4 p-5 rounded-[28px] bg-white/5 border border-emerald-500/10">
                             <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                             </div>
                             <p className="text-zinc-300 text-sm font-bold leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
           </Card>
        </div>
      )}

      {/* Soft Paywall for Deep Trends (Free Tier) */}
      {data?.subscriptionTier === 'free' && (
        <div className="relative mt-8">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex flex-col items-center justify-center pt-20">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md mb-4 border border-white/20 shadow-2xl shadow-black/50">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Discover the full picture</h3>
            <p className="text-zinc-400 text-sm max-w-md text-center mb-6">Notice a pattern? Plus gently connects the dots across your 30-day timeline to help you understand your habits on a deeper level.</p>
            <Link href="/subscription" className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors">
              See what your thoughts reveal
            </Link>
          </div>
          <Card className="bg-zinc-900 border-white/10 rounded-[40px] opacity-40 blur-md select-none pointer-events-none overflow-hidden h-[400px]">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black text-white">30-Day Subconscious Patterns</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 grid grid-cols-2 gap-6">
              <div className="h-48 bg-white/5 rounded-2xl border border-white/5"></div>
              <div className="h-48 bg-white/5 rounded-2xl border border-white/5"></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function InsightStatCard({ label, value, icon: Icon, color, desc }: { 
  label: string; 
  value: number | string; 
  icon: any; 
  color: string;
  desc: string;
}) {
  return (
    <Card className="bg-zinc-900/50 border-white/10 rounded-[32px] p-5 md:p-8 hover:bg-zinc-800/50 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
         <Icon size={80} />
      </div>
      <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter">{value}</div>
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</div>
      <p className="text-[10px] font-bold text-zinc-600 mt-1 italic">{desc}</p>
    </Card>
  )
}

function Heart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}
