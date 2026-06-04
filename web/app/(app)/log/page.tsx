// app/(app)/log/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Loader2, PenLine, Sparkles, Heart, Clock, CheckCircle2, Zap, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContentAnalyzer } from '@/components/log/ContentAnalyzer'
import { IntelligenceCard } from '@/components/log/IntelligenceCard'
import { MoodSlider } from '@/components/log/MoodSlider'
import { QuickLogFAB } from '@/components/dashboard/QuickLogFAB'
import { createClient } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'
import { trackEvent } from '@/lib/mixpanel'
import { getScoreColor, getScoreLabel } from '@/lib/utils'
import { FuelOrb } from '@/components/fuel/FuelOrb'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'
import { getScanVoiceLine } from '@/lib/fuel/personalityEngine'

export default function LogPage() {
  const [moodBefore, setMoodBefore] = useState(5)
  const [moodAfter, setMoodAfter] = useState(5)
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState<{
    category: string
    mental_score: number
    summary: string
    severity?: 'critical' | 'warning' | 'moderate' | 'safe' | 'excellent'
    confidence?: number
    impact_analysis?: { mood_shift: string; cognitive_load: string; habit_risk: string; time_quality: string }
    root_causes?: Array<{ reason: string; evidence: string; confidence: number }>
    copilot_actions?: Array<{ action: string; reason: string; impact: string; confidence: number }>
    missing_context?: string[]
  } | null>(null)
  const [lastContent, setLastContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [moodLogging, setMoodLogging] = useState(false)
  const [moodSaved, setMoodSaved] = useState(false)
  const [todayStats, setTodayStats] = useState<{ count: number; avg: number } | null>(null)
  const [fuelThought, setFuelThought] = useState<string | null>(null)
  const { speak } = useFuelVoice()

  // Load today's log stats for progress indicator
  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: summary } = await supabase
        .from('daily_summaries')
        .select('total_logs, average_score')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

      if (summary) {
        setTodayStats({ count: summary.total_logs, avg: summary.average_score })
      }
    }
    loadStats()
  }, [saved])

  function handleAnalyzed(result: any, content: string) {
    setLastAnalysis(result)
    setLastContent(content)
    setSaved(false)
    
    // Auto-calculate suggested post-consumption mood
    // 1-100 score mapped to -2 to +2 mood change
    let suggestedMood = moodBefore
    if (result.mental_score >= 80) suggestedMood = Math.min(10, moodBefore + 2)
    else if (result.mental_score >= 60) suggestedMood = Math.min(10, moodBefore + 1)
    else if (result.mental_score <= 20) suggestedMood = Math.max(1, moodBefore - 2)
    else if (result.mental_score <= 40) suggestedMood = Math.max(1, moodBefore - 1)
    
    setMoodAfter(suggestedMood)

    // Fuel speaks the verdict
    const voiceLine = getScanVoiceLine(
      { category: result.category, score: result.mental_score, summary: result.summary },
      'energized'
    )
    setFuelThought(voiceLine)
    speak(voiceLine)
  }

  async function handleSaveLog() {
    if (!lastAnalysis || !lastContent) return
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch('/api/log/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: lastContent,
          category: lastAnalysis.category,
          mental_score: lastAnalysis.mental_score,
          duration_minutes: parseInt(duration) || 15,
          mood_before: moodBefore,
          mood_after: moodAfter,
          source: 'manual',
          metadata: { summary: lastAnalysis.summary },
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save log')
      }

      // Update daily summary
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: existing } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (existing) {
        const newTotal = existing.total_logs + 1
        const newTotalScore = existing.total_score + lastAnalysis.mental_score
        const breakdown = existing.category_breakdown as Record<string, number>
        breakdown[lastAnalysis.category] = (breakdown[lastAnalysis.category] || 0) + 1

        await supabase
          .from('daily_summaries')
          .update({
            total_logs: newTotal,
            total_score: newTotalScore,
            average_score: Math.round(newTotalScore / newTotal),
            category_breakdown: breakdown,
          })
          .eq('id', existing.id)
      } else {
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
        const { data: yesterdaySummary } = await supabase
          .from('daily_summaries')
          .select('streak_days')
          .eq('user_id', user.id)
          .eq('date', yesterday)
          .single()
          
        const newStreak = yesterdaySummary ? (yesterdaySummary.streak_days || 0) + 1 : 1

        await supabase.from('daily_summaries').insert({
          user_id: user.id,
          date: today,
          total_score: lastAnalysis.mental_score,
          average_score: lastAnalysis.mental_score,
          total_logs: 1,
          category_breakdown: { [lastAnalysis.category]: 1 },
          streak_days: newStreak,
        })
      }

      trackEvent('Log Created', {
        category: lastAnalysis.category,
        score: lastAnalysis.mental_score,
        duration: parseInt(duration) || 15
      });

      setSaved(true)
    } catch (err) {
      console.error('Failed to save log:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogMood() {
    setMoodLogging(true)
    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: moodBefore, context: 'standalone_check_in' }),
      })
      if (res.ok) setMoodSaved(true)
    } catch {
      console.error('Failed to log mood')
    } finally {
      setMoodLogging(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto min-h-[85vh] flex flex-col justify-center space-y-10 pb-20 stagger-children animate-fade-in-up relative">
      {/* Subtle Spatial Background */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.03] via-black to-black" />

      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
          Space to Think
        </p>
        <h1 className="text-4xl md:text-5xl font-serif text-white opacity-90 tracking-tight">
          What's on your mind?
        </h1>
        {todayStats && (
          <p className="text-zinc-500 text-sm mt-4 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
            {todayStats.count} reflections today
          </p>
        )}
      </div>

      {/* Content Analyzer Section */}
      <div className="relative group w-full">
         <div className="absolute -inset-4 bg-gradient-to-r from-white/5 to-white/5 rounded-[40px] blur-2xl opacity-50 pointer-events-none transition-all group-hover:opacity-100" />
         <div className="relative bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 md:p-10 shadow-2xl">
            <ContentAnalyzer onAnalyzed={handleAnalyzed} />
         </div>
      </div>

      {/* Intelligence Card — appears after analysis */}
      {lastAnalysis && !saved && lastAnalysis.severity && (
        <IntelligenceCard data={{
          severity: lastAnalysis.severity,
          confidence: lastAnalysis.confidence || 50,
          impact_analysis: lastAnalysis.impact_analysis || { mood_shift: 'neutral', cognitive_load: 'moderate', habit_risk: 'low', time_quality: 'neutral' },
          root_causes: lastAnalysis.root_causes || [],
          copilot_actions: lastAnalysis.copilot_actions || [],
          missing_context: lastAnalysis.missing_context,
        }} />
      )}

      {/* Save log section — appears after analysis */}
      {lastAnalysis && !saved && (
        <div className="animate-fade-in-up bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden p-6 md:p-10 shadow-2xl">
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-serif text-white opacity-90">
                 How did this affect you?
              </h2>
              <div className="px-4 py-2 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">
                 {lastAnalysis.category}
              </div>
           </div>

          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">State Before</span>
                 </div>
                 <MoodSlider label="" value={moodBefore} onChange={setMoodBefore} />
              </div>
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">State After</span>
                     </div>
                     <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">AI Suggestion</span>
                  </div>
                  <MoodSlider label="" value={moodAfter} onChange={setMoodAfter} />
               </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-white/5">
              <div className="flex items-center gap-2">
                 <Clock className="w-4 h-4 text-zinc-500" />
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Duration (minutes)</span>
              </div>
              <input
                type="number"
                placeholder="e.g. 45"
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xl text-white placeholder-zinc-700 focus:border-white/30 transition-all outline-none text-center font-serif"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min={1}
              />
            </div>

            <Button 
              onClick={handleSaveLog} 
              disabled={saving} 
              className="w-full h-16 bg-white hover:bg-zinc-200 text-black rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-all"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : null}
              {saving ? 'Processing...' : 'Save to Mirror'}
            </Button>
          </div>
        </div>
      )}

      {/* Success state with instant insight */}
      {saved && (
        <div className="animate-fade-in-up space-y-6">
          <div className="bg-transparent border border-emerald-500/20 p-8 rounded-[32px] text-center backdrop-blur-lg">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-2xl font-serif text-white">Clarity captured.</p>
          </div>

          {/* Post-save instant insight */}
          {lastAnalysis && (
            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Immediate Insight</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Cognitive Cost</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-serif" style={{ color: getScoreColor(lastAnalysis.mental_score) }}>
                      {lastAnalysis.mental_score}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{getScoreLabel(lastAnalysis.mental_score)}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">State Shift</p>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-serif text-white opacity-60">{moodBefore}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-600" />
                    <span className={`text-2xl font-serif ${moodAfter > moodBefore ? 'text-white' : moodAfter < moodBefore ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {moodAfter}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => { setSaved(false); setLastAnalysis(null); setLastContent('') }}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                   Continue reflecting
                </button>
                <button
                  onClick={() => window.location.href = '/insights'}
                  className="flex-1 py-4 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                   View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Mood Check-in (Minimal) */}
      {!saved && !lastAnalysis && (
        <div className="mt-auto opacity-60 hover:opacity-100 transition-opacity pt-12">
          <div className="text-center mb-6">
             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Just a quick check-in?</p>
          </div>
          <div className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 max-w-2xl mx-auto">
             <div className="flex-1 w-full">
                <MoodSlider label="" value={moodBefore} onChange={setMoodBefore} />
             </div>
             <button
               onClick={handleLogMood}
               disabled={moodLogging || moodSaved}
               className="h-12 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest transition-all shrink-0 border border-white/10 disabled:opacity-50 cursor-pointer"
             >
               {moodSaved ? 'Saved' : moodLogging ? '...' : 'Log State'}
             </button>
          </div>
        </div>
      )}
      <QuickLogFAB onLogSaved={() => setTodayStats(prev => prev ? { ...prev, count: prev.count + 1 } : null)} />
      <FuelOrb thought={fuelThought} />
    </div>
  )
}
