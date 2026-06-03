'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Download, Sparkles, Brain, Clock, Zap, HeartPulse, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function WeeklyReportPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    fetch('/api/weekly-report')
      .then(res => res.json())
      .then(d => {
        setData(d.report)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(s => s + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(s => s - 1)
    } else {
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-emerald-400 animate-pulse mb-6" />
        <div className="text-zinc-400 font-bold tracking-widest uppercase text-sm animate-pulse">Compiling Digital Nutrition...</div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-8 text-center text-zinc-400">Unable to load report. Check back later.</div>
  }

  const { predictiveHealth } = data

  const getTopArchetype = () => {
    const creator = predictiveHealth?.digitalDNA?.creator || 0;
    const learner = predictiveHealth?.digitalDNA?.learner || 0;
    const consumer = predictiveHealth?.digitalDNA?.consumer || 0;
    if (creator >= learner && creator >= consumer) return 'Creator';
    if (learner >= creator && learner >= consumer) return 'Learner';
    return 'Passive Consumer';
  }

  const slides = [
    // SLIDE 0: Intro
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-6 animate-fade-in-up">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Your Weekly <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">Nutrition</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-sm">We analyzed your digital diet over the last 7 days. Ready to see who you're becoming?</p>
        <button onClick={nextSlide} className="mt-8 px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform cursor-pointer">
          Let's Go
        </button>
      </div>
    ),
    // SLIDE 1: Time
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up">
        <Clock className="w-16 h-16 text-indigo-400 mb-2" />
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          You reclaimed <br/><span className="text-indigo-400">{data.timeSavedMinutes} minutes</span>
        </h2>
        <p className="text-zinc-400 text-lg max-w-sm">That's time you spent focusing instead of falling into the infinite scroll.</p>
      </div>
    ),
    // SLIDE 2: Digital DNA
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up w-full max-w-md mx-auto">
        <Brain className="w-16 h-16 text-amber-400 mb-2" />
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight mb-4">
          Your Digital DNA
        </h2>
        
        <div className="w-full space-y-6">
          <div className="bg-zinc-900/80 p-5 rounded-2xl border border-emerald-500/20 relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 h-1 bg-emerald-400" style={{ width: `${predictiveHealth?.digitalDNA?.creator || 0}%` }} />
            <div className="text-emerald-400 font-bold mb-1 text-sm uppercase tracking-widest">Creator</div>
            <div className="text-3xl font-black text-white">{predictiveHealth?.digitalDNA?.creator || 0}%</div>
          </div>

          <div className="bg-zinc-900/80 p-5 rounded-2xl border border-indigo-500/20 relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 h-1 bg-indigo-400" style={{ width: `${predictiveHealth?.digitalDNA?.learner || 0}%` }} />
            <div className="text-indigo-400 font-bold mb-1 text-sm uppercase tracking-widest">Learner</div>
            <div className="text-3xl font-black text-white">{predictiveHealth?.digitalDNA?.learner || 0}%</div>
          </div>
          
          <div className="bg-zinc-900/80 p-5 rounded-2xl border border-pink-500/20 relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 h-1 bg-pink-400" style={{ width: `${predictiveHealth?.digitalDNA?.consumer || 0}%` }} />
            <div className="text-pink-400 font-bold mb-1 text-sm uppercase tracking-widest">Passive Consumer</div>
            <div className="text-3xl font-black text-white">{predictiveHealth?.digitalDNA?.consumer || 0}%</div>
          </div>
        </div>
      </div>
    ),
    // SLIDE 3: Trajectory
    (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-6 animate-fade-in-up">
        <HeartPulse className={`w-16 h-16 mb-2 ${predictiveHealth?.focusTrajectory === 'Declining' ? 'text-red-400' : 'text-emerald-400'}`} />
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
          Your focus is <br/>
          <span className={predictiveHealth?.focusTrajectory === 'Declining' ? 'text-red-400' : 'text-emerald-400'}>
            {predictiveHealth?.focusTrajectory}
          </span>
        </h2>
        {predictiveHealth?.warningMessage ? (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-sm">
             <p className="text-red-400 font-bold">{predictiveHealth.warningMessage}</p>
          </div>
        ) : (
          <p className="text-zinc-400 text-lg max-w-sm">Keep feeding your mind high-value content. It's paying off.</p>
        )}
      </div>
    ),
    // SLIDE 4: Summary Export
    (
      <div className="flex flex-col items-center justify-center h-full space-y-8 px-6 animate-fade-in-up w-full">
        {/* The "Shareable Card" */}
        <div id="shareable-report" className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[50px] -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] -ml-10 -mb-10" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="font-black text-white tracking-widest uppercase text-sm">MindFuel</span>
            </div>
            
            <h3 className="text-3xl font-black text-white leading-none mb-8">Weekly<br/>Nutrition</h3>
            
            <div className="space-y-6 flex-1">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Time Reclaimed</p>
                <p className="text-2xl font-black text-emerald-400">{data.timeSavedMinutes} mins</p>
              </div>
              
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Top Archetype</p>
                <p className="text-2xl font-black text-indigo-400">
                   {getTopArchetype()}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">Top Nutrients</p>
                <div className="flex flex-wrap gap-2">
                   {data.topStrengths && data.topStrengths.length > 0 ? data.topStrengths.map((s: any, i: number) => (
                     <Badge key={i} className="bg-white/10 text-white border-white/5">{s.category}</Badge>
                   )) : <span className="text-sm text-zinc-500">Not enough data yet</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button onClick={() => window.print()} className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold h-14 rounded-full gap-2">
            <Download className="w-4 h-4" /> Save Report
          </Button>
          <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1 h-14 rounded-full font-bold">
            Done
          </Button>
        </div>
      </div>
    )
  ]

  return (
    <div className="fixed inset-0 bg-black z-50 text-white overflow-hidden flex flex-col">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full flex gap-2 p-4 z-50">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: currentSlide >= i ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Navigation Areas */}
      <div className="absolute inset-y-0 left-0 w-1/3 z-40 cursor-w-resize" onClick={prevSlide} />
      <div className="absolute inset-y-0 right-0 w-2/3 z-40 cursor-e-resize" onClick={nextSlide} />

      {/* Slide Content */}
      <div className="flex-1 relative z-30 flex items-center justify-center">
        {slides[currentSlide]}
      </div>
      
      {/* Visual Hint */}
      {currentSlide < slides.length - 1 && (
        <div className="absolute bottom-8 right-8 z-50 flex items-center gap-2 text-zinc-500 animate-pulse pointer-events-none">
          Tap right <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}
