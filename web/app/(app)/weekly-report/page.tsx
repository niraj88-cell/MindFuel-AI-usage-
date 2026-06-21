// app/(app)/weekly-report/page.tsx — The Story (Phase 6)
'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Download, Sparkles, Brain, Clock, Zap, HeartPulse, Activity, Share2, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FuelOrb } from '@/components/fuel/FuelOrb'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'
import { generateWeeklyStory, getStoryNarration, WeeklyStoryData } from '@/lib/fuel/weeklyStoryEngine'

export default function WeeklyStoryPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [story, setStory] = useState<WeeklyStoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [fuelThought, setFuelThought] = useState<string | null>(null)
  
  const { speak } = useFuelVoice()
  const slideCount = 5

  useEffect(() => {
    fetch('/api/weekly-report')
      .then(res => res.json())
      .then(d => {
        setData(d.report)
        const storyData = generateWeeklyStory(d.report)
        setStory(storyData)
        setLoading(false)
        
        // Initial narration
        const line = getStoryNarration(0, storyData)
        setFuelThought(line)
        speak(line)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  const handleSlideChange = useCallback((newSlide: number) => {
    if (!story) return
    setCurrentSlide(newSlide)
    const line = getStoryNarration(newSlide, story)
    setFuelThought(line)
    speak(line)
  }, [story, speak])

  const nextSlide = () => {
    if (currentSlide < slideCount - 1) {
      handleSlideChange(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      handleSlideChange(currentSlide - 1)
    } else {
      router.push('/dashboard')
    }
  }

  if (loading || !story) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">

        <div className="text-zinc-500 font-black tracking-widest uppercase text-[10px] animate-pulse">Compiling The Story...</div>
      </div>
    )
  }

  const slides = [
    // SLIDE 0: Intro
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-6 animate-fade-in-up">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.1)]">

        </div>
        <h1 className="text-4xl sm:text-6xl font-serif text-white opacity-90 tracking-tight leading-tight">
          Your Weekly <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">Story</span>
        </h1>
        <p className="text-zinc-500 text-sm max-w-sm">We analyzed your digital behavior over the last 7 days. There's a pattern emerging.</p>
        <button onClick={nextSlide} className="mt-8 px-8 py-4 bg-white text-black text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          Begin
        </button>
      </div>
    ),
    // SLIDE 1: Time Reclaimed
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] mb-4">
          <Clock className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-4xl sm:text-6xl font-serif text-white tracking-tight leading-tight">
          You reclaimed <br/><span className="text-white font-black">{story.timeSavedMinutes} minutes</span>
        </h2>
        <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">That's time you took back from the algorithm and invested into your own focus.</p>
      </div>
    ),
    // SLIDE 2: Digital DNA (Archetype)
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up w-full max-w-md mx-auto">
        <Brain className="w-16 h-16 text-white mb-2 animate-pulse" />
        <h2 className="text-3xl sm:text-5xl font-serif text-white tracking-tight leading-tight mb-2">
          Your Digital DNA
        </h2>
        
        <div className="w-full bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Activity className="w-24 h-24 text-white" />
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 relative z-10">Dominant Trait</p>
          <div className="text-4xl font-black text-white relative z-10 mb-6">{story.topArchetype}</div>
          
          <div className="space-y-4 relative z-10">
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold text-zinc-400"><span>Creator</span> <span>{data?.predictiveHealth?.digitalDNA?.creator || 0}%</span></div>
               <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-white" style={{ width: `${data?.predictiveHealth?.digitalDNA?.creator || 0}%` }}></div>
               </div>
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold text-zinc-400"><span>Learner</span> <span>{data?.predictiveHealth?.digitalDNA?.learner || 0}%</span></div>
               <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-white/60" style={{ width: `${data?.predictiveHealth?.digitalDNA?.learner || 0}%` }}></div>
               </div>
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold text-zinc-400"><span>Consumer</span> <span>{data?.predictiveHealth?.digitalDNA?.consumer || 0}%</span></div>
               <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-white/30" style={{ width: `${data?.predictiveHealth?.digitalDNA?.consumer || 0}%` }}></div>
               </div>
             </div>
          </div>
        </div>
      </div>
    ),
    // SLIDE 3: The Shift Moment
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up w-full max-w-lg mx-auto">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">The Turning Point</p>
        <h2 className="text-3xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
          The Moment the Week <span className="italic">Shifted</span>
        </h2>
        
        {story.shiftMoment ? (
          <div className="w-full text-left bg-white text-black rounded-[32px] p-8 shadow-[0_0_50px_rgba(255,255,255,0.2)] mt-8 relative">
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center border-4 border-black">
                <CornerDownRight className="w-5 h-5" />
             </div>
             
             <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-black uppercase tracking-widest bg-black/5 px-3 py-1 rounded-full">{story.shiftMoment.day}</span>
                <span className="text-xs font-black text-black/50">{story.shiftMoment.time}</span>
             </div>
             
             <h3 className="text-2xl font-black mb-4">You {story.shiftMoment.event.toLowerCase()}.</h3>
             
             <p className="text-black/70 font-medium leading-relaxed">
               This single action {story.shiftMoment.impact.toLowerCase()}
             </p>
          </div>
        ) : (
          <div className="w-full text-center bg-zinc-900/50 border border-white/10 rounded-[32px] p-8 mt-8">
            <h3 className="text-xl font-bold text-white mb-2">Building your baseline</h3>
            <p className="text-zinc-400 text-sm">Keep logging to discover your unique turning points and patterns.</p>
          </div>
        )}
      </div>
    ),
    // SLIDE 4: Final Score & Share
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up w-full">
        <h2 className="text-2xl font-serif text-white opacity-90">Overall Week Score</h2>
        
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff" strokeWidth="4" 
              strokeDasharray="283" 
              strokeDashoffset={283 - (283 * story.score) / 100}
              className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-6xl font-black">{story.score}</span>
          </div>
        </div>

        <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 max-w-sm">
           <p className="text-sm text-zinc-400 font-medium leading-relaxed">
             {story.finalAdvice}
           </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button variant="outline" className="border-white/10 text-white hover:bg-white hover:text-black transition-all gap-2 rounded-2xl h-12 px-6" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <Button className="bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all gap-2 rounded-2xl h-12 px-6 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <Share2 className="w-4 h-4" /> Share Weekly Card
          </Button>
        </div>
      </div>
    )
  ]

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden text-white font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80" />
         <div 
           className="absolute inset-0 bg-white opacity-5 transition-opacity duration-1000" 
           style={{ opacity: currentSlide === 3 ? 0.1 : 0.02 }}
         />
      </div>

      {/* Progress Bars (Story style) */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-20 flex gap-2 w-full max-w-3xl mx-auto">
        {slides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-white transition-all duration-300 ease-out`}
              style={{ 
                width: idx < currentSlide ? '100%' : idx === currentSlide ? '100%' : '0%',
                transitionDuration: idx === currentSlide ? '8s' : '0.3s' // Fake progress over time
              }} 
            />
          </div>
        ))}
      </div>

      {/* Navigation Areas */}
      <div className="absolute inset-0 z-10 flex">
        <div className="w-1/3 cursor-pointer" onClick={prevSlide} />
        <div className="w-2/3 cursor-pointer" onClick={nextSlide} />
      </div>

      {/* Slide Content */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {slides[currentSlide]}
      </div>

      {/* Fuel Orb */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
        <div className="pointer-events-auto scale-90 sm:scale-100 origin-bottom-right">
           <FuelOrb thought={fuelThought} />
        </div>
      </div>

      {/* Exit Button */}
      <button 
        onClick={() => router.push('/dashboard')}
        className="absolute top-6 right-6 z-30 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 backdrop-blur-md border border-white/10 transition-colors"
      >
        <span className="sr-only">Close</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M13 1L1 13M1 1L13 13" />
        </svg>
      </button>
    </div>
  )
}
