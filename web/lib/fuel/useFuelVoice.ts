// lib/fuel/useFuelVoice.ts
// Reusable voice hook for Fuel. Any component calls speak() and Fuel talks.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseFuelVoiceReturn {
  speak: (text: string) => void
  stop: () => void
  isSpeaking: boolean
  isMuted: boolean
  toggleMute: () => void
}

export function useFuelVoice(): UseFuelVoiceReturn {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Setup browser synth
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis

      const selectVoice = () => {
        const voices = window.speechSynthesis.getVoices()
        const priority = ['Samantha', 'Karen', 'Fiona', 'Daniel', 'Google UK English']
        for (const name of priority) {
          const match = voices.find(v => v.name.includes(name))
          if (match) {
            voiceRef.current = match
            return
          }
        }
        const english = voices.find(v => v.lang.startsWith('en'))
        if (english) voiceRef.current = english
      }

      selectVoice()
      window.speechSynthesis.onvoiceschanged = selectVoice
    }

    // Setup audio element for ElevenLabs
    audioRef.current = new Audio()
    audioRef.current.onplay = () => setIsSpeaking(true)
    audioRef.current.onended = () => setIsSpeaking(false)
    audioRef.current.onerror = () => setIsSpeaking(false)

    // Restore mute preference
    const saved = localStorage.getItem('fuel_muted')
    if (saved === 'true') setIsMuted(true)

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (isMuted) return

    const mode = localStorage.getItem('fuel_voice_mode') || 'browser'

    if (mode === 'elevenlabs' && audioRef.current) {
      // Premium Voice via API
      try {
        setIsSpeaking(true) // Optimistic
        const res = await fetch('/api/fuel/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        })
        
        if (!res.ok) {
          throw new Error('ElevenLabs failed')
        }
        
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        audioRef.current.src = url
        audioRef.current.play()
        return
      } catch (e) {
        console.error('Premium voice failed, falling back to browser', e)
        // Fallback to browser voice below
      }
    }

    // Standard Browser Voice
    if (synthRef.current) {
      synthRef.current.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      if (voiceRef.current) utterance.voice = voiceRef.current
      utterance.rate = 1.05
      utterance.pitch = 1.1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      synthRef.current.speak(utterance)
    }
  }, [isMuted])

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsSpeaking(false)
  }, [])

  const toggleMute = useCallback(() => {
    stop()
    setIsMuted(prev => {
      const next = !prev
      localStorage.setItem('fuel_muted', String(next))
      return next
    })
  }, [stop])

  return { speak, stop, isSpeaking, isMuted, toggleMute }
}
