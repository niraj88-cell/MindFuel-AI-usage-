// app/(app)/layout.tsx — App shell with live notification badge + real-time unread count
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Network, LayoutDashboard, PenLine, BarChart3,
  MessageCircle, User, LogOut, Menu, X, Bell, Sparkles, Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AttentionRescue } from '@/components/fuel/AttentionRescue'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/log', label: 'Log', icon: PenLine },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/coach', label: 'Coach', icon: MessageCircle },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; full_name?: string; tier?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [rescueSignal, setRescueSignal] = useState<{ app: string; minutes: number } | null>(null)

  // Listen for Attention Rescue signals from the Chrome extension
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'MINDFUEL_DOOMSCROLL_ALERT') {
        const { appName, minutesSpent } = event.data
        setRescueSignal({ app: appName, minutes: minutesSpent })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const loadUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/login'); return }

    const [profileRes, notifRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', u.id)
        .maybeSingle(),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .eq('is_read', false)
    ])

    setUser({
      email: u.email,
      full_name: u.user_metadata?.full_name,
      tier: profileRes.data?.subscription_tier || 'free',
    })

    setUnreadCount(notifRes.count || 0)
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
      className={`relative text-gray-400 hover:text-[#111827] transition-colors cursor-pointer ${className}`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-[#4CAF50] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#111827] flex overflow-hidden">

      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-black/[0.06] bg-white z-20 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-8 py-8">
          <div className="w-10 h-10 bg-[#111827] rounded-2xl flex items-center justify-center">
            <Network className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#111827]">
            MindFuel
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1">
          <p className="px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-4">Main</p>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  active
                    ? 'bg-[#F5F7F6] text-[#111827] font-semibold'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F5F7F6]'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${active ? 'text-[#111827]' : 'text-gray-400 group-hover:text-[#111827]'} transition-colors`} />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />}
              </Link>
            )
          })}

          {/* Notifications nav item */}
          <Link
            href="/notifications"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
              pathname === '/notifications'
                ? 'bg-[#F5F7F6] text-[#111827] font-semibold'
                : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F5F7F6]'
            }`}
          >
            <Bell className={`w-4.5 h-4.5 ${pathname === '/notifications' ? 'text-[#111827]' : 'text-gray-400 group-hover:text-[#111827]'} transition-colors`} />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1 bg-[#4CAF50] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {pathname === '/notifications' && unreadCount === 0 && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
            )}
          </Link>
        </nav>

        {/* User Card */}
        <div className="p-4 m-4 bg-[#F5F7F6] border border-black/[0.04] rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#EADBC8] flex items-center justify-center text-[#111827] text-sm font-semibold">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-[#111827] truncate">{user?.full_name || 'Explorer'}</p>
                {user?.tier === 'premium' && (
                  <Sparkles className="w-3 h-3 text-[#FFB74D] fill-[#FFB74D] shrink-0" />
                )}
              </div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{user?.tier || 'free'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-white text-gray-500 hover:bg-[#111827] hover:text-white transition-all cursor-pointer border border-black/[0.06]"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white border-r border-black/[0.06] flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between px-8 py-8 border-b border-black/[0.06]">
              <div className="flex items-center gap-3">
                <Network className="w-8 h-8 text-[#111827]" />
                <span className="text-xl font-bold text-[#111827]">MindFuel</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2">
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
                    className={`flex items-center gap-4 px-6 py-4 rounded-xl text-sm font-medium transition-all ${
                      active ? 'bg-[#F5F7F6] text-[#111827] font-semibold' : 'text-[#4B5563] hover:bg-[#F5F7F6] hover:text-[#111827]'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    {isNotif && unreadCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1 bg-[#4CAF50] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
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
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="text-[#111827] cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Network className="w-6 h-6 text-[#111827]" />
            <span className="font-bold text-[#111827]">MindFuel</span>
          </div>
          <NotifBell />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto overflow-y-auto custom-scrollbar scroll-smooth pb-24 lg:pb-10">
          {children}
        </main>

        {/* Bottom Tab Bar — Mobile Only */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-black/[0.06] z-40 pb-safe">
          <div className="flex items-center justify-around h-16 px-2">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                    active ? 'text-[#111827]' : 'text-gray-400 hover:text-[#111827]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${active ? 'fill-current text-[#111827]' : 'text-gray-400'}`} />
                  <span className={`text-[10px] font-medium ${active ? 'text-[#111827]' : 'text-gray-400'}`}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Global Attention Rescue Overlay */}
        {rescueSignal && (
          <AttentionRescue
            appName={rescueSignal.app}
            minutesSpent={rescueSignal.minutes}
            trigger="doomscroll"
            onClose={() => setRescueSignal(null)}
          />
        )}
      </div>
    </div>
  )
}
