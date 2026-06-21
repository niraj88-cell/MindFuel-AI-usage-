// components/dashboard/CoachBanner.tsx
'use client'

import React, { useState } from 'react'
import { Sparkles, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CoachBannerProps {
  message: string
  actionItems?: string[]
  onDismiss?: () => void
  onViewMore?: () => void
}

export function CoachBanner({ message, actionItems, onDismiss, onViewMore }: CoachBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-5 animate-fade-in-up">
      {/* Animated background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-float" />

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">

        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-indigo-300 mb-1">Daily AI Coach</h4>
          <p className="text-sm text-[var(--foreground)] leading-relaxed">{message}</p>

          {actionItems && actionItems.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="text-indigo-400 mt-0.5">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {onViewMore && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-indigo-400 hover:text-indigo-300 gap-1 px-0"
              onClick={onViewMore}
            >
              Talk to your coach <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={() => { setDismissed(true); onDismiss() }}
            className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
