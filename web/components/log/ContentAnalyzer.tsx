// components/log/ContentAnalyzer.tsx
// Enhanced with Quick Category Presets, Voice Input, and richer analysis display
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search, Loader2, ArrowRight, Zap, ExternalLink, Mic, MicOff,
  Camera, Play, Newspaper, Smartphone, MessageCircle,
  Headphones, BookOpen, Code, Gamepad2, Sparkles, TrendingUp,
  BarChart3, Clock, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getScoreColor, getScoreLabel, getCategoryEmoji } from '@/lib/utils'
import { trackEvent } from '@/lib/mixpanel'

interface AnalysisResult {
  category: string
  mental_score: number
  summary: string
  reasoning: string
  tags: string[]
  is_junk: boolean
  time_well_spent: boolean
  // Intelligence fields
  severity: 'critical' | 'warning' | 'moderate' | 'safe' | 'excellent'
  confidence: number
  impact_analysis: {
    mood_shift: string
    cognitive_load: string
    habit_risk: string
    time_quality: string
  }
  root_causes: Array<{ reason: string; evidence: string; confidence: number }>
  copilot_actions: Array<{ action: string; reason: string; impact: string; confidence: number }>
  missing_context?: string[]
}

interface Alternative {
  title: string
  description: string
  category: string
  estimated_score: number
  duration_minutes: number
  type: string
  url?: string
  url_hint?: string
  provider?: string
  why_better: string
  relevance_score?: number
  expected_outcome?: string
}

interface ContentAnalyzerProps {
  onAnalyzed?: (result: AnalysisResult, content: string) => void
}

// Quick category presets for one-tap logging
const QUICK_CATEGORIES = [
  { id: 'instagram', label: 'Instagram', icon: <Camera className="w-4 h-4" />, text: 'Scrolling Instagram feed and reels', color: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', icon: <Smartphone className="w-4 h-4" />, text: 'Watching TikTok videos', color: '#00f2ea' },
  { id: 'youtube', label: 'YouTube', icon: <Play className="w-4 h-4" />, text: 'Watching YouTube videos', color: '#FF0000' },
  { id: 'twitter', label: 'Twitter/X', icon: <MessageCircle className="w-4 h-4" />, text: 'Scrolling Twitter/X timeline', color: '#1DA1F2' },
  { id: 'news', label: 'News', icon: <Newspaper className="w-4 h-4" />, text: 'Reading news articles online', color: '#64748b' },
  { id: 'podcast', label: 'Podcast', icon: <Headphones className="w-4 h-4" />, text: 'Listening to a podcast episode', color: '#10b981' },
  { id: 'reading', label: 'Book', icon: <BookOpen className="w-4 h-4" />, text: 'Reading a book or long-form article', color: '#6366f1' },
  { id: 'coding', label: 'Coding', icon: <Code className="w-4 h-4" />, text: 'Writing code or working on a project', color: '#22d3ee' },
  { id: 'gaming', label: 'Gaming', icon: <Gamepad2 className="w-4 h-4" />, text: 'Playing video games', color: '#f59e0b' },
]

export function ContentAnalyzer({ onAnalyzed }: ContentAnalyzerProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [alternatives, setAlternatives] = useState<Alternative[]>([])
  const [error, setError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [dailyLogsRemaining, setDailyLogsRemaining] = useState<number | null>(null)
  const [showQuickPresets, setShowQuickPresets] = useState(true)
  const [showDetailedReasoning, setShowDetailedReasoning] = useState(false)

  // Voice input
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setVoiceSupported(!!SR)
    }
  }, [])

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      if (final) {
        setContent(prev => prev + final)
        setInterimTranscript('')
      } else {
        setInterimTranscript(interim)
      }
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    trackEvent('Voice Input Started', { context: 'content_analyzer' })
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  function handleQuickCategory(text: string) {
    setContent(text)
    setShowQuickPresets(false)
    // Auto-analyze after selecting preset
    setTimeout(() => handleAnalyze(text), 100)
  }

  async function handleAnalyze(overrideContent?: string) {
    const textToAnalyze = overrideContent || content
    if (!textToAnalyze.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setAlternatives([])
    setLimitReached(false)
    setShowDetailedReasoning(false)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToAnalyze.trim() }),
      })

      const data = await res.json()

      if (res.status === 403 && data.limitReached) {
        setLimitReached(true)
        setError(data.message || 'Daily log limit reached. Upgrade to continue.')
        return
      }

      if (res.status === 429) {
        setError('You\'re analyzing too fast. Please wait a moment and try again.')
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data.analysis)
      if (data.alternatives) setAlternatives(data.alternatives)
      if (data.dailyLogsRemaining !== undefined) setDailyLogsRemaining(data.dailyLogsRemaining)
      onAnalyzed?.(data.analysis, textToAnalyze.trim())
      trackEvent('Content Analyzed', { 
        category: data.analysis?.category,
        score: data.analysis?.mental_score,
        source: overrideContent ? 'quick_preset' : 'manual',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Quick Category Presets — One-tap buttons */}
      {showQuickPresets && !result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-indigo-400" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Quick Scan</span>
            <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">One-Tap</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleQuickCategory(cat.text)}
                disabled={loading}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/30 border border-white/5 hover:border-indigo-500/20 transition-all text-sm disabled:opacity-50"
              >
                <span style={{ color: cat.color }} className="group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-slate-400 font-bold group-hover:text-white transition-colors text-xs">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input with Voice support */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <Input
              id="content-input"
              placeholder={isListening ? 'Listening... speak now' : 'Paste a URL, describe content, or use Quick Scan above...'}
              value={content + (interimTranscript ? ` ${interimTranscript}` : '')}
              onChange={(e) => { setContent(e.target.value); setShowQuickPresets(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className={`pl-10 h-12 text-base ${isListening ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : ''}`}
            />
            {isListening && (
              <div className="absolute right-14 top-1/2 -translate-y-1/2 flex gap-1">
                <div className="w-1.5 h-3 bg-indigo-500 rounded-full animate-pulse" />
                <div className="w-1.5 h-4 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              </div>
            )}
          </div>

          {/* Voice Button */}
          {voiceSupported && (
            <Button
              onClick={isListening ? stopListening : startListening}
              variant="outline"
              className={`h-12 w-12 shrink-0 transition-all ${
                isListening 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                  : 'hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}

          <Button
            id="analyze-button"
            onClick={() => handleAnalyze()}
            disabled={loading || !content.trim()}
            className="h-12 px-6"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Analyze Content <Zap className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Show quick presets toggle if hidden */}
        {!showQuickPresets && !result && (
          <button
            onClick={() => setShowQuickPresets(true)}
            className="text-xs text-slate-600 hover:text-indigo-400 transition-colors font-bold"
          >
            ← Show quick presets
          </button>
        )}
      </div>

      {/* Remaining daily logs indicator */}
      {dailyLogsRemaining !== null && dailyLogsRemaining >= 0 && !limitReached && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500">
            {dailyLogsRemaining === 0 
              ? 'Last free analysis for today'
              : `${dailyLogsRemaining} free ${dailyLogsRemaining === 1 ? 'analysis' : 'analyses'} remaining today`
            }
          </span>
          <a href="/subscription" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Upgrade for unlimited →
          </a>
        </div>
      )}

      {/* Error / Limit Reached */}
      {error && (
        <div className={`p-4 rounded-2xl text-sm ${
          limitReached 
            ? 'bg-amber-500/10 border border-amber-500/20' 
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <p className={limitReached ? 'text-amber-400 font-medium' : 'text-red-400'}>
            {error}
          </p>
          {limitReached && (
            <a
              href="/subscription"
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all"
            >
              <Zap className="w-3 h-3" /> Upgrade to Platinum
            </a>
          )}
        </div>
      )}

      {/* Enhanced Analysis Result */}
      {result && (
        <div className="animate-fade-in-up space-y-4">
          {/* Main Score Card */}
          <Card className="overflow-hidden border-none shadow-2xl">
            <div
              className="h-1.5"
              style={{ background: `linear-gradient(to right, ${getScoreColor(result.mental_score)}, transparent)` }}
            />
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
                    style={{
                      background: `${getScoreColor(result.mental_score)}15`,
                      color: getScoreColor(result.mental_score),
                      boxShadow: `0 8px 24px ${getScoreColor(result.mental_score)}20`,
                    }}
                  >
                    {result.mental_score}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-black text-white">{getScoreLabel(result.mental_score)}</span>
                      <span className={`category-pill category-${result.category}`}>
                        {getCategoryEmoji(result.category)} {result.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 max-w-md">{result.summary}</p>
                  </div>
                </div>
                {(result.time_well_spent || result.mental_score > 70) ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                    <TrendingUp className="w-3 h-3 mr-1" /> Time Well Spent ✓
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0">
                    <BarChart3 className="w-3 h-3 mr-1" /> Could Be Better
                  </Badge>
                )}
              </div>

              {/* Mental Impact Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mental Nutrition Level</span>
                  <span className="text-xs font-bold" style={{ color: getScoreColor(result.mental_score) }}>
                    {result.mental_score}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${result.mental_score}%`,
                      background: `linear-gradient(90deg, ${getScoreColor(result.mental_score)}, ${getScoreColor(result.mental_score)}80)`,
                    }}
                  />
                </div>
              </div>

              {/* Expandable Reasoning */}
              <button
                onClick={() => setShowDetailedReasoning(!showDetailedReasoning)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-400 transition-colors font-bold"
              >
                {showDetailedReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetailedReasoning ? 'Hide' : 'Show'} AI Reasoning
              </button>
              {showDetailedReasoning && (
                <p className="text-xs text-slate-500 mt-2 p-3 bg-slate-800/30 rounded-xl italic leading-relaxed border border-white/5">
                  {result.reasoning}
                </p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {result.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Smart Swap Suggestions */}
          {alternatives.length > 0 && result.is_junk && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                <h4 className="text-sm font-black text-white uppercase tracking-widest">Smart Swap</h4>
                <span className="text-[9px] font-black text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 ml-auto">AI Matched</span>
              </div>
              <div className="grid gap-2">
                {alternatives.map((alt, i) => {
                  const hasUrl = alt.url && alt.url.startsWith('http')
                  const Wrapper = hasUrl ? 'a' : 'div'
                  const wrapperProps = hasUrl ? { href: alt.url, target: '_blank', rel: 'noopener noreferrer' } : {}
                  return (
                    <Wrapper
                      key={i}
                      {...wrapperProps as any}
                      className="glass-card p-4 flex items-center gap-4 hover:border-white/20 transition-all duration-200 group cursor-pointer"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: `${getScoreColor(alt.estimated_score)}15` }}
                      >
                        {getCategoryEmoji(alt.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{alt.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-white/5 text-zinc-400 border-white/10">
                            {alt.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-emerald-500/5 text-emerald-400 border-emerald-500/20">
                            +{alt.estimated_score - result.mental_score} pts
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{alt.why_better}</p>
                        {alt.provider && (
                          <p className="text-[10px] text-zinc-600 mt-0.5 font-bold">{alt.provider} · {alt.duration_minutes}min</p>
                        )}
                      </div>
                      {hasUrl && (
                        <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0" />
                      )}
                    </Wrapper>
                  )
                })}
              </div>
            </div>
          )}

          {/* New Analysis button */}
          <button
            onClick={() => {
              setResult(null)
              setAlternatives([])
              setContent('')
              setShowQuickPresets(true)
              setShowDetailedReasoning(false)
            }}
            className="text-xs text-slate-600 hover:text-indigo-400 transition-colors font-bold"
          >
            ← Analyze something else
          </button>
        </div>
      )}
    </div>
  )
}
