// components/dashboard/DailyCheckIn.tsx
// End-of-day summary prompt with AI-suggested presets based on past habits
// Redesigned with Spider-Verse DNA — warm, safe, web-motif.
'use client'

import React, { useState, useEffect } from 'react'
import {
  Moon, Sun, CheckCircle2, Loader2, Sparkles,
  TrendingUp, TrendingDown, Minus, Brain,
  ChevronRight, Network
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/mixpanel'
import { MoodConstellation } from './MoodConstellation'
import { AccentButton } from '../ui/AccentButton'
import { WebCorner } from '../ui/WebCorner'

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

  const [showCheckIn, setShowCheckIn] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    setShowCheckIn(hour >= 18 || hour <= 1)
    loadTodayStats()
  }, [])

  async function loadTodayStats() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

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
      <div className="web-card border-web rounded-[32px] p-8 animate-web-swing bg-emerald-500/5">
        <WebCorner position="top-right" color="var(--accent-blue)" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Thread Spun ✨</h3>
            <p className="text-sm text-zinc-400">Your web is connected. See you tomorrow!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-brand rounded-[32px] blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
      <div className="web-card border-web relative rounded-[32px] p-8 shadow-2xl">
        <WebCorner position="top-right" color="var(--accent-blue)" />
        <WebCorner position="bottom-left" color="var(--accent-red)" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Network className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Spin Your Thread</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End of day reflection</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-zinc-500 hover:text-white font-bold transition-colors cursor-pointer relative z-10"
          >
            Skip today
          </button>
        </div>

        {/* Today's Stats Summary */}
        {todayStats && todayStats.totalLogs > 0 && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-8 flex items-center gap-4 relative z-10">
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Today's Web</p>
              <p className="text-sm text-zinc-300">
                <span className="text-white font-bold">{todayStats.totalLogs}</span> nodes connected · Avg score{' '}
                <span className={`font-bold ${todayStats.avgScore >= 60 ? 'text-blue-400' : todayStats.avgScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                  {todayStats.avgScore}
                </span>
              </p>
            </div>
            <div className="text-2xl">
              {todayStats.avgScore >= 70 ? <TrendingUp className="w-6 h-6 text-blue-400" /> :
               todayStats.avgScore >= 40 ? <Minus className="w-6 h-6 text-amber-400" /> :
               <TrendingDown className="w-6 h-6 text-red-400" />}
            </div>
          </div>
        )}

        <div className="space-y-8 relative z-10">
          {/* Constellation Mood Picker */}
          <div>
            <div className="text-center mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">How did today feel?</span>
            </div>
            <MoodConstellation value={mood} onChange={setMood} size={300} />
          </div>

          {/* Energy */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Energy Level</span>
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-lg font-semibold text-white tabular-nums">{energy}</span>
              </div>
            </div>
            <input
              type="range" min={1} max={10} value={energy}
              onChange={e => setEnergy(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* AI-Suggested Activities */}
          {suggestions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pattern Match</span>
                </div>
                <span className="text-[9px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Spidey Sense</span>
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
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border tap-effect cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                          : 'bg-white/5 text-zinc-400 border-white/10 hover:border-blue-500/30 hover:text-white'
                      }`}
                    >
                      {s.label}
                      <span className="ml-2 text-[9px] opacity-60">{s.confidence}%</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Reflection Note */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">What's on your mind?</span>
            <textarea
              value={reflectionNote}
              onChange={e => setReflectionNote(e.target.value)}
              placeholder="No judgment here — just you and your web."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <AccentButton 
            onClick={handleSubmit}
            loading={saving}
            variant="gradient"
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Connect to Web
                <ChevronRight className="w-4 h-4" />
              </div>
            )}
          </AccentButton>
        </div>
      </div>
    </div>
  )
}
