// app/(app)/layout.tsx — App shell with live notification badge + real-time unread count
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Brain, LayoutDashboard, PenLine, BarChart3,
  MessageCircle, User, LogOut, Menu, X, Bell, Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/log', label: 'Log', icon: PenLine },
  { href: '/coach', label: 'Coach', icon: MessageCircle },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/profile', label: 'Settings', icon: User },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; full_name?: string; tier?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', u.id)
      .maybeSingle()

    setUser({
      email: u.email,
      full_name: u.user_metadata?.full_name,
      tier: profile?.subscription_tier || 'free',
    })

    // Fetch unread notification count
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('is_read', false)

    setUnreadCount(count || 0)
  }, [router])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  // Refresh unread count when navigating away from notifications
  useEffect(() => {
    if (pathname !== '/notifications') {
      const supabase = createClient()
      supabase.auth.getUser().then(async ({ data: { user: u } }) => {
        if (!u) return
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .eq('is_read', false)
        setUnreadCount(count || 0)
      })
    } else {
      // Visiting notifications page — mark all read visually immediately
      setUnreadCount(0)
    }
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const NotifBell = ({ className = '' }: { className?: string }) => (
    <Link
      href="/notifications"
      className={`relative text-zinc-400 hover:text-white transition-colors cursor-pointer ${className}`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-white text-black text-[9px] font-black rounded-full flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex overflow-hidden">

      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-white/10 bg-zinc-950/80 backdrop-blur-2xl z-20 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-8 py-10">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-black" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            MindFuel
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1">
          <p className="px-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">Navigation</p>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group relative ${
                  active
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${active ? 'text-black' : 'text-zinc-500 group-hover:text-white'} transition-colors`} />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black/40" />}
              </Link>
            )
          })}

          {/* Notifications nav item */}
          <Link
            href="/notifications"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group relative ${
              pathname === '/notifications'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className={`w-4.5 h-4.5 ${pathname === '/notifications' ? 'text-black' : 'text-zinc-500 group-hover:text-white'} transition-colors`} />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1 bg-white text-black text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {pathname === '/notifications' && unreadCount === 0 && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black/40" />
            )}
          </Link>
        </nav>

        {/* User Card */}
        <div className="p-4 m-4 bg-zinc-900/60 border border-white/10 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-white text-sm font-black border border-white/10">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-black text-white truncate">{user?.full_name || 'Explorer'}</p>
                {user?.tier === 'premium' && (
                  <Sparkles className="w-3 h-3 text-white fill-white shrink-0" />
                )}
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{user?.tier || 'free'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-black bg-zinc-800 text-zinc-400 hover:bg-white hover:text-black transition-all cursor-pointer border border-white/10"
          >
            <LogOut className="w-3.5 h-3.5" /> DISCONNECT
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-zinc-950 border-r border-white/10 flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between px-8 py-8 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-white" />
                <span className="text-xl font-black text-white">MindFuel</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
              {[...NAV_ITEMS, { href: '/notifications', label: 'Notifications', icon: Bell }].map(item => {
                const active = pathname === item.href
                const isNotif = item.href === '/notifications'
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
                      active ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    {isNotif && unreadCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1 bg-white text-black text-[9px] font-black rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="text-white cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-white" />
            <span className="font-black text-white">MindFuel</span>
          </div>
          <NotifBell />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-12 max-w-7xl w-full mx-auto overflow-y-auto custom-scrollbar scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  )
}
