// components/mood-scan/ScanHistory.tsx
// Recent mood scan history list
'use client'

import React, { useEffect, useState } from 'react'
import { Clock, TrendingUp, TrendingDown, Minus, Globe, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ScanItem {
  id: string
  url: string | null
  content: string
  platform: string | null
  mood_verdict: string
  mood_trajectory: { effect: string } | null
  created_at: string
}

interface Props {
  onSelect?: (scan: ScanItem) => void
}

const platformIcons: Record<string, string> = {
  'youtube': '🎬', 'youtube-shorts': '📱', 'instagram': '📸',
  'instagram-reels': '🎞️', 'tiktok': '🎵', 'twitter': '🐦',
  'reddit': '💬', 'netflix': '🎥', 'spotify': '🎧',
  'longform': '📝', 'linkedin': '💼',
}

const effectConfig: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  elevate: { icon: TrendingUp, color: 'text-emerald-400', label: 'Elevated' },
  deplete: { icon: TrendingDown, color: 'text-rose-400', label: 'Depleted' },
  neutralize: { icon: Minus, color: 'text-slate-400', label: 'Neutral' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.length > 30 ? u.pathname.substring(0, 30) + '...' : u.pathname
    return u.hostname + path
  } catch {
    return url.length > 40 ? url.substring(0, 40) + '...' : url
  }
}

export function ScanHistory({ onSelect }: Props) {
  const [scans, setScans] = useState<ScanItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/mood-scan')
        if (res.ok) {
          const data = await res.json()
          setScans(data.scans || [])
        }
      } catch (err) {
        console.error('Failed to load scan history:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-slate-800/30 rounded-2xl animate-shimmer" />
        ))}
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Globe className="w-8 h-8 text-slate-700 mb-2" />
        <p className="text-sm text-slate-500 font-medium">No scans yet</p>
        <p className="text-xs text-slate-600 mt-1">Paste a URL above to get your first mood scan</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {scans.map(scan => {
        const effect = effectConfig[(scan.mood_trajectory as any)?.effect || 'neutralize'] || effectConfig.neutralize
        const EffectIcon = effect.icon
        const emoji = scan.platform ? platformIcons[scan.platform] || '🌐' : '🌐'

        return (
          <button
            key={scan.id}
            onClick={() => onSelect?.(scan)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-800/20 border border-white/5 hover:bg-slate-800/40 hover:border-indigo-500/20 transition-all text-left group"
          >
            <span className="text-lg shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-medium truncate">
                {scan.url ? truncateUrl(scan.url) : (scan.content?.substring(0, 50) || 'Content scan')}
              </p>
              <p className="text-[10px] text-slate-600 truncate mt-0.5">{scan.mood_verdict}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <EffectIcon className={`w-3.5 h-3.5 ${effect.color}`} />
              <span className="text-[10px] text-slate-600 font-bold">{timeAgo(scan.created_at)}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
