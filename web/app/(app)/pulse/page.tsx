'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Heart, Send, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'

const RATINGS = [
  { value: 1, emoji: '😫', label: 'Drained' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '✨', label: 'Energized' },
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PulseEntry {
  date: string
  rating: number
}

export default function PulsePage() {
  const [selected, setSelected] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [weekData, setWeekData] = useState<PulseEntry[]>([])

  const loadWeek = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('daily_pulses')
        .select('date, rating')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: true })
      setWeekData(data || [])
    } catch {}
  }, [])

  useEffect(() => { loadWeek() }, [loadWeek])

  const handleSave = async () => {
    if (!selected || saving) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = format(new Date(), 'yyyy-MM-dd')
      await supabase.from('daily_pulses').upsert({
        user_id: user.id,
        date: today,
        rating: selected,
        note: note.trim() || null,
      }, { onConflict: 'user_id,date' })
      setSaved(true)
      loadWeek()
      setTimeout(() => {
        setSaved(false)
        setSelected(null)
        setNote('')
      }, 2000)
    } catch {}
    setSaving(false)
  }

  // Build 7-day chart data
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const entry = weekData.find(e => e.date === dateStr)
    return {
      label: DAY_LABELS[date.getDay()],
      rating: entry?.rating || 0,
      isToday: i === 6,
    }
  })

  return (
    <div className="max-w-lg mx-auto space-y-12 py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <Heart className="w-10 h-10 text-zinc-500 mx-auto" />
        <h1 className="text-3xl font-bold tracking-tight text-white">Daily Pulse</h1>
        <p className="text-zinc-500 text-sm">How did your screen time make you feel today?</p>
      </div>

      {/* Rating buttons */}
      <div className="flex justify-center gap-2">
        {RATINGS.map(r => (
          <button
            key={r.value}
            onClick={() => setSelected(r.value)}
            className={`flex flex-col items-center gap-1.5 px-4 py-4 rounded-2xl transition-all cursor-pointer ${
              selected === r.value
                ? 'bg-white text-black scale-105'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <span className="text-2xl">{r.emoji}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{r.label}</span>
          </button>
        ))}
      </div>

      {/* Note input */}
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="bg-zinc-950 border-zinc-800 h-12 text-center focus:border-white transition-colors"
      />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!selected || saving}
        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all cursor-pointer ${
          saved
            ? 'bg-white text-black'
            : selected
              ? 'bg-white text-black hover:bg-zinc-100'
              : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
        }`}
      >
        {saved ? (
          <><Check className="w-5 h-5" /> Saved</>
        ) : (
          <><Send className="w-5 h-5" /> Save Pulse</>
        )}
      </button>

      {/* Weekly chart */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">This Week</h2>
        <div className="flex items-end justify-between gap-2 h-32">
          {chartDays.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                <div
                  className="w-full max-w-[28px] rounded-lg transition-all"
                  style={{
                    height: day.rating ? `${(day.rating / 5) * 100}%` : 4,
                    backgroundColor: day.rating
                      ? `rgba(255, 255, 255, ${0.15 + day.rating * 0.17})`
                      : 'rgba(255, 255, 255, 0.05)',
                    minHeight: 4,
                  }}
                />
              </div>
              <span className={`text-[10px] font-bold uppercase ${
                day.isToday ? 'text-white' : 'text-zinc-600'
              }`}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
