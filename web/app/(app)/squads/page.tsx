'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, KeyRound, Loader2, Network } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SquadDashboard } from '@/components/squads/SquadDashboard'

export default function SquadsPage() {
  const [squads, setSquads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newSquadName, setNewSquadName] = useState('')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [notification, setNotification] = useState<{title: string, desc?: string, type: 'success'|'error'} | null>(null)
  
  const showToast = (title: string, desc?: string, type: 'success'|'error' = 'success') => {
    setNotification({ title, desc, type })
    setTimeout(() => setNotification(null), 4000)
  }
  
  const fetchSquads = async () => {
    try {
      const res = await fetch('/api/squads')
      const data = await res.json()
      if (data.squads) setSquads(data.squads)
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
        showToast('Squad Created', 'Invite your friends using the code.')
        setNewSquadName('')
        fetchSquads()
      } else {
        showToast('Creation Failed', data.error, 'error')
      }
    } catch (err) {
      showToast('Error', 'Failed to create squad', 'error')
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
        showToast('Squad Joined', `Welcome to ${data.squad.name}`)
        setInviteCodeInput('')
        fetchSquads()
      } else {
        showToast('Join Failed', data.error, 'error')
      }
    } catch (err) {
      showToast('Error', 'Failed to join squad', 'error')
    } finally {
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  // Active Squad View
  if (squads.length > 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <SquadDashboard squad={squads[0]} showToast={showToast} />

        {/* Floating Toast Notification */}
        {notification && (
          <div className={`fixed bottom-6 right-6 p-4 rounded-2xl border backdrop-blur-xl z-50 animate-fade-in-up flex items-start gap-3 shadow-2xl ${notification.type === 'success' ? 'bg-zinc-900/90 border-white/10' : 'bg-red-950/90 border-red-500/20'}`}>
            <div>
              <p className={`font-bold text-sm ${notification.type === 'success' ? 'text-white' : 'text-red-200'}`}>{notification.title}</p>
              {notification.desc && <p className="text-zinc-400 text-xs mt-0.5">{notification.desc}</p>}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Premium Empty State
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in-up pb-20">
      
      <div className="text-center py-16 px-4">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
          <Network className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-semibold tracking-tighter text-white mb-6">Create a small private circle for daily check-ins and support.</h1>
        <p className="text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Share your daily reflection, support friends, and tackle simple missions together in a high-trust environment.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-zinc-800 rounded-2xl border border-white/5">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Form a Squad</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Start a new circle</p>
              </div>
            </div>
            <form onSubmit={handleCreateSquad} className="space-y-4">
              <Input
                placeholder="Name your squad (e.g., The 1% Club)"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                className="bg-black/50 border-white/10 h-14 rounded-2xl px-6 text-lg"
              />
              <Button type="submit" disabled={!newSquadName || isCreating} className="w-full h-14 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold text-lg">
                {isCreating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                Create Squad
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-zinc-800 rounded-2xl border border-white/5">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Join a Squad</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Enter Invite Code</p>
              </div>
            </div>
            <form onSubmit={handleJoinSquad} className="space-y-4">
              <Input
                placeholder="6-DIGIT CODE"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                className="bg-black/50 border-white/10 font-mono tracking-widest uppercase h-14 rounded-2xl px-6 text-lg text-center"
                maxLength={6}
              />
              <Button type="submit" disabled={!inviteCodeInput || isJoining} className="w-full h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-lg border border-white/5">
                {isJoining ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                Join Squad
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Floating Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-2xl border backdrop-blur-xl z-50 animate-fade-in-up flex items-start gap-3 shadow-2xl ${notification.type === 'success' ? 'bg-zinc-900/90 border-white/10' : 'bg-red-950/90 border-red-500/20'}`}>
          <div>
            <p className={`font-bold text-sm ${notification.type === 'success' ? 'text-white' : 'text-red-200'}`}>{notification.title}</p>
            {notification.desc && <p className="text-zinc-400 text-xs mt-0.5">{notification.desc}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
