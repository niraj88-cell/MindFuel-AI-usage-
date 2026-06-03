'use client'

import React from 'react'
import { getScoreColor } from '@/lib/utils'

interface MindCoreProps {
  score: number
  category?: string
}

export function MindCore({ score, category }: MindCoreProps) {
  const color = getScoreColor(score)
  const isHealthy = score >= 60

  return (
    <div className="relative flex items-center justify-center w-full h-[400px]">
      {/* Outer ambient aura */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full opacity-40 transition-all duration-1000 ease-in-out pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
          filter: 'blur(40px)',
          willChange: 'transform'
        }}
      />
      
      {/* Inner core */}
      <div 
        className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.1)] transition-all duration-1000"
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${color}40`,
        }}
      >
        {/* Core pulse */}
        <div 
          className="absolute inset-0 rounded-full animate-breathe opacity-50"
          style={{
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
          }}
        />
        
        {/* Value Display */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">State</span>
          <span className="text-5xl font-black text-white drop-shadow-md">{score}</span>
        </div>
      </div>

      {/* Floating particles (pure CSS) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-white/40 animate-orb-1" style={{ filter: 'blur(2px)' }} />
        <div className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-white/20 animate-orb-2" style={{ filter: 'blur(4px)' }} />
        <div className="absolute bottom-1/3 left-1/4 w-1 h-1 rounded-full bg-white/60 animate-orb-3" style={{ filter: 'blur(1px)' }} />
      </div>
    </div>
  )
}
