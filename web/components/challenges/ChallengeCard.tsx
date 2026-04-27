// components/challenges/ChallengeCard.tsx
'use client'

import React from 'react'
import { Trophy, Flame, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface ChallengeCardProps {
  id: string
  title: string
  description: string
  targetDays: number
  completedDays: number
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  isActive: boolean
  onAdjustDifficulty?: (id: string, direction: 'up' | 'down') => void
  onComplete?: (id: string) => void
}

const difficultyConfig = {
  easy: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '🌱 Easy' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: '🔥 Medium' },
  hard: { color: 'text-red-400', bg: 'bg-red-500/10', label: '💪 Hard' },
}

export function ChallengeCard({
  id, title, description, targetDays, completedDays,
  difficulty, category, isActive, onAdjustDifficulty, onComplete,
}: ChallengeCardProps) {
  const progress = Math.round((completedDays / targetDays) * 100)
  const config = difficultyConfig[difficulty]
  const isCompleted = completedDays >= targetDays

  return (
    <div className={`glass-card p-5 transition-all duration-300 ${isCompleted ? 'border-emerald-500/30' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-indigo-400" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="text-xs text-[var(--muted-foreground)]">{category}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] ${config.color}`}>
          {config.label}
        </Badge>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">{description}</p>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--muted-foreground)]">Progress</span>
          <span className="font-medium tabular-nums">{completedDays}/{targetDays} days</span>
        </div>
        <Progress
          value={progress}
          indicatorClassName={isCompleted ? 'bg-emerald-500' : 'bg-[var(--primary)]'}
        />
      </div>

      {/* Actions */}
      {isActive && !isCompleted && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--muted-foreground)] mr-1">Difficulty:</span>
            <button
              onClick={() => onAdjustDifficulty?.(id, 'down')}
              className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              disabled={difficulty === 'easy'}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAdjustDifficulty?.(id, 'up')}
              className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              disabled={difficulty === 'hard'}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button size="sm" onClick={() => onComplete?.(id)} className="gap-1 text-xs">
            <Check className="w-3.5 h-3.5" /> Log Today
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="text-center py-1">
          <span className="text-sm font-medium text-emerald-400">🎉 Challenge Complete!</span>
        </div>
      )}
    </div>
  )
}
