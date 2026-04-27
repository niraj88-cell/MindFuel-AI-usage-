// components/dashboard/DailyCheckIn.tsx
// End-of-day summary prompt with AI-suggested presets based on past habits
// Shows a smart check-in card that learns from user patterns
'use client'

import React, { useState, useEffect } from 'react'
import {
  Moon, Sun, CheckCircle2, Loader2, Sparkles,
  TrendingUp, TrendingDown, Minus, Brain,
  ChevronRight, Clock
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getMoodEmoji } from '@/lib/utils'
import { trackEvent } from '@/lib/mixpanel'

interface DailyCheckInProps {
  onComplete?: () => void
}

interface DailySuggestion {
  label: string
  presetId: string
  confidence: number // 0-100
}

export function DailyCheckIn({ onComplete }: DailyCheckInProps) {
  const [dismissed, setDismissed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<DailySuggestion[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([])
  const [reflectionNote, setReflectionNote] = useState('')
  const [todayStats, setTodayStats] = useState<{
    totalLogs: number
    avgScore: number
    topCategory: string
  } | null>(null)

  // Determine if we should show check-in (evening hours 6pm-midnight)
  const [showCheckIn, setShowCheckIn] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    // Show between 6 PM and midnight, or if user has logged today
    setShowCheckIn(hour >= 18 || hour <= 1)
    loadTodayStats()
  }, [])

  async function loadTodayStats() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    // Get today's logs
    const { data: logs } = await supabase
      .from('mental_logs')
      .select('category, mental_score')
      .eq('user_id', user.id)
      .gte('created_at', today)

    if (logs && logs.length > 0) {
      const avgScore = Math.round(logs.reduce((s, l) => s + l.mental_score, 0) / logs.length)
      const catCount = new Map<string, number>()
      logs.forEach(l => catCount.set(l.category, (catCount.get(l.category) || 0) + 1))
      const topCategory = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'

      setTodayStats({ totalLogs: logs.length, avgScore, topCategory })
    }

    // Generate AI-like suggestions based on past patterns
    const { data: recentLogs } = await supabase
      .from('mental_logs')
      .select('category, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentLogs && recentLogs.length > 0) {
      const catFreq = new Map<string, number>()
      recentLogs.forEach(l => catFreq.set(l.category, (catFreq.get(l.category) || 0) + 1))

      const sorted = [...catFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      const presetMap: Record<string, string> = {
        doomscroll: 'instagram_scroll',
        entertainment: 'youtube_video',
        educational: 'podcast_listen',
        productive: 'work_focus',
        social: 'twitter_scroll',
        creative: 'gaming',
        neutral: 'news_article',
      }

      setSuggestions(sorted.map(([cat, count]) => ({
        label: `${cat.charAt(0).toUpperCase() + cat.slice(1)} content`,
        presetId: presetMap[cat] || 'news_article',
        confidence: Math.min(95, Math.round((count / recentLogs.length) * 100 * 2)),
      })))
    }
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          energy,
          context: 'daily_checkin',
          notes: reflectionNote || `Daily check-in: mood ${mood}/10, energy ${energy}/10`,
        }),
      })

      if (res.ok) {
        setCompleted(true)
        trackEvent('Daily Check-In Completed', { mood, energy })
        onComplete?.()
        
        // Also quick-log any selected suggestions
        for (const presetId of selectedSuggestions) {
          await fetch('/api/quick-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset: presetId, mood }),
          })
        }
      }
    } catch {
      console.error('Daily check-in failed')
    } finally {
      setSaving(false)
    }
  }

  if (!showCheckIn || dismissed) return null

  if (completed) {
    return (
      <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-[32px] p-8 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Daily Reflection Complete ✨</h3>
            <p className="text-sm text-slate-400">Your data helps build better insights. See you tomorrow!</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-[32px] blur opacity-50 group-hover:opacity-100 transition-opacity" />
      <Card className="relative bg-slate-900 border-white/5 rounded-[32px] overflow-hidden p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
              <Moon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Daily Reflection</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End of day check-in</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-slate-600 hover:text-slate-400 font-bold"
          >
            Skip today
          </button>
        </div>

        {/* Today's Stats Summary */}
        {todayStats && todayStats.totalLogs > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Today's Summary</p>
              <p className="text-sm text-slate-300">
                <span className="text-white font-bold">{todayStats.totalLogs}</span> entries logged · Avg score{' '}
                <span className={`font-bold ${todayStats.avgScore >= 60 ? 'text-emerald-400' : todayStats.avgScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {todayStats.avgScore}
                </span>
              </p>
            </div>
            <div className="text-2xl">
              {todayStats.avgScore >= 70 ? <TrendingUp className="w-6 h-6 text-emerald-400" /> :
               todayStats.avgScore >= 40 ? <Minus className="w-6 h-6 text-amber-400" /> :
               <TrendingDown className="w-6 h-6 text-rose-400" />}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Mood */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Overall Mood</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getMoodEmoji(mood)}</span>
                <span className="text-lg font-black text-white tabular-nums">{mood}</span>
              </div>
            </div>
            <input
              type="range" min={1} max={10} value={mood}
              onChange={e => setMood(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Energy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Energy Level</span>
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-400" />
                <span className="text-lg font-black text-white tabular-nums">{energy}</span>
              </div>
            </div>
            <input
              type="range" min={1} max={10} value={energy}
              onChange={e => setEnergy(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* AI-Suggested Activities */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-3 h-3 text-indigo-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">What did you consume today?</span>
                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">AI Suggested</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => {
                  const isSelected = selectedSuggestions.includes(s.presetId)
                  return (
                    <button
                      key={s.presetId}
                      onClick={() => {
                        setSelectedSuggestions(prev =>
                          isSelected ? prev.filter(id => id !== s.presetId) : [...prev, s.presetId]
                        )
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-slate-800/50 text-slate-400 border-white/5 hover:border-indigo-500/20 hover:text-white'
                      }`}
                    >
                      {s.label}
                      <span className="ml-2 text-[9px] text-slate-600">{s.confidence}%</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Reflection Note */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick reflection (optional)</span>
            <textarea
              value={reflectionNote}
              onChange={e => setReflectionNote(e.target.value)}
              placeholder="How was your digital diet today?"
              rows={2}
              className="w-full bg-slate-800/30 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Complete Check-In
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  )
}
