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
  Lock,
  Smartphone,
  Clock,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendChart } from '@/components/insights/TrendChart'
import { MoodCorrelation } from '@/components/insights/MoodCorrelation'
import { LifeInPixels } from '@/components/insights/LifeInPixels'
import { CommunityBenchmark } from '@/components/insights/CommunityBenchmark'
import { Loader2 } from 'lucide-react'
import { trackEvent } from '@/lib/mixpanel'

interface InsightsData {
  trendData: Array<{ date: string; score: number; mood?: number }>
  pixelData: Array<{ date: string; score: number }>
  communityPercentile: number
  moodAnalysis: {
    overall_trend: string
    avg_mood: number
    anxiety_triggers: Array<{ trigger: string; severity: string; recommendation: string }>
    correlations: Array<{ pattern: string; confidence: 'low' | 'medium' | 'high'; data_points: number }>
    summary: string
    action_items: string[]
  } | null
  behavioralInsight?: {
    headline: string
    meaning: string
    pattern: string
    pattern_category: 'focus_impact' | 'mood_effect' | 'scrolling_pattern' | 'timing_pattern' | 'behavioral_trend' | 'risk_signal' | 'positive_signal'
    recommendation: string
    confidence: 'high' | 'medium' | 'low'
    tone: string
    data_signals: string[]
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
        <Loader2 className="w-12 h-12 animate-spin text-[#4CAF50]" />
        <p className="text-gray-400 font-medium uppercase tracking-[0.3em] text-xs">Gathering your reflections...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center border border-red-200">
           <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <div className="text-center">
           <h2 className="text-xl font-semibold text-[#111827] mb-2 tracking-tight">Insights Unavailable</h2>
           <p className="text-gray-500 text-sm max-w-xs">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[#111827] text-white rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#1f2937] transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 stagger-children relative min-h-[85vh]">
      {/* Subtle Spatial Background */}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="text-center md:text-left">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-4">
            Fluid Data
          </p>
          <h1 className="text-4xl md:text-5xl font-[var(--font-serif)] text-[#111827] tracking-tight">
             Clarity over time.
          </h1>
          <p className="text-gray-500 text-sm mt-4 font-medium">Observe how your interactions shape your state.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-full border border-black/[0.04] shadow-sm">
           <Link href="/weekly-report" className="px-5 py-2.5 bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50]/20 rounded-full flex items-center gap-2 font-semibold uppercase text-[10px] tracking-widest transition-colors">
              <Zap className="w-4 h-4" /> Weekly Report
           </Link>
           <div className="px-5 py-2.5 bg-[#111827] text-white rounded-full flex items-center gap-2 shadow-sm">
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-[10px] font-semibold text-white uppercase tracking-widest">Last 7 Days</span>
           </div>
           <div className="px-5 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Live Sync</span>
           </div>
        </div>
      </div>

      {/* Behavioral Insight Hero */}
      {data?.behavioralInsight && (
        <BehavioralInsightHero insight={data.behavioralInsight} />
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <InsightStatCard 
          label="Interactions" 
          value={data?.stats.totalLogs || 0} 
          icon={Activity} 
          color="text-[#111827]" 
          desc="Total items logged"
        />
        <InsightStatCard 
          label="Vitality Average" 
          value={data?.stats.avgScore || 0} 
          icon={Zap} 
          color="text-[#111827]" 
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

      {/* Long-Term View & Benchmarks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
        {/* Life In Pixels */}
        <div className="lg:col-span-8 bg-white border border-black/[0.04] rounded-2xl overflow-hidden shadow-sm relative p-8">
           <h2 className="text-xl font-[var(--font-serif)] text-[#111827] mb-6">
              Life in Pixels
           </h2>
           <LifeInPixels pixelData={data?.pixelData || []} />
        </div>
        
        {/* Community Benchmark */}
        <div className="lg:col-span-4 h-full">
           <CommunityBenchmark percentile={data?.communityPercentile || 0} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
        {/* Trend Visualization */}
        <div className="lg:col-span-8 bg-white border border-black/[0.04] rounded-2xl overflow-hidden shadow-sm relative group">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-[var(--font-serif)] text-[#111827] flex items-center gap-3">
                 Score Velocity
              </h2>
              <div className="w-10 h-10 bg-[#F5F7F6] rounded-full flex items-center justify-center border border-black/[0.04]">
                 <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-[#111827] transition-opacity" />
              </div>
            </div>
          </div>
          <div className="p-8 pt-4">
            <TrendChart data={data?.trendData || []} />
          </div>
        </div>

        {/* Correlations Side-panel */}
        <div className="lg:col-span-4 bg-white border border-black/[0.04] rounded-2xl shadow-sm flex flex-col relative group">
          <div className="p-8 pb-4">
             <h2 className="text-xl font-[var(--font-serif)] text-[#111827] flex items-center gap-3">
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
           <div className="absolute -inset-4 bg-gradient-to-r from-[#EADBC8]/10 via-[#EADBC8]/5 to-transparent rounded-3xl blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
           <div className="relative bg-white border border-black/[0.04] rounded-2xl overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-10">
                 <Sparkles className="w-16 h-16 text-gray-200/50 animate-breathe" />
              </div>
              <div className="p-8 md:p-12 pb-6 md:pb-8 border-b border-black/[0.04]">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#111827] text-white rounded-2xl flex items-center justify-center shadow-md">
                     <Brain className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-[var(--font-serif)] text-[#111827] tracking-tight">AI Wellness Synthesis</h2>
                    <div className="flex items-center gap-3 mt-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
                       <span className="text-[10px] font-semibold text-[#4CAF50] uppercase tracking-[0.2em]">{data.moodAnalysis.overall_trend} baseline</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 md:p-12 space-y-12">
                <p className="text-xl md:text-2xl text-[#4B5563] leading-relaxed font-[var(--font-serif)] font-light max-w-4xl">
                  "{data.moodAnalysis.summary}"
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                  {/* Triggers */}
                  {data.moodAnalysis.anxiety_triggers.length > 0 && (
                    <div className="space-y-8">
                      <h4 className="text-[11px] font-medium text-red-600 uppercase tracking-wider flex items-center gap-3">
                        <AlertTriangle className="w-3 h-3" /> Cognitive Friction
                      </h4>
                      <div className="space-y-4">
                        {data.moodAnalysis.anxiety_triggers.map((t, i) => (
                          <div key={i} className="p-6 rounded-2xl bg-red-50 border border-red-200 hover:border-red-300 transition-colors">
                            <p className="text-[#111827] font-semibold text-lg mb-2 font-[var(--font-serif)]">{t.trigger}</p>
                            <p className="text-gray-500 text-sm leading-relaxed">{t.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {data.moodAnalysis.action_items.length > 0 && (
                    <div className="space-y-8">
                      <h4 className="text-[11px] font-medium text-[#4CAF50] uppercase tracking-wider flex items-center gap-3">
                        <Sparkles className="w-3 h-3" /> Suggested Shifts
                      </h4>
                      <div className="space-y-4">
                        {data.moodAnalysis.action_items.map((item, i) => (
                          <div key={i} className="flex items-start gap-5 p-6 rounded-2xl bg-green-50 border border-green-200 hover:border-green-300 transition-colors">
                             <div className="w-8 h-8 rounded-2xl bg-[#4CAF50]/10 flex items-center justify-center shrink-0 mt-0.5 border border-[#4CAF50]/20">
                                <ArrowUpRight className="w-4 h-4 text-[#4CAF50]" />
                             </div>
                             <p className="text-[#4B5563] text-base leading-relaxed font-medium">{item}</p>
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F4] via-[#FAF8F4]/90 to-transparent z-20 flex flex-col items-center justify-center pt-20">
            <div className="w-16 h-16 bg-[#F5F7F6] rounded-2xl flex items-center justify-center mb-6 border border-black/[0.04]">
              <Lock className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-3xl font-[var(--font-serif)] text-[#111827] mb-4">Discover the full picture</h3>
            <p className="text-gray-500 text-base max-w-md text-center mb-8 font-medium">Notice a pattern? Plus gently connects the dots across your 30-day timeline to help you understand your habits on a deeper level.</p>
            <Link href="/subscription" className="px-10 py-5 bg-[#111827] text-white font-semibold text-xs uppercase tracking-widest rounded-full hover:bg-[#1f2937] transition-colors shadow-md">
              See what your thoughts reveal
            </Link>
          </div>
          <div className="bg-[#F5F7F6] border border-black/[0.04] rounded-2xl opacity-40 blur-xl select-none pointer-events-none overflow-hidden h-[400px]">
            <div className="p-10 pb-4">
              <h2 className="text-2xl font-[var(--font-serif)] text-[#111827]">30-Day Subconscious Patterns</h2>
            </div>
            <div className="p-10 pt-0 grid grid-cols-2 gap-8">
              <div className="h-48 bg-black/[0.03] rounded-2xl border border-black/[0.04]"></div>
              <div className="h-48 bg-black/[0.03] rounded-2xl border border-black/[0.04]"></div>
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
    <div className="bg-white border border-black/[0.04] rounded-2xl p-8 hover:shadow-md transition-all group overflow-hidden relative shadow-sm">
      <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
         <Icon size={160} />
      </div>
      <div className={`w-14 h-14 bg-[#F5F7F6] rounded-2xl flex items-center justify-center mb-8 border border-black/[0.04] group-hover:scale-110 transition-transform duration-500`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="text-5xl font-[var(--font-serif)] text-[#111827] mb-4 tracking-tight">{value}</div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <p className="text-xs text-gray-400 mt-2 font-medium">{desc}</p>
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

function BehavioralInsightHero({ insight }: { insight: NonNullable<InsightsData['behavioralInsight']> }) {
  const [showSignals, setShowSignals] = useState(false)
  
  const iconMap: Record<string, any> = {
    focus_impact: Target,
    mood_effect: Heart,
    scrolling_pattern: Smartphone,
    timing_pattern: Clock,
    behavioral_trend: TrendingUp,
    risk_signal: AlertTriangle,
    positive_signal: Sparkles
  }
  
  const Icon = iconMap[insight.pattern_category] || Sparkles
  const isRisk = insight.pattern_category === 'risk_signal'
  
  return (
    <div className="w-full bg-white border border-black/[0.04] rounded-2xl p-8 md:p-12 mb-12 relative overflow-hidden shadow-sm group">
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/3 pointer-events-none ${isRisk ? 'bg-rose-300' : 'bg-[#EADBC8]'}`} />
      
      <div className="relative z-10">
        {/* Top: Badge + Confidence */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-semibold uppercase tracking-widest ${
            isRisk 
              ? 'bg-red-50 border-red-200 text-red-600' 
              : 'bg-[#F5F7F6] border-black/[0.06] text-[#111827]'
          }`}>
            <Icon className="w-3 h-3" />
            {insight.pattern}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Confidence</span>
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full ${insight.confidence === 'high' || insight.confidence === 'medium' || insight.confidence === 'low' ? 'bg-[#4CAF50]' : 'bg-gray-200'}`} />
              <div className={`w-2 h-2 rounded-full ${insight.confidence === 'high' || insight.confidence === 'medium' ? 'bg-[#4CAF50]' : 'bg-gray-200'}`} />
              <div className={`w-2 h-2 rounded-full ${insight.confidence === 'high' ? 'bg-[#4CAF50]' : 'bg-gray-200'}`} />
            </div>
          </div>
        </div>
        
        {/* Main Headline */}
        <h2 className="text-3xl md:text-5xl font-[var(--font-serif)] text-[#111827] leading-tight tracking-tight max-w-4xl mb-6">
          {insight.headline}
        </h2>
        
        {/* Meaning */}
        <p className="text-lg text-[#4B5563] leading-relaxed max-w-3xl mb-10 font-medium">
          {insight.meaning}
        </p>
        
        {/* Recommendation & Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col justify-center">
            <h4 className="text-[11px] font-medium text-[#4CAF50] uppercase tracking-wider flex items-center gap-2 mb-3">
              <Sparkles className="w-3 h-3" /> Recommended Action
            </h4>
            <p className="text-[#111827] text-lg font-[var(--font-serif)]">
              {insight.recommendation}
            </p>
          </div>
          
          <div className="bg-[#F5F7F6] border border-black/[0.04] rounded-2xl p-6">
            <button 
              onClick={() => setShowSignals(!showSignals)}
              className="w-full flex items-center justify-between text-[11px] font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-[#111827] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-3 h-3" /> Data Evidence
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showSignals ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`mt-4 space-y-3 transition-all duration-300 overflow-hidden ${showSignals ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              {insight.data_signals.map((signal, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-[#4B5563] font-medium bg-white p-3 rounded-xl border border-black/[0.04]">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                  {signal}
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
