'use client'

// FocusAudio — an optional, quiet ambient backdrop for a running focus session.
//
// Privacy by design: the sound is GENERATED locally with WebAudio. There are no audio
// files, no streaming, no third-party requests, and nothing about what you listen to
// ever leaves this browser. The preference lives in localStorage, not your account.
//
// Deliberately only two sounds. Steady broadband noise is the one ambience with
// consistent evidence for masking distraction during focused work; "Deep" (brown noise,
// more low end, the common favorite for sustained concentration) and "Soft" (pink noise,
// gentler) cover both comfort preferences. More options would just be another decision
// between the user and their work.

import { useCallback, useEffect, useRef, useState } from 'react'

type NoiseKind = 'off' | 'brown' | 'pink'

const PREF_KEY = 'satyashift_focus_audio'
const DEFAULT_VOLUME = 0.3

function makeNoiseBuffer(ctx: AudioContext, kind: 'brown' | 'pink'): AudioBuffer {
  const len = ctx.sampleRate * 4 // 4s of noise loops seamlessly enough for broadband sound
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  if (kind === 'brown') {
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  } else {
    // Pink noise via Paul Kellet's economy filter.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return buf
}

function loadPref(): { kind: NoiseKind; volume: number } {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if ((p.kind === 'brown' || p.kind === 'pink' || p.kind === 'off') && typeof p.volume === 'number') {
        return { kind: p.kind, volume: Math.min(1, Math.max(0, p.volume)) }
      }
    }
  } catch { /* corrupt pref — fall back to default */ }
  return { kind: 'off', volume: DEFAULT_VOLUME }
}

export function FocusAudio() {
  // Off by default and remembered per device. Audio starts only from a click, so we never
  // fight the browser's autoplay policy.
  const [kind, setKind] = useState<NoiseKind>('off')
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    const p = loadPref()
    setVolume(p.volume)
    // Restore the chosen kind but stay silent until the user turns it on this session:
    // resuming audio without a gesture is both blocked by browsers and rude.
    setKind('off')
  }, [])

  const stop = useCallback(() => {
    const ctx = ctxRef.current
    const gain = gainRef.current
    const src = srcRef.current
    if (ctx && gain && src) {
      // Short fade-out so stopping never clicks.
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15)
      const oldSrc = src
      setTimeout(() => { try { oldSrc.stop() } catch { /* already stopped */ } }, 500)
    }
    srcRef.current = null
  }, [])

  const play = useCallback((k: 'brown' | 'pink', vol: number) => {
    let ctx = ctxRef.current
    if (!ctx) {
      ctx = new AudioContext()
      ctxRef.current = ctx
    }
    if (ctx.state === 'suspended') void ctx.resume()
    // Replace whatever is playing.
    if (srcRef.current) { try { srcRef.current.stop() } catch { /* noop */ } srcRef.current = null }
    const src = ctx.createBufferSource()
    src.buffer = makeNoiseBuffer(ctx, k)
    src.loop = true
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.4) // soft fade-in
    src.connect(gain).connect(ctx.destination)
    src.start()
    srcRef.current = src
    gainRef.current = gain
  }, [])

  function choose(k: NoiseKind) {
    setKind(k)
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ kind: k, volume })) } catch { /* private mode */ }
    if (k === 'off') stop()
    else play(k, volume)
  }

  function changeVolume(v: number) {
    setVolume(v)
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ kind, volume: v })) } catch { /* private mode */ }
    const ctx = ctxRef.current
    if (ctx && gainRef.current && srcRef.current) {
      gainRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.1)
    }
  }

  // Silence and release the device when the session screen goes away.
  useEffect(() => () => {
    try { srcRef.current?.stop() } catch { /* noop */ }
    void ctxRef.current?.close().catch(() => { /* already closed */ })
  }, [])

  const options: Array<{ id: NoiseKind; label: string }> = [
    { id: 'off', label: 'Quiet' },
    { id: 'brown', label: 'Deep noise' },
    { id: 'pink', label: 'Soft noise' },
  ]

  return (
    <div className="mt-8 w-full max-w-xs">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
        Backdrop <span className="font-normal normal-case tracking-normal">· generated on this device</span>
      </p>
      <div className="flex items-center justify-center gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => choose(o.id)}
            className={
              'rounded-full px-4 py-1.5 text-xs font-medium transition-colors ' +
              (kind === o.id
                ? 'bg-[#2E7D32] text-white'
                : 'bg-black/[0.05] text-[#6B7280] hover:bg-black/[0.08]')
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      {kind !== 'off' && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          aria-label="Backdrop volume"
          className="mt-3 w-full accent-[#2E7D32]"
        />
      )}
    </div>
  )
}
