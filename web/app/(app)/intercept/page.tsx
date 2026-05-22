'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function InterceptPage() {
  const router = useRouter()
  const [step, setStep] = useState<'breathe' | 'intent'>('breathe')
  const [timeLeft, setTimeLeft] = useState(5)
  const [intent, setIntent] = useState('')

  // Breathing timer
  useEffect(() => {
    if (step === 'breathe' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (step === 'breathe' && timeLeft === 0) {
      setStep('intent')
    }
  }, [step, timeLeft])

  const handleContinue = () => {
    // In a real app, this would redirect to the original intended app via deep link
    // or log the intent to the database to track successful vs failed intercepts.
    router.push('/dashboard')
  }

  const handleDisconnect = () => {
    // Close the loop
    router.push('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-6 animate-fade-in-up">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black opacity-50" />
      
      <div className="relative z-10 max-w-md w-full space-y-12 text-center">
        <ShieldAlert className="w-12 h-12 text-zinc-500 mx-auto" />
        
        {step === 'breathe' ? (
          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-3xl font-bold tracking-tight">Pause.</h1>
            <p className="text-zinc-400">Take a deep breath before proceeding.</p>
            
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 border border-zinc-700 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-4 border border-zinc-500 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
              <div className="text-4xl font-black text-white">{timeLeft}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-3xl font-bold tracking-tight">Why are you opening this?</h1>
            <p className="text-zinc-400 text-sm">Mindless scrolling steals your time. State your intent.</p>
            
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="p-6 space-y-6">
                <Input 
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="e.g., Checking an important message" 
                  className="bg-black border-zinc-800 h-14 text-center focus:border-white transition-colors"
                  autoFocus
                />
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleContinue}
                    disabled={!intent.trim()}
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl"
                  >
                    Continue to App <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <Button 
                    onClick={handleDisconnect}
                    variant="ghost" 
                    className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl"
                  >
                    Close & Disconnect <X className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
