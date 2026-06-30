'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  LogOut,
  Menu,
  Shield,
  Target,
  User,
  Users,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AttentionRescue } from '@/components/fuel/AttentionRescue'
import { SatyaMark } from '@/components/brand/SatyaMark'

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Today', icon: CalendarDays },
  { href: '/focus', label: 'Focus', icon: Target },
  { href: '/squads', label: 'Squad', icon: Users },
]

const SECONDARY_NAV = [
  { href: '/notifications', label: 'Reminders', icon: Bell },
  { href: '/profile', label: 'Settings', icon: User },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [user, setUser] = useState<{ email?: string; name?: string; tier?: string } | null>(null)
  const [rescueSignal, setRescueSignal] = useState<{ app: string; minutes: number } | null>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'MINDFUEL_DOOMSCROLL_ALERT') {
        setRescueSignal({ app: event.data.appName, minutes: event.data.minutesSpent })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const loadUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: activeUser } } = await supabase.auth.getUser()

    if (!activeUser) {
      setAuthChecked(true)
      router.replace('/login')
      return
    }

    const [profileRes, notifRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', activeUser.id)
        .maybeSingle(),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', activeUser.id)
        .eq('is_read', false),
    ])

    setUser({
      email: activeUser.email,
      name: activeUser.user_metadata?.full_name,
      tier: profileRes.data?.subscription_tier || 'free',
    })
    setUnreadCount(notifRes.count || 0)
    setAuthChecked(true)
  }, [router])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    if (pathname === '/notifications') {
      setUnreadCount(0)
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: activeUser } }) => {
      if (!activeUser) return
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', activeUser.id)
        .eq('is_read', false)
      setUnreadCount(count || 0)
    })
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function NavLink({ item, compact = false }: { item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }, compact?: boolean }) {
    const active = pathname === item.href
    const Icon = item.icon
    const isNotif = item.href === '/notifications'

    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
          active
            ? 'bg-[#111827] text-white'
            : 'text-[#4B5563] hover:bg-black/[0.04] hover:text-[#111827]'
        } ${compact ? 'justify-center px-3' : ''}`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {!compact && <span>{item.label}</span>}
        {isNotif && unreadCount > 0 && (
          <span className={`${compact ? 'absolute -right-1 top-1' : 'ml-auto'} flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4CAF50] px-1 text-[10px] font-bold text-white`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    )
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] text-[#111827]">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 animate-pulse items-center justify-center rounded-2xl bg-[#111827] text-white">
            <SatyaMark size={20} />
          </div>
          <p className="text-sm font-semibold text-[#6B7280]">Opening SatyaShift</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#111827]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-black/[0.07] bg-white/80 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-3 py-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] text-white">
            <SatyaMark size={20} />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight">SatyaShift</p>
            <p className="text-xs font-medium text-[#6B7280]">Focus, verified</p>
          </div>
        </Link>

        <nav className="space-y-1">
          <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Core loop</p>
          {PRIMARY_NAV.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="my-6 h-px bg-black/[0.06]" />

        <nav className="space-y-1">
          <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">Support</p>
          {SECONDARY_NAV.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="mt-auto rounded-3xl border border-black/[0.07] bg-[#FAF8F4] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-bold shadow-sm">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name || 'MindFuel member'}</p>
              <p className="text-xs capitalize text-[#6B7280]">{user?.tier || 'free'} plan</p>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-[#4B5563]">
            <Shield className="h-3.5 w-3.5 text-[#4CAF50]" />
            Private by default
          </div>
          <button
            onClick={handleLogout}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.08] bg-white text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F5F7F6]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-[#111827]/35" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 flex w-[84vw] max-w-sm flex-col border-r border-black/[0.07] bg-[#FAF8F4] p-5 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] text-white">
                  <SatyaMark size={20} />
                </span>
                <span className="text-lg font-bold">SatyaShift</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => <NavLink key={item.href} item={item} />)}
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/[0.06] bg-[#FAF8F4]/85 px-4 backdrop-blur-xl lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <SatyaMark size={20} /> SatyaShift
          </Link>
          <Link href="/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#4CAF50]" />}
          </Link>
        </header>

        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>

        {rescueSignal && (
          <AttentionRescue
            appName={rescueSignal.app}
            minutesSpent={rescueSignal.minutes}
            trigger="doomscroll"
            onClose={() => setRescueSignal(null)}
          />
        )}

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/[0.08] bg-white/90 px-3 pb-2 pt-2 backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
            <NavLink item={PRIMARY_NAV[0]} compact />
            <NavLink item={PRIMARY_NAV[2]} compact />
            <Link href="/focus" aria-label="Start focus" className="mx-auto flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-[#2E7D32] text-white shadow-lg">
              <Target className="h-6 w-6" />
            </Link>
            <NavLink item={SECONDARY_NAV[0]} compact />
            <NavLink item={SECONDARY_NAV[1]} compact />
          </div>
        </nav>
      </div>
    </div>
  )
}
