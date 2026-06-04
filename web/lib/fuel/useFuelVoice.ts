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

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    synthRef.current = window.speechSynthesis

    // Load and select the best voice
    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      // Priority order: premium female AI voices first, then quality male voices
      const priority = ['Samantha', 'Karen', 'Fiona', 'Daniel', 'Google UK English']
      for (const name of priority) {
        const match = voices.find(v => v.name.includes(name))
        if (match) {
          voiceRef.current = match
          return
        }
      }
      // Fallback: first English voice
      const english = voices.find(v => v.lang.startsWith('en'))
      if (english) voiceRef.current = english
    }

    selectVoice()
    window.speechSynthesis.onvoiceschanged = selectVoice

    // Restore mute preference
    const saved = localStorage.getItem('fuel_muted')
    if (saved === 'true') setIsMuted(true)

    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!synthRef.current || isMuted) return

    // Cancel any current speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    if (voiceRef.current) {
      utterance.voice = voiceRef.current
    }

    utterance.rate = 1.05
    utterance.pitch = 1.1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthRef.current.speak(utterance)
  }, [isMuted])

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (isSpeaking && synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
    setIsMuted(prev => {
      const next = !prev
      localStorage.setItem('fuel_muted', String(next))
      return next
    })
  }, [isSpeaking])

  return { speak, stop, isSpeaking, isMuted, toggleMute }
}
