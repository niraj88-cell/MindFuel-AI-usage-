'use client'

import { useState } from 'react'
import { Heart, Flame, ShieldAlert, Sparkles, Send, CheckCircle2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'

const PING_TYPES = [
  { id: 'motivate', label: "You've got this", icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'check-in', label: "Checking in", icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'focus-flame', label: "Lock in", icon: ShieldAlert, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'celebrate', label: "Proud of you", icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
]

export function CuratedInteractionMenu({ squadId, targetUser, onComplete, onCancel }: { squadId: string, targetUser: { id: string, name: string }, onComplete: () => void, onCancel: () => void }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendPing = async (pingType: string) => {
    setError(null)
    setSending(true)
    try {
      const res = await fetch(`/api/squads/${squadId}/pings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user: targetUser.id, ping_type: pingType })
      })
      
      if (res.ok) {
        setSent(true)
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send ping.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center animate-fade-in-up">
        <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
        <p className="text-white font-bold">Sent to {targetUser.name}!</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 relative">
      <Dialog.Close asChild>
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
      </Dialog.Close>

      <div className="text-center mb-6 pt-2">
        <h4 className="text-lg font-bold text-white mb-1">Send a Nudge</h4>
        <p className="text-sm text-zinc-400">Support {targetUser.name} without the noise of a chat.</p>
      </div>
      
      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        {PING_TYPES.map(ping => (
          <button
            key={ping.id}
            onClick={() => sendPing(ping.id)}
            disabled={sending}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-colors group"
          >
            <div className={`p-3 rounded-full mb-3 ${ping.bg} group-hover:scale-110 transition-transform`}>
              <ping.icon className={`w-6 h-6 ${ping.color}`} />
            </div>
            <span className="text-sm font-medium text-zinc-300">{ping.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
