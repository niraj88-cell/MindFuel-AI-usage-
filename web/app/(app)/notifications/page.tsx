'use client'

// SatyaShift — Activity.
// SatyaShift is ambient: there is nothing to log and nothing to manage. This page is the
// single quiet inbox — pings from your circle and anything the app has sent you — plus one
// optional, off-by-default nudge to show up. No fake schedules, no "log now", no shame.

import { useEffect, useState } from 'react'
import { Bell, Shield, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { PushNotificationManager } from '@/components/PushNotificationManager'

type NotificationItem = {
  id: string
  title: string
  body: string
  type: string
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, type, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    setNotifications((data || []) as NotificationItem[])
    setLoading(false)

    if (data?.some((item) => !item.is_read)) {
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
    setNotifications((items) => items.filter((item) => item.id !== id))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Activity</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#6B7280]">
          What happened while you were away — pings from your circle, and anything SatyaShift
          sent you. If a single gentle nudge helps you show up, turn one on. It&rsquo;s off by default.
        </p>
      </div>

      {/* The one real control */}
      <section className="rounded-3xl border border-black/[0.07] bg-white p-5">
        <PushNotificationManager />
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#FAF8F4] p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D32]" />
          <p className="text-[13px] leading-relaxed text-[#4B5563]">
            A reminder should help you show up. It should never shame you or become another feed to check.
          </p>
        </div>
      </section>

      {/* Quiet history of anything the app has sent */}
      <section>
        <p className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">History</p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-black/[0.04]" />)}
          </div>
        ) : notifications.length > 0 ? (
          <div className="rounded-2xl border border-black/[0.07] bg-white">
            {notifications.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-black/[0.05] p-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                    <p className="shrink-0 text-xs text-[#6B7280]">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#6B7280]">{item.body}</p>
                </div>
                <button
                  onClick={() => deleteNotification(item.id)}
                  aria-label="Delete"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#B42318]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/[0.07] bg-white p-8 text-center">
            <Bell className="mx-auto mb-3 h-7 w-7 text-[#A5D6A7]" />
            <p className="text-sm font-medium text-[#111827]">Nothing here yet.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#6B7280]">
              Anything SatyaShift sends you will rest here quietly. That&rsquo;s all this page is for.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
