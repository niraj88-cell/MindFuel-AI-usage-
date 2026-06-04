'use client'

import React, { useEffect, useState } from 'react'
import { Cpu, Brain, Volume2, VolumeX } from 'lucide-react'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'

interface FuelOrbProps {
  /** Optional thought text to display in the bubble */
  thought?: string | null
  /** Optional: auto-speak this text on mount (once) */
  autoSpeak?: string | null
}

export function FuelOrb({ thought, autoSpeak }: FuelOrbProps) {
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

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-end gap-3 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSpeaking ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-90 scale-[0.97] hover:opacity-100 hover:scale-100'}`}>
      
      {/* Thought Bubble */}
      {(showThought || isSpeaking) && thought && (
        <div className="bg-zinc-950/90 backdrop-blur-2xl border border-sky-500/20 rounded-2xl p-4 shadow-[0_0_30px_rgba(14,165,233,0.12)] max-w-[280px] hidden sm:block relative overflow-hidden animate-[fadeSlideIn_0.5s_ease-out]">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          <p className="text-[13px] font-sans tracking-wide text-sky-100/80 leading-relaxed relative z-10">
            {thought}
          </p>
          {/* Connector triangle */}
          <div className="absolute -right-2 bottom-4 w-3 h-3 bg-zinc-950/90 border-r border-b border-sky-500/20 rotate-[-45deg]" />
        </div>
      )}

      {/* The Orb */}
      <div className="relative group">
        {/* Holographic spinning rings */}
        {isSpeaking && (
          <>
            <div className="absolute inset-[-5px] border border-sky-400/30 rounded-full animate-[spin_4s_linear_infinite]" />
            <div className="absolute inset-[-10px] border-t border-r border-cyan-400/20 rounded-full animate-[spin_2.5s_linear_infinite_reverse]" />
            <div className="absolute inset-[-15px] border-b border-sky-300/10 rounded-full animate-[spin_6s_linear_infinite]" />
            <div className="absolute inset-0 bg-sky-500/15 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          </>
        )}
        
        {/* Ambient glow (always-on, subtle) */}
        <div className={`absolute inset-[-3px] rounded-full transition-all duration-1000 ${isSpeaking ? 'bg-sky-500/20 blur-md' : 'bg-white/5 blur-sm'}`} />

        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center border backdrop-blur-2xl transition-all duration-500 cursor-pointer z-10 relative overflow-hidden
            ${isSpeaking 
              ? 'bg-zinc-950 border-sky-400/50 scale-110 shadow-[0_0_25px_rgba(56,189,248,0.25)]' 
              : 'bg-zinc-950/80 border-white/10 hover:border-sky-500/30 hover:shadow-[0_0_15px_rgba(56,189,248,0.1)]'}`}
        >
          {/* Inner radial glow */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)' }} />
          )}

          {isSpeaking ? (
            <Cpu className="w-6 h-6 text-sky-400 animate-pulse relative z-10" />
          ) : (
            <Brain className="w-6 h-6 text-zinc-500 group-hover:text-sky-300 transition-colors duration-300 relative z-10" />
          )}

          {/* Mute indicator */}
          <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-1 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
            {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-sky-400" />}
          </div>
        </button>
      </div>
    </div>
  )
}
