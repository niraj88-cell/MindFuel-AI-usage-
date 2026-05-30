'use client'

import React, { useEffect, useRef, useState } from 'react'

interface StatItem {
  value: number
  suffix: string
  label: string
}

const STATS: StatItem[] = [
  { value: 2400, suffix: '+', label: 'Mental check-ins logged' },
  { value: 31, suffix: '%', label: 'Less doomscrolling in 14 days' },
  { value: 94, suffix: '%', label: 'Report increased awareness' },
]

function useCountUp(target: number, isVisible: boolean, duration = 2000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    let startTime: number | null = null
    let rafId: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [target, isVisible, duration])

  return count
}

function StatPill({ stat, isVisible, delay }: { stat: StatItem; isVisible: boolean; delay: number }) {
  const count = useCountUp(stat.value, isVisible)

  return (
    <div 
      className="flex flex-col items-center gap-1 px-6 py-4 sm:px-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
        {count.toLocaleString()}{stat.suffix}
      </span>
      <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">
        {stat.label}
      </span>
    </div>
  )
}

export function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full max-w-3xl mx-auto my-16 px-4">
      <div className="flex flex-col sm:flex-row items-center justify-center divide-y sm:divide-y-0 sm:divide-x divide-white/5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm">
        {STATS.map((stat, i) => (
          <StatPill key={stat.label} stat={stat} isVisible={isVisible} delay={i * 0.15} />
        ))}
      </div>
    </div>
  )
}
