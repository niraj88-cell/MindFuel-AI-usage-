// components/mood-scan/MoodScanResult.tsx
// Premium 5-dimension mood intelligence result display
'use client'

import React, { useState } from 'react'
import {
  Heart, Zap, Brain, TrendingUp, TrendingDown, Minus,
  Shield, AlertTriangle, ChevronDown, ChevronUp,
  Sparkles, ArrowRight, Activity, Eye
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

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

interface Props {
  result: MoodIntelligence
  onScanAnother: () => void
}

const polarityConfig = {
  positive: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Positive' },
  negative: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Negative' },
  mixed: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Mixed' },
}

const trajectoryConfig = {
  elevate: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: TrendingUp, label: '↑ Elevating' },
  deplete: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: TrendingDown, label: '↓ Depleting' },
  neutralize: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Minus, label: '→ Neutral' },
}

const riskConfig = {
  none: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'No Risk' },
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Low Risk' },
  moderate: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Moderate Risk' },
  high: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'High Risk' },
}

const themeColors: Record<string, string> = {
  'dopamine-loops': 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  'comparison': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'escapism': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'motivation': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'fear': 'bg-red-500/15 text-red-300 border-red-500/20',
  'outrage': 'bg-red-500/15 text-red-300 border-red-500/20',
  'nostalgia': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  'social-validation': 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  'growth': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'self-improvement': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'creativity': 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  'curiosity': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'entertainment': 'bg-slate-500/15 text-slate-300 border-slate-500/20',
}

function getThemeColor(theme: string): string {
  const key = theme.toLowerCase()
  for (const [k, v] of Object.entries(themeColors)) {
    if (key.includes(k)) return v
  }
  return 'bg-slate-500/15 text-slate-300 border-slate-500/20'
}

export function MoodScanResult({ result, onScanAnother }: Props) {
  const [expandedRisk, setExpandedRisk] = useState(false)
  const polarity = polarityConfig[result.emotional_valence.polarity as keyof typeof polarityConfig] || polarityConfig.mixed
  const trajectory = trajectoryConfig[result.mood_trajectory.effect as keyof typeof trajectoryConfig] || trajectoryConfig.neutralize
  const risk = riskConfig[result.consumption_risk.risk_level as keyof typeof riskConfig] || riskConfig.low
  const TrajectoryIcon = trajectory.icon

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Mood Verdict (Hero Card) ── */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-[32px] blur opacity-50 group-hover:opacity-100 transition-opacity" />
        <Card className="relative bg-slate-900 border-indigo-500/30 rounded-[32px] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Mood Verdict</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                </div>
                <p className="text-lg text-white font-bold leading-relaxed">{result.mood_verdict}</p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-4 rounded-2xl ${trajectory.bg} border ${trajectory.border}`}>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recommended Action</span>
                <p className={`text-sm font-medium mt-1 ${trajectory.color}`}>{result.recommended_action}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 5 Dimension Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 1. Emotional Valence */}
        <Card className="mood-dimension-card bg-slate-900/50 border-white/5 rounded-[28px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${polarity.bg} border ${polarity.border}`}>
                <Heart className={`w-5 h-5 ${polarity.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Emotional Valence</h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${polarity.color}`}>{polarity.label}</span>
              </div>
              <div className="ml-auto">
                <div className={`px-3 py-1 rounded-full text-xs font-black ${polarity.bg} ${polarity.color} border ${polarity.border}`}>
                  {result.emotional_valence.intensity}/10
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.emotional_valence.emotions.map((emotion, i) => (
                <Badge key={i} variant="outline" className={`text-xs ${polarity.bg} ${polarity.color} ${polarity.border}`}>
                  {emotion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. Energy Signature */}
        <Card className="mood-dimension-card bg-slate-900/50 border-white/5 rounded-[28px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Energy Signature</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  {result.energy_signature.type.replace('-', ' ')}
                </span>
              </div>
            </div>
            {/* Energy Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span>Meditative</span>
                <span className="text-amber-400 font-black">{result.energy_signature.level}/10</span>
                <span>High-Stim</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out animate-score-fill"
                  style={{
                    width: `${result.energy_signature.level * 10}%`,
                    background: result.energy_signature.level > 7
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : result.energy_signature.level > 4
                        ? 'linear-gradient(90deg, #6366f1, #f59e0b)'
                        : 'linear-gradient(90deg, #10b981, #6366f1)',
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.energy_signature.descriptors.map((d, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-amber-500/5 text-amber-300 border-amber-500/20">{d}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Psychological Themes */}
        <Card className="mood-dimension-card bg-slate-900/50 border-white/5 rounded-[28px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                <Eye className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Psychological Themes</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                  Dominant: {result.psychological_themes.dominant_theme}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.psychological_themes.themes.map((theme, i) => (
                <Badge key={i} variant="outline" className={`text-xs border ${getThemeColor(theme)}`}>
                  {theme === result.psychological_themes.dominant_theme && '★ '}{theme}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 4. Mood Trajectory */}
        <Card className="mood-dimension-card bg-slate-900/50 border-white/5 rounded-[28px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trajectory.bg} border ${trajectory.border}`}>
                <TrajectoryIcon className={`w-5 h-5 ${trajectory.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Mood Trajectory</h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${trajectory.color}`}>{trajectory.label}</span>
              </div>
              <Badge variant="outline" className="ml-auto text-[10px] bg-slate-800/50 text-slate-400 border-white/10">
                {result.mood_trajectory.duration}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{result.mood_trajectory.explanation}</p>
          </CardContent>
        </Card>
      </div>

      {/* 5. Consumption Pattern Risk — Full Width */}
      <Card className={`mood-dimension-card bg-slate-900/50 ${risk.border} rounded-[28px] overflow-hidden border`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${risk.bg} border ${risk.border}`}>
                <Shield className={`w-5 h-5 ${risk.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Consumption Pattern Risk</h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${risk.color}`}>{risk.label}</span>
              </div>
            </div>
            {result.consumption_risk.flags.length > 0 && (
              <button onClick={() => setExpandedRisk(!expandedRisk)} className="text-slate-500 hover:text-white transition-colors">
                {expandedRisk ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {result.consumption_risk.warning && (
            <div className={`flex items-start gap-2 p-3 rounded-xl ${risk.bg} border ${risk.border} mb-3`}>
              <AlertTriangle className={`w-4 h-4 ${risk.color} shrink-0 mt-0.5`} />
              <p className={`text-xs font-medium ${risk.color}`}>{result.consumption_risk.warning}</p>
            </div>
          )}

          {expandedRisk && result.consumption_risk.flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 animate-fade-in-up">
              {result.consumption_risk.flags.map((flag, i) => (
                <Badge key={i} variant="outline" className={`text-xs ${risk.bg} ${risk.color} ${risk.border}`}>
                  {flag}
                </Badge>
              ))}
            </div>
          )}

          {result.consumption_risk.flags.length === 0 && (
            <p className="text-xs text-slate-500">No consumption pattern risks detected. ✓</p>
          )}
        </CardContent>
      </Card>

      {/* Scan Another Button */}
      <button
        onClick={onScanAnother}
        className="text-xs text-slate-600 hover:text-indigo-400 transition-colors font-bold flex items-center gap-1"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Scan another link
      </button>
    </div>
  )
}
