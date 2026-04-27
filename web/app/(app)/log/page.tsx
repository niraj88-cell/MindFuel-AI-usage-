// app/(app)/log/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Loader2, PenLine, Sparkles, Heart, Clock, CheckCircle2, Zap, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContentAnalyzer } from '@/components/log/ContentAnalyzer'
import { MoodSlider } from '@/components/log/MoodSlider'
import { QuickLogFAB } from '@/components/dashboard/QuickLogFAB'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { trackEvent } from '@/lib/mixpanel'
import { getScoreColor, getScoreLabel } from '@/lib/utils'

export default function LogPage() {
  const [moodBefore, setMoodBefore] = useState(5)
  const [moodAfter, setMoodAfter] = useState(5)
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState<{
    category: string
    mental_score: number
    summary: string
  } | null>(null)
  const [lastContent, setLastContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [moodLogging, setMoodLogging] = useState(false)
  const [moodSaved, setMoodSaved] = useState(false)
  const [todayStats, setTodayStats] = useState<{ count: number; avg: number } | null>(null)

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

  function handleAnalyzed(result: { category: string; mental_score: number; summary: string }, content: string) {
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
  }

  async function handleSaveLog() {
    if (!lastAnalysis || !lastContent) return
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('mental_logs').insert({
        user_id: user.id,
        content: lastContent,
        category: lastAnalysis.category as any,
        mental_score: lastAnalysis.mental_score,
        duration_minutes: parseInt(duration) || 15,
        mood_before: moodBefore,
        mood_after: moodAfter,
        source: 'manual' as const,
        metadata: { summary: lastAnalysis.summary },
      })

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
        await supabase.from('daily_summaries').insert({
          user_id: user.id,
          date: today,
          total_score: lastAnalysis.mental_score,
          average_score: lastAnalysis.mental_score,
          total_logs: 1,
          category_breakdown: { [lastAnalysis.category]: 1 },
          streak_days: 1,
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
    <div className="max-w-4xl mx-auto space-y-10 pb-20 stagger-children">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
             <PenLine className="w-6 h-6 text-indigo-400" />
             Log <span className="text-indigo-400">Content</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Log what you just watched or read to get your mental wellness score.</p>
        </div>
        
        {/* Today's Progress Pill */}
        {todayStats && (
          <div className="flex items-center gap-3 bg-slate-800/40 border border-white/5 rounded-2xl px-5 py-2.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <div className="text-xs">
              <span className="font-black text-white">{todayStats.count}</span>
              <span className="text-slate-500"> logs today</span>
              {todayStats.avg > 0 && (
                <span className="ml-2">
                  · avg <span className="font-bold" style={{ color: getScoreColor(todayStats.avg) }}>{todayStats.avg}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Analyzer Section */}
      <div className="relative group">
         <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[32px] blur opacity-10"></div>
         <Card className="relative bg-slate-900 border-white/5 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
               <Sparkles className="w-5 h-5 text-indigo-400" />
               <h2 className="text-lg font-bold">AI Content Scanner</h2>
               <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 ml-auto">
                 Voice + Quick Presets
               </span>
            </div>
            <ContentAnalyzer onAnalyzed={handleAnalyzed} />
         </Card>
      </div>

      {/* Save log section — appears after analysis */}
      {lastAnalysis && !saved && (
        <Card className="animate-fade-in-up bg-slate-900/50 border-indigo-500/30 rounded-[32px] overflow-hidden p-8 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                 Save This Entry
              </h2>
              <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">
                 {lastAnalysis.category} • Score: {lastAnalysis.mental_score}
              </div>
           </div>

          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase">How did you feel before?</span>
                 </div>
                 <MoodSlider label="" value={moodBefore} onChange={setMoodBefore} />
              </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">How do you feel now?</span>
                     </div>
                     <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">AI Suggested</span>
                  </div>
                  <MoodSlider label="" value={moodAfter} onChange={setMoodAfter} />
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                 <Clock className="w-4 h-4 text-indigo-400" />
                 <span className="text-xs font-bold text-slate-500 uppercase">Time Spent</span>
              </div>
              <input
                type="number"
                placeholder="Minutes spent (e.g. 45)"
                className="w-full h-14 bg-slate-800/50 border-white/5 rounded-2xl px-6 text-white placeholder-slate-600 focus:border-indigo-500 transition-colors outline-none"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min={1}
              />
            </div>

            <Button 
              onClick={handleSaveLog} 
              disabled={saving} 
              className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Plus className="w-5 h-5 mr-3" />}
              Save Log Entry
            </Button>
          </div>
        </Card>
      )}

      {/* Success state with instant insight */}
      {saved && (
        <div className="animate-fade-in-up space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[32px] text-center">
            <p className="text-xl font-bold text-emerald-400 flex items-center justify-center gap-3">
               <CheckCircle2 className="w-6 h-6" />
               Saved Successfully!
            </p>
            <p className="text-emerald-500/60 text-sm mt-2">Your log has been saved to your profile.</p>
          </div>

          {/* Post-save instant insight */}
          {lastAnalysis && (
            <Card className="bg-slate-900/50 border-white/5 rounded-[32px] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Quick Insight</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Score Impact</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black" style={{ color: getScoreColor(lastAnalysis.mental_score) }}>
                      {lastAnalysis.mental_score}
                    </span>
                    <span className="text-xs text-slate-500">{getScoreLabel(lastAnalysis.mental_score)}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mood Change</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{moodBefore}</span>
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                    <span className={`text-lg font-bold ${moodAfter > moodBefore ? 'text-emerald-400' : moodAfter < moodBefore ? 'text-rose-400' : 'text-slate-400'}`}>
                      {moodAfter}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => { setSaved(false); setLastAnalysis(null); setLastContent('') }}
                  className="flex-1 py-3 bg-indigo-600/10 text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Log Another
                </button>
                <button
                  onClick={() => window.location.href = '/insights'}
                  className="flex-1 py-3 bg-slate-800/50 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" /> View Insights
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Quick Mood Check-in */}
      <Card className="bg-slate-900/30 border-white/5 rounded-[32px] p-8">
         <div className="flex items-center gap-3 mb-6">
            <Heart className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold">Quick Mood Check</h2>
         </div>
         <div className="space-y-8">
            <MoodSlider label="" value={moodBefore} onChange={setMoodBefore} />
            <Button
              variant="secondary"
              onClick={handleLogMood}
              disabled={moodLogging || moodSaved}
              className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              {moodSaved ? '✓ Mood Saved' : moodLogging ? 'Processing...' : 'Save Current Mood'}
            </Button>
         </div>
      </Card>

      {/* Quick Log FAB on Log page too */}
      <QuickLogFAB onLogSaved={() => setTodayStats(prev => prev ? { ...prev, count: prev.count + 1 } : null)} />
    </div>
  )
}
