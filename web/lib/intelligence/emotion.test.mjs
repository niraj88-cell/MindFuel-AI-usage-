// emotion.test.mjs — behavioral-only emotional context. Run: node --test lib/intelligence/emotion.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSession, qualityOf } from '../behavior.ts'
import { emptyProfile } from './traits.ts'
import { estimateEmotion, dominantEmotion } from './emotion.ts'

const MIN = 60
function rec(events, hour = 10) {
  const signals = analyzeSession(events)
  return { startedAt: '2026-01-01T10:00:00Z', durationS: signals.total_s, quality: qualityOf(signals), signals, hour, dow: 3 }
}

const flowEvents = [{ domain: 'github.com', category: 'productive', duration_s: 50 * MIN }]
const scatterEscalating = () => {
  const e = [{ domain: 'github.com', category: 'productive', duration_s: 15 * MIN }]
  for (let i = 0; i < 8; i++) e.push({ domain: `x${i % 6}.com`, category: 'distraction', duration_s: 90 })
  return e
}

test('every emotion is present, bounded, and carries confidence + evidence', () => {
  const e = estimateEmotion(emptyProfile(), rec(flowEvents))
  for (const name of ['calm', 'momentum', 'resistance', 'fatigue', 'flow', 'overwhelm', 'recoveryReadiness']) {
    assert.ok(e[name], `missing ${name}`)
    assert.ok(e[name].value >= 0 && e[name].value <= 1)
    assert.ok(e[name].confidence >= 0 && e[name].confidence <= 1)
    assert.ok(Array.isArray(e[name].evidence))
  }
})

test('a long unbroken session reads as flow, a scattered escalating one as overwhelm', () => {
  const flow = estimateEmotion(emptyProfile(), rec(flowEvents))
  const chaos = estimateEmotion(emptyProfile(), rec(scatterEscalating()))
  assert.ok(flow.flow.value > 0.7, `flow ${flow.flow.value}`)
  assert.ok(chaos.overwhelm.value > flow.overwhelm.value, 'scattered escalating is more overwhelming')
  assert.ok(flow.flow.value > chaos.flow.value)
})

test('with no session signal, confidence stays low (conservative)', () => {
  const e = estimateEmotion(emptyProfile(), null)
  assert.ok(e.flow.confidence <= 0.15, 'nothing to go on ⇒ near-zero confidence')
})

test('dominantEmotion returns the strongest confident estimate', () => {
  const d = dominantEmotion(estimateEmotion(emptyProfile(), rec(flowEvents)))
  assert.ok(d && typeof d.name === 'string')
})
