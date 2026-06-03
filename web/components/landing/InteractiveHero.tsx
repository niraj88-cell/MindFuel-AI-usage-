'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, Brain, TrendingDown, TrendingUp, Zap, BookOpen, Gamepad2, MessageCircle } from 'lucide-react'

// Preset scenarios users can click to instantly "try" the app
const PRESETS = [
  {
    id: 'doomscroll',
    text: 'I scrolled TikTok for 2 hours and now I feel exhausted and anxious',
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    color: '#ef4444',
  },
  {
    id: 'learning',
    text: 'Just finished a great podcast about habit formation',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: '#22c55e',
  },
  {
    id: 'gaming',
    text: 'Played video games for 3 hours instead of sleeping',
    icon: <Gamepad2 className="w-3.5 h-3.5" />,
    color: '#f59e0b',
  },
  {
    id: 'social',
    text: 'Got into a heated argument on Twitter and can\'t stop thinking about it',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    color: '#ef4444',
  },
]

// Simulated AI analysis results for each preset
const RESULTS: Record<string, {
  category: string
  categoryColor: string
  score: number
  scoreLabel: string
  scoreColor: string
  insight: string
  suggestion: string
}> = {
  doomscroll: {
    category: 'Doomscroll',
    categoryColor: '#ef4444',
    score: 25,
    scoreLabel: 'Draining',
    scoreColor: '#ef4444',
    insight: 'Extended passive scrolling correlates with increased anxiety. Your brain craves novelty but gets fatigued by the constant context-switching.',
    suggestion: 'Try a 10-minute walk to reset your baseline. Users who do this report feeling 40% better.',
  },
  learning: {
    category: 'Educational',
    categoryColor: '#22c55e',
    score: 85,
    scoreLabel: 'Energizing',
    scoreColor: '#22c55e',
    insight: 'Active learning content nourishes your mental state. You tend to feel most focused and creative after educational content.',
    suggestion: 'Great choice! Consider journaling one takeaway to strengthen retention.',
  },
  gaming: {
    category: 'Entertainment',
    categoryColor: '#f59e0b',
    score: 40,
    scoreLabel: 'Mixed',
    scoreColor: '#f59e0b',
    insight: 'Late-night gaming disrupts your sleep cycle. Moderate gaming is fine, but past midnight your recovery quality drops significantly.',
    suggestion: 'Set a gentle wind-down alarm 30 minutes before your ideal bedtime.',
  },
  social: {
    category: 'Doomscroll',
    categoryColor: '#ef4444',
    score: 15,
    scoreLabel: 'Harmful',
    scoreColor: '#ef4444',
    insight: 'Online conflicts activate your fight-or-flight response. The rumination afterwards can last hours and affect sleep quality.',
    suggestion: 'Mute the thread and write down how you actually feel. Getting it out of your head helps.',
  },
}

// Default result for custom text
const DEFAULT_RESULT = {
  category: 'Reflection',
  categoryColor: '#a1a1aa',
  score: 60,
  scoreLabel: 'Neutral',
  scoreColor: '#a1a1aa',
  insight: 'Thank you for sharing. Regular reflection helps MindFuel build a clearer picture of your patterns over time.',
  suggestion: 'Sign up to unlock personalized AI insights based on your unique patterns.',
}

export function InteractiveHero() {
  const router = useRouter()
  const [inputText, setInputText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<typeof DEFAULT_RESULT | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [progressWidth, setProgressWidth] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function handlePresetClick(preset: typeof PRESETS[0]) {
    setInputText(preset.text)
    setActivePreset(preset.id)
    setResult(null)
  }

  function handleAnalyze() {
    if (!inputText.trim()) return
    setAnalyzing(true)
    setResult(null)
    setProgressWidth(0)

    // Animate the progress bar with CSS transition
    setTimeout(() => {
      setProgressWidth(100)
    }, 50)

    // Show result after animation
    setTimeout(() => {
      setAnalyzing(false)
      setResult(activePreset ? (RESULTS[activePreset] || DEFAULT_RESULT) : DEFAULT_RESULT)
    }, 2200)
  }

  function handleReset() {
    setInputText('')
    setResult(null)
    setActivePreset(null)
    setAnalyzing(false)
    setProgressWidth(0)
  }

  return (
    <>
      {/* CTA buttons */}
      <div className="w-full max-w-xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <button 
          onClick={() => router.push('/signup')}
          className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-xl font-black text-sm sm:text-base hover:bg-zinc-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95"
        >
          Begin Your Map
        </button>
        <a 
          href="#try-demo"
          className="w-full sm:w-auto bg-zinc-900/50 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-sm sm:text-base hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 active:scale-95"
        >
          <Zap className="w-4 h-4" />
          Try it now — no signup
        </a>
      </div>

      <div className="flex items-center justify-center gap-2 mt-6 text-xs font-bold text-zinc-500 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
        <span>Free forever · Private by default · No credit card</span>
      </div>

      {/* Interactive Demo Section */}
      <div id="try-demo" className="w-full max-w-3xl mx-auto mt-20 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">
            <Zap className="w-3 h-3" /> Live Demo
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">See MindFuel in action</h2>
          <p className="text-zinc-500 mt-2 text-sm">Click a scenario below or type your own — watch the AI break it down instantly.</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          {/* Preset pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                disabled={analyzing}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 ${
                  activePreset === preset.id
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {preset.icon}
                <span className="hidden sm:inline">{preset.text.length > 40 ? preset.text.slice(0, 40) + '…' : preset.text}</span>
                <span className="sm:hidden">{preset.text.length > 25 ? preset.text.slice(0, 25) + '…' : preset.text}</span>
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setActivePreset(null) }}
              placeholder="What did you just consume? How are you feeling?..."
              disabled={analyzing || !!result}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 resize-none disabled:opacity-60 transition-colors"
            />
          </div>

          {/* Analyze button */}
          {!result && !analyzing && (
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
              className="mt-4 w-full py-4 bg-white text-black font-black text-sm rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Analyze with AI
            </button>
          )}

          {/* Analyzing state — breathing animation with progress */}
          {analyzing && (
            <div className="mt-6 flex flex-col items-center gap-5 py-4">
              <div className="relative flex items-center justify-center w-14 h-14">
                <div className="absolute w-full h-full bg-white/10 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="absolute w-10 h-10 bg-white/20 rounded-full animate-pulse" style={{ animationDuration: '1.5s' }} />
                <div className="w-6 h-6 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full transition-all ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ width: `${progressWidth}%`, transitionDuration: '2000ms' }}
                />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">Understanding your thoughts...</span>
            </div>
          )}

          {/* Result card */}
          {result && (
            <div className="mt-6 space-y-4 animate-fade-in-up">
              {/* Score + Category header */}
              <div className="flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  {/* Score ring */}
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <circle
                        cx="32" cy="32" r="28"
                        fill="none"
                        stroke={result.scoreColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${result.score * 1.76} 176`}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-black text-white">{result.score}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-black text-lg">Mental Score</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ color: result.scoreColor, background: `${result.scoreColor}15` }}
                      >
                        {result.scoreLabel}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-zinc-400"
                      >
                        {result.category}
                      </span>
                    </div>
                  </div>
                </div>
                {result.score >= 60 ? (
                  <TrendingUp className="w-6 h-6 text-emerald-400 opacity-40" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-400 opacity-40" />
                )}
              </div>

              {/* AI Insight */}
              <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">AI Insight</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{result.insight}</p>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-zinc-500 leading-relaxed">💡 {result.suggestion}</p>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/signup')}
                  className="flex-1 py-4 bg-white text-black font-black text-sm rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Start tracking for free <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="py-4 px-6 bg-white/5 border border-white/10 text-zinc-400 font-bold text-sm rounded-2xl hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                >
                  Try another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
