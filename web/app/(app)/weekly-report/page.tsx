// app/(app)/weekly-report/page.tsx — The Story (Phase 6)
'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Download, Sparkles, Brain, Clock, Zap, HeartPulse, Activity, Share2, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/share/ShareButton'
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#FAF8F4] z-50 flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-gray-300 animate-pulse mb-6" />
        <div className="text-gray-400 font-semibold tracking-widest uppercase text-[10px] animate-pulse">Compiling The Story...</div>
      </div>
    )
  }

  if (!story || !data) {
    return (
      <div className="fixed inset-0 bg-[#FAF8F4] z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        <div className="w-20 h-20 bg-[#F5F7F6] rounded-2xl flex items-center justify-center mb-6 border border-black/[0.04]">
          <Sparkles className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-3xl font-[var(--font-serif)] text-[#111827] tracking-tight mb-3">
          Your weekly story needs a bit more data.
        </h2>
        <p className="text-[#4B5563] mb-8 max-w-sm">
          Log 5 entries to unlock your first report.
        </p>
        <Button 
          onClick={() => router.push('/log')}
          className="bg-[#111827] text-white px-8 py-6 rounded-2xl text-base font-semibold hover:bg-[#1f2937] transition-colors shadow-md"
        >
          Log now
        </Button>
      </div>
    )
  }

  const slides = [
    // SLIDE 0: Intro
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-6 animate-fade-in-up">
        <div className="w-20 h-20 bg-[#F5F7F6] rounded-2xl flex items-center justify-center mb-4 border border-black/[0.04] shadow-sm">
          <Sparkles className="w-10 h-10 text-[#111827]" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-[var(--font-serif)] text-[#111827] opacity-90 tracking-tight leading-tight">
          Your Weekly <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#111827] to-gray-400">Story</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-sm">We analyzed your digital behavior over the last 7 days. There's a pattern emerging.</p>
        <button onClick={nextSlide} className="mt-8 px-8 py-4 bg-[#111827] text-white text-xs font-semibold uppercase tracking-widest rounded-2xl hover:bg-[#1f2937] hover:scale-105 transition-all shadow-md">
          Begin
        </button>
      </div>
    ),
    // SLIDE 1: Time Reclaimed
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-[#111827] flex items-center justify-center shadow-lg mb-4">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-4xl sm:text-6xl font-[var(--font-serif)] text-[#111827] tracking-tight leading-tight">
          You reclaimed <br/><span className="text-[#111827] font-semibold">{story.timeSavedMinutes} minutes</span>
        </h2>
        <p className="text-gray-500 text-sm max-w-sm leading-relaxed">That's time you took back from the algorithm and invested into your own focus.</p>
      </div>
    ),
    // SLIDE 2: Digital DNA (Archetype)
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up w-full max-w-md mx-auto">
        <Brain className="w-16 h-16 text-[#111827] mb-2 animate-pulse" />
        <h2 className="text-3xl sm:text-5xl font-[var(--font-serif)] text-[#111827] tracking-tight leading-tight mb-2">
          Your Digital DNA
        </h2>
        
        <div className="w-full bg-white border border-black/[0.04] rounded-2xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Activity className="w-24 h-24 text-[#111827]" />
          </div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 relative z-10">Dominant Trait</p>
          <div className="text-4xl font-semibold text-[#111827] relative z-10 mb-6">{story.topArchetype}</div>
          
          <div className="space-y-4 relative z-10">
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold text-[#4B5563]"><span>Creator</span> <span>{data?.predictiveHealth?.digitalDNA?.creator || 0}%</span></div>
               <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-[#111827]" style={{ width: `${data?.predictiveHealth?.digitalDNA?.creator || 0}%` }}></div>
               </div>
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold text-[#4B5563]"><span>Learner</span> <span>{data?.predictiveHealth?.digitalDNA?.learner || 0}%</span></div>
               <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-[#111827]/60" style={{ width: `${data?.predictiveHealth?.digitalDNA?.learner || 0}%` }}></div>
               </div>
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold text-[#4B5563]"><span>Consumer</span> <span>{data?.predictiveHealth?.digitalDNA?.consumer || 0}%</span></div>
               <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-[#111827]/30" style={{ width: `${data?.predictiveHealth?.digitalDNA?.consumer || 0}%` }}></div>
               </div>
             </div>
          </div>
        </div>
      </div>
    ),
    // SLIDE 3: The Shift Moment
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up w-full max-w-lg mx-auto">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.3em]">The Turning Point</p>
        <h2 className="text-3xl sm:text-5xl font-[var(--font-serif)] text-[#111827] tracking-tight leading-tight">
          The Moment the Week <span className="italic">Shifted</span>
        </h2>
        
        {story.shiftMoment ? (
          <div className="w-full text-left bg-[#111827] text-white rounded-2xl p-8 shadow-lg mt-8 relative">
             <div className="absolute -top-4 -right-4 w-12 h-12 bg-white text-[#111827] rounded-full flex items-center justify-center border-4 border-[#FAF8F4]">
                <CornerDownRight className="w-5 h-5" />
             </div>
             
             <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-semibold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">{story.shiftMoment.day}</span>
                <span className="text-xs font-semibold text-white/50">{story.shiftMoment.time}</span>
             </div>
             
             <h3 className="text-2xl font-semibold mb-4">You {story.shiftMoment.event.toLowerCase()}.</h3>
             
             <p className="text-white/70 font-medium leading-relaxed">
               This single action {story.shiftMoment.impact.toLowerCase()}
             </p>
          </div>
        ) : (
          <div className="w-full text-center bg-[#F5F7F6] border border-black/[0.04] rounded-2xl p-8 mt-8">
            <h3 className="text-xl font-bold text-[#111827] mb-2">Building your baseline</h3>
            <p className="text-[#4B5563] text-sm">Keep logging to discover your unique turning points and patterns.</p>
          </div>
        )}
      </div>
    ),
    // SLIDE 4: Final Score & Share
    (
      <div id="weekly-report-card" className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up w-full bg-[#FAF8F4] py-10 rounded-3xl">
        <h2 className="text-2xl font-[var(--font-serif)] text-[#111827] opacity-90">Overall Week Score</h2>
        
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(229,231,235)" strokeWidth="4" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#4CAF50" strokeWidth="4" 
              strokeDasharray="283" 
              strokeDashoffset={283 - (283 * story.score) / 100}
              className="drop-shadow-[0_0_10px_rgba(76,175,80,0.3)] transition-all duration-1000 ease-out" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#111827]">
            <span className="text-6xl font-semibold">{story.score}</span>
          </div>
        </div>

        <div className="bg-[#F5F7F6] border border-black/[0.04] rounded-2xl p-6 max-w-sm">
           <p className="text-sm text-[#4B5563] font-medium leading-relaxed">
             {story.finalAdvice}
           </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8" data-html2canvas-ignore>
          <Button variant="outline" className="border-black/[0.06] text-[#111827] hover:bg-[#111827] hover:text-white transition-all gap-2 rounded-2xl h-12 px-6" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <ShareButton 
            targetId="weekly-report-card" 
            title="My Weekly MindFuel Score" 
            text={`I scored ${story.score} on my digital wellness this week with MindFuel. ${story.finalAdvice}`} 
          />
        </div>
      </div>
    )
  ]

  return (
    <div className="fixed inset-0 bg-[#FAF8F4] z-50 overflow-hidden text-[#111827] font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
         <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4] via-[#FAF8F4] to-[#F5F7F6] opacity-80" />
         <div 
           className="absolute inset-0 bg-[#EADBC8] transition-opacity duration-1000" 
           style={{ opacity: currentSlide === 3 ? 0.08 : 0.02 }}
         />
      </div>

      {/* Progress Bars (Story style) */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-20 flex gap-2 w-full max-w-3xl mx-auto">
        {slides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-black/[0.06] rounded-full overflow-hidden">
            <div 
              className={`h-full bg-[#111827] transition-all duration-300 ease-out`}
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
        className="absolute top-6 right-6 z-30 w-10 h-10 bg-black/[0.04] rounded-full flex items-center justify-center hover:bg-black/[0.08] border border-black/[0.06] transition-colors"
      >
        <span className="sr-only">Close</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M13 1L1 13M1 1L13 13" />
        </svg>
      </button>
    </div>
  )
}
