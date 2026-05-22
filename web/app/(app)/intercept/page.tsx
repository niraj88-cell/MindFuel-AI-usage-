'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, ArrowRight, X, Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface InterceptLog {
  id: string
  intent: string
  action: 'continued' | 'disconnected'
  created_at: string
}

export default function InterceptPage() {
  const router = useRouter()
  const [step, setStep] = useState<'breathe' | 'intent'>('breathe')
  const [timeLeft, setTimeLeft] = useState(5)
  const [intent, setIntent] = useState('')
  const [recentLogs, setRecentLogs] = useState<InterceptLog[]>([])

  useEffect(() => {
    if (step === 'breathe' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (step === 'breathe' && timeLeft === 0) {
      setStep('intent')
    }
  }, [step, timeLeft])

  const loadLogs = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('intercept_logs')
        .select('id, intent, action, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setRecentLogs(data || [])
    } catch {}
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  const saveAndAct = async (action: 'continued' | 'disconnected') => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('intercept_logs').insert({
        user_id: user.id,
        intent: intent.trim() || 'No intent stated',
        action,
      })
    } catch {}
    router.push('/dashboard')
  }

  const todayCount = recentLogs.filter(l => {
    const logDate = format(new Date(l.created_at), 'yyyy-MM-dd')
    return logDate === format(new Date(), 'yyyy-MM-dd')
  }).length

  const disconnectRate = recentLogs.length > 0
    ? Math.round((recentLogs.filter(l => l.action === 'disconnected').length / recentLogs.length) * 100)
    : 0

  return (
    <div className="max-w-lg mx-auto">
      {step === 'breathe' ? (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in-up">
          <ShieldAlert className="w-12 h-12 text-zinc-500 mb-8" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Pause.</h1>
          <p className="text-zinc-500 mt-2">Take a deep breath before proceeding.</p>
          
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center mt-12">
            <div className="absolute inset-0 border border-zinc-800 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
            <div className="text-4xl font-black text-white">{timeLeft}</div>
          </div>
        </div>
      ) : (
        <div className="py-8 space-y-8 animate-fade-in-up">
          <div className="text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-zinc-500 mx-auto" />
            <h1 className="text-3xl font-bold tracking-tight text-white">Why are you opening this?</h1>
            <p className="text-zinc-500 text-sm">Mindless scrolling steals your time. State your intent.</p>
          </div>

          <Input 
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Checking an important message" 
            className="bg-zinc-950 border-zinc-800 h-14 text-center focus:border-white transition-colors"
            autoFocus
          />
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => saveAndAct('continued')}
              disabled={!intent.trim()}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl cursor-pointer"
            >
              Continue to App <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button 
              onClick={() => saveAndAct('disconnected')}
              variant="ghost" 
              className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl cursor-pointer"
            >
              Close & Disconnect <X className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Stats */}
          {recentLogs.length > 0 && (
            <div className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{todayCount}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Today's Intercepts</p>
                </div>
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{disconnectRate}%</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Disconnect Rate</p>
                </div>
              </div>

              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Recent</p>
              {recentLogs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center gap-3 text-sm">
                  {log.action === 'disconnected' 
                    ? <Check className="w-4 h-4 text-white shrink-0" />
                    : <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  }
                  <span className="text-zinc-400 truncate flex-1">{log.intent}</span>
                  <span className="text-zinc-700 text-xs shrink-0">{format(new Date(log.created_at), 'h:mm a')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
