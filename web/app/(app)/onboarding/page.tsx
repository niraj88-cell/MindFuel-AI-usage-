// app/(app)/onboarding/page.tsx — "The First Five Minutes"
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Network, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/mixpanel'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
      })
      .eq('id', user.id)

    trackEvent('Onboarding Completed')
    router.push('/log')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-60" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full pt-12 pb-32 flex items-center justify-center min-h-[60vh]">
        <div className="space-y-8 animate-fade-in-up text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <Network className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif text-white tracking-tight">Welcome to MindFuel.</h1>
          <p className="text-zinc-400 text-lg">Understand how your screen time affects your mood and focus.</p>
          <Button 
            onClick={handleComplete}
            disabled={loading}
            className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 mt-8"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log your first moment'} <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
