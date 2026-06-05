'use client'

import { Activity, Zap, Brain } from 'lucide-react'

export function SquadPulse({ members, pings }: { members: any[], pings: any[] }) {
  // Calculate average score
  const avgScore = members.length > 0 
    ? Math.round(members.reduce((acc, m) => acc + m.today_score, 0) / members.length)
    : 0

  // Calculate total streak
  const totalStreak = members.reduce((acc, m) => acc + m.streak, 0)

  // Determine pulse color
  let pulseColor = 'from-zinc-500 to-zinc-700'
  let textColor = 'text-zinc-400'
  if (avgScore >= 80) {
    pulseColor = 'from-emerald-500 to-teal-500'
    textColor = 'text-emerald-400'
  } else if (avgScore >= 50) {
    pulseColor = 'from-indigo-500 to-blue-500'
    textColor = 'text-indigo-400'
  } else if (avgScore > 0) {
    pulseColor = 'from-rose-500 to-orange-500'
    textColor = 'text-rose-400'
  }

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Background Pulse Animation */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br ${pulseColor} opacity-5 blur-3xl rounded-full animate-pulse-slow pointer-events-none`} />
      
      <div className="flex items-center gap-3 mb-6">
        <Activity className={`w-5 h-5 ${textColor}`} />
        <h3 className="text-lg font-bold text-white uppercase tracking-widest">Squad Pulse</h3>
      </div>

      <div className="grid grid-cols-2 gap-6 relative z-10">
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Collective Focus</p>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-black ${textColor} leading-none`}>{avgScore}</span>
            <span className="text-lg font-bold text-zinc-500 mb-1">/100</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Combined Streak</p>
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-amber-500" />
            <span className="text-4xl font-black text-white leading-none">{totalStreak}</span>
          </div>
        </div>
      </div>

      {pings.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Recent Support</p>
          <div className="flex flex-wrap gap-2">
            {pings.slice(0, 5).map(ping => (
              <div key={ping.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-white/5 text-xs">
                <span className="font-bold text-zinc-300">{ping.from_user.full_name.split(' ')[0]}</span>
                <span className="text-zinc-500">nudged</span>
                <span className="font-bold text-zinc-300">{ping.to_user.full_name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
