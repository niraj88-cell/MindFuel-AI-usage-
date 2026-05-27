// components/dashboard/QuickLogFAB.tsx
// Floating Action Button for one-tap quick logging with voice input support
// Appears on dashboard — minimal friction, maximum data capture
'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus, X, Mic, MicOff, Loader2, CheckCircle2,
  Camera, Play, Newspaper, MessageCircle,
  Gamepad2, BookOpen, Headphones, Code, Palette,
  Smartphone, Zap, TrendingUp, Sparkles, Clock
} from 'lucide-react'
import { getMoodEmoji } from '@/lib/utils'
import { trackEvent } from '@/lib/mixpanel'

interface QuickPreset {
  id: string
  label: string
  icon: React.ReactNode
  category: string
  color: string
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'instagram_scroll', label: 'Instagram', icon: <Camera className="w-5 h-5" />, category: 'doomscroll', color: '#E1306C' },
  { id: 'tiktok_scroll', label: 'TikTok', icon: <Smartphone className="w-5 h-5" />, category: 'doomscroll', color: '#00f2ea' },
  { id: 'youtube_video', label: 'YouTube', icon: <Play className="w-5 h-5" />, category: 'entertainment', color: '#FF0000' },
  { id: 'youtube_shorts', label: 'YT Shorts', icon: <Play className="w-5 h-5" />, category: 'doomscroll', color: '#ff4444' },
  { id: 'twitter_scroll', label: 'Twitter/X', icon: <MessageCircle className="w-5 h-5" />, category: 'doomscroll', color: '#1DA1F2' },
  { id: 'news_article', label: 'News', icon: <Newspaper className="w-5 h-5" />, category: 'neutral', color: '#64748b' },
  { id: 'reddit_browse', label: 'Reddit', icon: <MessageCircle className="w-5 h-5" />, category: 'entertainment', color: '#FF4500' },
  { id: 'podcast_listen', label: 'Podcast', icon: <Headphones className="w-5 h-5" />, category: 'educational', color: '#10b981' },
  { id: 'reading_book', label: 'Reading', icon: <BookOpen className="w-5 h-5" />, category: 'educational', color: '#6366f1' },
  { id: 'online_course', label: 'Course', icon: <TrendingUp className="w-5 h-5" />, category: 'educational', color: '#8b5cf6' },
  { id: 'gaming', label: 'Gaming', icon: <Gamepad2 className="w-5 h-5" />, category: 'entertainment', color: '#f59e0b' },
  { id: 'work_focus', label: 'Deep Work', icon: <Code className="w-5 h-5" />, category: 'productive', color: '#22d3ee' },
]

interface InsightResponse {
  message: string
  emoji: string
  suggestion: string
  scoreLabel: string
}

interface QuickLogFABProps {
  onLogSaved?: () => void
}

export function QuickLogFAB({ onLogSaved }: QuickLogFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [mood, setMood] = useState(5)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [insight, setInsight] = useState<InsightResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Check voice support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setVoiceSupported(!!SpeechRecognition)
    }
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ')
      setVoiceText(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    trackEvent('Voice Input Started')
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  async function handleQuickLog(presetId?: string) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: presetId || undefined,
          mood,
          voiceText: voiceText || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || data.message || 'Failed to save')
        return
      }

      setInsight(data.instantInsight)
      setSaved(true)
      setSelectedPreset(null)
      setVoiceText('')
      trackEvent('Quick Log Created', { preset: presetId || 'voice', score: data.analysis?.mental_score })
      onLogSaved?.()

      // Auto-close after 3s
      setTimeout(() => {
        setSaved(false)
        setInsight(null)
        setIsOpen(false)
      }, 4000)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setIsOpen(false)
    setSelectedPreset(null)
    setSaved(false)
    setInsight(null)
    setError(null)
    setVoiceText('')
    if (isListening) stopListening()
  }

  // FAB button
  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); trackEvent('Quick Log FAB Opened') }}
        className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        aria-label="Quick Log"
        id="quick-log-fab"
      >
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
      </button>
    )
  }

  // Success state with instant insight
  if (saved && insight) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-[32px] p-8 animate-fade-in-up shadow-2xl">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-white">Logged! ✨</h3>
            
            {/* Instant Insight Card */}
            <div className="bg-slate-800/50 rounded-2xl p-5 text-left border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{insight.emoji}</span>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Instant Insight</span>
              </div>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">{insight.message}</p>
              <div className="mt-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <p className="text-xs text-slate-500">{insight.suggestion}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Quick Log Panel
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden animate-fade-in-up shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Quick Log</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">One-tap capture</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Quick Mood Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">How are you feeling?</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl transition-all duration-200">{getMoodEmoji(mood)}</span>
                <span className="text-lg font-black tabular-nums w-6 text-center text-white">{mood}</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={mood}
              onChange={(e) => setMood(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 px-1">
              <span>Very Low</span>
              <span>Neutral</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Voice Input */}
          {voiceSupported && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="w-3 h-3 text-indigo-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Voice Log</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    isListening
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                      : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:border-indigo-500/30 hover:text-indigo-400'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isListening ? 'Stop' : 'Speak'}
                </button>
                {voiceText && (
                  <div className="flex-1 bg-slate-800/30 rounded-xl px-4 py-3 text-sm text-slate-300 border border-white/5">
                    "{voiceText}"
                  </div>
                )}
              </div>
              {voiceText && (
                <button
                  onClick={() => handleQuickLog()}
                  disabled={saving}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Log Voice Entry
                </button>
              )}
            </div>
          )}

          {/* Preset Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">What did you just do?</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {QUICK_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleQuickLog(preset.id)}
                  disabled={saving}
                  className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-800/30 border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ '--preset-color': preset.color } as React.CSSProperties}
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${preset.color}15`, color: preset.color }}
                  >
                    {preset.icon}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors text-center leading-tight">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-[32px] transition-opacity duration-500">
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex items-center justify-center w-16 h-16">
                <div className="absolute w-full h-full bg-indigo-500/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="absolute w-12 h-12 bg-indigo-500/40 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="w-8 h-8 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
              </div>
              <span className="text-xs font-black text-indigo-300 uppercase tracking-widest animate-pulse">Gathering your thoughts...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
