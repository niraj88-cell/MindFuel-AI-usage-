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
  Calendar
} from 'lucide-react'
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
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Analyzing your data...</p>
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
           <p className="text-slate-500 text-sm max-w-xs">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
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
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
             <BarChart3 className="w-8 h-8 text-indigo-500" />
             Your <span className="text-indigo-500">Insights</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">See how your screen time affects your mood.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
           <div className="px-4 py-2 bg-indigo-600 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20">
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Last 7 Days</span>
           </div>
           <div className="pr-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Synced</span>
           </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightStatCard 
          label="Cumulative Logs" 
          value={data?.stats.totalLogs || 0} 
          icon={Activity} 
          color="text-indigo-400" 
          desc="Total items logged"
        />
        <InsightStatCard 
          label="Avg Wellness Score" 
          value={data?.stats.avgScore || 0} 
          icon={Zap} 
          color="text-emerald-400" 
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
        <Card className="lg:col-span-8 bg-slate-900/50 border-white/5 rounded-[40px] overflow-hidden shadow-2xl group">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-3">
                 <TrendingUp className="w-5 h-5 text-indigo-400" />
                 Score Velocity
              </CardTitle>
              <ArrowUpRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-colors" />
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <TrendChart data={data?.trendData || []} />
          </CardContent>
        </Card>

        {/* Correlations Side-panel */}
        <Card className="lg:col-span-4 bg-slate-900/50 border-white/5 rounded-[40px] shadow-2xl flex flex-col">
          <CardHeader className="p-8">
             <CardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-3">
                <Target className="w-5 h-5 text-purple-400" />
                Detected Patterns
             </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar">
            <MoodCorrelation correlations={data?.moodAnalysis?.correlations || []} />
          </CardContent>
        </Card>
      </div>

      {/* AI Deep Analysis Section */}
      {data?.moodAnalysis && (
        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-[40px] blur opacity-50 group-hover:opacity-100 transition-opacity" />
           <Card className="relative bg-slate-900 border-indigo-500/30 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8">
                 <Sparkles className="w-12 h-12 text-indigo-500/20 animate-float" />
              </div>
              <CardHeader className="p-10 pb-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                     <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tight text-white">AI Wellness Report</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{data.moodAnalysis.overall_trend} baseline</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <p className="text-lg text-slate-300 leading-relaxed font-medium">
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
                            <p className="text-slate-400 text-xs leading-relaxed">{t.recommendation}</p>
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
                          <div key={i} className="flex items-start gap-4 p-5 rounded-[28px] bg-emerald-500/5 border border-emerald-500/10">
                             <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                             </div>
                             <p className="text-slate-300 text-sm font-bold leading-relaxed">{item}</p>
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
    <Card className="bg-slate-900/50 border-white/5 rounded-[32px] p-8 hover:bg-slate-800/50 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
         <Icon size={80} />
      </div>
      <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="text-4xl font-black text-white mb-2 tracking-tighter">{value}</div>
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
      <p className="text-[10px] font-bold text-slate-600 mt-1 italic">{desc}</p>
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
