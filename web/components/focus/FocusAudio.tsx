'use client'

// FocusAudio — the Environment System's one surface: an optional place to work in,
// alongside a running focus session. Grown from the original two-noise backdrop; the
// concept is unchanged (off by default, device-local preference, generated audio).
//
// Privacy + licensing by design: every environment is SYNTHESIZED locally with WebAudio
// (lib/environments.ts). No audio files, no streaming, no third-party requests, nothing
// about what you listen to ever leaves this browser, and nothing needed a license.
//
// Playback rules, enforced here:
//   - Never autoplay. The remembered environment is restored SELECTED but silent; sound
//     starts only from a click (also what the browser's gesture policy requires).
//   - Choosing a place starts it (the click is the gesture); Silent is a real choice.
//   - Pause / resume / volume are always one small control away, keyboard included.
//   - Leaving the session screen releases the audio device entirely.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import {
  ENVIRONMENTS, ENV_PREF_KEY, LEGACY_PREF_KEY, DEFAULT_VOLUME,
  buildEnvironment, parseEnvironmentPref, type EnvironmentId,
} from '@/lib/environments'

export function FocusAudio() {
  const [env, setEnv] = useState<EnvironmentId>('silent')
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [playing, setPlaying] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Restore the remembered place and volume — selected, not playing.
  useEffect(() => {
    try {
      const p = parseEnvironmentPref(
        localStorage.getItem(ENV_PREF_KEY),
        localStorage.getItem(LEGACY_PREF_KEY),
      )
      setEnv(p.env)
      setVolume(p.volume)
    } catch { /* storage unavailable — defaults stand */ }
  }, [])

  const savePref = useCallback((e: EnvironmentId, v: number) => {
    try { localStorage.setItem(ENV_PREF_KEY, JSON.stringify({ env: e, volume: v })) } catch { /* private mode */ }
  }, [])

  /** Fade out and release whatever is playing. Captures locals so a quick environment
   *  switch can't race the delayed teardown. */
  const stopGraph = useCallback(() => {
    const ctx = ctxRef.current
    const master = masterRef.current
    const cleanup = cleanupRef.current
    masterRef.current = null
    cleanupRef.current = null
    if (!ctx || !master) { cleanup?.(); return }
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.12) // no clicks, ever
    setTimeout(() => {
      cleanup?.()
      try { master.disconnect() } catch { /* already gone */ }
    }, 450)
  }, [])

  /** Build and fade in one environment. Only this environment exists in memory. */
  const startGraph = useCallback((id: EnvironmentId, vol: number) => {
    let ctx = ctxRef.current
    if (!ctx) {
      ctx = new AudioContext()
      ctxRef.current = ctx
    }
    if (ctx.state === 'suspended') void ctx.resume()
    stopGraph()
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.gain.setTargetAtTime(vol, ctx.currentTime, 0.4) // soft arrival
    master.connect(ctx.destination)
    masterRef.current = master
    cleanupRef.current = buildEnvironment(ctx, id, master)
    setPlaying(true)
  }, [stopGraph])

  function choose(id: EnvironmentId) {
    setEnv(id)
    savePref(id, volume)
    if (id === 'silent') {
      stopGraph()
      setPlaying(false)
    } else {
      // Choosing a place is the gesture — begin there right away.
      startGraph(id, volume)
    }
  }

  function togglePlay() {
    if (env === 'silent') return
    if (playing) {
      stopGraph()
      setPlaying(false)
    } else {
      startGraph(env, volume)
    }
  }

  function changeVolume(v: number) {
    setVolume(v)
    savePref(env, v)
    const ctx = ctxRef.current
    if (ctx && masterRef.current) {
      masterRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.08)
    }
  }

  // Leaving the session screen silences and releases the device.
  useEffect(() => () => {
    cleanupRef.current?.()
    void ctxRef.current?.close().catch(() => { /* already closed */ })
  }, [])

  return (
    <div className="mt-8 w-full max-w-sm">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ghost">
        Environment <span className="normal-case tracking-normal">&middot; generated on this device</span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Environment">
        {ENVIRONMENTS.map((e) => (
          <button
            key={e.id}
            title={e.hint}
            aria-pressed={env === e.id}
            onClick={() => choose(e.id)}
            className={
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ' +
              (env === e.id
                ? playing && e.id !== 'silent'
                  ? 'bg-green text-white' // live sound — the one green state here
                  : 'bg-line text-ink'
                : 'bg-hairline text-soft hover:bg-line')
            }
          >
            {e.name}
          </button>
        ))}
      </div>

      {env !== 'silent' && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause environment' : 'Play environment'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-hairline"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Environment volume"
            className="w-40 accent-ink"
          />
        </div>
      )}
    </div>
  )
}
