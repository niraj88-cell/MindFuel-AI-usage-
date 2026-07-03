// phase4.test.mjs — Notification personalization + Squad recommendation.
// Run from web/:  node --test lib/intelligence/phase4.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSession, qualityOf } from '../behavior.ts'
import { emptyProfile, updateProfile } from './traits.ts'
import { notificationResponsiveness, notificationDecision } from './notifications.ts'
import { squadImpact, recommendSquadSupport } from './squad.ts'

const NOW = Date.parse('2026-03-01T12:00:00Z')
const ago = (days) => new Date(NOW - days * 86_400_000).toISOString()
const notif = (is_read, days) => ({ is_read, created_at: ago(days) })

// --- Notification personalization ---

test('responsiveness needs evidence; a few reads stay unconfident', () => {
  assert.equal(notificationResponsiveness([], NOW).confidence, 0)
  assert.equal(notificationResponsiveness([notif(true, 1), notif(false, 2)], NOW).confidence, 0)
})

test('a chronic ignorer is confidently low and gets backed off to ~daily', () => {
  const recent = Array.from({ length: 10 }, (_, i) => notif(false, i + 0.1)) // 10 unread, recent
  const r = notificationResponsiveness(recent, NOW)
  assert.ok(r.value < 0.2 && r.confidence > 0.45)
  // Last one was ~2.4h ago (0.1 day) → within the 24h back-off → suppress.
  assert.equal(notificationDecision(recent, NOW).send, false)
})

test('an engaged recipient always gets sent', () => {
  const recent = Array.from({ length: 8 }, (_, i) => notif(true, i + 0.5))
  const d = notificationDecision(recent, NOW)
  assert.equal(d.send, true)
  assert.ok(d.responsiveness > 0.8)
})

test('no history → fail-open (we never withhold support on a hunch)', () => {
  assert.equal(notificationDecision([], NOW).send, true)
})

// --- Squad recommendation ---

const MIN = 60
const deep = () => {
  const s = analyzeSession([{ domain: 'github.com', category: 'productive', duration_s: 60 * MIN }])
  return { startedAt: '2026-01-01T09:00:00Z', durationS: s.total_s, quality: qualityOf(s), signals: s, hour: 9, dow: 3 }
}
const struggle = () => {
  const s = analyzeSession([
    { domain: 'github.com', category: 'productive', duration_s: 6 * MIN },
    { domain: 'youtube.com', category: 'distraction', duration_s: 25 * MIN },
  ])
  return { startedAt: '2026-01-01T23:00:00Z', durationS: s.total_s, quality: qualityOf(s), signals: s, hour: 23, dow: 3 }
}

test('squadImpact: encouragement that helps reads above 0.5, with evidence', () => {
  const outcomes = [
    ...Array.from({ length: 6 }, () => ({ encouraged: true, good: true })),
    ...Array.from({ length: 6 }, () => ({ encouraged: false, good: false })),
  ]
  const e = squadImpact(outcomes)
  assert.ok(e.value > 0.6 && e.confidence > 0)
  assert.ok(e.evidence[0].length > 0)
})

test('a thriving solo worker is left alone (solo), not pushed to socialize', () => {
  let prof = emptyProfile()
  for (let i = 0; i < 25; i++) prof = updateProfile(prof, { ...deep(), startedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T09:00:00Z` })
  const now = Date.parse('2026-01-28T10:00:00Z')
  const rec = recommendSquadSupport({ profile: prof, aloneInCircle: true, now })
  assert.equal(rec.recommend, 'solo')
})

test('an alone, struggling worker is gently invited to bring a friend', () => {
  let prof = emptyProfile()
  for (let i = 0; i < 25; i++) prof = updateProfile(prof, { ...struggle(), startedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T23:00:00Z` })
  const now = Date.parse('2026-01-28T23:30:00Z')
  const rec = recommendSquadSupport({ profile: prof, aloneInCircle: true, now })
  assert.equal(rec.recommend, 'invite')
  assert.ok(rec.confidence > 0)
})

test('a thin profile says nothing (silent)', () => {
  const rec = recommendSquadSupport({ profile: emptyProfile(), aloneInCircle: true })
  assert.equal(rec.recommend, 'silent')
})
