'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  Lock,
  LogOut,
  Menu,
  Play,
  User,
  Users,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SatyaMark } from '@/components/brand/SatyaMark'

// Focus is an ACTION (started from Today), not a destination — the nav stays four items.
const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Today', icon: CalendarDays },
  { href: '/squads', label: 'Circle', icon: Users },
]

const SECONDARY_NAV = [
  { href: '/notifications', label: 'Activity', icon: Bell },
  { href: '/profile', label: 'Settings', icon: User },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [user, setUser] = useState<{ email?: string; name?: string; tier?: string } | null>(null)

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

    // Two "you are here" languages for two contexts. In the sidebar, the active item
    // becomes a raised surface tile with a left ink rail — presence from surface + border,
    // not a loud filled pill. In the icon-only bottom bar, the active tab simply resolves
    // to ink while the rest rest at ghost — a calmer tab-bar convention. Green is not spent
    // on location; it stays earned for verified/live/primary.
    const state = compact
      ? active
        ? 'font-semibold text-ink'
        : 'font-medium text-ghost hover:text-soft'
      : active
        ? "font-semibold text-ink bg-card ring-1 ring-line before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-ink"
        : 'font-medium text-soft hover:bg-hairline hover:text-ink'

    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={() => setSidebarOpen(false)}
        className={`focus-ring relative flex items-center gap-3 rounded-lg py-2.5 text-sm transition-colors ${state} ${compact ? 'justify-center px-3' : 'px-4'}`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {!compact && <span>{item.label}</span>}
        {isNotif && unreadCount > 0 && (
          <span className={`${compact ? 'absolute -right-1 top-1' : 'ml-auto'} flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1 font-mono text-[11px] font-semibold text-white`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    )
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 animate-pulse items-center justify-center rounded-lg bg-ink text-white">
            <SatyaMark size={20} />
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-faint">Opening SatyaShift</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-9 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
            <SatyaMark size={19} />
          </span>
          <div className="leading-none">
            <p className="font-semibold tracking-tight">SatyaShift</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Focus, verified</p>
          </div>
        </Link>

        <nav className="space-y-0.5">
          {PRIMARY_NAV.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="my-4 h-px bg-hairline" />

        <nav className="space-y-0.5">
          {SECONDARY_NAV.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="mt-auto">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-sm font-semibold text-ink ring-1 ring-line">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || 'Member'}</p>
              <p className="truncate text-xs text-faint">{user?.email || ''}</p>
            </div>
          </div>
          <div className="mb-2 flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-faint">
            <Lock className="h-3.5 w-3.5 text-green" />
            Private by default
          </div>
          <button
            onClick={handleLogout}
            className="focus-ring press flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-card text-sm font-medium text-soft hover:bg-green-wash hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/30" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 flex w-[84vw] max-w-sm flex-col border-r border-line bg-paper p-5 shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="focus-ring flex items-center gap-3 rounded-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
                  <SatyaMark size={19} />
                </span>
                <span className="font-semibold">SatyaShift</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="focus-ring press flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-card transition-colors hover:bg-hairline">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => <NavLink key={item.href} item={item} />)}
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur-sm lg:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="focus-ring press flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-card transition-colors hover:bg-hairline">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="focus-ring flex items-center gap-2 rounded-lg font-semibold">
            <SatyaMark size={19} /> SatyaShift
          </Link>
          <Link href="/notifications" aria-label="Activity" className="focus-ring press relative flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-card transition-colors hover:bg-hairline">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-green" />}
          </Link>
        </header>

        <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-12">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-paper/95 px-3 pb-2 pt-2 backdrop-blur-sm lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
            <NavLink item={PRIMARY_NAV[0]} compact />
            <NavLink item={PRIMARY_NAV[1]} compact />
            <Link href="/dashboard?start=1" aria-label="Start a focus session" className="focus-ring press mx-auto flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-green text-white hover:bg-green-deep">
              <Play className="h-6 w-6" fill="currentColor" strokeWidth={0} />
            </Link>
            <NavLink item={SECONDARY_NAV[0]} compact />
            <NavLink item={SECONDARY_NAV[1]} compact />
          </div>
        </nav>
      </div>
    </div>
  )
}
