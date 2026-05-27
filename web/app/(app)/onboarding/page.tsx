'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ArrowRight, Loader2, Target, Smartphone, Bell, Heart, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/mixpanel'

const STEPS = [
  { id: 'app', title: 'What drains your energy most?', icon: Smartphone },
  { id: 'goal', title: 'What is your primary goal?', icon: Target },
  { id: 'mood', title: 'How is your baseline mood lately?', icon: Heart },
  { id: 'finish', title: 'Ready to fuel your mind?', icon: Brain }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState({
    drainingApp: '',
    primaryGoal: '',
    baselineMood: 5,
  })

  async function handleComplete() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        content_regret: data.drainingApp,
        // we can store goal in metadata if needed, but for now we just set onboarding_completed
      })
      .eq('id', user.id)

    if (updateError) {
      console.error(updateError)
      setError('Failed to save your preferences.')
      setLoading(false)
      return
    }

    trackEvent('Onboarding Completed', data)
    router.push('/dashboard')
  }

  const renderStep = () => {
    switch(step) {
      case 0:
        return (
          <div className="space-y-4 animate-fade-in-up">
            {['Instagram Reels', 'TikTok', 'Twitter / X', 'YouTube Shorts', 'News & Politics'].map(app => (
              <button
                key={app}
                onClick={() => { setData({ ...data, drainingApp: app }); setStep(1) }}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-white/10 text-left hover:bg-zinc-800 transition-all font-bold text-white flex items-center justify-between"
              >
                {app}
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </button>
            ))}
          </div>
        )
      case 1:
        return (
          <div className="space-y-4 animate-fade-in-up">
            {['Save 1+ hour daily', 'Improve my sleep', 'Reduce anxiety', 'Deepen my focus'].map(goal => (
              <button
                key={goal}
                onClick={() => { setData({ ...data, primaryGoal: goal }); setStep(2) }}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-white/10 text-left hover:bg-zinc-800 transition-all font-bold text-white flex items-center justify-between"
              >
                {goal}
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </button>
            ))}
          </div>
        )
      case 2:
        return (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between px-2">
              <span className="text-2xl">😫</span>
              <span className="text-2xl">😐</span>
              <span className="text-2xl">🚀</span>
            </div>
            <input 
              type="range" 
              min="1" max="10" 
              value={data.baselineMood}
              onChange={(e) => setData({ ...data, baselineMood: parseInt(e.target.value) })}
              className="w-full accent-white"
            />
            <Button 
              onClick={() => setStep(3)}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold"
            >
              Continue
            </Button>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6 animate-fade-in-up text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-zinc-400">
              We've tailored your dashboard. MindFuel will now help you break your <span className="text-white font-bold">{data.drainingApp}</span> habit and <span className="text-white font-bold">{data.primaryGoal.toLowerCase()}</span>.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button 
              onClick={handleComplete}
              disabled={loading}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter Dashboard'}
            </Button>
          </div>
        )
    }
  }

  const CurrentIcon = STEPS[step].icon

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CurrentIcon className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-black text-white">{STEPS[step].title}</h1>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div 
              key={s.id} 
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-white' : 'bg-white/10'}`} 
            />
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[250px]">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
