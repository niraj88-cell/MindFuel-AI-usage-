// components/log/MoodSlider.tsx
'use client'

import React from 'react'
import { Slider } from '@/components/ui/slider'
import { getMoodEmoji } from '@/lib/utils'

interface MoodSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function MoodSlider({ label, value, onChange, min = 1, max = 10 }: MoodSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-2xl transition-all duration-200">{getMoodEmoji(value)}</span>
          <span className="text-lg font-bold tabular-nums w-6 text-center">{value}</span>
        </div>
      </div>

      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
      />

      <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] px-1">
        <span>Very Low</span>
        <span>Neutral</span>
        <span>Excellent</span>
      </div>
    </div>
  )
}
