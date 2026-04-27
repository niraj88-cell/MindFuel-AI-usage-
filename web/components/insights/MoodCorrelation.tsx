// components/insights/MoodCorrelation.tsx
'use client'

import React from 'react'
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Correlation {
  pattern: string
  confidence: 'low' | 'medium' | 'high'
  data_points: number
}

interface MoodCorrelationProps {
  correlations: Correlation[]
}

const confidenceConfig = {
  low: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Low' },
  medium: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', label: 'Medium' },
  high: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'High' },
}

export function MoodCorrelation({ correlations }: MoodCorrelationProps) {
  if (!correlations.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-[var(--muted-foreground)]">
        <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">Not enough data for correlations yet</p>
        <p className="text-xs mt-1">Keep logging to discover patterns</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {correlations.map((c, i) => {
        const config = confidenceConfig[c.confidence]
        const isNegative = c.pattern.toLowerCase().includes('anxiety') ||
          c.pattern.toLowerCase().includes('spike') ||
          c.pattern.toLowerCase().includes('decline')

        return (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} transition-all hover:scale-[1.01]`}>
            <div className={`mt-0.5 ${config.color}`}>
              {isNegative ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{c.pattern}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">
                  {c.data_points} data points
                </Badge>
                <span className={`text-[10px] font-medium ${config.color}`}>
                  {config.label} confidence
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
