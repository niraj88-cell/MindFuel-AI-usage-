// app/(app)/challenges/page.tsx — Expeditions (Phase 5)
'use client'

import React, { useEffect, useState } from 'react'
import { Compass, CheckCircle2, Circle, Flame, Star, MapPin, Loader2, Sparkles, ChevronRight, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { HabitChallenge } from '@/lib/supabase/types'
import { FuelOrb } from '@/components/fuel/FuelOrb'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'
import {
  EXPEDITIONS,
  getExpeditionStartLine,
  getExpeditionProgressLine,
  getExpeditionCompletionStory,
} from '@/lib/fuel/expeditionEngine'

export default function ExpeditionsPage() {
  const [activeChallenges, setActiveChallenges] = useState<HabitChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null)
  const [fuelThought, setFuelThought] = useState<string | null>(null)
  const { speak } = useFuelVoice()

  useEffect(() => {
    loadChallenges()
  }, [])

  async function loadChallenges() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('habit_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setActiveChallenges(data || [])
    setLoading(false)
  }

  async function startExpedition(exp: typeof EXPEDITIONS[0]) {
    setAddingTemplate(exp.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('habit_challenges').insert({
      user_id: user.id,
      title: exp.title,
      description: exp.description,
      target_days: exp.target_days,
      difficulty: exp.difficulty,
      category: exp.category,
      target_category: exp.target_category,
      completed_days: 0,
      is_active: true,
      started_at: new Date().toISOString(),
      completed_at: null,
    } as any)

    // Fuel narrates the experiment start
    const line = getExpeditionStartLine(exp.id)
    setFuelThought(line)
    speak(line)

    await loadChallenges()
    setAddingTemplate(null)
  }

  async function checkInExpedition(challenge: HabitChallenge) {
    const supabase = createClient()
    const newProgress = challenge.completed_days + 1
    const isCompleted = newProgress >= challenge.target_days

    await supabase.from('habit_challenges')
      .update({
        completed_days: newProgress,
        is_active: !isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      } as any)
      .eq('id', challenge.id)

    // Find matching expedition ID
    const expMatch = EXPEDITIONS.find(e => e.title === challenge.title)
    const expId = expMatch?.id || ''

    if (isCompleted) {
      // Fuel narrates the completion story
      const story = getExpeditionCompletionStory(expId)
      setFuelThought(story)
      speak(story)
    } else {
      // Fuel narrates daily progress
      const progressLine = getExpeditionProgressLine(expId, newProgress, challenge.target_days)
      setFuelThought(progressLine)
      speak(progressLine)
    }

    loadChallenges()
  }

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (d === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
            <Compass className="w-6 h-6 text-zinc-500" />
          </div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Loading expeditions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-20 animate-fade-in-up">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <Compass className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Expeditions</h1>
        <p className="text-zinc-500 mt-3 text-sm max-w-md mx-auto">
          Multi-day behavioral experiments. Run them, learn something about your brain, and level up.
        </p>
      </div>

      {/* Active Expeditions */}
      {activeChallenges.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Active Expeditions</p>
          {activeChallenges.map((challenge) => {
            const progress = (challenge.completed_days / challenge.target_days) * 100
            const expMatch = EXPEDITIONS.find(e => e.title === challenge.title)

            return (
              <div
                key={challenge.id}
                className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[28px] p-6 md:p-8 shadow-2xl relative overflow-hidden group"
              >
                {/* Progress bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <div
                    className="h-full bg-white transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-white" />
                      <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${difficultyColor(expMatch?.difficulty || 'medium')}`}>
                        {expMatch?.difficulty || 'medium'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{challenge.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{challenge.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-semibold text-white">{challenge.completed_days}<span className="text-zinc-600 text-lg">/{challenge.target_days}</span></p>
                    <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Days</p>
                  </div>
                </div>

                {/* Day indicators */}
                <div className="flex gap-2 mb-6">
                  {Array.from({ length: challenge.target_days }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                        i < challenge.completed_days
                          ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                          : i === challenge.completed_days
                          ? 'bg-white/30 animate-pulse'
                          : 'bg-white/5'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => checkInExpedition(challenge)}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Day {challenge.completed_days + 1}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Discover Expeditions */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Discover Expeditions</p>
        <div className="grid grid-cols-1 gap-4">
          {EXPEDITIONS.map((exp) => {
            const isActive = activeChallenges.some(c => c.title === exp.title)

            return (
              <div
                key={exp.id}
                className={`bg-zinc-950/40 backdrop-blur-2xl border rounded-[28px] p-6 md:p-8 transition-all group ${
                  isActive ? 'border-white/20 opacity-60' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${difficultyColor(exp.difficulty)}`}>
                        {exp.difficulty}
                      </span>
                      <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">
                        {exp.target_days} days
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-white/90 transition-colors">{exp.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{exp.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => startExpedition(exp)}
                  disabled={isActive || addingTemplate === exp.id}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-white/5 text-zinc-600 border border-white/5'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                  } disabled:cursor-not-allowed`}
                >
                  {isActive ? (
                    <><CheckCircle2 className="w-4 h-4" /> Active</>
                  ) : addingTemplate === exp.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Initializing...</>
                  ) : (
                    <><Compass className="w-4 h-4" /> Begin Expedition</>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state hint */}
      {activeChallenges.length === 0 && (
        <div className="text-center py-8 opacity-50">
          <Sparkles className="w-6 h-6 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-600 text-sm">Pick an expedition above to start learning about your brain.</p>
        </div>
      )}

      {/* Fuel Orb */}
      <FuelOrb thought={fuelThought} />
    </div>
  )
}
