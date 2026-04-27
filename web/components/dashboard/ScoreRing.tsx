// components/dashboard/ScoreRing.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { getScoreColor, getScoreLabel } from '@/lib/utils'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  subtitle?: string
  animated?: boolean
}

export function ScoreRing({
  score,
  size = 200,
  strokeWidth = 10,
  label,
  subtitle,
  animated = true,
}: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)
  const [mounted, setMounted] = useState(false)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100) / 100
  const dashOffset = circumference * (1 - (animated && mounted ? progress : 0))
  const color = getScoreColor(score)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!animated) return

    const duration = 1500
    const startTime = Date.now()
    const startVal = 0

    const tick = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayScore(Math.round(startVal + (score - startVal) * eased))
      if (t < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [score, animated])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity duration-1000"
        style={{ background: color, opacity: mounted ? 0.2 : 0 }}
      />

      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="score-ring-bg"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: animated ? 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-bold tabular-nums tracking-tight"
          style={{ color }}
        >
          {displayScore}
        </span>
        <span className="text-xs font-medium uppercase tracking-widest mt-1" style={{ color }}>
          {label || getScoreLabel(score)}
        </span>
        {subtitle && (
          <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{subtitle}</span>
        )}
      </div>
    </div>
  )
}
