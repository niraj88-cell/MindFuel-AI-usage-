// components/insights/ScrollInsights.tsx
// Content Analysis / Scrolling Insights with Spider-Verse styling
// Non-judgmental language with web-node icons and web-strand progress bars
'use client'

import React from 'react'
import { WebCorner } from '../ui/WebCorner'

interface CategoryStat {
  category: string
  hours: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  message: string
  color: string
}

interface ScrollInsightsProps {
  stats: CategoryStat[]
}

const DEFAULT_STATS: CategoryStat[] = [
  {
    category: 'Entertainment',
    hours: 2.3,
    percentage: 45,
    trend: 'stable',
    message: 'You spent 2.3 hours on entertainment yesterday. That\'s about average for you. Want to explore why?',
    color: 'var(--accent-blue)'
  },
  {
    category: 'Doomscroll',
    hours: 1.1,
    percentage: 20,
    trend: 'down',
    message: 'Your scrolling is down 15% this week. The web is catching less noise.',
    color: 'var(--accent-red)'
  },
  {
    category: 'Productive',
    hours: 3.5,
    percentage: 60,
    trend: 'up',
    message: 'Strong focus today. Your mental strands are aligned.',
    color: '#10B981' // emerald
  }
]

export function ScrollInsights({ stats = DEFAULT_STATS }: ScrollInsightsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 px-2">Pattern Analysis</h3>
      
      {stats.map((stat, i) => (
        <div 
          key={stat.category}
          className="web-card p-5 group animate-fade-in-up"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <WebCorner position="top-right" color={stat.color} />
          
          <div className="flex items-start gap-4">
            {/* Web Node Icon */}
            <div className="relative mt-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: stat.color,
                  boxShadow: `0 0 12px ${stat.color}80` 
                }}
              />
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-50"
                style={{ backgroundColor: stat.color }}
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">{stat.category}</span>
                <span className="text-xs font-black" style={{ color: stat.color }}>{stat.hours}h</span>
              </div>
              
              {/* Web Strand Progress Bar */}
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-3 relative">
                {/* Background dashed strand */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${stat.color}, ${stat.color} 2px, transparent 2px, transparent 6px)`
                  }}
                />
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${stat.percentage}%`,
                    backgroundColor: stat.color,
                    boxShadow: `0 0 10px ${stat.color}`
                  }}
                />
              </div>
              
              <p className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                {stat.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
