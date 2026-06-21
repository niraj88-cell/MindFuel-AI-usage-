// components/insights/BrainReport.tsx
// A premium, shareable "Brain Report" card — screenshot-worthy and elegant.
// Designed for Instagram Stories (9:16) with web-motif accents.
'use client'

import React, { useRef, useCallback } from 'react'
import { Share2, Download, TrendingUp, Flame, Clock, Zap } from 'lucide-react'

interface BrainReportProps {
  score: number
  moodTrend: 'up' | 'down' | 'stable'
  focusHours: number
  streak: number
  summary: string
  recommendation: string
  userName?: string
  weekLabel?: string
}

function getScoreGradient(score: number): string {
  if (score >= 75) return 'from-emerald-400 to-blue-500'
  if (score >= 50) return 'from-blue-400 to-indigo-500'
  if (score >= 30) return 'from-amber-400 to-orange-500'
  return 'from-red-400 to-rose-500'
}

function getScoreWord(score: number): string {
  if (score >= 80) return 'Thriving'
  if (score >= 65) return 'Strong'
  if (score >= 50) return 'Steady'
  if (score >= 35) return 'Rebuilding'
  return 'Healing'
}

export function BrainReport({
  score,
  moodTrend,
  focusHours,
  streak,
  summary,
  recommendation,
  userName = 'Explorer',
  weekLabel,
}: BrainReportProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return
    
    try {
      // Try native share API first
      if (navigator.share) {
        await navigator.share({
          title: `My MindFuel Brain Report`,
          text: `${getScoreWord(score)} week — score ${score}/100. ${summary}`,
          url: window.location.href,
        })
      } else {
        // Fallback: copy summary to clipboard
        await navigator.clipboard.writeText(
          `🕸️ My MindFuel Brain Report\n\n${getScoreWord(score)} week — ${score}/100\n${summary}\n\n💡 ${recommendation}\n\n#MindFuel #MentalHealth`
        )
        alert('Report copied to clipboard!')
      }
    } catch {
      // User cancelled share
    }
  }, [score, summary, recommendation])

  const scoreGradient = getScoreGradient(score)
  const circumference = 2 * Math.PI * 80
  const dashOffset = circumference * (1 - score / 100)

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* The Card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[28px] p-8 border border-white/[0.08]"
        style={{
          background: 'linear-gradient(160deg, #0E0E18 0%, #12121F 40%, #0F1520 100%)',
          aspectRatio: '4/5',
        }}
      >
        {/* Web pattern overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 400 500"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Concentric web circles */}
          {[120, 180, 240].map((r, i) => (
            <circle
              key={i}
              cx="200" cy="220"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.025)"
              strokeWidth="0.5"
              strokeDasharray="8,12"
            />
          ))}
          {/* Radial lines */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2
            return (
              <line
                key={`r-${i}`}
                x1="200" y1="220"
                x2={200 + 250 * Math.cos(angle)}
                y2={220 + 250 * Math.sin(angle)}
                stroke="rgba(255,255,255,0.02)"
                strokeWidth="0.5"
              />
            )
          })}
        </svg>

        {/* Corner accents */}
        <svg className="absolute top-0 right-0 w-16 h-16 pointer-events-none" viewBox="0 0 60 60">
          <line x1="60" y1="0" x2="30" y2="20" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8" />
          <line x1="60" y1="0" x2="40" y2="25" stroke="rgba(220,38,38,0.15)" strokeWidth="0.8" />
          <circle cx="60" cy="0" r="2" fill="rgba(59,130,246,0.3)" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none" viewBox="0 0 60 60">
          <line x1="0" y1="60" x2="25" y2="35" stroke="rgba(220,38,38,0.2)" strokeWidth="0.8" />
          <line x1="0" y1="60" x2="20" y2="40" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8" />
          <circle cx="0" cy="60" r="2" fill="rgba(220,38,38,0.3)" />
        </svg>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                {weekLabel || 'This Week'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {userName}&apos;s Brain Report
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 to-blue-500" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">MindFuel</span>
            </div>
          </div>

          {/* Score Ring */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              {/* Glow */}
              <div 
                className={`absolute inset-0 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${scoreGradient}`}
                style={{ transform: 'scale(1.5)' }}
              />
              
              <svg width="190" height="190" className="relative z-10">
                {/* Background track */}
                <circle
                  cx="95" cy="95" r="80"
                  fill="none"
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="6"
                />
                {/* Dashed web track */}
                <circle
                  cx="95" cy="95" r="88"
                  fill="none"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="1"
                  strokeDasharray="6,8"
                />
                {/* Score arc */}
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DC2626" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <circle
                  cx="95" cy="95" r="80"
                  fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 95 95)"
                  style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
                {/* Web nodes on the ring */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                  const rad = (deg - 90) * (Math.PI / 180)
                  const nx = 95 + 80 * Math.cos(rad)
                  const ny = 95 + 80 * Math.sin(rad)
                  return (
                    <circle
                      key={i}
                      cx={nx} cy={ny} r="2.5"
                      fill="rgba(255,255,255,0.15)"
                    />
                  )
                })}
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className={`text-5xl font-semibold bg-gradient-to-br ${scoreGradient} bg-clip-text text-transparent`}>
                  {score}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mt-1">
                  {getScoreWord(score)}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3 my-6">
            <div className="text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className={`w-3 h-3 ${moodTrend === 'up' ? 'text-emerald-400' : moodTrend === 'down' ? 'text-red-400' : 'text-zinc-400'}`} />
              </div>
              <p className="text-xs font-bold text-white capitalize">{moodTrend}</p>
              <p className="text-[9px] text-zinc-500 font-medium">Mood</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-blue-400" />
              </div>
              <p className="text-xs font-bold text-white">{focusHours}h</p>
              <p className="text-[9px] text-zinc-500 font-medium">Focus</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-3 h-3 text-orange-400" />
              </div>
              <p className="text-xs font-bold text-white">{streak}d</p>
              <p className="text-[9px] text-zinc-500 font-medium">Streak</p>
            </div>
          </div>

          {/* AI Summary */}
          <div className="mb-4">
            <p className="text-sm text-zinc-300 leading-relaxed font-medium">
              {summary}
            </p>
          </div>

          {/* Recommendation */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/[0.1]">
            <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200/80 leading-relaxed">
              {recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12] transition-all cursor-pointer active:scale-[0.98]"
      >
        <Share2 className="w-4 h-4" />
        Share Your Web
      </button>
    </div>
  )
}
