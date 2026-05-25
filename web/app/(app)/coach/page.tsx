// app/(app)/coach/page.tsx — Full-screen AI coach with real token streaming + history load
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, Brain, Bot, User, Sparkles, Clock, AlertCircle } from 'lucide-react'
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
    if (/^---+$/.test(line.trim())) return <hr key={i} className="border-white/10 my-3" />
    if (/^[-*]\s/.test(line)) {
      const content = line.replace(/^[-*]\s/, '')
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-white shrink-0 mt-0.5">•</span>
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
      return <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*'))
      return <em key={i} className="text-zinc-300 italic">{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="bg-zinc-700 text-white px-1.5 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>
    return p
  })
}

const QUICK_PROMPTS = [
  'How was my digital health today?',
  'I feel overwhelmed by screens',
  'Give me a 7-day digital detox plan',
  'Why do I keep doomscrolling?',
]

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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="flex gap-1.5">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
        <p className="text-sm text-zinc-500">Loading session history…</p>
      </div>
    )
  }

  const showQuickPrompts = messages.length <= 1

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-8rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-white" />
            Cognitive <span className="text-white">Assistant</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Real-time AI mental wellness coaching.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Online</span>
        </div>
      </div>

      {/* Rate limit banner */}
      {rateLimited && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white shrink-0 animate-fade-in-up">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{rateLimited.message}</span>
          {countdown && (
            <span className="font-mono font-black text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full text-xs">
              {countdown}
            </span>
          )}
        </div>
      )}

      {/* Chat card */}
      <Card className="flex-1 flex flex-col min-h-0 bg-zinc-900/50 border-white/10 rounded-[20px] md:rounded-[40px] overflow-hidden shadow-2xl">
        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 space-y-6 custom-scrollbar">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-end gap-4 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                msg.role === 'user'
                  ? 'bg-white/10 text-white border-white/10'
                  : msg.role === 'system'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-white/5 text-white border-white/10'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[85%] md:max-w-[72%] px-4 py-3 md:px-6 md:py-4 rounded-[28px] shadow-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-white text-black rounded-br-md'
                  : msg.role === 'system'
                  ? 'bg-rose-500/10 text-rose-300 rounded-bl-md border border-rose-500/20 italic text-xs'
                  : 'bg-zinc-800/80 text-zinc-200 border border-white/10 rounded-bl-md'
              }`}>
                <div className="space-y-0.5">
                  {renderContent(msg.content)}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-cursor-blink rounded-sm ml-0.5 align-middle" />
                  )}
                </div>
                {msg.ts && (
                  <div className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-white/40' : 'text-zinc-600'}`}>
                    {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex items-end gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/5 text-white border border-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div className="px-6 py-5 rounded-[28px] bg-zinc-800/80 border border-white/10 rounded-bl-md flex items-center gap-1.5">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Quick prompts */}
        {showQuickPrompts && (
          <div className="flex flex-wrap gap-2 px-3 sm:px-5 md:px-8 pb-4 shrink-0">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="text-xs px-4 py-3 min-h-[44px] rounded-full border border-white/10 text-zinc-400 hover:bg-white/5 hover:border-white/10 hover:text-white transition-all cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 md:p-6 border-t border-white/10 bg-zinc-900/80 backdrop-blur-md shrink-0">
          <div className="flex gap-4 items-end bg-zinc-800/50 rounded-[28px] p-3 pl-6 border border-white/10 focus-within:border-white/10 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={rateLimited ? `Rate limited — retry in ${countdown || '...'}` : 'Talk to your coach… (Enter to send, Shift+Enter for newline)'}
              rows={1}
              disabled={loading || !!rateLimited}
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-zinc-500 text-sm resize-none max-h-[120px] overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            />
            <Button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading || !!rateLimited}
              className="w-12 h-12 rounded-2xl bg-white hover:bg-zinc-200 text-black shrink-0 shadow-lg shadow-white/5 p-0 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 text-center">
            MindFuel AI Coach · Not a substitute for professional mental health care
          </p>
        </div>
      </Card>
    </div>
  )
}
