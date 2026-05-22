// app/(app)/layout.tsx — App shell with live notification badge + real-time unread count
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Brain, LayoutDashboard, PenLine, BarChart3,
  MessageCircle, Trophy, User, LogOut, Menu, X, Bell, CreditCard, Sparkles, ScanLine
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log', label: 'Log Content', icon: PenLine },
  { href: '/mood-scan', label: 'Mood Scan', icon: ScanLine },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/coach', label: 'AI Coach', icon: MessageCircle },
  { href: '/challenges', label: 'Challenges', icon: Trophy },
  { href: '/subscription', label: 'Membership', icon: CreditCard },
  { href: '/profile', label: 'Profile', icon: User },
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
    router.push('/login')
    router.refresh()
  }

  const NotifBell = ({ className = '' }: { className?: string }) => (
    <Link
      href="/notifications"
      className={`relative text-slate-400 hover:text-white transition-colors cursor-pointer ${className}`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-indigo-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-notif-pulse shadow-lg shadow-indigo-500/50">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-200 flex overflow-hidden">
      {/* Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/8 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-[20%] h-[20%] bg-blue-500/3 blur-[100px] rounded-full" />
      </div>

      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-white/5 bg-slate-900/40 backdrop-blur-2xl z-20 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-8 py-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            MindFuel <span className="text-indigo-400">Pro</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1">
          <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Navigation</p>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group relative ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`} />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />}
              </Link>
            )
          })}

          {/* Notifications nav item */}
          <Link
            href="/notifications"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group relative ${
              pathname === '/notifications'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className={`w-4.5 h-4.5 ${pathname === '/notifications' ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`} />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1 bg-indigo-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {pathname === '/notifications' && unreadCount === 0 && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            )}
          </Link>
        </nav>

        {/* User Card */}
        <div className="p-4 m-4 bg-slate-800/40 border border-white/5 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-indigo-300 text-sm font-black border border-indigo-500/20">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-black text-white truncate">{user?.full_name || 'Explorer'}</p>
                {user?.tier === 'premium' && (
                  <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user?.tier || 'free'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-black bg-rose-500/8 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" /> DISCONNECT
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-slate-900 border-r border-white/5 flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between px-8 py-8 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-indigo-500" />
                <span className="text-xl font-black text-white">MindFuel</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 cursor-pointer">
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
                      active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    {isNotif && unreadCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1 bg-indigo-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
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
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="text-white cursor-pointer">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-500" />
            <span className="font-black text-white">MindFuel</span>
          </div>
          <NotifBell />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-12 max-w-7xl w-full mx-auto overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
