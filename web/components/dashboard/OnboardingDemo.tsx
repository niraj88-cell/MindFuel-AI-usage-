// components/dashboard/OnboardingDemo.tsx
// First-time user onboarding — interactive demo showing MindFuel's value
// Shows a guided walkthrough with a demo log to illustrate the full flow
'use client'

import React, { useState, useEffect } from 'react'
import {
  Brain, Zap, ArrowRight, CheckCircle2, Sparkles,
  BarChart3, MessageCircle, Trophy, X, ChevronRight
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/mixpanel'

interface OnboardingDemoProps {
  onComplete?: () => void
}

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to MindFuel',
    subtitle: 'Your AI-powered mental nutrition tracker',
    description: 'MindFuel analyzes your digital content consumption and shows you exactly how it affects your mood, focus, and mental wellbeing.',
    icon: Brain,
    color: '#6366f1',
    features: [
      'AI-powered content analysis',
      'Mood tracking & correlations',
      'Personalized wellness coaching',
      'Habit challenges & streaks',
    ],
  },
  {
    title: 'Quick Log — 1 Tap',
    subtitle: 'The easiest way to track',
    description: "See the ⚡ button at the bottom right? That's your Quick Log. Just tap a category like 'Instagram' or 'YouTube' and we'll handle the rest — instant analysis, no typing needed.",
    icon: Zap,
    color: '#10b981',
    features: [
      'One-tap preset categories',
      'Voice input — just speak',
      'AI categorizes automatically',
      'Instant insight after every log',
    ],
  },
  {
    title: 'Deep Analysis',
    subtitle: 'Paste any URL or describe content',
    description: "For deeper analysis, go to Log Content and paste a URL or describe what you consumed. Our AI gives you a mental nutrition score from 1-100 with specific psychological reasoning.",
    icon: BarChart3,
    color: '#f59e0b',
    features: [
      'URL scanning with metadata extraction',
      'Mental nutrition score (1-100)',
      'Smart swap suggestions',
      'Before/after mood tracking',
    ],
  },
  {
    title: 'AI Coach & Insights',
    subtitle: 'Your personal wellness guide',
    description: "As you log more, MindFuel's AI finds patterns — like 'Instagram after 8 PM drops your mood by 2 points.' The AI Coach gives personalized, evidence-based advice.",
    icon: MessageCircle,
    color: '#8b5cf6',
    features: [
      'Pattern detection across mood & content',
      'Time-of-day correlations',
      'Evidence-based recommendations',
      'Daily coaching messages',
    ],
  },
]

export function OnboardingDemo({ onComplete }: OnboardingDemoProps) {
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    checkOnboarding()
  }, [])

  async function checkOnboarding() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if user has any logs — if 0 logs, show onboarding
    const { count } = await supabase
      .from('mental_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Also check localStorage for dismissal
    const dismissedKey = `mindfuel_onboarding_${user.id}`
    const wasDismissed = typeof window !== 'undefined' && localStorage.getItem(dismissedKey)

    if ((count === null || count === 0) && !wasDismissed) {
      setShouldShow(true)
      trackEvent('Onboarding Shown')
    }
  }

  async function handleComplete() {
    setCompleting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const dismissedKey = `mindfuel_onboarding_${user.id}`
      localStorage.setItem(dismissedKey, 'true')
    }
    trackEvent('Onboarding Completed', { steps_viewed: step + 1 })
    setShouldShow(false)
    onComplete?.()
  }

  function handleDismiss() {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        localStorage.setItem(`mindfuel_onboarding_${user.id}`, 'true')
      }
    })
    trackEvent('Onboarding Dismissed', { step })
    setDismissed(true)
    setShouldShow(false)
    onComplete?.()
  }

  if (!shouldShow || dismissed) return null

  const currentStep = ONBOARDING_STEPS[step]
  const isLast = step === ONBOARDING_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleDismiss} />

      <div className="relative w-full max-w-lg animate-fade-in-up">
        {/* Glow */}
        <div
          className="absolute -inset-2 rounded-[40px] blur-xl opacity-30"
          style={{ background: `radial-gradient(ellipse, ${currentStep.color}40, transparent 70%)` }}
        />

        <Card className="relative bg-slate-900 border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
          {/* Progress Bar */}
          <div className="flex gap-1 p-4 pb-0">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{
                  background: i <= step ? currentStep.color : 'rgba(255,255,255,0.05)',
                }}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8 pt-6 space-y-6">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: `${currentStep.color}15`,
                boxShadow: `0 8px 24px ${currentStep.color}20`,
              }}
            >
              <currentStep.icon
                className="w-8 h-8"
                style={{ color: currentStep.color }}
              />
            </div>

            {/* Title */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: currentStep.color }}>
                Step {step + 1} of {ONBOARDING_STEPS.length}
              </p>
              <h2 className="text-2xl font-black text-white tracking-tight">{currentStep.title}</h2>
              <p className="text-sm text-slate-400 font-bold mt-1">{currentStep.subtitle}</p>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed">{currentStep.description}</p>

            {/* Features */}
            <div className="space-y-2">
              {currentStep.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/3 animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: currentStep.color }} />
                  <span className="text-sm text-slate-300 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Skip
                </button>
              </div>

              {isLast ? (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${currentStep.color}, ${currentStep.color}cc)`,
                    boxShadow: `0 8px 24px ${currentStep.color}30`,
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${currentStep.color}, ${currentStep.color}cc)`,
                    boxShadow: `0 8px 24px ${currentStep.color}30`,
                  }}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
