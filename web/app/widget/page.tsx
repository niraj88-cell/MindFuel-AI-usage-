'use client'

// SatyaShift — the Desktop Reflection Widget.
//
// A small companion window (opened from Settings) that sits at the edge of the desktop
// and holds ONE quiet line about where attention is: a running session in coarse bands,
// or the week's one noticing, or the day so far. It is not a dashboard and must never
// become one — no numbers to watch, no charts, no controls, nothing that rewards
// checking it. The best outcome is that it's occasionally noticed.
//
// FLOAT ON TOP: in Chrome, "Float on top" moves the widget into a Document
// Picture-in-Picture window that stays above every other application — the line sits on
// the actual desktop, beside the user's real work. The same DOM node is physically moved
// into the PiP window (the documented framework pattern), so React keeps driving it; the
// node therefore stays mounted through every state. The PiP window lives only as long as
// this tab, which the in-page note says plainly. No API → the button never appears.
//
// Lives OUTSIDE the (app) route group on purpose: no nav, no page chrome — just paper.
// The default-deny middleware already requires a session for this route, and every read
// here is the user's own rows under RLS (same as the dashboard). Refreshes once a
// minute; the only motion anywhere is a 150ms color transition when a line changes.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { widgetMessage, type WidgetState } from '@/lib/widget'
import { weeklyInsight } from '@/lib/intelligence/insights'
import type { BehavioralProfile } from '@/lib/intelligence/types'

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>
    }
  }
}

const REFRESH_MS = 60_000

/** Clone this document's styles into the PiP window (tokens, fonts, utilities). */
function copyStylesInto(pip: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join('')
      const style = pip.document.createElement('style')
      style.textContent = css
      pip.document.head.appendChild(style)
    } catch {
      // Cross-origin sheet — reference it instead of reading it.
      if (sheet.href) {
        const link = pip.document.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        pip.document.head.appendChild(link)
      }
    }
  }
  // next/font exposes the font families as CSS variables on <html>/<body> classes.
  pip.document.documentElement.className = document.documentElement.className
  pip.document.body.className = document.body.className
  pip.document.title = 'SatyaShift'
}

export default function WidgetPage() {
  const [state, setState] = useState<WidgetState | null>(null)
  const [signedOut, setSignedOut] = useState(false)
  const [canFloat, setCanFloat] = useState(false)
  const [floating, setFloating] = useState(false)
  const homeRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSignedOut(true); return }
    setSignedOut(false)

    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    const [{ data: sessions }, { data: bp }] = await Promise.all([
      supabase
        .from('focus_sessions')
        .select('status, duration_s, created_at, intention')
        .eq('user_id', user.id)
        .gte('created_at', dayStart.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('behavioral_profiles')
        .select('profile')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const rows = sessions ?? []
    const activeRow = rows.find((r) => r.status === 'active') ?? null
    const done = rows.filter((r) => r.status !== 'active' && (r.duration_s ?? 0) > 0)
    const profile = (bp?.profile as unknown as BehavioralProfile) ?? null
    // Same seed scheme as the dashboard, so the week reads as ONE consistent voice.
    const insight = profile
      ? weeklyInsight(profile, Date.now(), Math.floor(Date.now() / (7 * 24 * 3600 * 1000)))
      : null

    setState({
      active: !!activeRow,
      intention: activeRow?.intention ?? null,
      startedAtMs: activeRow ? new Date(activeRow.created_at).getTime() : null,
      todayCount: done.length,
      todayFocusS: done.reduce((s, r) => s + (r.duration_s ?? 0), 0),
      insight: insight?.text ?? null,
    })
  }, [])

  useEffect(() => {
    document.title = 'SatyaShift'
    setCanFloat(typeof window !== 'undefined' && 'documentPictureInPicture' in window)
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  async function floatOnTop() {
    const card = cardRef.current
    const pipApi = window.documentPictureInPicture
    if (!card || !pipApi) return
    try {
      const pip = await pipApi.requestWindow({ width: 340, height: 170 })
      copyStylesInto(pip)
      pip.document.body.append(card)
      pip.addEventListener('pagehide', () => {
        homeRef.current?.append(card)
        setFloating(false)
      }, { once: true })
      setFloating(true)
    } catch { /* dismissed or unsupported — the widget simply stays in this window */ }
  }

  const msg = state ? widgetMessage(state) : null

  // Single stable tree: the card node must never unmount, because while floating it
  // physically lives inside the PiP window's document.
  return (
    <div className="relative min-h-screen bg-paper">
      <div ref={homeRef}>
        <div ref={cardRef} className="flex min-h-screen flex-col justify-center bg-paper px-6 py-5">
          {signedOut ? (
            <p className="text-sm text-soft">Signed out. Open SatyaShift to sign in again.</p>
          ) : msg ? (
            <>
              <div className="flex items-center gap-2">
                {/* Static presence dot — green only while a session is live, and it does not move. */}
                {state?.active && <span className="h-2 w-2 shrink-0 rounded-full bg-green-bright" />}
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  {msg.overline}
                </span>
              </div>
              <p className="mt-2 font-serif text-[1.25rem] leading-snug text-ink transition-colors duration-150">
                {msg.primary}
              </p>
              {msg.support && (
                <p className="mt-1.5 truncate text-xs text-faint">{msg.support}</p>
              )}
            </>
          ) : null}
        </div>
      </div>

      {floating ? (
        // The card is away in its floating window; this tab just needs to stay open.
        <div className="absolute inset-0 flex items-center justify-center bg-paper px-6">
          <p className="max-w-xs text-center text-xs leading-relaxed text-faint">
            The widget is floating above your work. Keep this tab open — closing the small
            window brings it back here.
          </p>
        </div>
      ) : canFloat && !signedOut && msg ? (
        <button
          onClick={floatOnTop}
          className="absolute bottom-2 right-3 rounded-lg px-2 py-1 text-[11px] font-medium text-ghost transition-colors hover:text-ink"
        >
          Float on top
        </button>
      ) : null}
    </div>
  )
}
