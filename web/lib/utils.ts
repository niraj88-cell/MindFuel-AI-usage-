// lib/utils.ts — Utility functions
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getScoreColor(score: number): string {
  if (score >= 85) return 'var(--color-score-excellent)'
  if (score >= 65) return 'var(--color-score-good)'
  if (score >= 45) return 'var(--color-score-neutral)'
  if (score >= 25) return 'var(--color-score-low)'
  return 'var(--color-score-harmful)'
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 45) return 'Neutral'
  if (score >= 25) return 'Low'
  return 'Harmful'
}

export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    educational: '📚',
    productive: '⚡',
    creative: '🎨',
    social: '👥',
    entertainment: '🎬',
    doomscroll: '🌀',
    neutral: '➖',
  }
  return emojis[category] || '📊'
}

export function getMoodEmoji(mood: number): string {
  if (mood >= 9) return '🤩'
  if (mood >= 7) return '😊'
  if (mood >= 5) return '😐'
  if (mood >= 3) return '😔'
  return '😢'
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
