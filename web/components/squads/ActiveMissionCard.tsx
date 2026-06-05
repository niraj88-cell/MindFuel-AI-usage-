'use client'

import { useState, useEffect, useTransition } from 'react'
import { Target, CheckCircle2, ChevronRight, Activity, Flame, Shield, Moon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as Dialog from '@radix-ui/react-dialog'
import { createClient } from '@/lib/supabase/client'

export interface ActiveMission {
  id: string
  type: string
  title: string
  target_value: number
  status: string
  expires_at: string
  squad_mission_participants: {
    user_id: string
    progress: number
    completed: boolean
  }[]
}

export function ActiveMissionCard({ mission, members, squadId, onRefresh }: { mission: ActiveMission | null, members: any[], squadId: string, onRefresh: () => void }) {
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('focus')
  const [targetVal, setTargetVal] = useState('180')
  const [open, setOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data.user) setCurrentUserId(data.user.id)
    }
    fetchUser()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !targetVal) return
    setIsCreating(true)
    try {
      await fetch(`/api/squads/${squadId}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          title, 
          target_value: parseInt(targetVal),
          expires_at: new Date(Date.now() + 86400000 * 7).toISOString() // 7 days
        })
      })
      setOpen(false)
      onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!mission) return
    setIsJoining(true)
    try {
      await fetch(`/api/squads/${squadId}/missions/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: mission.id })
      })
      onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setIsJoining(false)
    }
  }

  if (!mission) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
        <Target className="w-12 h-12 text-zinc-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Active Mission</h3>
        <p className="text-zinc-400 max-w-sm mb-6">
          Start a group mission to build momentum together. Complete missions to increase the squad's pulse score.
        </p>
        
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button className="bg-white text-black hover:bg-zinc-200">Start a Mission</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fade-in" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel z-50 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">New Mission</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Mission Title</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 10k Steps Daily" className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white">
                      <option value="focus">Focus</option>
                      <option value="detox">Detox</option>
                      <option value="sleep">Sleep</option>
                      <option value="steps">Steps</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Target</label>
                    <input required type="number" value={targetVal} onChange={e => setTargetVal(e.target.value)} className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating} className="bg-white text-black hover:bg-zinc-200">
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    )
  }

  // Calculate total progress
  const totalProgress = mission.squad_mission_participants?.reduce((sum, p) => sum + p.progress, 0) || 0
  const percentComplete = Math.min(100, Math.round((totalProgress / mission.target_value) * 100))
  
  // Icon based on type
  const Icon = mission.type === 'focus' ? Flame : mission.type === 'detox' ? Shield : mission.type === 'sleep' ? Moon : Activity

  return (
    <div className="glass-card p-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-zinc-800 rounded-2xl border border-white/5">
            <Icon className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{mission.type} Mission</span>
            <h3 className="text-xl font-bold text-white">{mission.title}</h3>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <span className="text-3xl font-black text-white">{percentComplete}%</span>
          {currentUserId && !mission.squad_mission_participants?.some(p => p.user_id === currentUserId) && (
            <Button size="sm" onClick={handleJoin} disabled={isJoining} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7 px-3 rounded-full">
              {isJoining ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Join Mission
            </Button>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-4 bg-black rounded-full overflow-hidden flex border border-white/10 mb-6">
        {(mission.squad_mission_participants || []).map((p, i) => {
          const w = Math.min(100, (p.progress / mission.target_value) * 100)
          if (w === 0) return null
          
          // Generate a color based on the index to differentiate participants
          const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-teal-500', 'bg-rose-500']
          const bg = colors[i % colors.length]
          
          return (
            <div 
              key={p.user_id} 
              className={`h-full ${bg} border-r border-black/50 last:border-0`} 
              style={{ width: `${w}%` }} 
              title="Member Progress"
            />
          )
        })}
      </div>

      {/* Member Contributions */}
      <div className="space-y-3">
        {members.map(member => {
          const participant = (mission.squad_mission_participants || []).find(p => p.user_id === member.id)
          const progress = participant ? participant.progress : 0
          
          return (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                  {member.avatar ? (
                    <img src={member.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                      {member.name.substring(0,2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-300">{member.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{progress}</span>
                {participant?.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
