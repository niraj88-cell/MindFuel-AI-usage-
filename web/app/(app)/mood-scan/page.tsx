// app/(app)/mood-scan/page.tsx — Premium Mood Intelligence Scanner
'use client'

import React, { useState, useCallback } from 'react'
import {
  ScanLine, Loader2, Link2, Sparkles, Brain, Clock,
  Play, Camera, Smartphone, MessageCircle, Newspaper, History
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoodScanResult } from '@/components/mood-scan/MoodScanResult'
import { ScanHistory } from '@/components/mood-scan/ScanHistory'
import { trackEvent } from '@/lib/mixpanel'

interface MoodIntelligence {
  emotional_valence: { polarity: string; emotions: string[]; intensity: number }
  energy_signature: { level: number; descriptors: string[]; type: string }
  psychological_themes: { themes: string[]; dominant_theme: string }
  mood_trajectory: { effect: string; explanation: string; duration: string }
  consumption_risk: { risk_level: string; flags: string[]; warning?: string }
  mood_verdict: string
  recommended_action: string
  platform?: string
}

const PLATFORM_PRESETS = [
  { id: 'youtube', label: 'YouTube', icon: <Play className="w-4 h-4" />, placeholder: 'https://youtube.com/watch?v=...', color: '#FF0000' },
  { id: 'instagram', label: 'Instagram', icon: <Camera className="w-4 h-4" />, placeholder: 'https://instagram.com/reel/...', color: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', icon: <Smartphone className="w-4 h-4" />, placeholder: 'https://tiktok.com/@user/video/...', color: '#00f2ea' },
  { id: 'twitter', label: 'Twitter/X', icon: <MessageCircle className="w-4 h-4" />, placeholder: 'https://x.com/user/status/...', color: '#1DA1F2' },
  { id: 'news', label: 'News', icon: <Newspaper className="w-4 h-4" />, placeholder: 'https://news-site.com/article/...', color: '#64748b' },
]

export default function MoodScanPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MoodIntelligence | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanPhase, setScanPhase] = useState<string>('')

  const handleScan = useCallback(async (overrideUrl?: string) => {
    const target = (overrideUrl || url).trim()
    if (!target || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    // Animated scan phases
    setScanPhase('Detecting platform...')
    await new Promise(r => setTimeout(r, 400))
    setScanPhase('Extracting content metadata...')
    await new Promise(r => setTimeout(r, 500))
    setScanPhase('Running mood intelligence analysis...')

    try {
      const res = await fetch('/api/mood-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target, content: target }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Scan failed')
      }

      setScanPhase('Rendering dimensions...')
      await new Promise(r => setTimeout(r, 300))
      setResult(data.analysis)

      trackEvent('Mood Scan Completed', {
        platform: data.analysis?.platform,
        effect: data.analysis?.mood_trajectory?.effect,
        risk: data.analysis?.consumption_risk?.risk_level,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
      setScanPhase('')
    }
  }, [url, loading])

  function handleReset() {
    setResult(null)
    setUrl('')
    setError(null)
  }

  function handlePreset(placeholder: string) {
    setUrl(placeholder)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24 stagger-children">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
            <ScanLine className="w-8 h-8 text-white" />
            Mood <span className="text-white">Scan</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-2 font-medium max-w-md">
            Paste any content link to get a deep 5-dimension psychological analysis of how it shapes your mood.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-full">
          <Brain className="w-4 h-4 text-white" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">AI-Powered</span>
        </div>
      </div>

      {/* Scanner Input Card */}
      {!result && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[36px] blur opacity-15 group-hover:opacity-25 transition-opacity" />
          <Card className="relative bg-zinc-900 border-white/10 rounded-[32px] overflow-hidden">
            <CardContent className="p-8 space-y-6">
              {/* URL Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-white" />
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Paste a URL or describe content</span>
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      id="mood-scan-input"
                      placeholder="https://youtube.com/watch?v=... or describe what you watched"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                      className="h-14 text-base pl-4 pr-4 bg-zinc-800/50 border-white/10 rounded-2xl focus:border-indigo-500/50"
                      disabled={loading}
                    />
                  </div>
                  <Button
                    id="scan-button"
                    onClick={() => handleScan()}
                    disabled={loading || !url.trim()}
                    className="h-14 px-8 bg-white hover:bg-zinc-200 text-black rounded-2xl font-black text-sm shadow-lg shadow-none"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4 mr-2" />
                        Scan
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Platform Presets */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Quick Platform Scan</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handlePreset(p.placeholder)}
                      disabled={loading}
                      className="group/btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/30 border border-white/10 hover:border-white/10 transition-all text-sm disabled:opacity-50"
                    >
                      <span style={{ color: p.color }} className="group-hover/btn:scale-110 transition-transform">
                        {p.icon}
                      </span>
                      <span className="text-zinc-400 font-bold group-hover/btn:text-white transition-colors text-xs">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in-up">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center">
              <Brain className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
            <div className="absolute -inset-3 w-30 h-30 rounded-full border border-transparent border-t-purple-500/50 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-white">{scanPhase}</p>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Analyzing 5 Mood Dimensions</p>
          </div>
          <div className="flex gap-1.5">
            {[0, 150, 300, 450, 600].map(d => (
              <div
                key={d}
                className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center animate-fade-in-up">
          <p className="text-rose-400 font-medium text-sm">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(false) }}
            className="mt-3 text-xs text-zinc-500 hover:text-white font-bold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Result */}
      {result && <MoodScanResult result={result} onScanAnother={handleReset} />}

      {/* Scan History */}
      {!loading && (
        <Card className="bg-zinc-900/30 border-white/10 rounded-[32px]">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-sm font-black text-zinc-400 flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <ScanHistory />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
