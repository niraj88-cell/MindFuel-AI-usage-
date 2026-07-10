'use client'

// SatyaShift — /week: your week of attention.
//
// The one shareable artifact (launch blocker #4): a quiet picture of the last seven
// days that is safe to show anyone, because it is domain-free BY CONSTRUCTION — the
// fold in lib/week.ts never receives a domain, so neither can the page or the image.
// Verified time is the spine; everything else is restraint.
//
// The "Save as image" button draws the same ledger onto a canvas. A canvas cannot
// read CSS custom properties, so (like the extension's palette blocks and
// global-error.tsx) it mirrors the globals.css tokens as literals — change them there
// first, here second.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ChevronLeft, Download, Share2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildWeek, humanDurationS, type WeekSessionRow, type WeekSummary } from '@/lib/week'
import { weeklyInsight } from '@/lib/intelligence/insights'
import type { BehavioralProfile } from '@/lib/intelligence/types'

// globals.css @theme, mirrored for the canvas only.
const C = {
  paper: '#FAF8F4',
  ink: '#23201B',
  soft: '#575148',
  faint: '#6F6A61',
  ghost: '#A6A095',
  line: 'rgba(35, 32, 27, 0.11)',
  hairline: 'rgba(35, 32, 27, 0.06)',
  green: '#2D6A3F',
  greenDeep: '#1E4A2D',
}

export default function WeekPage() {
  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState<WeekSummary | null>(null)
  const [insightText, setInsightText] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [canShare, setCanShare] = useState(false)
  // Read the real (hashed) next/font family names off rendered elements, so the canvas
  // draws with the same three typefaces the page does.
  const serifRef = useRef<HTMLHeadingElement>(null)
  const monoRef = useRef<HTMLParagraphElement>(null)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const since = new Date()
      since.setDate(since.getDate() - 6)
      since.setHours(0, 0, 0, 0)
      const [sessionsRes, profileRes] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('created_at, duration_s, status, session_quality')
          .eq('user_id', user.id)
          .gte('created_at', since.toISOString())
          .limit(100),
        supabase.from('behavioral_profiles').select('profile').eq('user_id', user.id).maybeSingle(),
      ])
      setWeek(buildWeek(((sessionsRes.data ?? []) as unknown) as WeekSessionRow[], new Date()))
      // The same weekly line (and week seed) the dashboard speaks — one voice per week.
      const profile = (profileRes.data?.profile as unknown as BehavioralProfile) ?? null
      const insight = profile
        ? weeklyInsight(profile, Date.now(), Math.floor(Date.now() / (7 * 24 * 3600 * 1000)))
        : null
      setInsightText(insight?.text ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // The OS share sheet is a mobile affordance; detect it once for the button's label + icon.
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.canShare === 'function')
  }, [])

  // Draw the artifact: 1080×1080, same ledger, nothing that isn't on the page.
  async function saveImage() {
    if (!week || saving) return
    setSaving(true)
    try {
      await document.fonts.ready
      const serif = serifRef.current ? getComputedStyle(serifRef.current).fontFamily : 'serif'
      const mono = monoRef.current ? getComputedStyle(monoRef.current).fontFamily : 'monospace'
      const sans = getComputedStyle(document.body).fontFamily || 'sans-serif'

      const S = 1080
      const canvas = document.createElement('canvas')
      canvas.width = S
      canvas.height = S
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const M = 84 // margin

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, S, S)

      // Overline + date range
      ctx.fillStyle = C.faint
      ctx.font = `500 22px ${mono}`
      ctx.fillText('SATYASHIFT · A WEEK OF ATTENTION', M, M + 22)
      const range = `${format(subDays(new Date(), 6), 'd MMM')} – ${format(new Date(), 'd MMM yyyy')}`
      ctx.textAlign = 'right'
      ctx.fillText(range.toUpperCase(), S - M, M + 22)
      ctx.textAlign = 'left'

      // Headline number: verified focus
      ctx.fillStyle = C.greenDeep
      ctx.font = `500 104px ${mono}`
      ctx.fillText(humanDurationS(week.verifiedS), M, M + 160)
      ctx.fillStyle = C.green
      ctx.font = `400 30px ${sans}`
      ctx.fillText('of verified focus this week', M, M + 208)

      // Day ledger
      const top = M + 290
      const rowH = 64
      const barX = M + 96
      const barW = S - M - barX - 130
      week.days.forEach((d, i) => {
        const y = top + i * rowH
        ctx.fillStyle = d.isToday ? C.ink : C.faint
        ctx.font = `500 24px ${mono}`
        ctx.fillText(d.label, M, y + 8)
        // track
        ctx.fillStyle = C.hairline
        ctx.fillRect(barX, y - 6, barW, 14)
        const total = d.verifiedS + d.unverifiedS
        if (week.maxDayS > 0 && total > 0) {
          const w = Math.max(6, (total / week.maxDayS) * barW)
          const vw = total > 0 ? (d.verifiedS / total) * w : 0
          ctx.fillStyle = C.ghost
          ctx.fillRect(barX, y - 6, w, 14)
          ctx.fillStyle = C.green
          ctx.fillRect(barX, y - 6, vw, 14)
        }
        ctx.fillStyle = total > 0 ? C.soft : C.ghost
        ctx.font = `400 24px ${mono}`
        ctx.textAlign = 'right'
        ctx.fillText(total > 0 ? humanDurationS(total) : '·', S - M, y + 8)
        ctx.textAlign = 'left'
      })

      // Deepest stretch + one Satya line
      let y = top + 7 * rowH + 36
      ctx.strokeStyle = C.line
      ctx.beginPath(); ctx.moveTo(M, y - 44); ctx.lineTo(S - M, y - 44); ctx.stroke()
      if (week.deepestS > 0 && week.deepestLabel) {
        ctx.fillStyle = C.soft
        ctx.font = `400 28px ${sans}`
        ctx.fillText(`Deepest stretch: `, M, y + 8)
        const dw = ctx.measureText('Deepest stretch: ').width
        ctx.fillStyle = C.ink
        ctx.font = `500 28px ${mono}`
        ctx.fillText(`${humanDurationS(week.deepestS)}`, M + dw, y + 8)
        ctx.fillStyle = C.soft
        ctx.font = `400 28px ${sans}`
        ctx.fillText(`, ${week.deepestLabel}`, M + dw + ctx.measureText(humanDurationS(week.deepestS)).width + 6, y + 8)
        y += 62
      }
      if (insightText) {
        ctx.fillStyle = C.ink
        ctx.font = `400 34px ${serif}`
        y = wrapText(ctx, insightText, M, y + 14, S - 2 * M, 46)
      }

      // Footer: the promise that makes it shareable
      ctx.fillStyle = C.green
      ctx.beginPath()
      ctx.arc(M + 7, S - M - 6, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = C.faint
      ctx.font = `400 24px ${sans}`
      ctx.fillText('Verified focus · domains only, never content · satyashift.com', M + 28, S - M + 2)

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      const filename = `satyashift-week-${format(new Date(), 'yyyy-MM-dd')}.png`

      // On a phone, "save it, then go find it in Files" loses most people — and this artifact
      // was built to be shown. Where the OS share sheet can take a file, offer it; a cancelled
      // sheet just returns quietly. Everywhere else (and if a share fails for a real reason),
      // fall back to the normal download.
      const file = new File([blob], filename, { type: 'image/png' })
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'A week of attention' })
          return
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return // user closed the sheet — do nothing
          // otherwise fall through to a download
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-6 py-4">
        <div className="h-10 w-64 rounded-lg bg-hairline" />
        <div className="h-72 rounded-xl bg-hairline" />
      </div>
    )
  }

  const empty = !week || week.sessionCount === 0

  return (
    <div className="mx-auto max-w-2xl py-2">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-faint transition-colors hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Today
      </Link>

      <p ref={monoRef} className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
        {format(subDays(new Date(), 6), 'd MMM')} &ndash; {format(new Date(), 'd MMM yyyy')}
      </p>
      <h1 ref={serifRef} className="mt-2 font-serif text-[2rem] leading-tight tracking-[-0.01em] text-ink">
        A week of attention
      </h1>

      {empty ? (
        <div className="mt-8 rounded-xl border border-line bg-card p-6">
          <p className="font-serif text-[1.2rem] leading-snug text-ink">
            A quiet week so far. Your first session will draw the first line here.
          </p>
          <Link href="/dashboard?start=1" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:text-green-deep">
            Start one now
          </Link>
        </div>
      ) : (
        <>
          {/* The verified headline */}
          <div className="mt-7 leading-none">
            <span className="font-mono text-[2.4rem] font-medium text-green-deep">{humanDurationS(week.verifiedS)}</span>
            <span className="ml-3 text-sm text-green">of verified focus</span>
          </div>

          {/* Day ledger */}
          <div className="mt-7 rounded-xl border border-line bg-card p-5">
            {week.days.map((d) => {
              const total = d.verifiedS + d.unverifiedS
              const w = week.maxDayS > 0 ? (total / week.maxDayS) * 100 : 0
              const vw = total > 0 ? (d.verifiedS / total) * 100 : 0
              return (
                <div key={d.dateKey} className="flex items-center gap-4 border-b border-hairline py-2.5 last:border-0">
                  <span className={`w-9 shrink-0 font-mono text-[12px] ${d.isToday ? 'font-medium text-ink' : 'text-faint'}`}>
                    {d.label}
                  </span>
                  <span className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-hairline">
                    {total > 0 && (
                      <span className="absolute inset-y-0 left-0 rounded-full bg-ghost" style={{ width: `${Math.max(w, 1.5)}%` }}>
                        <span className="absolute inset-y-0 left-0 rounded-full bg-green" style={{ width: `${vw}%` }} />
                      </span>
                    )}
                  </span>
                  <span className={`w-16 shrink-0 text-right font-mono text-[12px] ${total > 0 ? 'text-soft' : 'text-ghost'}`}>
                    {total > 0 ? humanDurationS(total) : '·'}
                  </span>
                </div>
              )
            })}
            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-xs text-faint">
              <span>
                {week.sessionCount} {week.sessionCount === 1 ? 'session' : 'sessions'}
                {week.verifiedCount > 0 && <>, {week.verifiedCount} verified</>}
              </span>
              {week.deepestS > 0 && week.deepestLabel && (
                <span>
                  Deepest: <span className="font-mono text-ink">{humanDurationS(week.deepestS)}</span>, {week.deepestLabel}
                </span>
              )}
            </div>
          </div>

          {/* The one weekly line, same voice as the dashboard */}
          {insightText && (
            <div className="mt-6 border-l-2 border-green pl-4">
              <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-green">Satya</div>
              <p className="font-serif text-[1.2rem] leading-snug text-ink">{insightText}</p>
            </div>
          )}

          {/* Share — safe by construction */}
          <button
            onClick={saveImage}
            disabled={saving}
            className="focus-ring press mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-green py-3 text-sm font-semibold text-white transition-colors hover:bg-green-deep disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : canShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {canShare ? 'Share this week' : 'Save as image'}
          </button>
          <p className="mt-2.5 text-center text-xs text-faint">
            No sites, no scores. Nothing here you couldn&rsquo;t show anyone.
          </p>
        </>
      )}
    </div>
  )
}

// Simple canvas word-wrap; returns the y after the last drawn line.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = attempt
    }
  }
  if (line) ctx.fillText(line, x, y)
  return y + lineHeight
}
