// components/dashboard/MoodConstellation.tsx
// A web-inspired mood selection UI — 5 emotion nodes in a curved arc
// Connected by thin web lines. Tapping a node "snaps" it into focus.
'use client'

import React, { useState, useCallback } from 'react'

interface MoodOption {
  value: number
  emoji: string
  label: string
  color: string
  bgColor: string
}

const MOODS: MoodOption[] = [
  { value: 2, emoji: '😰', label: 'Stressed', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)' },
  { value: 4, emoji: '😔', label: 'Low', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' },
  { value: 5, emoji: '😐', label: 'Meh', color: '#9CA3AF', bgColor: 'rgba(156, 163, 175, 0.12)' },
  { value: 7, emoji: '😊', label: 'Good', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.12)' },
  { value: 9, emoji: '😌', label: 'Great', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.12)' },
]

interface MoodConstellationProps {
  value: number
  onChange: (value: number) => void
  size?: number
}

export function MoodConstellation({ value, onChange, size = 320 }: MoodConstellationProps) {
  const [tappedIndex, setTappedIndex] = useState<number | null>(null)
  
  const centerX = size / 2
  const centerY = size / 2 + 20
  const arcRadius = size * 0.38
  
  // Position nodes along a gentle arc (top semicircle)
  const getNodePosition = useCallback((index: number) => {
    const startAngle = -150 * (Math.PI / 180)
    const endAngle = -30 * (Math.PI / 180)
    const angle = startAngle + (endAngle - startAngle) * (index / (MOODS.length - 1))
    return {
      x: centerX + arcRadius * Math.cos(angle),
      y: centerY + arcRadius * Math.sin(angle),
    }
  }, [centerX, centerY, arcRadius])

  const selectedIndex = MOODS.findIndex(m => m.value === value)

  const handleTap = (mood: MoodOption, index: number) => {
    setTappedIndex(index)
    onChange(mood.value)
    setTimeout(() => setTappedIndex(null), 400)
  }

  return (
    <div className="relative" style={{ width: size, height: size * 0.7, margin: '0 auto' }}>
      <svg
        width={size}
        height={size * 0.7}
        viewBox={`0 0 ${size} ${size * 0.7}`}
        className="absolute inset-0"
      >
        {/* Web connection lines from center anchor to each node */}
        {MOODS.map((mood, i) => {
          const pos = getNodePosition(i)
          const isSelected = selectedIndex === i
          return (
            <line
              key={`line-${i}`}
              x1={centerX}
              y1={centerY + 30}
              x2={pos.x}
              y2={pos.y}
              stroke={isSelected ? mood.color : 'var(--web-line)'}
              strokeWidth={isSelected ? 1.5 : 0.8}
              strokeDasharray={isSelected ? 'none' : '4,6'}
              opacity={isSelected ? 0.6 : 0.3}
              style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          )
        })}

        {/* Arc connecting all nodes */}
        {MOODS.map((_, i) => {
          if (i >= MOODS.length - 1) return null
          const pos1 = getNodePosition(i)
          const pos2 = getNodePosition(i + 1)
          return (
            <line
              key={`arc-${i}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke="var(--web-line)"
              strokeWidth={0.6}
              strokeDasharray="3,5"
              opacity={0.25}
            />
          )
        })}

        {/* Center anchor node */}
        <circle
          cx={centerX}
          cy={centerY + 30}
          r={4}
          fill={selectedIndex >= 0 ? MOODS[selectedIndex].color : 'var(--web-node)'}
          opacity={0.5}
          style={{ transition: 'fill 0.4s ease' }}
        />
      </svg>

      {/* Mood nodes */}
      {MOODS.map((mood, i) => {
        const pos = getNodePosition(i)
        const isSelected = selectedIndex === i
        const isTapped = tappedIndex === i
        const nodeSize = isSelected ? 64 : 52

        return (
          <button
            key={mood.value}
            onClick={() => handleTap(mood, i)}
            className="absolute flex flex-col items-center justify-center rounded-full transition-all duration-400 cursor-pointer focus:outline-none focus-web"
            style={{
              left: pos.x - nodeSize / 2,
              top: pos.y - nodeSize / 2,
              width: nodeSize,
              height: nodeSize,
              background: isSelected ? mood.bgColor : 'rgba(255, 255, 255, 0.03)',
              border: `1.5px solid ${isSelected ? mood.color + '50' : 'var(--border)'}`,
              boxShadow: isSelected ? `0 0 24px ${mood.color}25, 0 0 48px ${mood.color}10` : 'none',
              transform: isTapped ? 'scale(0.9)' : isSelected ? 'scale(1.1)' : 'scale(1)',
              transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              zIndex: isSelected ? 10 : 1,
            }}
            aria-label={`Mood: ${mood.label}`}
          >
            <span className="text-xl leading-none" style={{ filter: isSelected ? 'none' : 'grayscale(0.5)' }}>
              {mood.emoji}
            </span>
          </button>
        )
      })}

      {/* Selected label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center transition-all duration-300"
        style={{ bottom: 0 }}
      >
        {selectedIndex >= 0 && (
          <>
            <span
              className="text-sm font-bold block"
              style={{ color: MOODS[selectedIndex].color }}
            >
              {MOODS[selectedIndex].label}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">
              Tap to change
            </span>
          </>
        )}
      </div>
    </div>
  )
}
