'use client'

import React, { useEffect, useState } from 'react'
import { getScoreColor, getScoreLabel } from '@/lib/utils'

interface WebRingProps {
  score: number
  size?: number
  animated?: boolean
  showLabel?: boolean
}

export const WebRing = React.memo(function WebRing({
  score,
  size = 280,
  animated = true,
  showLabel = true,
}: WebRingProps) {
  const [mounted, setMounted] = useState(false)
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)

  useEffect(() => {
    setMounted(true)
    let animationFrameId: number;
    
    if (animated) {
      // Score count up animation
      const duration = 1500
      const startTime = Date.now()
      
      const tick = () => {
        const elapsed = Date.now() - startTime
        const t = Math.min(elapsed / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplayScore(Math.round(score * eased))
        
        if (t < 1) {
          animationFrameId = requestAnimationFrame(tick)
        }
      }
      
      animationFrameId = requestAnimationFrame(tick)
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [score, animated])

  const center = size / 2
  const outerRadius = (size / 2) - 10
  const innerRadius = outerRadius - 16
  const circumference = 2 * Math.PI * innerRadius
  const dashOffset = circumference * (1 - (mounted ? Math.min(Math.max(score, 0), 100) / 100 : 0))
  
  const scoreColor = getScoreColor(score)

  return (
    <div 
      className="relative flex items-center justify-center transition-all duration-1000"
      style={{ width: size, height: size }}
    >
      {/* Ambient Glow */}
      <div 
        className="absolute inset-0 rounded-full opacity-15 blur-3xl transition-all duration-1000"
        style={{ 
          background: scoreColor,
          transform: mounted ? 'scale(1.2)' : 'scale(0.8)',
          opacity: mounted ? 0.15 : 0 
        }}
      />

      <svg width={size} height={size} className="relative z-10 overflow-visible">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-red)" />
            <stop offset="100%" stopColor="var(--accent-blue)" />
          </linearGradient>
          <radialGradient id="pulseGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={scoreColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={scoreColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Inner Pulse */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.3}
          fill="url(#pulseGradient)"
          className="animate-breathe"
          opacity={0.3}
        />

        {/* Radiating Web Strands */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 60) * (Math.PI / 180)
          const x2 = center + outerRadius * Math.cos(angle)
          const y2 = center + outerRadius * Math.sin(angle)
          return (
            <line
              key={`strand-${i}`}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="var(--web-line)"
              strokeWidth="1"
              opacity={0.06}
              strokeDasharray="4,6"
              style={{
                strokeDashoffset: mounted ? 0 : 50,
                transition: `stroke-dashoffset 1.5s ease-out ${i * 0.1}s, opacity 1s ease-out`
              }}
            />
          )
        })}

        {/* Outer Ring - "The Web" */}
        <g style={{ transformOrigin: 'center', animation: 'spin 120s linear infinite' }}>
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="var(--web-line)"
            strokeWidth="1"
            strokeDasharray="6,8"
            opacity={0.3}
          />
          {/* Nodes on outer ring */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) * (Math.PI / 180)
            const nx = center + outerRadius * Math.cos(angle)
            const ny = center + outerRadius * Math.sin(angle)
            return (
              <circle
                key={`node-${i}`}
                cx={nx}
                cy={ny}
                r="2"
                fill="var(--web-node)"
                opacity={0.5}
              />
            )
          })}
        </g>

        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="var(--web-line)"
          strokeWidth="6"
          opacity={0.04}
        />

        {/* The Score Arc */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
        <span className="text-5xl font-black tabular-nums tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-blue)]">
          {displayScore}
        </span>
        
        {showLabel && (
          <div className="flex flex-col items-center mt-2">
            <span 
              className="text-xs font-bold uppercase tracking-[0.2em] ml-[0.2em]" 
              style={{ color: scoreColor }}
            >
              {getScoreLabel(score)}
            </span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 ml-[0.1em]">
              Today's Web
            </span>
          </div>
        )}
      </div>
    </div>
  )
})
