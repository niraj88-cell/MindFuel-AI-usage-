// app/(app)/challenges/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { Trophy, CheckCircle2, Circle, Flame, Star, AlertCircle, Plus, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { HabitChallenge } from '@/lib/supabase/types'

const STATIC_TEMPLATES = [
  {
    title: 'Digital Detox Morning',
    description: 'No social media or news for the first hour after waking up.',
    target_days: 7,
    difficulty: 'medium' as const,
    category: 'morning_routine',
    target_category: 'doomscroll',
  },
  {
    title: 'Mindful Meals',
    description: 'Eat at least one meal a day without any screens.',
    target_days: 14,
    difficulty: 'easy' as const,
    category: 'mindfulness',
    target_category: 'entertainment',
  },
  {
    title: 'Deep Work Sprint',
    description: 'Complete one 90-minute focused work block daily without interruptions.',
    target_days: 5,
    difficulty: 'hard' as const,
    category: 'productivity',
    target_category: 'productive',
  }
]

export default function ChallengesPage() {
  const [activeChallenges, setActiveChallenges] = useState<HabitChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null)

  useEffect(() => {
    loadChallenges()
  }, [])

  async function loadChallenges() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('habit_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setActiveChallenges(data || [])
    setLoading(false)
  }

  async function startChallenge(template: typeof STATIC_TEMPLATES[0]) {
    setAddingTemplate(template.title)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('habit_challenges').insert({
      user_id: user.id,
      title: template.title,
      description: template.description,
      target_days: template.target_days,
      difficulty: template.difficulty,
      category: template.category,
      target_category: template.target_category,
      completed_days: 0,
      is_active: true,
      started_at: new Date().toISOString(),
      completed_at: null,
    } as any)

    await loadChallenges()
    setAddingTemplate(null)
  }

  async function checkInChallenge(challenge: HabitChallenge) {
    const supabase = createClient()
    const newProgress = challenge.completed_days + 1
    const isCompleted = newProgress >= challenge.target_days

    await supabase.from('habit_challenges')
      .update({
        completed_days: newProgress,
        is_active: !isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      } as any)
      .eq('id', challenge.id)

    loadChallenges()
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-[var(--muted)] rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => <div key={i} className="h-48 bg-[var(--muted)] rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-white" /> Habit Challenges
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Build healthier digital habits with guided progressive challenges.
        </p>
      </div>

      {/* Active Challenges */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Challenges</h2>
        {activeChallenges.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeChallenges.map((challenge) => {
              const progressPercentage = (challenge.completed_days / challenge.target_days) * 100

              return (
                <Card key={challenge.id} className="border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[var(--muted)]">
                    <div 
                      className="h-full bg-white transition-all duration-500" 
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline" className="mb-2 category-focus">
                          {challenge.category}
                        </Badge>
                        <CardTitle className="text-base">{challenge.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-white bg-white/5 px-2 py-1 rounded-full">
                        <Flame className="w-3.5 h-3.5" />
                        {challenge.completed_days} / {challenge.target_days} days
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">
                      {challenge.description}
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => checkInChallenge(challenge)}
                    >
                      <Circle className="w-4 h-4 mr-2" /> Mark Day Complete
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="glass-card p-6 sm:p-8 text-center border-dashed">
            <AlertCircle className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-3" />
            <h3 className="font-medium">No active challenges</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1 mb-4">
              Pick a challenge below to start improving your mental nutrition.
            </p>
          </div>
        )}
      </div>

      {/* Available Challenges */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Discover Challenges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STATIC_TEMPLATES.map((template) => {
            const isActive = activeChallenges.some(c => c.title === template.title)
            
            return (
              <Card key={template.title} className="hover:border-white/10 transition-colors group">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="capitalize text-xs">
                      {template.difficulty}
                    </Badge>
                    <div className="text-xs text-[var(--muted-foreground)] font-medium flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-white" />
                      {template.target_days} days
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-white transition-colors">
                    {template.title}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] line-clamp-3 mb-5 min-h-[60px]">
                    {template.description}
                  </p>
                  <Button 
                    variant={isActive ? "secondary" : "outline"} 
                    className={`w-full transition-all ${!isActive && 'group-hover:bg-[var(--primary)] group-hover:text-white group-hover:border-transparent'}`}
                    onClick={() => startChallenge(template)}
                    disabled={isActive || addingTemplate === template.title}
                  >
                    {isActive ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Active</>
                    ) : addingTemplate === template.title ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" /> Start Challenge</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
