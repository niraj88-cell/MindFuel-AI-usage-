'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brain, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface OnboardingFlowProps {
  userId: string
  onComplete: (love: string | null, regret: string | null) => void
}

export function OnboardingFlow({ userId, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1)
  const [loveAnswer, setLoveAnswer] = useState('')
  const [regretAnswer, setRegretAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNext = () => {
    if (step === 1 && loveAnswer.trim()) {
      setStep(2)
    } else if (step === 2 && regretAnswer.trim()) {
      saveAndComplete(loveAnswer, regretAnswer)
    }
  }

  const handleSkip = () => {
    saveAndComplete(null, null)
  }

  const saveAndComplete = async (love: string | null, regret: string | null) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          content_love: love,
          content_regret: regret,
        })
        .eq('id', userId)
        
        
      if (error) throw error
      
      // Save locally to instantly bypass any Next.js caching if they navigate away and back
      localStorage.setItem(`onboarding_done_${userId}`, 'true')
      
      onComplete(love, regret)
    } catch (error) {
      console.error('Failed to save onboarding:', error)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg bg-zinc-900 border-white/10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-white">
            Welcome to MindFuel
          </CardTitle>
          <p className="text-zinc-400 text-sm mt-2">
            Let's personalize your digital nutrition dashboard.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 1 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-200">
                  1. What kind of content leaves you feeling better after 20 minutes?
                </label>
                <Input
                  autoFocus
                  placeholder="e.g., Documentaries, design tutorials, cooking videos..."
                  value={loveAnswer}
                  onChange={(e) => setLoveAnswer(e.target.value)}
                  className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 h-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext()
                  }}
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button 
                  onClick={handleNext} 
                  disabled={!loveAnswer.trim() || loading}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-bold"
                >
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-200">
                  2. What content do you always regret consuming?
                </label>
                <Input
                  autoFocus
                  placeholder="e.g., Doomscrolling news, outrage threads, TikTok..."
                  value={regretAnswer}
                  onChange={(e) => setRegretAnswer(e.target.value)}
                  className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 h-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext()
                  }}
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button 
                  onClick={handleNext} 
                  disabled={!regretAnswer.trim() || loading}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-bold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <button 
              onClick={handleSkip}
              className="text-xs font-medium text-zinc-500 hover:text-white transition-colors"
              disabled={loading}
            >
              Skip for now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
