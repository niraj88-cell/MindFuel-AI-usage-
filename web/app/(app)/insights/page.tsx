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
    <div className="max-w-6xl mx-auto space-y-10 pb-24 stagger-children relative min-h-[85vh]">
      {/* Subtle Spatial Background */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/[0.03] via-black to-black" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="text-center md:text-left">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
            Fluid Data
          </p>
          <h1 className="text-4xl md:text-5xl font-serif text-white opacity-90 tracking-tight">
             Clarity over time.
          </h1>
          <p className="text-zinc-500 text-sm mt-4 font-medium">Observe how your interactions shape your state.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-zinc-950/40 backdrop-blur-xl p-2 rounded-full border border-white/5 shadow-2xl">
           <Link href="/weekly-report" className="px-5 py-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-full flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-colors">
              <Zap className="w-4 h-4" /> Weekly Report
           </Link>
           <div className="px-5 py-2.5 bg-white text-black rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Calendar className="w-4 h-4 text-black" />
              <span className="text-[10px] font-black text-black uppercase tracking-widest">Last 7 Days</span>
           </div>
           <div className="px-5 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Live Sync</span>
           </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <InsightStatCard 
          label="Interactions" 
          value={data?.stats.totalLogs || 0} 
          icon={Activity} 
          color="text-white" 
          desc="Total items logged"
        />
        <InsightStatCard 
          label="Vitality Average" 
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
        {/* Trend Visualization */}
        <div className="lg:col-span-8 bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[40px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative group">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif text-white opacity-90 flex items-center gap-3">
                 Score Velocity
              </h2>
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                 <TrendingUp className="w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          <div className="p-8 pt-4">
            <TrendChart data={data?.trendData || []} />
          </div>
        </div>

        {/* Correlations Side-panel */}
        <div className="lg:col-span-4 bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col relative group">
          <div className="p-8 pb-4">
             <h2 className="text-xl font-serif text-white opacity-90 flex items-center gap-3">
                Detected Patterns
             </h2>
          </div>
          <div className="p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar">
            <MoodCorrelation correlations={data?.moodAnalysis?.correlations || []} />
          </div>
        </div>
      </div>

      {/* AI Deep Analysis Section */}
      {data?.moodAnalysis && (
        <div className="relative group mt-12">
           <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-600/10 to-transparent rounded-[50px] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
           <div className="relative bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[40px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
              <div className="absolute top-0 right-0 p-10">
                 <Sparkles className="w-16 h-16 text-white/5 animate-breathe" />
              </div>
              <div className="p-8 md:p-12 pb-6 md:pb-8 border-b border-white/5">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white text-black rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                     <Brain className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-serif text-white opacity-90 tracking-tight">AI Wellness Synthesis</h2>
                    <div className="flex items-center gap-3 mt-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{data.moodAnalysis.overall_trend} baseline</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 md:p-12 space-y-12">
                <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed font-serif font-light max-w-4xl">
                  "{data.moodAnalysis.summary}"
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                  {/* Triggers */}
                  {data.moodAnalysis.anxiety_triggers.length > 0 && (
                    <div className="space-y-8">
                      <h4 className="text-[10px] font-black text-rose-500/80 uppercase tracking-[0.3em] flex items-center gap-3">
                        <AlertTriangle className="w-3 h-3" /> Cognitive Friction
                      </h4>
                      <div className="space-y-4">
                        {data.moodAnalysis.anxiety_triggers.map((t, i) => (
                          <div key={i} className="p-6 rounded-[32px] bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/20 transition-colors">
                            <p className="text-white font-bold text-lg mb-2 font-serif">{t.trigger}</p>
                            <p className="text-zinc-500 text-sm leading-relaxed">{t.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {data.moodAnalysis.action_items.length > 0 && (
                    <div className="space-y-8">
                      <h4 className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Sparkles className="w-3 h-3" /> Suggested Shifts
                      </h4>
                      <div className="space-y-4">
                        {data.moodAnalysis.action_items.map((item, i) => (
                          <div key={i} className="flex items-start gap-5 p-6 rounded-[32px] bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
                             <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                             </div>
                             <p className="text-zinc-300 text-base leading-relaxed font-medium">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Soft Paywall for Deep Trends (Free Tier) */}
      {data?.subscriptionTier === 'free' && (
        <div className="relative mt-16">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent z-20 flex flex-col items-center justify-center pt-20">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center backdrop-blur-2xl mb-6 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-3xl font-serif text-white opacity-90 mb-4">Discover the full picture</h3>
            <p className="text-zinc-500 text-base max-w-md text-center mb-8 font-medium">Notice a pattern? Plus gently connects the dots across your 30-day timeline to help you understand your habits on a deeper level.</p>
            <Link href="/subscription" className="px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              See what your thoughts reveal
            </Link>
          </div>
          <div className="bg-zinc-950/40 border border-white/5 rounded-[40px] opacity-40 blur-xl select-none pointer-events-none overflow-hidden h-[400px]">
            <div className="p-10 pb-4">
              <h2 className="text-2xl font-serif text-white">30-Day Subconscious Patterns</h2>
            </div>
            <div className="p-10 pt-0 grid grid-cols-2 gap-8">
              <div className="h-48 bg-white/5 rounded-3xl border border-white/5"></div>
              <div className="h-48 bg-white/5 rounded-3xl border border-white/5"></div>
            </div>
          </div>
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
    <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 hover:bg-zinc-900/80 transition-all group overflow-hidden relative shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
      <div className="absolute -top-10 -right-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
         <Icon size={160} />
      </div>
      <div className={`w-14 h-14 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(255,255,255,0.02)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="text-5xl font-serif text-white mb-4 tracking-tight opacity-90">{value}</div>
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</div>
      <p className="text-xs text-zinc-600 mt-2 font-medium">{desc}</p>
    </div>
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
