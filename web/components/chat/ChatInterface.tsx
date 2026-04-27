// components/chat/ChatInterface.tsx — Premium streaming chat with markdown, rate limit UI
// Handles real token-by-token streaming, rich markdown rendering, crisis alerts
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Bot, User, Sparkles, AlertTriangle, Clock, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  isCrisis?: boolean
}

interface RateLimitState {
  remaining: number | null
  resetAt: number | null
  isLimited: boolean
  message: string | null
}

const QUICK_PROMPTS = [
  'How was my digital health today?',
  'I feel overwhelmed by notifications',
  'Give me a 7-day detox plan',
  'Why does doomscrolling feel good?',
  'How to build better screen habits?',
]

/** Ultra-lightweight markdown renderer — no external dependency */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (!line.trim()) { result.push(<div key={i} className="h-2" />); i++; continue }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      result.push(<hr key={i} className="border-white/10 my-3" />)
      i++; continue
    }

    // Bullet list item
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s/, ''))
        i++
      }
      result.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm text-slate-300">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span>{inlineMd(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      let n = 1
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      result.push(
        <ol key={`ol-${i}`} className="space-y-1 my-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm text-slate-300">
              <span className="text-indigo-400 shrink-0 font-bold">{j + 1}.</span>
              <span>{inlineMd(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Normal paragraph
    result.push(
      <p key={i} className="text-sm leading-relaxed text-slate-200">
        {inlineMd(line)}
      </p>
    )
    i++
  }

  return result
}

/** Inline markdown: **bold**, *italic*, `code` */
function inlineMd(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="text-slate-300">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-slate-800 text-emerald-400 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    return part
  })
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey! I'm your **MindFuel coach** 🧠✨\n\nI help you understand your content habits, manage your mood, and build healthier digital routines.\n\nWhat's on your mind today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    remaining: null, resetAt: null, isLimited: false, message: null,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Countdown timer for rate limit
  const [countdown, setCountdown] = useState<string | null>(null)
  useEffect(() => {
    if (!rateLimit.isLimited || !rateLimit.resetAt) return
    const update = () => {
      const secs = Math.max(0, Math.ceil((rateLimit.resetAt! - Date.now()) / 1000))
      if (secs === 0) { setRateLimit(r => ({ ...r, isLimited: false })); setCountdown(null); return }
      const m = Math.floor(secs / 60), s = secs % 60
      setCountdown(m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [rateLimit.isLimited, rateLimit.resetAt])

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || isLoading || rateLimit.isLimited) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    }

    window.speechSynthesis?.cancel()
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    // Auto-grow textarea reset
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      })

      // Update rate limit state from headers
      const remaining = res.headers.get('X-RateLimit-Remaining')
      const resetAt = res.headers.get('X-RateLimit-Reset')
      const isCrisis = res.headers.get('X-Crisis-Detected') === '1'

      if (remaining) setRateLimit(r => ({ ...r, remaining: parseInt(remaining) }))

      // Rate limited
      if (res.status === 429) {
        const data = await res.json()
        setRateLimit({
          remaining: 0,
          resetAt: data.resetAt || (resetAt ? parseInt(resetAt) * 1000 : Date.now() + 60000),
          isLimited: true,
          message: data.error,
        })
        setIsLoading(false)
        return
      }

      // Non-streaming fallback (error JSON)
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok || contentType.includes('application/json')) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || data.error || "Something went wrong. Please try again.",
          timestamp: new Date(),
          isCrisis,
        }])
        setIsLoading(false)
        return
      }

      // True streaming — read tokens as they arrive
      const assistantId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        isCrisis,
      }])

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (reader) {
        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            if (audioEnabled && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel()
              const utterance = new SpeechSynthesisUtterance(accumulated.replace(/[*#`_]/g, ''))
              window.speechSynthesis.speak(utterance)
            }
            break
          }
          const chunk = decoder.decode(value, { stream: true })
          accumulated += chunk
          setMessages(prev =>
            prev.map(m => m.id === assistantId
              ? { ...m, content: accumulated, isStreaming: true }
              : m
            )
          )
        }
      }

      // Mark streaming complete
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
      )
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, rateLimit.isLimited, messages])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
  }

  const showQuickPrompts = messages.length <= 1 && !isLoading

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[780px]">
      {/* Rate limit alert */}
      {rateLimit.isLimited && (
        <div className="mx-4 mt-2 flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-sm text-amber-400 animate-fade-in-up">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="flex-1">{rateLimit.message || 'Rate limit reached.'}</span>
          {countdown && (
            <span className="font-mono font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">
              {countdown}
            </span>
          )}
        </div>
      )}

      {/* Remaining indicator */}
      {rateLimit.remaining !== null && rateLimit.remaining <= 10 && !rateLimit.isLimited && (
        <div className="mx-4 mt-2 text-xs text-slate-500 text-right px-2">
          {rateLimit.remaining} message{rateLimit.remaining !== 1 ? 's' : ''} remaining this hour
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4 custom-scrollbar">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-indigo-400 border border-indigo-500/20'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4" />
                : <User className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-md'
                : msg.isCrisis
                  ? 'bg-emerald-500/10 border border-emerald-500/20 rounded-tl-md'
                  : 'bg-slate-800/60 border border-white/5 rounded-tl-md'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="space-y-1">
                  {renderMarkdown(msg.content)}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded-sm ml-0.5 align-middle" />
                  )}
                </div>
              )}
              <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-white/50' : 'text-slate-600'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-800/60 border border-white/5 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts and Audio Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
        {showQuickPrompts ? (
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : <div className="flex-1" />}
        <button
          onClick={() => {
            setAudioEnabled(!audioEnabled);
            if (audioEnabled) window.speechSynthesis?.cancel();
          }}
          className={`p-2 rounded-full border transition-all ${
            audioEnabled 
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
              : 'bg-slate-800 border-white/10 text-slate-500'
          }`}
          title={audioEnabled ? "Mute AI voice" : "Unmute AI voice"}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-4 bg-slate-900/30 backdrop-blur-xl">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            id="coach-input"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={rateLimit.isLimited ? `Rate limited — retry in ${countdown || '...'}` : 'Talk to your coach... (Enter to send, Shift+Enter for newline)'}
            rows={1}
            disabled={isLoading || rateLimit.isLimited}
            className="flex-1 resize-none bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all max-h-32 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            id="send-message-button"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim() || rateLimit.isLimited}
            size="icon"
            className="h-11 w-11 rounded-2xl shrink-0 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2 text-center">
          MindFuel AI Coach · Not a substitute for professional mental health support
        </p>
      </div>
    </div>
  )
}
