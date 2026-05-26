'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Instagram, Smartphone, Loader2 } from 'lucide-react'

export default function PromoSimulatePage() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'simulating' | 'intercepting'>('idle')

  useEffect(() => {
    if (state === 'simulating') {
      // For a promo video, 5 seconds is perfect to show them opening the app, 
      // scrolling for a second, and then getting intercepted.
      const timer = setTimeout(() => {
        setState('intercepting')
        // Give a tiny flash effect before redirecting
        setTimeout(() => {
          router.push('/intercept')
        }, 300)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [state, router])

  if (state === 'simulating' || state === 'intercepting') {
    return (
      <div className={`fixed inset-0 z-50 transition-all duration-300 bg-white ${state === 'intercepting' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Fake Instagram UI */}
        <div className="h-full w-full flex flex-col max-w-md mx-auto border-x border-zinc-200 bg-white relative shadow-2xl">
          {/* Header */}
          <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-4 bg-white">
            <div className="font-bold text-xl font-serif text-black">Instagram</div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
              <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
            </div>
          </div>
          
          {/* Stories */}
          <div className="h-24 border-b border-zinc-200 flex items-center gap-4 px-4 overflow-hidden bg-white">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-16 h-16 rounded-full border-2 border-pink-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-zinc-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Feed Post */}
          <div className="flex-1 overflow-hidden bg-white">
            <div className="flex items-center gap-3 p-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
            </div>
            <div className="w-full aspect-square bg-zinc-100 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
                <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
                <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
              </div>
              <div className="h-4 w-1/4 bg-zinc-200 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-zinc-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md w-full space-y-8 animate-fade-in-up">
        
        <div className="w-16 h-16 mx-auto bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-white" />
        </div>

        <div>
          <h1 className="text-3xl font-black text-white mb-3">Promo Video Simulator</h1>
          <p className="text-zinc-500">
            Click the button below to simulate opening Instagram. After exactly 5 seconds, it will automatically "intercept" you and show the MindFuel Deep Breath screen.
          </p>
        </div>

        <button
          onClick={() => setState('simulating')}
          className="w-full h-14 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 rounded-xl flex items-center justify-center gap-3 font-bold text-white shadow-xl shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Instagram className="w-6 h-6" />
          Simulate Opening Instagram
        </button>

        <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest pt-8">
          Web Mockup Mode
        </div>
      </div>
    </div>
  )
}
