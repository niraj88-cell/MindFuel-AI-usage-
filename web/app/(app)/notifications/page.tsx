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
    color: 'text-[#4CAF50]',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Daily Coach',
  },
  swap_suggestion: {
    icon: RefreshCw,
    color: 'text-[#5DADE2]',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Content Swap',
  },
  challenge: {
    icon: Trophy,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Challenge',
  },
  streak: {
    icon: TrendingUp,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
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
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-3 text-[#111827]">
            <Bell className="w-7 h-7 text-[#111827]" />
            Notifications
          </h1>
          <p className="text-[#4B5563] text-sm mt-1">
            {notifications.length === 0
              ? 'All caught up!'
              : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F7F6] border border-black/[0.06] hover:border-red-200 cursor-pointer"
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
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer ${
                filter === f
                  ? 'bg-[#111827] text-white shadow-sm'
                  : 'bg-[#F5F7F6] text-[#4B5563] border border-black/[0.06] hover:text-[#111827]'
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
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-shimmer" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-[#F5F7F6] border border-black/[0.06] flex items-center justify-center mx-auto mb-6">
            <Bell className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-[#111827] mb-2">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </h3>
          <p className="text-gray-400 text-sm">
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
                className={`relative group flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-300 animate-fade-in-up ${
                  !notif.is_read
                    ? `bg-white ${config.border} border-l-2 shadow-sm`
                    : 'bg-white border-black/[0.04]'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Icon */}
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className={`text-[9px] font-semibold uppercase tracking-widest ${config.color} mr-2`}>
                        {config.label}
                      </span>
                      {!notif.is_read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4CAF50] align-middle" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
                  </div>
                  <p className="text-sm font-bold text-[#111827] mb-1">{notif.title}</p>
                  <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-3">{notif.body}</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-7 h-7 sm:w-6 sm:h-6 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
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
