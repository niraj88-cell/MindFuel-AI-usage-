// lib/environments.ts — the Environment System's quiet core.
//
// An environment is a place to work, not a track. The user picks where to sit — silent,
// rain, a fire — presses play, and forgets it exists. Nothing here is a music feature:
// no playlists, no favorites, no visualizer, exactly one thing playing or nothing.
//
// Licensing + privacy by construction: every environment is SYNTHESIZED in real time
// with WebAudio on this device. There are no audio files, no downloads, no streams, no
// third-party requests — the audio is created specifically for this product each time it
// plays, so there is nothing to license and nothing about what you listen to ever leaves
// the browser. (This is also why there is no café murmur or piano: anything that can't
// be synthesized honestly is excluded rather than shipped from an unclear source.)
//
// Shape of the module: the catalog and preference parsing are PURE and unit-tested
// (`node --test lib/environments.test.mjs`). The builders need a live AudioContext, so
// they run only in the browser; each returns a cleanup function that releases every
// node and timer it created, so only the selected environment ever occupies memory.

export type EnvironmentId = 'silent' | 'noise' | 'rain' | 'ocean' | 'wind' | 'fire'

export interface EnvironmentDef {
  id: EnvironmentId
  name: string
  /** One quiet sentence, surfaced only as a hover title — never visible chrome. */
  hint: string
}

// Curated on purpose. Names describe an atmosphere, never a real place or a recording.
export const ENVIRONMENTS: EnvironmentDef[] = [
  { id: 'silent', name: 'Silent', hint: 'No sound.' },
  { id: 'noise', name: 'Deep Noise', hint: 'A steady low hum that masks a loud room.' },
  { id: 'rain', name: 'Gentle Rain', hint: 'Soft, even rain.' },
  { id: 'ocean', name: 'Ocean Waves', hint: 'Slow swells, some way off.' },
  { id: 'wind', name: 'Forest Wind', hint: 'Air moving through trees.' },
  { id: 'fire', name: 'Fireplace', hint: 'Low embers, an occasional crackle.' },
]

export function isEnvironmentId(x: unknown): x is EnvironmentId {
  return typeof x === 'string' && ENVIRONMENTS.some((e) => e.id === x)
}

// ---------------------------------------------------------------------------
// Preference. Device-local (localStorage), like the original backdrop pref — what you
// listen to is not account data. The selection and volume are remembered; playback
// itself is NEVER resumed without a fresh gesture (autoplay is both blocked and rude).
// ---------------------------------------------------------------------------
export const ENV_PREF_KEY = 'satyashift_environment'
/** The pre-environment backdrop pref ('brown' | 'pink' noise) — migrated, then ignored. */
export const LEGACY_PREF_KEY = 'satyashift_focus_audio'
export const DEFAULT_VOLUME = 0.3

export interface EnvironmentPref {
  env: EnvironmentId
  volume: number
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/**
 * Pure parse of the stored preference (pass localStorage values in). Falls back to the
 * legacy backdrop pref — both old noise colors map to 'noise', and the volume carries
 * over — then to the silent default. Never throws on corrupt input.
 */
export function parseEnvironmentPref(
  raw: string | null,
  legacyRaw: string | null = null,
): EnvironmentPref {
  try {
    if (raw) {
      const p = JSON.parse(raw)
      if (isEnvironmentId(p?.env) && typeof p?.volume === 'number' && Number.isFinite(p.volume)) {
        return { env: p.env, volume: clamp01(p.volume) }
      }
    }
  } catch { /* corrupt — try the legacy pref */ }
  try {
    if (legacyRaw) {
      const p = JSON.parse(legacyRaw)
      const volume = typeof p?.volume === 'number' && Number.isFinite(p.volume)
        ? clamp01(p.volume) : DEFAULT_VOLUME
      const env: EnvironmentId = p?.kind === 'brown' || p?.kind === 'pink' ? 'noise' : 'silent'
      return { env, volume }
    }
  } catch { /* corrupt legacy pref */ }
  return { env: 'silent', volume: DEFAULT_VOLUME }
}

// ---------------------------------------------------------------------------
// Synthesis. Browser-only from here down (needs an AudioContext). Each environment is a
// small node graph: one or two looped noise layers shaped by filters and very slow LFOs,
// plus (for rain and fire) short scheduled bursts for droplets and crackle.
//
// Per-environment output levels are balanced so switching environments doesn't jump in
// loudness; the user's volume sits on a master gain the component owns.
// ---------------------------------------------------------------------------
type NoiseColor = 'white' | 'pink' | 'brown'

function makeNoiseBuffer(ctx: AudioContext, color: NoiseColor, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  if (color === 'brown') {
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  } else if (color === 'pink') {
    // Paul Kellet's economy pink-noise filter.
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
  } else {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return buf
}

interface Layer {
  color: NoiseColor
  filter?: { type: BiquadFilterType; freq: number; q?: number }
  /** Resting gain of the layer. */
  gain: number
  /** Optional slow swell: a sine LFO added onto the layer gain. depth < gain, always. */
  swell?: { hz: number; depth: number }
  /** Optional slow sweep of the filter frequency (wind gusts). */
  sweep?: { hz: number; depth: number }
}

interface Bursts {
  color: NoiseColor
  filter: { type: BiquadFilterType; freq: [number, number]; q?: number }
  peak: [number, number]
  decayS: [number, number]
  gapS: [number, number]
  rate?: [number, number]
}

const rand = ([a, b]: [number, number]) => a + Math.random() * (b - a)

/**
 * Short random bursts (rain droplets, fire crackle), scheduled with ~2.5s of lookahead
 * on the audio clock so they stay even when the tab is backgrounded and setInterval is
 * throttled — the whole point of an environment is that it keeps working while you work
 * somewhere else.
 */
function scheduleBursts(ctx: AudioContext, out: AudioNode, o: Bursts): () => void {
  const buf = makeNoiseBuffer(ctx, o.color, 1)
  let next = ctx.currentTime + rand(o.gapS)
  let stopped = false
  const tick = () => {
    if (stopped) return
    const horizon = ctx.currentTime + 2.5
    while (next < horizon) {
      const t = next
      const src = ctx.createBufferSource()
      src.buffer = buf
      if (o.rate) src.playbackRate.value = rand(o.rate)
      const f = ctx.createBiquadFilter()
      f.type = o.filter.type
      f.frequency.value = rand(o.filter.freq)
      if (o.filter.q != null) f.Q.value = o.filter.q
      const g = ctx.createGain()
      const decay = rand(o.decayS)
      g.gain.setValueAtTime(rand(o.peak), t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
      src.connect(f).connect(g).connect(out)
      src.start(t, Math.random() * 0.8, decay + 0.05)
      next += rand(o.gapS)
    }
  }
  tick()
  const timer = setInterval(tick, 700)
  return () => { stopped = true; clearInterval(timer) }
}

function startLayer(ctx: AudioContext, out: AudioNode, l: Layer): () => void {
  const src = ctx.createBufferSource()
  src.buffer = makeNoiseBuffer(ctx, l.color)
  src.loop = true
  const g = ctx.createGain()
  g.gain.value = l.gain
  let tail: AudioNode = src
  let filter: BiquadFilterNode | null = null
  if (l.filter) {
    filter = ctx.createBiquadFilter()
    filter.type = l.filter.type
    filter.frequency.value = l.filter.freq
    if (l.filter.q != null) filter.Q.value = l.filter.q
    tail = tail.connect(filter)
  }
  tail.connect(g).connect(out)

  const oscs: OscillatorNode[] = []
  const addLfo = (hz: number, depth: number, target: AudioParam) => {
    const osc = ctx.createOscillator()
    osc.frequency.value = hz
    const depthGain = ctx.createGain()
    depthGain.gain.value = depth
    osc.connect(depthGain).connect(target)
    osc.start()
    oscs.push(osc)
  }
  if (l.swell) addLfo(l.swell.hz, l.swell.depth, g.gain)
  if (l.sweep && filter) addLfo(l.sweep.hz, l.sweep.depth, filter.frequency)

  src.start()
  return () => {
    try { src.stop() } catch { /* already stopped */ }
    for (const osc of oscs) { try { osc.stop() } catch { /* already stopped */ } }
    g.disconnect()
  }
}

/**
 * Build the node graph for one environment into `out`. Returns a cleanup that releases
 * everything (sources, LFOs, timers). 'silent' builds nothing — silence is a first-class
 * choice, not a missing feature.
 */
export function buildEnvironment(ctx: AudioContext, id: EnvironmentId, out: AudioNode): () => void {
  const stops: Array<() => void> = []
  const layer = (l: Layer) => stops.push(startLayer(ctx, out, l))
  const bursts = (b: Bursts) => stops.push(scheduleBursts(ctx, out, b))

  switch (id) {
    case 'silent':
      break
    case 'noise':
      // The original backdrop, unchanged: brown noise, full level (master gain scales it).
      layer({ color: 'brown', gain: 1 })
      break
    case 'rain':
      // Body of the rain + a lighter patter band that breathes a little.
      layer({ color: 'pink', gain: 0.55, filter: { type: 'lowpass', freq: 1500 } })
      layer({
        color: 'white', gain: 0.16, filter: { type: 'bandpass', freq: 2600, q: 0.7 },
        swell: { hz: 0.28, depth: 0.05 },
      })
      // Sparse, quiet droplets so it reads as rain, not static.
      bursts({
        color: 'white', filter: { type: 'highpass', freq: [2800, 4200] },
        peak: [0.02, 0.06], decayS: [0.02, 0.05], gapS: [0.35, 1.4], rate: [0.7, 1.3],
      })
      break
    case 'ocean':
      // Two slow swells at slightly different periods so the sea never falls into a loop.
      layer({
        color: 'brown', gain: 0.34, filter: { type: 'lowpass', freq: 550 },
        swell: { hz: 0.06, depth: 0.24 },
      })
      layer({
        color: 'white', gain: 0.055, filter: { type: 'bandpass', freq: 1100, q: 0.6 },
        swell: { hz: 0.083, depth: 0.045 },
      })
      break
    case 'wind':
      // One band of air; the gusts move both its pitch and its strength, slowly.
      layer({
        color: 'pink', gain: 0.5, filter: { type: 'bandpass', freq: 480, q: 0.9 },
        swell: { hz: 0.071, depth: 0.22 }, sweep: { hz: 0.047, depth: 260 },
      })
      break
    case 'fire':
      // A low ember bed under irregular crackle.
      layer({ color: 'brown', gain: 0.45, filter: { type: 'lowpass', freq: 240 } })
      bursts({
        color: 'white', filter: { type: 'highpass', freq: [1500, 2600] },
        peak: [0.06, 0.28], decayS: [0.015, 0.05], gapS: [0.08, 0.9], rate: [0.5, 1.5],
      })
      break
  }
  return () => { for (const stop of stops) stop() }
}
