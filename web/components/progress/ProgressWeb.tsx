// components/progress/ProgressWeb.tsx
// The signature Spider-Man-inspired radial web visualization for habit consistency
'use client'

import React, { useState } from 'react'
import { WebStrand } from './WebStrand'

interface CategoryProgress {
  category: string
  color: string
  totalDays: number
  completedDays: number
  icon: string
}

interface ProgressWebProps {
  data: CategoryProgress[]
  size?: number
}

const DEFAULT_DATA: CategoryProgress[] = [
  { category: 'Focus', color: 'var(--accent-blue)', totalDays: 7, completedDays: 5, icon: '🎯' },
  { category: 'Sleep', color: '#10B981', totalDays: 7, completedDays: 6, icon: '🌙' },
  { category: 'Social', color: '#FCD34D', totalDays: 7, completedDays: 3, icon: '🤝' },
  { category: 'Reflect', color: '#C4B5FD', totalDays: 7, completedDays: 7, icon: '🧠' },
  { category: 'Create', color: '#F472B6', totalDays: 7, completedDays: 2, icon: '✨' },
  { category: 'Motion', color: 'var(--accent-red)', totalDays: 7, completedDays: 4, icon: '⚡' },
]

export function ProgressWeb({ data = DEFAULT_DATA, size = 320 }: ProgressWebProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const center = size / 2
  const radius = (size / 2) - 40 // space for labels
  
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {/* Background Concentric Webs */}
        {Array.from({ length: 4 }).map((_, i) => {
          const r = (i + 1) * (radius / 4)
          return (
            <circle
              key={`bg-${i}`}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="var(--web-line)"
              strokeWidth="0.5"
              strokeDasharray="4,8"
              opacity={0.3}
            />
          )
        })}

        {/* Strands */}
        {data.map((cat, i) => {
          const angle = (i * (360 / data.length) - 90) * (Math.PI / 180)
          const x2 = center + radius * Math.cos(angle)
          const y2 = center + radius * Math.sin(angle)
          const isHovered = hoveredIndex === i
          const isAnyHovered = hoveredIndex !== null
          
          return (
            <g 
              key={cat.category}
              style={{ 
                opacity: isAnyHovered ? (isHovered ? 1 : 0.3) : 1,
                transition: 'opacity 0.3s ease'
              }}
            >
              <WebStrand
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                color={cat.color}
                nodes={cat.totalDays}
                activeNodes={cat.completedDays}
                delay={i * 0.1}
              />
            </g>
          )
        })}

        {/* Center Node */}
        <circle cx={center} cy={center} r={6} fill="var(--foreground)" className="animate-spidey-snap" />
        <circle cx={center} cy={center} r={16} fill="var(--web-line)" opacity={0.5} className="animate-pulse-sense" />
      </svg>

      {/* Category Labels */}
      {data.map((cat, i) => {
        const angle = (i * (360 / data.length) - 90) * (Math.PI / 180)
        // Push labels slightly further out
        const labelRadius = radius + 25
        const lx = center + labelRadius * Math.cos(angle)
        const ly = center + labelRadius * Math.sin(angle)
        
        const isHovered = hoveredIndex === i
        const isAnyHovered = hoveredIndex !== null

        return (
          <div
            key={cat.category}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer tap-effect"
            style={{ 
              left: lx, 
              top: ly,
              opacity: isAnyHovered ? (isHovered ? 1 : 0.4) : 1,
              transition: 'all 0.3s var(--ease-snap)',
              transform: isHovered ? 'translate(-50%, -50%) scale(1.1)' : 'translate(-50%, -50%) scale(1)'
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1 bg-white/5 border"
              style={{ borderColor: isHovered ? cat.color : 'var(--border)' }}
            >
              {cat.icon}
            </div>
            <span 
              className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
              style={{ color: isHovered ? cat.color : 'var(--muted-foreground)' }}
            >
              {cat.category}
            </span>
          </div>
        )
      })}
    </div>
  )
}
