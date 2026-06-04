'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Cpu, Brain, Volume2, VolumeX, Sparkles } from 'lucide-react'

interface JarvisAssistantProps {
  neuroData: {
    neuroState: { summary: string }
    prophecy: { prophecy: string, trajectory: string }
  } | null
}

export function JarvisAssistant({ neuroData }: JarvisAssistantProps) {
  const [hasSpoken, setHasSpoken] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  
  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
      // Load voices
      window.speechSynthesis.getVoices()
    }
    
    // Check if user has muted the assistant previously
    const savedMuted = localStorage.getItem('jarvis_muted')
    if (savedMuted === 'true') {
      setIsMuted(true)
    }
  }, [])

  useEffect(() => {
    // Only speak once per session/reload when neuroData is available
    if (neuroData && !hasSpoken && !isMuted && synthRef.current) {
      setHasSpoken(true)
      
      const greeting = `Welcome back, Boss. ${neuroData.prophecy.prophecy}`
      
      const utterance = new SpeechSynthesisUtterance(greeting)
      
      // Look for a slick, smooth voice. E.g., Samantha, Karen, Fiona (female AI vibes like Friday/Edith), or Daniel/Google (Jarvis).
      const voices = synthRef.current.getVoices()
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Karen') ||
        v.name.includes('Fiona') ||
        v.name.includes('Daniel') || 
        v.name.includes('Google UK English')
      )
      
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
      
      utterance.rate = 1.05 // Slightly faster for a crisp, techy feel
      utterance.pitch = 1.1 // Slightly higher/crisper
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      
      synthRef.current.speak(utterance)
    }
  }, [neuroData, hasSpoken, isMuted])

  const toggleMute = () => {
    if (isSpeaking && synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
    const newMuted = !isMuted
    setIsMuted(newMuted)
    localStorage.setItem('jarvis_muted', String(newMuted))
  }

  if (!neuroData) return null

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-end gap-4 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isSpeaking ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-90 scale-95 hover:opacity-100'}`}>
      
      {/* Thought Bubble */}
      <div className="bg-zinc-950/90 backdrop-blur-2xl border border-sky-500/20 rounded-2xl p-4 shadow-[0_0_30px_rgba(14,165,233,0.15)] max-w-[280px] hidden sm:block relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 to-transparent pointer-events-none" />
        <p className="text-sm font-sans tracking-wide text-sky-100/70 leading-snug relative z-10">
          "Welcome back, Boss. <span className="text-sky-50 font-medium">{neuroData.prophecy.prophecy}</span>"
        </p>
      </div>

      {/* Assistant Orb */}
      <div className="relative group">
        {/* Stark Tech Hologram Rings */}
        {isSpeaking && (
          <>
            <div className="absolute inset-[-4px] border border-sky-400/40 rounded-full animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-[-8px] border-t-2 border-r-2 border-cyan-400/30 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
            <div className="absolute inset-0 bg-sky-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
          </>
        )}
        
        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center border backdrop-blur-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-500 cursor-pointer z-10 relative overflow-hidden
            ${isSpeaking 
              ? 'bg-zinc-950 border-sky-400/60 scale-110 shadow-[0_0_30px_rgba(56,189,248,0.3)]' 
              : 'bg-zinc-950/80 border-white/10 hover:border-sky-500/30'}`}
        >
          {/* Inner core glow */}
          {isSpeaking && <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, transparent 70%)' }} />}

          {isSpeaking ? (
            <Cpu className="w-6 h-6 text-sky-400 animate-pulse relative z-10" />
          ) : (
            <Brain className="w-6 h-6 text-zinc-400 group-hover:text-sky-200 transition-colors relative z-10" />
          )}

          {/* Mute toggle indicator (shows on hover) */}
          <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-1 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
            {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-sky-400" />}
          </div>
        </button>
      </div>
    </div>
  )
}
