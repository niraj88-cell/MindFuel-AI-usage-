'use client'

import React from 'react'
import { Users, TrendingUp, Trophy } from 'lucide-react'

interface CommunityBenchmarkProps {
  percentile: number // e.g., 15 for "Top 15%"
}

export function CommunityBenchmark({ percentile }: CommunityBenchmarkProps) {
  if (!percentile || percentile <= 0) {
    return (
      <div className="w-full bg-[#FAF8F4] border border-[#4CAF50]/20 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
        <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <h3 className="text-[#111827] font-[var(--font-serif)] text-lg mb-1">Building Your Baseline</h3>
        <p className="text-[#4B5563] text-xs">Log a few more days to see how your digital wellness compares to the community.</p>
      </div>
    )
  }

  const isTopTier = percentile <= 20
  const isAverage = percentile > 20 && percentile <= 60

  return (
    <div className="w-full h-full bg-[#111827] rounded-3xl p-8 relative overflow-hidden shadow-lg group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Trophy className="w-32 h-32 text-white" />
      </div>
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-[0.2em]">Community Benchmark</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-[var(--font-serif)] text-white tracking-tight leading-tight">
            Top <span className="text-[#4CAF50]">{percentile}%</span>
          </h2>
          
          <p className="text-gray-400 text-sm mt-4 max-w-xs leading-relaxed">
            {isTopTier 
              ? "Your digital wellness score places you in the upper echelon of MindFuel users. You've mastered your attention."
              : isAverage 
              ? "Your score is perfectly aligned with the community average. You're maintaining a healthy baseline."
              : "Your current habits are a bit more draining than the community average. Small shifts can pull you up quickly."}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-gray-400">Global Average</span>
            <span className="text-white flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-[#4CAF50]" />
              Hovering around 62
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
