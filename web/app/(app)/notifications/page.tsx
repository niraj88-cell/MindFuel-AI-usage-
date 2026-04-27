// app/(app)/notifications/page.tsx — Full notifications center
'use client'

import React, { useState, useEffect } from 'react'
import { Bell, BrainCircuit, Trophy, Sparkles, TrendingUp, CheckCheck, X, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  title: string
  body: string
  type: 'daily_coach' | 'swap_suggestion' | 'challenge' | 'streak'
  is_read: boolean
  created_at: string
  metadata: any
}

const TYPE_CONFIG = {
  daily_coach: {
    icon: BrainCircuit,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    label: 'Daily Coach',
  },
  swap_suggestion: {
    icon: RefreshCw,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Content Swap',
  },
  challenge: {
    icon: Trophy,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Challenge',
  },
  streak: {
    icon: TrendingUp,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Streak',
  },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications(data || [])
    setLoading(false)

    // Mark all as read after loading
    if (data && data.some(n => !n.is_read)) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
    }
  }

  async function deleteNotification(id: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function clearAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 stagger-children">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Bell className="w-7 h-7 text-indigo-400" />
            Notifications
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {notifications.length === 0
              ? 'All caught up!'
              : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-white/5 hover:border-rose-500/20 cursor-pointer"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Filter tabs */}
      {notifications.length > 0 && (
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-white/20 rounded-full px-1.5">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-3xl bg-slate-800/30 animate-shimmer" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Bell className="w-10 h-10 text-indigo-400 opacity-50" />
          </div>
          <h3 className="text-xl font-black text-slate-300 mb-2">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </h3>
          <p className="text-slate-500 text-sm">
            {filter === 'unread'
              ? 'You have no unread notifications.'
              : 'Your daily coach updates and insights will appear here.'}
          </p>
        </div>
      )}

      {/* Notifications list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((notif, index) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.daily_coach
            const Icon = config.icon
            const timeAgo = (() => {
              try { return formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) }
              catch { return 'recently' }
            })()

            return (
              <div
                key={notif.id}
                className={`relative group flex gap-4 p-5 rounded-3xl border transition-all duration-300 animate-fade-in-up ${
                  !notif.is_read
                    ? `${config.bg} ${config.border}`
                    : 'bg-slate-900/40 border-white/5'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${config.color} mr-2`}>
                        {config.label}
                      </span>
                      {!notif.is_read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 align-middle" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 shrink-0">{timeAgo}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-1">{notif.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{notif.body}</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500/50 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
