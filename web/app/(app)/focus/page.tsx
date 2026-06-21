'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Timer, Play, X, Check, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { FuelOrb } from '@/components/fuel/FuelOrb'
import { useFuelVoice } from '@/lib/fuel/useFuelVoice'
import { getFocusStartLine, getFocusCompleteLine } from '@/lib/fuel/personalityEngine'

const DURATIONS = [15, 30, 45, 60]

interface FocusSession {
  id: string
  duration_minutes: number
  completed: boolean
  created_at: string
}

export default function FocusPage() {
  const router = useRouter()
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [phase, setPhase] = useState<'select' | 'running' | 'done'>('select')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [history, setHistory] = useState<FocusSession[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('focus_sessions')
        .select('id, duration_minutes, completed, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setHistory(data || [])
    } catch {}
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const { speak } = useFuelVoice()

  const startTimer = useCallback(() => {
    const total = selectedMinutes * 60
    setTotalSeconds(total)
    setSecondsLeft(total)
    setPhase('running')
    // Fuel speaks on mission start
    speak(getFocusStartLine(selectedMinutes, 'energized'))
  }, [selectedMinutes, speak])

  useEffect(() => {
    if (phase === 'running' && secondsLeft > 0) {
      intervalRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
      return () => { if (intervalRef.current) clearTimeout(intervalRef.current) }
    }
    if (phase === 'running' && secondsLeft === 0) {
      setPhase('done')
      saveSession(true)
      // Fuel celebrates completion
      speak(getFocusCompleteLine(selectedMinutes, 'celebratory'))
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
      loadHistory()
    } catch {}
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0

  const size = 240
  const strokeWidth = 2
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  // Stats
  const completed = history.filter(s => s.completed)
  const totalHours = Math.round(completed.reduce((a, s) => a + s.duration_minutes, 0) / 60 * 10) / 10
  const completionRate = history.length > 0 ? Math.round((completed.length / history.length) * 100) : 0

  return (
    <div className="max-w-lg mx-auto">
      {phase === 'select' && (
        <div className="space-y-10 py-8 animate-fade-in-up">
          <div className="text-center">
            <Timer className="w-10 h-10 text-zinc-500 mx-auto mb-6" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Focus Timer</h1>
            <p className="text-zinc-500 mt-3 text-sm">Commit to phone-free time. Build your focus muscle.</p>
          </div>

          {/* Stats row */}
          {history.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-semibold text-white">{totalHours}h</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Total Focus</p>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-semibold text-white">{completed.length}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Completed</p>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-semibold text-white">{completionRate}%</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Success</p>
              </div>
            </div>
          )}

          <div className="flex justify-center flex-wrap gap-2 sm:gap-3">
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedMinutes(d)}
                className={`px-4 sm:px-6 py-3 min-w-[70px] rounded-2xl text-sm font-bold transition-all cursor-pointer ${
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

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Recent Sessions</p>
              {history.slice(0, 7).map(s => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  {s.completed
                    ? <Check className="w-4 h-4 text-white shrink-0" />
                    : <X className="w-4 h-4 text-zinc-700 shrink-0" />
                  }
                  <span className="text-zinc-400 flex-1">{s.duration_minutes} min</span>
                  <span className="text-zinc-700 text-xs">{format(new Date(s.created_at), 'MMM d, h:mm a')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'running' && (
        <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-10 animate-fade-in-up">
          <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#ffffff" strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-5xl sm:text-6xl font-semibold text-white tracking-tight font-mono">{mm}:{ss}</p>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Remaining</p>
            </div>
          </div>
          <p className="text-zinc-600 text-sm">Stay present. Your future self will thank you.</p>
          <button onClick={giveUp} className="text-zinc-600 hover:text-zinc-400 text-sm font-medium flex items-center gap-2 mx-auto transition-colors cursor-pointer">
            <X className="w-4 h-4" /> Give Up
          </button>
          <FuelOrb thought="Focus mode active. I'm keeping watch." />
        </div>
      )}

      {phase === 'done' && (
        <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-10 animate-fade-in-up">
          <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Focus Complete</h1>
            <p className="text-zinc-400 mt-3">{selectedMinutes} minutes of undistracted time. Well done.</p>
          </div>
          <button
            onClick={() => { setPhase('select'); loadHistory() }}
            className="w-full max-w-md py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
