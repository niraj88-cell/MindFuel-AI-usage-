'use client'

import React, { useMemo } from 'react'
import { format, subDays, startOfDay, parseISO } from 'date-fns'

interface LifeInPixelsProps {
  pixelData: Array<{ date: string; score: number }>
}

function getPixelColor(score: number): string {
  if (score === 0) return '#F5F7F6' // No data / Empty
  if (score >= 80) return '#4CAF50' // Excellent (Green)
  if (score >= 60) return '#81C784' // Nourishing (Light Green)
  if (score >= 40) return '#FFB74D' // Neutral (Orange)
  if (score >= 20) return '#E57373' // Draining (Light Red)
  return '#D32F2F' // Harmful (Dark Red)
}

export function LifeInPixels({ pixelData }: LifeInPixelsProps) {
  // Generate the last 90 days
  const days = useMemo(() => {
    const today = startOfDay(new Date())
    const dataMap = new Map<string, number>()
    
    pixelData.forEach(d => {
      // Use YYYY-MM-DD for stable comparison
      dataMap.set(d.date.substring(0, 10), d.score)
    })

    const grid = []
    for (let i = 89; i >= 0; i--) {
      const date = subDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const score = dataMap.get(dateStr) || 0
      grid.push({
        date: dateStr,
        score,
        color: getPixelColor(score)
      })
    }
    return grid
  }, [pixelData])

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-start sm:justify-center">
        {days.map((day, i) => (
          <div
            key={i}
            className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm sm:rounded-md transition-all hover:scale-125 cursor-crosshair group relative"
            style={{ backgroundColor: day.color }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#111827] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md">
              {format(parseISO(day.date), 'MMM d')}: {day.score > 0 ? day.score : 'No data'}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 mt-8 text-[10px] font-medium text-gray-400 uppercase tracking-widest flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#D32F2F]"></div>
          <span>Harmful</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#E57373]"></div>
          <span>Draining</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#FFB74D]"></div>
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#81C784]"></div>
          <span>Nourishing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#4CAF50]"></div>
          <span>Excellent</span>
        </div>
      </div>
    </div>
  )
}
