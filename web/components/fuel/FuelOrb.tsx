'use client'

import React, { useEffect, useState } from 'react'
import { Network, Brain, Volume2, VolumeX } from 'lucide-react'
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
      // Small delay to feel natural — like Spidey is "reading" the data first
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
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      text: 'text-blue-100',
      shadow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
      gradient: 'from-blue-500/10 to-indigo-500/10',
      ring1: 'border-blue-400/40',
      ring2: 'border-blue-500/20',
      ring3: 'border-indigo-400/10',
      glow: 'bg-blue-500/20',
      activeBorder: 'border-blue-400/60',
      activeShadow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]',
      hoverBorder: 'hover:border-blue-500/40',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
      icon: 'text-blue-400',
      iconHover: 'group-hover:text-blue-300',
      radial: 'rgba(59,130,246,0.3)',
      webLine: 'rgba(59,130,246,0.15)'
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      text: 'text-amber-100',
      shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      gradient: 'from-amber-500/10 to-orange-500/10',
      ring1: 'border-amber-400/40',
      ring2: 'border-amber-500/20',
      ring3: 'border-orange-400/10',
      glow: 'bg-amber-500/20',
      activeBorder: 'border-amber-400/60',
      activeShadow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
      hoverBorder: 'hover:border-amber-500/40',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      icon: 'text-amber-400',
      iconHover: 'group-hover:text-amber-300',
      radial: 'rgba(245,158,11,0.3)',
      webLine: 'rgba(245,158,11,0.15)'
    },
    critical: {
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
      text: 'text-red-100',
      shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]',
      gradient: 'from-red-500/10 to-rose-500/10',
      ring1: 'border-red-400/40',
      ring2: 'border-red-500/20',
      ring3: 'border-rose-400/10',
      glow: 'bg-red-500/20',
      activeBorder: 'border-red-400/60',
      activeShadow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
      hoverBorder: 'hover:border-red-500/40',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]',
      icon: 'text-red-400',
      iconHover: 'group-hover:text-red-300',
      radial: 'rgba(239,68,68,0.3)',
      webLine: 'rgba(239,68,68,0.15)'
    }
  }

  const theme = colorMap[riskLevel] || colorMap.safe

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-end gap-3 transition-swing duration-700 ${isSpeaking ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-90 scale-[0.97] hover:opacity-100 hover:scale-100'}`}>
      
      {/* Thought Bubble - Spidey Sense Alert */}
      {(showThought || isSpeaking) && thought && (
        <div className={`web-card border-web rounded-2xl p-4 ${theme.shadow} max-w-[280px] hidden sm:block relative overflow-hidden animate-web-swing`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} pointer-events-none`} />
          <p className={`text-[13px] font-sans tracking-wide ${theme.text} leading-relaxed relative z-10 font-medium`}>
            {thought}
          </p>
          {/* Connector triangle */}
          <div className={`absolute -right-2 bottom-4 w-3 h-3 bg-[var(--card)] border-r border-b var(--border) rotate-[-45deg] z-20`} />
        </div>
      )}

      {/* The Web Emblem (formerly Orb) */}
      <div className="relative group">
        {/* Spidey-sense web spinning rings */}
        {isSpeaking && (
          <>
            <svg className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] animate-[spin_4s_linear_infinite]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke={theme.webLine} strokeWidth="1" strokeDasharray="8 8" />
            </svg>
            <svg className="absolute inset-[-14px] w-[calc(100%+28px)] h-[calc(100%+28px)] animate-[spin_3s_linear_infinite_reverse]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke={theme.webLine} strokeWidth="0.5" strokeDasharray="4 12" />
            </svg>
            {/* Spidey sense pulse */}
            <div className={`absolute inset-0 ${theme.bg} rounded-full animate-pulse-sense`} />
          </>
        )}
        
        {/* Ambient glow (always-on, subtle) */}
        <div className={`absolute inset-[-3px] rounded-full transition-all duration-1000 ${isSpeaking ? `${theme.glow} blur-md` : 'bg-white/5 blur-sm'}`} />

        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center border backdrop-blur-2xl transition-all duration-500 cursor-pointer z-10 relative overflow-hidden tap-effect
            ${isSpeaking 
              ? `bg-[var(--card)] ${theme.activeBorder} scale-110 ${theme.activeShadow}` 
              : `bg-[var(--card)]/80 border-[var(--border)] ${theme.hoverBorder} ${theme.hoverShadow}`}`}
        >
          {/* Inner radial glow */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${theme.radial} 0%, transparent 70%)` }} />
          )}

          {isSpeaking ? (
            <Network className={`w-6 h-6 ${theme.icon} animate-pulse relative z-10`} />
          ) : (
            <Network className={`w-6 h-6 text-zinc-500 ${theme.iconHover} transition-colors duration-300 relative z-10`} />
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
