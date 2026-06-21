'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert, ArrowRight, X, Check, Clock, Heart, Leaf, ExternalLink, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────
type FrictionMode = 'speed_bump' | 'mirror' | 'tollgate'
type InterceptStep =
  | 'hold_breathe'     // Mode 1: Hold-to-breathe (replaces passive countdown)
  | 'feeling'          // Emotion labeling
  | 'mirror_choice'    // Mode 2: "Is this intentional or automatic?"
  | 'tollgate_type'    // Mode 3: Type accountability sentence
  | 'intent'           // State your purpose
  | 'landing_pad'      // Graceful exit: 10s of stillness

interface InterceptLog {
  id: string
  intent: string
  emotion: string | null
  action: 'continued' | 'disconnected'
  created_at: string
}

// ─── Friction Detection ─────────────────────────────────────────────────────
function determineFrictionMode(logs: InterceptLog[]): FrictionMode {
  const now = new Date()
  const hour = now.getHours()
  const isLateNight = hour >= 23 || hour < 5

  // Count intercepts in the last 60 minutes
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const recentCount = logs.filter(
    (l) => new Date(l.created_at) > oneHourAgo
  ).length

  // Count intercepts in the last 15 minutes (loop detection)
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000)
  const loopCount = logs.filter(
    (l) => new Date(l.created_at) > fifteenMinsAgo
  ).length

  // Mode 3: Tollgate — late night OR extreme loop (3+ in 15min)
  if (isLateNight || loopCount >= 3) return 'tollgate'

  // Mode 2: Mirror — moderate frequency (2+ in last hour)
  if (recentCount >= 2 || loopCount >= 2) return 'mirror'

  // Mode 1: Speed Bump — default, low friction
  return 'speed_bump'
}

function getLastInterceptMinutesAgo(logs: InterceptLog[]): number | null {
  if (logs.length === 0) return null
  const last = new Date(logs[0].created_at)
  return Math.round((Date.now() - last.getTime()) / 60000)
}

// ─── Component ──────────────────────────────────────────────────────────────
function InterceptContent() {
  const router = useRouter()

  // State
  const [recentLogs, setRecentLogs] = useState<InterceptLog[]>([])
  const [frictionMode, setFrictionMode] = useState<FrictionMode>('speed_bump')
  const [step, setStep] = useState<InterceptStep>('hold_breathe')
  const [emotion, setEmotion] = useState('')
  const [intent, setIntent] = useState('')
  const [tollgateText, setTollgateText] = useState('')

  // Prediction and Smart Swaps
  const searchParams = useSearchParams()
  const targetUrl = searchParams?.get('target') || ''
  const [prediction, setPrediction] = useState<string | null>(null)
  const [smartSwaps, setSmartSwaps] = useState<any[]>([])
  const [intervention, setIntervention] = useState<{
    message: string
    command: string
    severity: string
    algorithm_callout: string
  } | null>(null)

  // Hold-to-breathe state
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdDuration = frictionMode === 'tollgate' ? 5000 : frictionMode === 'mirror' ? 4000 : 3000
  const holdStep = 50 // ms per tick

  // Landing pad
  const [landingSeconds, setLandingSeconds] = useState(10)

  // ─── Load recent logs & determine friction mode ─────────────────────────
  const loadLogs = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('intercept_logs')
        .select('id, intent, emotion, action, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      const logs = (data || []) as InterceptLog[]
      setRecentLogs(logs)
      setFrictionMode(determineFrictionMode(logs))
    } catch { /* silent */ }
  }, [])

  const loadPrediction = useCallback(async () => {
    if (!targetUrl) return
    try {
      const res = await fetch(`/api/intercept/predict?url=${encodeURIComponent(targetUrl)}`)
      if (res.ok) {
        const data = await res.json()
        setPrediction(data.prediction)
        setSmartSwaps(data.alternatives || [])
        if (data.intervention) setIntervention(data.intervention)
      }
    } catch { /* silent */ }
  }, [targetUrl])

  useEffect(() => { 
    loadLogs()
    loadPrediction()
  }, [loadLogs, loadPrediction])

  // ─── Hold-to-breathe interaction ────────────────────────────────────────
  const startHold = useCallback(() => {
    setIsHolding(true)
    if (holdInterval.current) clearInterval(holdInterval.current)
    holdInterval.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + (holdStep / holdDuration) * 100
        if (next >= 100) {
          if (holdInterval.current) clearInterval(holdInterval.current)
          return 100
        }
        return next
      })
    }, holdStep)
  }, [holdDuration])

  const stopHold = useCallback(() => {
    setIsHolding(false)
    if (holdInterval.current) clearInterval(holdInterval.current)
    // If not complete, decay back to 0
    setHoldProgress((prev) => (prev >= 100 ? 100 : 0))
  }, [])

  // When hold completes, advance to next step
  useEffect(() => {
    if (holdProgress >= 100) {
      const timer = setTimeout(() => {
        if (frictionMode === 'mirror') {
          setStep('mirror_choice')
        } else if (frictionMode === 'tollgate') {
          setStep('feeling')
        } else {
          setStep('feeling')
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [holdProgress, frictionMode])

  // Cleanup hold interval on unmount
  useEffect(() => {
    return () => {
      if (holdInterval.current) clearInterval(holdInterval.current)
    }
  }, [])

  // ─── Landing pad countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (step === 'landing_pad' && landingSeconds > 0) {
      const timer = setTimeout(() => setLandingSeconds((s) => s - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [step, landingSeconds])

  // ─── Save & Act ─────────────────────────────────────────────────────────
  const saveAndAct = async (action: 'continued' | 'disconnected') => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('intercept_logs').insert({
        user_id: user.id,
        intent: intent.trim() || 'No intent stated',
        emotion: emotion || null,
        action,
      })
    } catch { /* silent */ }

    if (action === 'disconnected') {
      setStep('landing_pad')
    } else {
      router.push('/dashboard')
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────
  const todayCount = recentLogs.filter((l) => {
    const logDate = format(new Date(l.created_at), 'yyyy-MM-dd')
    return logDate === format(new Date(), 'yyyy-MM-dd')
  }).length

  const disconnectRate = recentLogs.length > 0
    ? Math.round((recentLogs.filter((l) => l.action === 'disconnected').length / recentLogs.length) * 100)
    : 0

  const minutesAgo = getLastInterceptMinutesAgo(recentLogs)

  // Tollgate target sentence
  const TOLLGATE_SENTENCE = 'I am choosing to keep scrolling'

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">

      {/* ── STEP 1: Hold-to-Breathe (All Modes) ────────────────────────── */}
      {step === 'hold_breathe' && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in-up select-none">
          <ShieldAlert className="w-10 h-10 text-zinc-600 mb-6" />

          {/* Interceptor Intervention Message */}
          {intervention && (
            <div className="w-full max-w-sm mb-8 animate-fade-in-up">
              <div className={`p-5 rounded-2xl border text-left ${
                intervention.severity === 'critical' 
                  ? 'bg-red-500/10 border-red-500/20' 
                  : intervention.severity === 'severe'
                  ? 'bg-orange-500/8 border-orange-500/15'
                  : 'bg-zinc-900 border-white/10'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className={`w-3.5 h-3.5 ${
                    intervention.severity === 'critical' ? 'text-red-400' : 
                    intervention.severity === 'severe' ? 'text-orange-400' : 'text-zinc-400'
                  }`} />
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Interceptor</span>
                </div>
                <p className="text-white font-bold text-sm leading-relaxed mb-2">{intervention.message}</p>
                <p className="text-zinc-500 text-xs italic">{intervention.algorithm_callout}</p>
              </div>
            </div>
          )}

          {/* Contextual headline based on friction mode */}
          {frictionMode === 'tollgate' ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">It&apos;s late. Your mind needs rest.</h1>
              <p className="text-zinc-500 mt-2 text-sm">Hold the circle to prove you&apos;re here intentionally.</p>
            </>
          ) : frictionMode === 'mirror' && minutesAgo !== null && minutesAgo < 60 ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">You were just here {minutesAgo} min ago.</h1>
              <p className="text-zinc-500 mt-2 text-sm">Hold the circle. Let&apos;s check if this is autopilot.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Pause. Breathe.</h1>
              <p className="text-zinc-500 mt-2 text-sm">Hold the circle to continue. Your autopilot brought you here.</p>
            </>
          )}

          {/* Hold-to-breathe circle */}
          <div className="relative w-36 h-36 mx-auto mt-10 mb-8">
            {/* Background ring */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
              <circle cx="72" cy="72" r="66" fill="none" stroke="rgb(39 39 42)" strokeWidth="4" />
              <circle
                cx="72" cy="72" r="66"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 66}`}
                strokeDashoffset={`${2 * Math.PI * 66 * (1 - holdProgress / 100)}`}
                className="transition-all duration-100"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {holdProgress >= 100 ? (
                <Check className="w-8 h-8 text-white" />
              ) : isHolding ? (
                <div className="text-sm font-bold text-white animate-pulse">Breathing...</div>
              ) : (
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Hold</div>
              )}
            </div>
          </div>

          {/* Hold button */}
          <button
            onMouseDown={startHold}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={startHold}
            onTouchEnd={stopHold}
            className={`w-full max-w-xs h-14 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              isHolding
                ? 'bg-white text-black scale-95'
                : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:border-white/30'
            }`}
          >
            {holdProgress >= 100 ? 'Releasing...' : isHolding ? 'Keep holding...' : 'Press & hold to breathe'}
          </button>

          {/* Friction mode indicator (subtle) */}
          <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
            <div className={`w-2 h-2 rounded-full ${
              frictionMode === 'tollgate' ? 'bg-red-500' : frictionMode === 'mirror' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            {frictionMode === 'tollgate' ? 'High Awareness' : frictionMode === 'mirror' ? 'Pattern Detected' : 'Mindful Check'}
          </div>
        </div>
      )}

      {/* ── STEP 2a: Mirror Choice (Mode 2 Only) ──────────────────────── */}
      {step === 'mirror_choice' && (
        <div className="min-h-[70vh] flex flex-col justify-center animate-fade-in-up">
          <div className="text-center space-y-3 mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Is this intentional, or automatic?
            </h1>
            <p className="text-zinc-500 text-sm">
              {minutesAgo !== null && minutesAgo < 30
                ? `You opened this ${minutesAgo} minutes ago. Be honest with yourself.`
                : 'No judgment. Just awareness.'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setIntent('Intentional use')
                setStep('intent')
              }}
              className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl border border-white/10 hover:border-white/30 transition-all cursor-pointer"
            >
              I need this for a specific task
            </button>
            <button
              onClick={() => {
                setEmotion('autopilot')
                setIntent('Admitted autopilot scrolling')
                saveAndAct('disconnected')
              }}
              className="w-full h-14 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-400 hover:text-white font-medium rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer"
            >
              I&apos;m just scrolling
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2b: Tollgate Typing (Mode 3 Only) ─────────────────────── */}
      {step === 'tollgate_type' && (
        <div className="min-h-[70vh] flex flex-col justify-center animate-fade-in-up">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Your nervous system is exhausted.</h1>
            <p className="text-zinc-500 text-sm">To continue, type the sentence below exactly:</p>
            <p className="text-white font-bold text-lg mt-4 italic">&ldquo;{TOLLGATE_SENTENCE}&rdquo;</p>
          </div>

          <Input
            value={tollgateText}
            onChange={(e) => setTollgateText(e.target.value)}
            placeholder="Type the sentence above..."
            className="bg-zinc-950 border-zinc-800 h-14 text-center focus:border-white transition-colors mb-4"
            autoFocus
          />

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setIntent('Bypassed tollgate')
                setStep('intent')
              }}
              disabled={tollgateText.toLowerCase().trim() !== TOLLGATE_SENTENCE.toLowerCase()}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue anyway
            </Button>
            <Button
              onClick={() => saveAndAct('disconnected')}
              variant="ghost"
              className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl cursor-pointer"
            >
              You&apos;re right, I&apos;ll stop <Leaf className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Emotion Check (All Modes) ──────────────────────────── */}
      {step === 'feeling' && (
        <div className="min-h-[70vh] flex flex-col justify-center animate-fade-in-up">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">What are you actually feeling right now?</h1>
            <p className="text-zinc-500 text-sm">Naming an emotion reduces its intensity. Take a moment.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {['😰 Anxious', '😔 Lonely', '😤 Frustrated', '😶 Numb', '😩 Overwhelmed', '🤷 Not sure'].map((em) => (
              <button
                key={em}
                onClick={() => {
                  setEmotion(em)
                  if (frictionMode === 'tollgate') {
                    setStep('tollgate_type')
                  } else {
                    setStep('intent')
                  }
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium p-4 rounded-xl text-center border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                {em}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (frictionMode === 'tollgate') {
                setStep('tollgate_type')
              } else {
                setStep('intent')
              }
            }}
            className="text-zinc-500 hover:text-white text-sm font-bold mx-auto block transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>
      )}

      {/* ── STEP 4: Intent (Speed Bump & Mirror) ───────────────────────── */}
      {step === 'intent' && (
        <div className="py-8 space-y-8 animate-fade-in-up">
          <div className="text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-zinc-500 mx-auto" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Now — what&apos;s your actual intention?</h1>
            <p className="text-zinc-500 text-sm">If you can&apos;t name a reason, maybe you don&apos;t need to open it.</p>
            {prediction && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold animate-fade-in-up">
                ⚠️ {prediction}
              </div>
            )}
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
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-xl sm:text-2xl font-semibold text-white">{todayCount}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Today&apos;s Intercepts</p>
                </div>
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-xl sm:text-2xl font-semibold text-white">{disconnectRate}%</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Disconnect Rate</p>
                </div>
              </div>

              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Recent</p>
              {recentLogs.slice(0, 5).map((log) => (
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

      {/* ── STEP 5: Landing Pad (Graceful Exit) ────────────────────────── */}
      {step === 'landing_pad' && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in-up">
          <Heart className="w-10 h-10 text-zinc-600 mb-6" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Good choice.</h1>
          <p className="text-zinc-500 mt-2 text-sm mb-10">
            {landingSeconds > 0
              ? `${landingSeconds}s of stillness. You earned this.`
              : 'You just chose yourself over the algorithm.'}
          </p>

          {/* Subtle breathing animation */}
          <div className="relative w-24 h-24 mx-auto mb-10">
            <div
              className="absolute inset-0 border border-zinc-800 rounded-full"
              style={{
                animation: 'pulse 4s ease-in-out infinite',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-zinc-600" />
            </div>
          </div>

          {/* Smart Swaps */}
          {smartSwaps.length > 0 && landingSeconds <= 0 && (
            <div className="w-full max-w-sm mb-8 text-left animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Smart Swaps</h4>
              </div>
              <div className="space-y-2">
                {smartSwaps.map((alt, i) => (
                  <a
                    key={i}
                    href={alt.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/20 transition-all group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-bold text-white line-clamp-1">{alt.title}</span>
                      <Badge variant="outline" className="text-[9px] shrink-0 bg-white/5 text-zinc-400 border-white/10">{alt.type}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{alt.why_better}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-zinc-600 font-bold">{alt.provider} · {alt.duration_minutes}m</span>
                      <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-white ml-auto" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {landingSeconds <= 0 && (
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => router.push('/log')}
                className="w-full h-12 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Log how I&apos;m feeling
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full h-12 text-zinc-500 hover:text-white font-medium rounded-xl transition-colors cursor-pointer"
              >
                Back to dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function InterceptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-500">Loading...</div>}>
      <InterceptContent />
    </Suspense>
  )
}
