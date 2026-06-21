// app/(app)/onboarding/page.tsx — 3-Step Activation Onboarding
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Network, ArrowRight, Loader2, Smartphone, Eye,
  BatteryLow, HelpCircle, Camera, Play,
  MessageCircle, Globe, Newspaper, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/mixpanel'

const GOALS = [
  { id: 'scroll_less', label: 'I scroll too much', icon: Smartphone, desc: 'Break the autopilot loop' },
  { id: 'cant_focus', label: "I can't focus", icon: Eye, desc: 'Reclaim your attention' },
  { id: 'feel_drained', label: 'I feel drained after screens', icon: BatteryLow, desc: 'Understand the mental cost' },
  { id: 'curious', label: 'Just curious', icon: HelpCircle, desc: 'See what your habits reveal' },
]

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Camera, color: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', icon: Smartphone, color: '#00f2ea' },
  { id: 'youtube', label: 'YouTube', icon: Play, color: '#FF0000' },
  { id: 'twitter', label: 'Twitter/X', icon: MessageCircle, color: '#1DA1F2' },
  { id: 'reddit', label: 'Reddit', icon: Globe, color: '#FF4500' },
  { id: 'news', label: 'News', icon: Newspaper, color: '#64748b' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  function togglePlatform(id: string) {
    setSelectedPlatforms(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    )
  }

  async function handleComplete() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
      })
      .eq('id', user.id)

    trackEvent('Onboarding Completed', {
      goal: selectedGoal,
      platforms: selectedPlatforms,
    })
    router.push('/log')
  }

  const goalMessages: Record<string, string> = {
    scroll_less: "We'll help you see the real cost of every scroll session.",
    cant_focus: "We'll track what fragments your attention — and what restores it.",
    feel_drained: "We'll connect the dots between content and how you feel.",
    curious: "We'll show you patterns you've never noticed.",
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4] via-[#FAF8F4] to-[#F5F7F6] opacity-60" />
      </div>

      {/* Progress Dots */}
      <div className="relative z-10 flex items-center gap-2 mb-12">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-[#111827]' : i < step ? 'w-4 bg-[#4CAF50]' : 'w-4 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Step 0: Goal */}
        {step === 0 && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl text-[#111827] tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                What brings you here?
              </h1>
              <p className="text-[#4B5563] mt-3">This helps us personalize your experience.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {GOALS.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => { setSelectedGoal(goal.id); setStep(1) }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-black/[0.04] hover:border-black/[0.1] hover:shadow-md transition-all text-left cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#F5F7F6] border border-black/[0.04] flex items-center justify-center shrink-0 group-hover:bg-[#111827] transition-colors">
                    <goal.icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-[#111827]">{goal.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{goal.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-[#111827] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Platforms */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl text-[#111827] tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                Which platforms pull you in?
              </h1>
              <p className="text-[#4B5563] mt-3">Select up to 3. We'll start tracking these.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map(p => {
                const selected = selectedPlatforms.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#111827] border-[#111827] text-white shadow-md'
                        : 'bg-white border-black/[0.04] text-[#111827] hover:border-black/[0.1] hover:shadow-sm'
                    }`}
                  >
                    <p.icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-400'}`} />
                    <span className="font-medium text-sm">{p.label}</span>
                    {selected && <Check className="w-4 h-4 ml-auto text-[#4CAF50]" />}
                  </button>
                )
              })}
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={selectedPlatforms.length === 0}
              className="w-full h-14 bg-[#111827] text-white font-semibold rounded-2xl hover:bg-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <button
              onClick={() => setStep(0)}
              className="w-full text-center text-sm text-gray-400 hover:text-[#111827] transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 2: Ready */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in-up text-center">
            <div className="w-20 h-20 bg-[#F5F7F6] rounded-2xl flex items-center justify-center mx-auto border border-black/[0.04] shadow-sm">
              <Network className="w-10 h-10 text-[#111827]" />
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl text-[#111827] tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                You're all set.
              </h1>
              <p className="text-[#4B5563] mt-3 max-w-sm mx-auto">
                {selectedGoal ? goalMessages[selectedGoal] : "Let's see what your habits reveal."}
              </p>
              <p className="text-sm text-gray-400 mt-6">
                Log 3 entries to unlock your first content pattern.
              </p>
            </div>

            <Button
              onClick={handleComplete}
              disabled={loading}
              className="w-full h-14 bg-[#111827] text-white font-semibold rounded-2xl hover:bg-[#1f2937] mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log your first moment'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>

            <button
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-gray-400 hover:text-[#111827] transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
