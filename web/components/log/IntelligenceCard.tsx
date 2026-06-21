// components/log/IntelligenceCard.tsx
// Simple, human-friendly intelligence display after content analysis
'use client'

import React from 'react'
import { Shield, Brain, Zap, Clock, Heart, AlertTriangle, ChevronRight, Info } from 'lucide-react'

interface IntelligenceData {
  severity: 'critical' | 'warning' | 'moderate' | 'safe' | 'excellent'
  confidence: number
  impact_analysis: {
    mood_shift: string
    cognitive_load: string
    habit_risk: string
    time_quality: string
  }
  root_causes: Array<{ reason: string; evidence: string; confidence: number }>
  copilot_actions: Array<{ action: string; reason: string; impact: string; confidence: number }>
  missing_context?: string[]
}

interface IntelligenceCardProps {
  data: IntelligenceData
}

// Plain-language labels
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: '⚠️ Harmful', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  warning: { label: '🟡 Not Great', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  moderate: { label: '➖ Okay', color: '#a1a1aa', bg: 'rgba(161,161,170,0.08)', border: 'rgba(161,161,170,0.2)' },
  safe: { label: '✅ Good', color: '#d4d4d8', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
  excellent: { label: '🌟 Great Choice', color: '#ffffff', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)' },
}

const MOOD_LABELS: Record<string, string> = {
  strong_negative: '😞 Drops mood',
  negative: '😕 Lowers mood',
  neutral: '😐 No change',
  positive: '🙂 Lifts mood',
  strong_positive: '😊 Great for mood',
}

const TIME_LABELS: Record<string, string> = {
  wasted: 'Time wasted',
  low: 'Low value',
  neutral: 'Okay use of time',
  good: 'Time well spent',
  excellent: 'Great use of time',
}

const HABIT_LABELS: Record<string, string> = {
  high: '🔴 Addictive patterns',
  moderate: '🟡 Somewhat habit-forming',
  low: '🟢 Low risk',
  none: '✨ No risk',
}

export function IntelligenceCard({ data }: IntelligenceCardProps) {
  const sev = SEVERITY_CONFIG[data.severity] || SEVERITY_CONFIG.moderate

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Header: Severity + Confidence */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold"
          style={{ background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color }}
        >
          {sev.label}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Confidence</span>
          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${data.confidence}%`,
                background: data.confidence >= 70 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
              }}
            />
          </div>
          <span className="text-xs font-bold text-zinc-500">{data.confidence}%</span>
        </div>
      </div>

      {/* Impact Grid — 4 simple cards */}
      <div className="grid grid-cols-2 gap-3">
        <ImpactTile
          icon={<Heart className="w-4 h-4" />}
          label="Mood"
          value={MOOD_LABELS[data.impact_analysis.mood_shift] || '😐 No change'}
        />
        <ImpactTile
          icon={<Clock className="w-4 h-4" />}
          label="Time"
          value={TIME_LABELS[data.impact_analysis.time_quality] || 'Okay use of time'}
        />
        <ImpactTile
          icon={<Brain className="w-4 h-4" />}
          label="Brain Load"
          value={data.impact_analysis.cognitive_load === 'overwhelming' ? '🔴 Heavy' :
                 data.impact_analysis.cognitive_load === 'high' ? '🟡 Moderate-high' :
                 data.impact_analysis.cognitive_load === 'moderate' ? '➖ Normal' :
                 data.impact_analysis.cognitive_load === 'restorative' ? '✨ Relaxing' : '🟢 Light'}
        />
        <ImpactTile
          icon={<Shield className="w-4 h-4" />}
          label="Habit Risk"
          value={HABIT_LABELS[data.impact_analysis.habit_risk] || '🟢 Low risk'}
        />
      </div>

      {/* Why — Top root cause only, keep it simple */}
      {data.root_causes.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Why this score</p>
          <p className="text-sm text-zinc-300 font-medium leading-relaxed">
            {data.root_causes[0].evidence}
          </p>
          {data.root_causes.length > 1 && (
            <p className="text-xs text-zinc-500 mt-2 italic">
              + {data.root_causes.length - 1} more factor{data.root_causes.length - 1 > 1 ? 's' : ''} identified
            </p>
          )}
        </div>
      )}

      {/* What to do — Simple action cards */}
      {data.copilot_actions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">What to do</p>
          {data.copilot_actions.slice(0, 2).map((action, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{action.action}</p>
                <p className="text-xs text-zinc-500 truncate">{action.reason}</p>
              </div>
              {action.impact === 'high' && (
                <span className="text-[9px] font-semibold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                  HIGH IMPACT
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Low confidence notice */}
      {data.confidence < 60 && data.missing_context && data.missing_context.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <Info className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-zinc-500">Want a better analysis?</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Try adding: {data.missing_context.join(', ').toLowerCase()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ImpactTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3">
      <div className="text-zinc-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-bold text-zinc-300 truncate">{value}</p>
      </div>
    </div>
  )
}
