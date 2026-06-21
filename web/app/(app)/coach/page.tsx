// app/(app)/coach/page.tsx — Full-screen AI coach with real token streaming + history load
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Brain, Bot, User, Sparkles, Clock, AlertCircle, Volume2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { trackEvent } from '@/lib/mixpanel'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  ts?: number
  isStreaming?: boolean
}

/** Minimal inline markdown: **bold**, *italic*, bullet lists */
function renderContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1.5" />
    if (/^---+$/.test(line.trim())) return <hr key={i} className="border-black/[0.06] my-3" />
    if (/^[-*]\s/.test(line)) {
      const content = line.replace(/^[-*]\s/, '')
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-[#111827] shrink-0 mt-0.5">•</span>
          <span>{inlineMd(content)}</span>
        </div>
      )
    }
    return <p key={i} className="leading-relaxed">{inlineMd(line)}</p>
  })
}

function inlineMd(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="text-[#111827] font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*'))
      return <em key={i} className="text-[#4B5563] italic">{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="bg-[#F5F7F6] text-[#111827] px-1.5 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>
    return p
  })
}

const QUICK_PROMPTS = [
  'How was my digital health today?',
  'I feel overwhelmed by screens',
  'Give me a 7-day digital detox plan',
  'Why do I keep doomscrolling?',
]

function playNativeVoice(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
  
  const voices = window.speechSynthesis.getVoices();
  const premium = voices.find(v => 
    v.name.includes('Premium') || 
    v.name.includes('Enhanced') || 
    v.name.includes('Siri') ||
    v.name.includes('Google') ||
    v.name.includes('Online')
  );
  
  if (premium) utterance.voice = premium;
  utterance.rate = 1.15; // Faster talking
  utterance.pitch = 1.25; // Slightly higher pitch
  window.speechSynthesis.speak(utterance);
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [rateLimited, setRateLimited] = useState<{ message: string; resetAt: number } | null>(null)
  const [countdown, setCountdown] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    trackEvent('AI Coach Session Started');
  }, []);

  // Rate limit countdown
  useEffect(() => {
    if (!rateLimited) { setCountdown(null); return }
    const tick = () => {
      const secs = Math.max(0, Math.ceil((rateLimited.resetAt - Date.now()) / 1000))
      if (secs === 0) { setRateLimited(null); setCountdown(null); return }
      const m = Math.floor(secs / 60), s = secs % 60
      setCountdown(m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [rateLimited])

  // Load session history from DB
  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('coaching_sessions')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle()

      const stateObj = data?.state as Record<string, any> | null
      if (stateObj?.messages?.length > 0) {
        // Load last 20 messages from history
        const history: Message[] = stateObj!.messages.slice(-20).map((m: any, i: number) => ({
          id: `hist-${i}`,
          role: m.type === 'human' ? 'user' : 'assistant',
          content: m.content || '',
          ts: m.ts,
        }))
        setMessages(history)
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "**Welcome to your cognitive sanctuary** 🧠\n\nI'm your MindFuel coach — trained to help you understand and improve your digital mental nutrition.\n\nHow's your mental health today?",
          ts: Date.now(),
        }])
      }
      setInitialLoading(false)
    }
    loadHistory()
  }, [])

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading || !!rateLimited) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      ts: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const allMessages = [...messages, userMsg]
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.status === 429) {
        const data = await res.json()
        setRateLimited({ message: data.error, resetAt: data.resetAt || Date.now() + 60000 })
        setLoading(false)
        return
      }

      const contentType = res.headers.get('content-type') || ''
      const isCrisis = res.headers.get('X-Crisis-Detected') === '1'

      // Non-streaming fallback
      if (!res.ok || contentType.includes('application/json')) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || data.error || 'Something went wrong.',
          ts: Date.now(),
        }])
        setLoading(false)
        return
      }

      // True streaming
      const assistantId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        ts: Date.now(),
        isStreaming: true,
      }])

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (reader) {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
          )
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
      )
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'system',
        content: 'Connection lost. Please try again.',
        ts: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, rateLimited, messages])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  if (initialLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F5F7F6] blur-[100px] rounded-full opacity-50" />
        
        <div className="w-24 h-24 rounded-full bg-[#F5F7F6] border border-black/[0.04] flex items-center justify-center relative z-10">
           <div className="absolute inset-0 rounded-full border-2 border-[#4CAF50]/30 animate-[spin_4s_linear_infinite]" style={{ borderTopColor: '#4CAF50', borderLeftColor: 'transparent' }} />
           <Brain className="w-10 h-10 text-[#4CAF50] animate-pulse" />
        </div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest relative z-10">Initializing Neural Link</p>
      </div>
    )
  }

  const showQuickPrompts = messages.length <= 1

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-5rem)] w-full max-w-4xl mx-auto relative group/page">
      {/* Ambient background for the entire coach experience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
         <div className={`absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-radial-gradient from-[#F5F7F6] to-transparent blur-[120px] rounded-full transition-opacity duration-1000 ${loading ? 'opacity-40 animate-pulse' : 'opacity-30'}`} />
      </div>

      {/* Header - Floating Pill */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center p-4 md:p-8 pointer-events-none">
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-xl border border-black/[0.06] px-6 py-3 rounded-full shadow-md pointer-events-auto">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F7F6] border border-black/[0.04]">
            <Sparkles className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <div className="flex flex-col">
             <span className="text-sm font-[var(--font-serif)] font-semibold text-[#111827] leading-tight">MindFuel AI</span>
             <span className="text-[11px] font-medium text-[#4CAF50] uppercase tracking-wider leading-tight">Active Sync</span>
          </div>
        </div>
      </div>

      {/* Rate limit banner */}
      {rateLimited && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-6 py-3 bg-red-50 border border-red-200 rounded-full text-sm text-red-600 shadow-sm animate-fade-in-up whitespace-nowrap">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{rateLimited.message}</span>
          {countdown && (
            <span className="font-mono font-semibold bg-red-100 px-2 py-0.5 rounded-full text-xs">
              {countdown}
            </span>
          )}
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-32 pb-40 space-y-12 custom-scrollbar">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const isSystem = msg.role === 'system'
          
          return (
            <div key={msg.id} className={`flex w-full animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
              
              {isUser ? (
                // USER MESSAGE - Floating semi-transparent pill
                <div className="flex flex-col items-end max-w-[80%] md:max-w-[65%]">
                  <div className="px-6 py-4 rounded-[24px] rounded-tr-sm bg-[#111827] text-white text-[15px] leading-relaxed shadow-sm">
                     {renderContent(msg.content)}
                  </div>
                  {msg.ts && (
                    <span className="text-[10px] text-gray-400 mt-2 font-medium tracking-wide mr-2">
                      {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ) : isSystem ? (
                // SYSTEM MESSAGE
                <div className="w-full flex justify-center my-4">
                   <div className="px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs italic">
                     {msg.content}
                   </div>
                </div>
              ) : (
                // COACH MESSAGE - Immersive spatial text
                <div className="flex items-start gap-5 max-w-[90%] md:max-w-[75%]">
                   <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative mt-1 bg-[#F5F7F6] border border-black/[0.04]">
                      <div className="absolute inset-0 bg-[#4CAF50]/10 rounded-full" />
                      <Brain className="w-5 h-5 text-[#4CAF50] relative z-10" />
                   </div>
                   <div className="flex-1">
                     <div className="text-[15px] md:text-[16px] text-[#111827] leading-[1.8] font-normal coach-typography">
                        {renderContent(msg.content)}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-5 bg-[#4CAF50] animate-pulse rounded-sm ml-1 align-middle" />
                        )}
                     </div>
                     {msg.ts && !msg.isStreaming && (
                        <div className="flex items-center gap-3 mt-4 text-[10px] text-gray-400 font-medium tracking-wide">
                          <span>M.A.I. • {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button 
                            onClick={() => playNativeVoice(msg.content)}
                            className="p-1.5 rounded-full hover:bg-[#F5F7F6] text-gray-400 hover:text-[#4CAF50] transition-colors"
                            title="Listen with native premium voice"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                     )}
                   </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Thinking indicator */}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-start gap-5 animate-fade-in-up">
             <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative mt-1 bg-[#F5F7F6] border border-black/[0.04]">
                <div className="absolute inset-0 bg-[#4CAF50]/10 rounded-full" />
                <Brain className="w-5 h-5 text-[#4CAF50] relative z-10 animate-pulse" />
             </div>
             <div className="flex items-center gap-2 h-10">
                <span className="text-xs font-medium text-gray-400 italic mr-2 animate-pulse">Searching semantic memory...</span>
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Dock - Floating Spatial Bar */}
      <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[800px] z-30">
        
        {/* Quick prompts */}
        {showQuickPrompts && (
          <div className="flex flex-wrap justify-center gap-2 mb-4 animate-fade-in-up">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="text-xs px-5 py-2.5 rounded-full bg-white border border-black/[0.06] text-[#4B5563] hover:bg-[#F5F7F6] hover:text-[#111827] transition-all shadow-sm"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="relative group/input">
           <div className="relative flex items-end gap-3 bg-white border border-black/[0.06] p-2.5 md:p-3 rounded-[24px] shadow-md">
              <div className="flex-1 min-h-[44px] flex items-center pl-4">
                 <textarea
                   ref={inputRef}
                   value={input}
                   onChange={handleInputChange}
                   onKeyDown={handleKeyDown}
                   placeholder={rateLimited ? `Rate limited — retry in ${countdown || '...'}` : 'Message MindFuel AI...'}
                   rows={1}
                   disabled={loading || !!rateLimited}
                   className="w-full bg-transparent border-none focus:ring-0 text-[#111827] placeholder-gray-400 text-[15px] resize-none max-h-[120px] overflow-y-auto disabled:opacity-50 outline-none leading-relaxed custom-scrollbar py-2"
                 />
              </div>
              <Button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading || !!rateLimited}
                className="w-12 h-12 rounded-full bg-[#111827] hover:bg-[#1f2937] hover:scale-105 active:scale-95 text-white shrink-0 shadow-sm p-0 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
              </Button>
           </div>
        </div>
      </div>
    </div>
  )
}
