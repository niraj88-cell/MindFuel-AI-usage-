'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock, TrendingUp, AlertTriangle, Zap, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default function WeeklyReportPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/weekly-report')
      .then(res => res.json())
      .then(d => {
        setData(d.report)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-zinc-400 font-bold animate-pulse">Generating your MindFuel Report...</div>
  }

  if (!data) {
    return <div className="p-8 text-center text-zinc-400">Unable to load report. Check back later.</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Your Weekly MindFuel Report</h1>
          <p className="text-zinc-500 font-bold">A 30-second summary of your digital nutrition</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4" /> Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">{data.timeSavedMinutes} <span className="text-lg text-emerald-400">mins</span></div>
            <p className="text-xs text-emerald-500/70 mt-1 font-bold">Focus time vs. Doomscrolling</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-500/10 border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Avg Mood Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">{data.averageMoodDelta > 0 ? '+' : ''}{data.averageMoodDelta}</div>
            <p className="text-xs text-indigo-500/70 mt-1 font-bold">Points per session</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" /> Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topStrengths.length > 0 ? data.topStrengths.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="capitalize font-bold text-white">{s.category}</span>
                <Badge className="bg-emerald-500/20 text-emerald-400">{Math.round(s.avgScore)} pts</Badge>
              </div>
            )) : <p className="text-sm text-zinc-500">Not enough data yet.</p>}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Your Triggers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topTriggers.length > 0 ? data.topTriggers.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="capitalize font-bold text-white">{t.category}</span>
                <Badge className="bg-red-500/20 text-red-400">{Math.round(t.avgScore)} pts</Badge>
              </div>
            )) : <p className="text-sm text-zinc-500">Not enough data yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-8">
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>
    </div>
  )
}
