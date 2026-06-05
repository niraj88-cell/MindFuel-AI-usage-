'use client'

import { useState, useEffect } from 'react'
import { Users, Copy, Plus } from 'lucide-react'
import { SquadPulse } from './SquadPulse'
import { ActiveMissionCard, ActiveMission } from './ActiveMissionCard'
import { CuratedInteractionMenu } from './CuratedInteractionMenu'
import * as Dialog from '@radix-ui/react-dialog'

export function SquadDashboard({ squad, showToast }: { squad: any, showToast: any }) {
  const [mission, setMission] = useState<ActiveMission | null>(null)
  const [pings, setPings] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any | null>(null)

  const fetchData = async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetch(`/api/squads/${squad.id}/missions`),
        fetch(`/api/squads/${squad.id}/pings`)
      ])
      const mData = await mRes.json()
      const pData = await pRes.json()
      
      if (mData.mission) setMission(mData.mission)
      if (pData.pings) setPings(pData.pings)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
    // Realtime implemented via Supabase (will add subscription logic shortly)
    // Removed 30s polling
  }, [squad.id])

  function getMemberStatus(member: any) {
    if (!member.today_score || member.today_score === 0) return "Quiet today"
    if (member.today_score < 40) return "Could use support"
    return "Checked in today"
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(squad.invite_code)
    showToast('Copied', 'Invite code copied to clipboard.')
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">{squad.name}</h1>
          <div className="flex items-center gap-2 mt-2 text-zinc-400">
            <Users className="w-4 h-4" />
            <span>{squad.members.length} Members</span>
            <span className="text-zinc-600 px-2">•</span>
            <button onClick={copyInviteCode} className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider text-xs flex items-center gap-1">
              Invite: {squad.invite_code} <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SquadPulse members={squad.members} pings={pings} />
        <ActiveMissionCard mission={mission} members={squad.members} squadId={squad.id} onRefresh={fetchData} />
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-6">Squad Members</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {squad.members.map((member: any) => (
            <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-800/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black border border-white/10 overflow-hidden shrink-0">
                  {member.avatar ? (
                    <img src={member.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                      {member.name.substring(0,2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{member.name}</p>
                  <p className="text-xs text-zinc-500 font-medium">{getMemberStatus(member)}</p>
                </div>
              </div>
              
              <Dialog.Root open={selectedMember?.id === member.id} onOpenChange={(open) => !open && setSelectedMember(null)}>
                <Dialog.Trigger asChild>
                  <button 
                    onClick={() => setSelectedMember(member)}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-zinc-400" />
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fade-in" />
                  <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm glass-panel z-50 animate-fade-in-up">
                    <CuratedInteractionMenu 
                      squadId={squad.id} 
                      targetUser={member} 
                      onComplete={() => {
                        setSelectedMember(null)
                        fetchData()
                      }} 
                      onCancel={() => setSelectedMember(null)}
                    />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
