'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Timer, Play, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DURATIONS = [15, 30, 45, 60]

export default function FocusPage() {
  const router = useRouter()
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [phase, setPhase] = useState<'select' | 'running' | 'done'>('select')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = useCallback(() => {
    const total = selectedMinutes * 60
    setTotalSeconds(total)
    setSecondsLeft(total)
    setPhase('running')
  }, [selectedMinutes])

  useEffect(() => {
    if (phase === 'running' && secondsLeft > 0) {
      intervalRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
      return () => { if (intervalRef.current) clearTimeout(intervalRef.current) }
    }
    if (phase === 'running' && secondsLeft === 0) {
      setPhase('done')
      saveSession(true)
    }
  }, [phase, secondsLeft])

  const giveUp = () => {
    setPhase('select')
    saveSession(false)
  }

  const saveSession = async (completed: boolean) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('focus_sessions').insert({
        user_id: user.id,
        duration_minutes: selectedMinutes,
        completed,
      })
    } catch {}
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0

  // SVG ring
  const size = 240
  const strokeWidth = 2
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      {phase === 'select' && (
        <div className="space-y-12 animate-fade-in-up max-w-md w-full">
          <div>
            <Timer className="w-10 h-10 text-zinc-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold tracking-tight text-white">Focus Timer</h1>
            <p className="text-zinc-500 mt-3 text-sm">Commit to phone-free time. Build your focus muscle.</p>
          </div>

          <div className="flex justify-center gap-3">
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedMinutes(d)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                  selectedMinutes === d
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {d}m
              </button>
            ))}
          </div>

          <button
            onClick={startTimer}
            className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <Play className="w-5 h-5" /> Begin Focus
          </button>
        </div>
      )}

      {phase === 'running' && (
        <div className="space-y-10 animate-fade-in-up">
          <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
              />
              <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="#ffffff" strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-6xl font-black text-white tracking-tight font-mono">{mm}:{ss}</p>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Remaining</p>
            </div>
          </div>

          <p className="text-zinc-600 text-sm">Stay present. Your future self will thank you.</p>

          <button
            onClick={giveUp}
            className="text-zinc-600 hover:text-zinc-400 text-sm font-medium flex items-center gap-2 mx-auto transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" /> Give Up
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-10 animate-fade-in-up max-w-md w-full">
          <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Focus Complete</h1>
            <p className="text-zinc-400 mt-3">{selectedMinutes} minutes of undistracted time. Well done.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
