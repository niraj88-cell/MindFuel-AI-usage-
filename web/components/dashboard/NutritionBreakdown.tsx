// components/dashboard/NutritionBreakdown.tsx
'use client'

import React from 'react'
import { getCategoryEmoji } from '@/lib/utils'

interface CategoryData {
  category: string
  count: number
  percentage: number
  avgScore: number
}

interface NutritionBreakdownProps {
  data: CategoryData[]
}

const CATEGORY_COLORS: Record<string, string> = {
  educational: '#818cf8',
  productive: '#34d399',
  creative: '#f472b6',
  social: '#60a5fa',
  entertainment: '#fbbf24',
  doomscroll: '#f87171',
  neutral: '#94a3b8',
}

export function NutritionBreakdown({ data }: NutritionBreakdownProps) {
  const sortedData = [...data].sort((a, b) => b.percentage - a.percentage)

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-[var(--muted)]">
        {sortedData.map((item) => (
          <div
            key={item.category}
            className="h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${item.percentage}%`,
              backgroundColor: CATEGORY_COLORS[item.category] || '#94a3b8',
              minWidth: item.percentage > 0 ? '4px' : '0',
            }}
            title={`${item.category}: ${item.percentage}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {sortedData.map((item) => (
          <div
            key={item.category}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--muted)] transition-colors duration-200 group"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#94a3b8' }}
              />
              <span className="text-sm capitalize">
                {getCategoryEmoji(item.category)} {item.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">{item.count} logs</span>
              <span className="text-sm font-semibold tabular-nums">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
