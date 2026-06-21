'use client'

import React, { useEffect, useState } from 'react'
import { X, Shield, Clock, Zap } from 'lucide-react'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'
import {
  RescueEvent,
  getRescueState,
  updateRescueState,
  shouldTriggerRescue,
  determineRescueLevel,
  generateRescue,
} from '@/lib/fuel/attentionRescue'

interface AttentionRescueProps {
  /** Signal from extension: app name being used */
  appName?: string
  /** Signal from extension: minutes spent */
  minutesSpent?: number
  /** Trigger type */
  trigger?: 'doomscroll' | 'distraction_spiral' | 'late_night' | 'content_binge' | 'mental_fatigue'
  /** Called when rescue is dismissed or completed */
  onClose?: () => void
}

export function AttentionRescue({ appName, minutesSpent, trigger, onClose }: AttentionRescueProps) {
  const { speak } = useFuelVoice()
  const [rescue, setRescue] = useState<RescueEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [breathCount, setBreathCount] = useState(0)
  const [showBreath, setShowBreath] = useState(false)

  useEffect(() => {
    if (!appName || !minutesSpent || !trigger) return

    const state = getRescueState()
    if (!shouldTriggerRescue(state)) return

    const hour = new Date().getHours()
    const level = determineRescueLevel(minutesSpent, state.rescuesToday, hour)
    const event = generateRescue(trigger, appName, minutesSpent, level)

    setRescue(event)
    setVisible(true)

    // Update state
    updateRescueState({
      rescuesToday: state.rescuesToday + 1,
      lastRescueTime: Date.now(),
    })

    // Speak if not a nudge
    if (level !== 'nudge' && event.voiceLine) {
      setTimeout(() => speak(event.voiceLine), 400)
    }
  }, [appName, minutesSpent, trigger, speak])

  const handleDismiss = () => {
    const state = getRescueState()
    updateRescueState({ dismissalsToday: state.dismissalsToday + 1 })
    setVisible(false)
    onClose?.()
  }

  const handleBreakFree = () => {
    setShowBreath(true)
  }

  // Breathing exercise
  useEffect(() => {
    if (!showBreath) return
    if (breathCount >= 4) {
      // Done breathing
      setTimeout(() => {
        speak('Nice. Your nervous system just reset. You earned that.')
        setVisible(false)
        onClose?.()
      }, 1000)
      return
    }
    const timer = setTimeout(() => setBreathCount(c => c + 1), 4000)
    return () => clearTimeout(timer)
  }, [showBreath, breathCount, speak, onClose])

  if (!rescue || !visible) return null

  const levelColors = {
    nudge: { bg: 'bg-zinc-900/95', border: 'border-white/10', accent: 'text-zinc-400' },
    notice: { bg: 'bg-zinc-900/95', border: 'border-sky-500/20', accent: 'text-sky-400' },
    redirect: { bg: 'bg-zinc-950/98', border: 'border-orange-500/20', accent: 'text-orange-400' },
    rescue: { bg: 'bg-black/98', border: 'border-red-500/20', accent: 'text-red-400' },
  }

  const colors = levelColors[rescue.level]

  // Nudge: minimal floating card
  if (rescue.level === 'nudge') {
    return (
      <div className="fixed bottom-24 right-6 z-[60] animate-[fadeSlideIn_0.5s_ease-out] max-w-[260px]">
        <div className={`${colors.bg} backdrop-blur-2xl ${colors.border} border rounded-2xl p-4 shadow-2xl`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${colors.accent}`} />
              <span className="text-sm text-white font-medium">{rescue.headline}</span>
            </div>
            <button onClick={handleDismiss} className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Breathing overlay
  if (showBreath) {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center">
        <div className={`w-32 h-32 rounded-full border-2 border-sky-400/50 flex items-center justify-center ${breathCount % 2 === 0 ? 'animate-[breathe_4s_ease-in-out_infinite]' : ''}`}>
          <span className="text-sky-400 text-sm font-bold uppercase tracking-widest">
            {breathCount % 2 === 0 ? 'Breathe in' : 'Breathe out'}
          </span>
        </div>
        <p className="text-zinc-600 text-xs mt-8">{breathCount + 1} of 4</p>
      </div>
    )
  }

  // Notice / Redirect / Rescue: increasing intensity
  const isFullScreen = rescue.level === 'rescue'

  return (
    <div className={`fixed ${isFullScreen ? 'inset-0' : 'bottom-0 left-0 right-0'} z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6`}>
      {/* Backdrop */}
      {isFullScreen && <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={handleDismiss} />}
      {!isFullScreen && <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" onClick={handleDismiss} />}

      {/* Card */}
      <div className={`relative w-full max-w-md ${colors.bg} backdrop-blur-2xl ${colors.border} border rounded-[28px] p-8 shadow-2xl animate-[fadeSlideIn_0.4s_ease-out]`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${colors.accent}`} />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Attention Rescue</span>
          </div>
          <button onClick={handleDismiss} className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Headline */}
        <h2 className={`text-2xl font-bold text-white mb-3 tracking-tight`}>
          {rescue.headline}
        </h2>

        {/* Explanation (N-E-A: Explain) */}
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          {rescue.explanation}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          {rescue.action.type === 'break' ? (
            <button
              onClick={handleBreakFree}
              className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              <Zap className="w-4 h-4" /> {rescue.action.label}
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/20 transition-all cursor-pointer border border-white/10"
            >
              {rescue.action.label}
            </button>
          )}

          {rescue.action.type === 'break' && (
            <button
              onClick={handleDismiss}
              className="w-full py-3 text-zinc-600 text-xs font-medium hover:text-zinc-400 transition-colors cursor-pointer"
            >
              Not yet
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
