'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContentAnalyzer } from '@/components/log/ContentAnalyzer'
import { IntelligenceCard } from '@/components/log/IntelligenceCard'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DemoScanner() {
  const router = useRouter()
  const [result, setResult] = useState<any>(null)
  const [content, setContent] = useState('')

  return (
    <div className="w-full max-w-2xl mx-auto mb-16 text-left animate-fade-in-up bg-white p-6 rounded-3xl border border-black/[0.04] shadow-sm relative z-20">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#4CAF50]" />
        </div>
        <h2 className="font-semibold text-[#111827]">Try it instantly</h2>
      </div>

      {!result ? (
        <ContentAnalyzer 
          onAnalyzed={(res, ctx) => {
            setResult(res)
            setContent(ctx)
          }} 
        />
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <IntelligenceCard 
            data={result} 
          />
          
          <div className="bg-[#FAF8F4] p-5 rounded-2xl border border-[#4CAF50]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[#111827] text-sm">Want to track this over time?</h3>
              <p className="text-xs text-[#4B5563]">Log 2 more entries to unlock your full content pattern.</p>
            </div>
            <Button 
              onClick={() => router.push('/signup')}
              className="w-full sm:w-auto bg-[#4CAF50] text-white hover:bg-[#388E3C] rounded-xl font-bold h-10 px-6"
            >
              Sign up free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={() => setResult(null)}
              className="text-xs font-medium text-gray-400 hover:text-[#111827] transition-colors uppercase tracking-wider cursor-pointer"
            >
              Try another scan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
