'use client'

import React, { useEffect, useState } from 'react'
import { Cpu, Brain, Volume2, VolumeX } from 'lucide-react'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'

interface FuelOrbProps {
  /** Optional thought text to display in the bubble */
  thought?: string | null
  /** Optional: auto-speak this text on mount (once) */
  autoSpeak?: string | null
  /** Optional: risk level for color coding */
  riskLevel?: 'safe' | 'warning' | 'critical'
}

export function FuelOrb({ thought, autoSpeak, riskLevel = 'safe' }: FuelOrbProps) {
  const { speak, isSpeaking, isMuted, toggleMute } = useFuelVoice()
  const [hasAutoSpoken, setHasAutoSpoken] = useState(false)
  const [showThought, setShowThought] = useState(false)

  // Auto-speak on mount (once)
  useEffect(() => {
    if (autoSpeak && !hasAutoSpoken) {
      setHasAutoSpoken(true)
      setShowThought(true)
      // Small delay to feel natural — like Fuel is "reading" the data first
      const timer = setTimeout(() => speak(autoSpeak), 600)
      return () => clearTimeout(timer)
    }
  }, [autoSpeak, hasAutoSpoken, speak])

  // Auto-hide thought bubble after speech
  useEffect(() => {
    if (!isSpeaking && hasAutoSpoken && showThought) {
      const timer = setTimeout(() => setShowThought(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [isSpeaking, hasAutoSpoken, showThought])

  const colorMap = {
    safe: {
      border: 'border-sky-500/20',
      bg: 'bg-sky-500/15',
      text: 'text-sky-100/80',
      shadow: 'shadow-[0_0_30px_rgba(14,165,233,0.12)]',
      gradient: 'from-sky-500/5 to-cyan-500/5',
      ring1: 'border-sky-400/30',
      ring2: 'border-cyan-400/20',
      ring3: 'border-sky-300/10',
      glow: 'bg-sky-500/20',
      activeBorder: 'border-sky-400/50',
      activeShadow: 'shadow-[0_0_25px_rgba(56,189,248,0.25)]',
      hoverBorder: 'hover:border-sky-500/30',
      hoverShadow: 'hover:shadow-[0_0_15px_rgba(56,189,248,0.1)]',
      icon: 'text-sky-400',
      iconHover: 'group-hover:text-sky-300',
      radial: 'rgba(56,189,248,0.25)'
    },
    warning: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/15',
      text: 'text-amber-100/80',
      shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.12)]',
      gradient: 'from-amber-500/5 to-orange-500/5',
      ring1: 'border-amber-400/30',
      ring2: 'border-orange-400/20',
      ring3: 'border-amber-300/10',
      glow: 'bg-amber-500/20',
      activeBorder: 'border-amber-400/50',
      activeShadow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)]',
      hoverBorder: 'hover:border-amber-500/30',
      hoverShadow: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      icon: 'text-amber-400',
      iconHover: 'group-hover:text-amber-300',
      radial: 'rgba(245,158,11,0.25)'
    },
    critical: {
      border: 'border-red-500/20',
      bg: 'bg-red-500/15',
      text: 'text-red-100/80',
      shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.12)]',
      gradient: 'from-red-500/5 to-rose-500/5',
      ring1: 'border-red-400/30',
      ring2: 'border-rose-400/20',
      ring3: 'border-red-300/10',
      glow: 'bg-red-500/20',
      activeBorder: 'border-red-400/50',
      activeShadow: 'shadow-[0_0_25px_rgba(239,68,68,0.25)]',
      hoverBorder: 'hover:border-red-500/30',
      hoverShadow: 'hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]',
      icon: 'text-red-400',
      iconHover: 'group-hover:text-red-300',
      radial: 'rgba(239,68,68,0.25)'
    }
  }

  const theme = colorMap[riskLevel] || colorMap.safe

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-end gap-3 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSpeaking ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-90 scale-[0.97] hover:opacity-100 hover:scale-100'}`}>
      
      {/* Thought Bubble */}
      {(showThought || isSpeaking) && thought && (
        <div className={`bg-zinc-950/90 backdrop-blur-2xl border ${theme.border} rounded-2xl p-4 ${theme.shadow} max-w-[280px] hidden sm:block relative overflow-hidden animate-[fadeSlideIn_0.5s_ease-out]`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} pointer-events-none`} />
          <p className={`text-[13px] font-sans tracking-wide ${theme.text} leading-relaxed relative z-10`}>
            {thought}
          </p>
          {/* Connector triangle */}
          <div className={`absolute -right-2 bottom-4 w-3 h-3 bg-zinc-950/90 border-r border-b ${theme.border} rotate-[-45deg]`} />
        </div>
      )}

      {/* The Orb */}
      <div className="relative group">
        {/* Holographic spinning rings */}
        {isSpeaking && (
          <>
            <div className={`absolute inset-[-5px] border ${theme.ring1} rounded-full animate-[spin_4s_linear_infinite]`} />
            <div className={`absolute inset-[-10px] border-t border-r ${theme.ring2} rounded-full animate-[spin_2.5s_linear_infinite_reverse]`} />
            <div className={`absolute inset-[-15px] border-b ${theme.ring3} rounded-full animate-[spin_6s_linear_infinite]`} />
            <div className={`absolute inset-0 ${theme.bg} rounded-full animate-ping`} style={{ animationDuration: '2s' }} />
          </>
        )}
        
        {/* Ambient glow (always-on, subtle) */}
        <div className={`absolute inset-[-3px] rounded-full transition-all duration-1000 ${isSpeaking ? `${theme.glow} blur-md` : 'bg-white/5 blur-sm'}`} />

        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center border backdrop-blur-2xl transition-all duration-500 cursor-pointer z-10 relative overflow-hidden
            ${isSpeaking 
              ? `bg-zinc-950 ${theme.activeBorder} scale-110 ${theme.activeShadow}` 
              : `bg-zinc-950/80 border-white/10 ${theme.hoverBorder} ${theme.hoverShadow}`}`}
        >
          {/* Inner radial glow */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${theme.radial} 0%, transparent 70%)` }} />
          )}

          {isSpeaking ? (
            <Cpu className={`w-6 h-6 ${theme.icon} animate-pulse relative z-10`} />
          ) : (
            <Brain className={`w-6 h-6 text-zinc-500 ${theme.iconHover} transition-colors duration-300 relative z-10`} />
          )}

          {/* Mute indicator */}
          <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-1 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
            {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className={`w-3 h-3 ${theme.icon}`} />}
          </div>
        </button>
      </div>
    </div>
  )
}
