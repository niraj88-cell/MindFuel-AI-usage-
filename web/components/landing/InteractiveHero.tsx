'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, Search, Loader2 } from 'lucide-react'

export function InteractiveHero() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanText, setScanText] = useState('Scanning dopamine triggers...')

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsScanning(true)

    // Simulate analysis steps
    setTimeout(() => setScanText('Analyzing cognitive load...'), 800)
    setTimeout(() => setScanText('Generating health score...'), 1600)
    
    // Redirect to signup to see results
    setTimeout(() => {
      router.push(`/signup?intent=analyze&url=${encodeURIComponent(url)}`)
    }, 2400)
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-8 relative z-10">
      {isScanning ? (
        <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white font-bold text-lg animate-pulse">{scanText}</p>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-white rounded-full w-2/3 animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAnalyze} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center p-2 focus-within:border-white/30 transition-colors shadow-2xl">
            <div className="pl-4 pr-2 text-zinc-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Paste a TikTok, YouTube, or News URL..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500 font-medium text-sm sm:text-base px-2"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button 
              type="submit"
              className="bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-black text-sm sm:text-base flex items-center gap-2 transition-transform active:scale-95 shrink-0"
            >
              Analyze <ArrowRight className="w-4 h-4 hidden sm:block" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs font-bold text-zinc-500">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Free forever. No credit card required.</span>
          </div>
        </form>
      )}
    </div>
  )
}
