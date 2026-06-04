'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, KeyRound, Copy, Trophy, CheckCircle2, Flame, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SquadMember {
  id: string
  name: string
  avatar: string | null
  today_score: number
  streak: number
}

interface Squad {
  id: string
  name: string
  invite_code: string
  members: SquadMember[]
}

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [newSquadName, setNewSquadName] = useState('')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  
  const fetchSquads = async () => {
    try {
      const res = await fetch('/api/squads')
      const data = await res.json()
      if (data.squads) {
        setSquads(data.squads)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSquads()
  }, [])

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSquadName.trim()) return
    setIsCreating(true)
    
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSquadName })
      })
      
      const data = await res.json()
      if (res.ok) {
        alert('Squad Created! Invite your friends to join.')
        setNewSquadName('')
        fetchSquads()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      alert('Failed to create squad')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinSquad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCodeInput.trim()) return
    setIsJoining(true)
    
    try {
      const res = await fetch('/api/squads/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCodeInput })
      })
      
      const data = await res.json()
      if (res.ok) {
        alert(`Joined Squad! Welcome to ${data.squad.name}`)
        setInviteCodeInput('')
        fetchSquads()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      alert('Failed to join squad')
    } finally {
      setIsJoining(false)
    }
  }

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert('Invite code copied to clipboard.')
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif">Squads</h1>
          <p className="text-zinc-400 mt-1">Multiplayer accountability for digital detoxing.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Squad Card */}
        <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                <Plus className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Create a Squad</h2>
            </div>
            <form onSubmit={handleCreateSquad} className="space-y-4">
              <Input
                placeholder="Squad Name (e.g., Focus Masters)"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                className="bg-black/50 border-white/10"
              />
              <Button type="submit" disabled={!newSquadName || isCreating} className="w-full bg-white text-black hover:bg-zinc-200">
                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Squad
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Join Squad Card */}
        <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <KeyRound className="w-5 h-5 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Join a Squad</h2>
            </div>
            <form onSubmit={handleJoinSquad} className="space-y-4">
              <Input
                placeholder="6-Digit Invite Code"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                className="bg-black/50 border-white/10 font-mono tracking-widest uppercase"
                maxLength={6}
              />
              <Button type="submit" disabled={!inviteCodeInput || isJoining} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
                {isJoining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Join Squad
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {squads.length > 0 ? (
        <div className="space-y-6">
          {squads.map(squad => (
            <Card key={squad.id} className="bg-zinc-900/50 border-white/5 backdrop-blur-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{squad.name}</h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-zinc-400">
                    <Users className="w-4 h-4" />
                    <span>{squad.members.length} Members</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/5 cursor-pointer hover:bg-black/60 transition-colors" onClick={() => copyInviteCode(squad.invite_code)}>
                  <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Invite Code</span>
                  <span className="font-mono font-bold tracking-widest text-indigo-400">{squad.invite_code}</span>
                  <Copy className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
              
              <div className="p-0">
                {squad.members.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <div className="w-6 text-center font-mono font-bold text-zinc-500">
                      {index === 0 ? <Trophy className="w-5 h-5 text-amber-400 mx-auto" /> : `#${index + 1}`}
                    </div>
                    <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center bg-zinc-800 text-xs overflow-hidden shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{member.name.substring(0,2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{member.name}</p>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                         <p className="text-xs text-zinc-500 font-medium uppercase">Today</p>
                         <div className="flex items-center gap-1.5 justify-end">
                            <span className="font-bold text-lg">{member.today_score}</span>
                            <span className="text-xs text-zinc-400">/100</span>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-xs text-zinc-500 font-medium uppercase">Streak</p>
                         <div className="flex items-center gap-1 justify-end">
                            <Flame className={`w-4 h-4 ${member.streak > 0 ? 'text-rose-500' : 'text-zinc-600'}`} />
                            <span className="font-bold text-lg">{member.streak}</span>
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Squads Yet</h3>
          <p className="text-zinc-400 max-w-sm mx-auto">
            You aren't part of any squads. Create one to challenge your friends, or join an existing squad using an invite code.
          </p>
        </div>
      )}
    </div>
  )
}
