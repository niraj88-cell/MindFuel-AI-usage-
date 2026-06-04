'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Sparkles, Brain, Volume2, VolumeX } from 'lucide-react'

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
      
      const greeting = `Hello Boss. ${neuroData.prophecy.prophecy}`
      
      const utterance = new SpeechSynthesisUtterance(greeting)
      
      // Try to find a premium/calm voice (e.g. Daniel on Mac, or a good Google voice)
      const voices = synthRef.current.getVoices()
      const preferredVoice = voices.find(v => 
        v.name.includes('Daniel') || 
        v.name.includes('Google UK English Male') ||
        (v.lang.startsWith('en') && v.name.includes('Male'))
      )
      
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
      
      utterance.rate = 0.95 // slightly slower for a calmer feel
      utterance.pitch = 0.9 // slightly deeper
      
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
    <div className={`fixed bottom-6 right-6 z-50 flex items-end gap-4 transition-all duration-500 ease-in-out ${isSpeaking ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-90 hover:opacity-100'}`}>
      
      {/* Thought Bubble */}
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl max-w-[280px] hidden sm:block">
        <p className="text-sm font-serif text-zinc-300 leading-snug">
          "Hello Boss. <span className="text-white">{neuroData.prophecy.prophecy}</span>"
        </p>
      </div>

      {/* Assistant Orb */}
      <div className="relative group">
        {/* Pulsing rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-[-8px] border border-emerald-500/30 rounded-full animate-pulse" />
          </>
        )}
        
        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center border backdrop-blur-xl shadow-2xl transition-all cursor-pointer z-10 relative
            ${isSpeaking 
              ? 'bg-zinc-900 border-emerald-500/50 scale-105' 
              : 'bg-zinc-900/80 border-white/10 hover:border-white/20'}`}
        >
          {isSpeaking ? (
            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
          ) : (
            <Brain className="w-6 h-6 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          )}

          {/* Mute toggle indicator (shows on hover) */}
          <div className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-1 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-zinc-400" />}
          </div>
        </button>
      </div>
    </div>
  )
}
