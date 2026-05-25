'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

const PROOFS = [
  "Alex just reclaimed 45m of focus time",
  "Sarah logged her first mental check-in",
  "David broke a 3-day doomscroll streak",
  "Emma analyzed 12 TikTok URLs today",
  "Michael unlocked the Platinum Coach"
]

export function SocialProofToasts() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Start showing after 3 seconds
    const initialDelay = setTimeout(() => {
      setVisible(true)
    }, 3000)

    // Rotate every 8 seconds
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % PROOFS.length)
        setVisible(true)
      }, 500) // 500ms to allow fade out
    }, 8000)

    return () => {
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-none hidden md:block">
      <div 
        className={`bg-zinc-900 border border-white/10 rounded-full px-4 py-2.5 flex items-center gap-3 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <p className="text-xs font-bold text-zinc-300">{PROOFS[index]}</p>
      </div>
    </div>
  )
}
