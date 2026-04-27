// components/insights/TrendChart.tsx — Premium Chart
'use client'

import React from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'

interface TrendDataPoint {
  date: string
  score: number
  mood?: number
}

interface TrendChartProps {
  data: TrendDataPoint[]
  showMood?: boolean
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-[20px] border border-white/5 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{label}</p>
      <div className="space-y-2">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
               <span className="text-xs font-bold text-slate-300 capitalize">{p.dataKey}:</span>
            </div>
            <span className="text-sm font-black text-white">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrendChart({ data, showMood = true }: TrendChartProps) {
  if (!data || !data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
           <Activity className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-600">Insufficient Data</p>
        <p className="text-xs text-slate-700 mt-1 max-w-[200px]">Synchronize more content logs to generate trend intelligence.</p>
      </div>
    )
  }

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} 
            tickLine={false} 
            axisLine={false} 
            domain={[0, 100]} 
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(99, 102, 241, 0.2)', strokeWidth: 1 }} />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#6366f1" 
            strokeWidth={4} 
            fill="url(#scoreGrad)" 
            animationDuration={2000}
            dot={false}
            activeDot={{ r: 6, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }}
          />
          {showMood && (
            <Area 
              type="monotone" 
              dataKey="mood" 
              stroke="#10b981" 
              strokeWidth={3} 
              fill="url(#moodGrad)" 
              animationDuration={2500}
              dot={false}
              activeDot={{ r: 5, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2" />
    </svg>
  )
}
