// components/progress/WebStrand.tsx
// A reusable SVG component for a single web strand with nodes
'use client'

import React from 'react'

interface WebStrandProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  nodes?: number // number of nodes along the strand
  activeNodes?: number // number of glowing nodes
  animated?: boolean
  delay?: number
}

export function WebStrand({
  x1,
  y1,
  x2,
  y2,
  color = 'var(--accent-blue)',
  nodes = 7,
  activeNodes = 0,
  animated = true,
  delay = 0
}: WebStrandProps) {
  // Calculate node positions along the line
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)
  
  const nodePositions = Array.from({ length: nodes }).map((_, i) => {
    const fraction = (i + 1) / (nodes + 1)
    return {
      x: x1 + dx * fraction,
      y: y1 + dy * fraction,
      isActive: i < activeNodes
    }
  })

  return (
    <g className={animated ? 'animate-fade-in-up' : ''} style={{ animationDelay: `${delay}s` }}>
      {/* Background faint line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--web-line)"
        strokeWidth="1"
        strokeDasharray="4,4"
        opacity={0.3}
      />
      
      {/* Active progress line */}
      {activeNodes > 0 && (
        <line
          x1={x1}
          y1={y1}
          x2={nodePositions[Math.min(activeNodes, nodes) - 1].x}
          y2={nodePositions[Math.min(activeNodes, nodes) - 1].y}
          stroke={color}
          strokeWidth="1.5"
          className={animated ? 'animate-strand-draw' : ''}
          style={{ animationDelay: `${delay + 0.2}s` }}
        />
      )}
      
      {/* Nodes */}
      {nodePositions.map((pos, i) => (
        <g key={i}>
          {pos.isActive && (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={4}
              fill={color}
              opacity={0.2}
              className={animated ? 'animate-glow-pulse' : ''}
              style={{ animationDelay: `${delay + i * 0.1}s` }}
            />
          )}
          <circle
            cx={pos.x}
            cy={pos.y}
            r={1.5}
            fill={pos.isActive ? '#fff' : 'var(--web-node)'}
            opacity={pos.isActive ? 1 : 0.4}
            className={animated ? 'animate-spidey-snap' : ''}
            style={{ animationDelay: `${delay + 0.5 + i * 0.1}s`, transformOrigin: `${pos.x}px ${pos.y}px` }}
          />
        </g>
      ))}
    </g>
  )
}
