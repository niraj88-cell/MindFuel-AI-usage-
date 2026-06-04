// app/(app)/onboarding/page.tsx — "The First Five Minutes"
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ArrowRight, Loader2, Sparkles, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/mixpanel'
import { FuelOrb } from '@/components/fuel/FuelOrb'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'

const SCRIPT = [
  {
    id: 'greeting',
    voice: "Hey. I'm Fuel. I'm going to help you understand what your screen is doing to your brain. No lectures, no guilt. Just clarity."
  },
  {
    id: 'quick_scan',
    voice: "Tell me something you consumed in the last hour. A video, an article, a scroll session — anything."
  },
  {
    id: 'reveal',
    voice: "Okay, that's high-stimulation entertainment. See that? Most people have no idea their content has a cognitive cost. I'm going to help you see it — and act on it."
  },
  {
    id: 'personalize',
    voice: "One more thing. When's the time of day you feel most scattered? Morning, afternoon, or evening?"
  },
  {
    id: 'promise',
    voice: "Got it. I'll be here. Quietly. I'll speak up when it matters. Ready to start?"
  }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  
  const { speak } = useFuelVoice()
  const [fuelThought, setFuelThought] = useState<string | null>(null)

  const [data, setData] = useState({
    scatteredTime: '',
  })

  // Start Fuel narration on mount
  useEffect(() => {
    handleStepNarration(0)
  }, [])

  const handleStepNarration = (stepIndex: number) => {
    if (stepIndex >= SCRIPT.length) return
    const text = SCRIPT[stepIndex].voice
    setFuelThought(text)
    speak(text)
  }

  const nextStep = () => {
    const next = step + 1
    setStep(next)
    handleStepNarration(next)
  }

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanInput.trim()) return
    
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      nextStep()
    }, 1500) // Fake processing delay for dramatic effect
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

    trackEvent('Onboarding Completed', data)
    router.push('/dashboard')
  }

  const renderStep = () => {
    switch(step) {
      case 0: // Greeting
        return (
          <div className="space-y-8 animate-fade-in-up text-center max-w-md mx-auto">
            <h1 className="text-3xl md:text-5xl font-serif text-white tracking-tight">Meet Fuel.</h1>
            <p className="text-zinc-400 text-lg">Your living digital companion.</p>
            <Button onClick={nextStep} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200">
              Continue
            </Button>
          </div>
        )
      case 1: // Quick Scan
        return (
          <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto">
            <h1 className="text-2xl font-serif text-white tracking-tight mb-2">Let's try something.</h1>
            
            <form onSubmit={handleScanSubmit} className="relative">
              <input
                type="text"
                placeholder="e.g. Scrolled TikTok for 20 mins..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                disabled={isScanning}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
              />
              <button 
                type="submit"
                disabled={isScanning || !scanInput.trim()}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-white text-black rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        )
      case 2: // The Reveal
        return (
          <div className="space-y-6 animate-fade-in-up text-center max-w-md mx-auto">
            <div className="w-full bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden mb-8">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Instant Verdict</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">High-Stimulation</h2>
              <p className="text-zinc-400 text-sm">Fun in the moment, but your brain treats it like candy — energy spike, then crash.</p>
            </div>
            <Button onClick={nextStep} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200">
              Makes Sense
            </Button>
          </div>
        )
      case 3: // Personalize
        return (
          <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto">
            <h1 className="text-2xl font-serif text-white tracking-tight mb-6 text-center">When is your focus weakest?</h1>
            
            <div className="space-y-3">
              {['Morning (8am - 12pm)', 'Afternoon (1pm - 5pm)', 'Evening (6pm - 11pm)'].map(time => (
                <button
                  key={time}
                  onClick={() => { setData({ ...data, scatteredTime: time }); nextStep() }}
                  className="w-full p-5 rounded-2xl bg-zinc-900 border border-white/10 text-left hover:bg-zinc-800 hover:border-white/20 transition-all font-bold text-white flex items-center justify-between group"
                >
                  {time}
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )
      case 4: // The Promise
        return (
          <div className="space-y-8 animate-fade-in-up text-center max-w-md mx-auto">
            <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-serif text-white tracking-tight">You're ready.</h1>
            <p className="text-zinc-400 text-lg">Fuel will run quietly in the background.</p>
            
            <Button 
              onClick={handleComplete}
              disabled={loading}
              className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Dashboard'}
            </Button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-60" />
      </div>

      {/* Progress */}
      <div className="absolute top-12 left-0 right-0 max-w-md mx-auto px-6 flex gap-2">
        {SCRIPT.map((s, i) => (
          <div 
            key={s.id} 
            className="h-1 flex-1 rounded-full transition-all duration-500" 
            style={{ backgroundColor: i <= step ? 'white' : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full pt-12 pb-32 flex items-center justify-center min-h-[60vh]">
        {renderStep()}
      </div>

      {/* Fuel Orb at the bottom */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <FuelOrb thought={fuelThought} />
        </div>
      </div>
    </div>
  )
}
