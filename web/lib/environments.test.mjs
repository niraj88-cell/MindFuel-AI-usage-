// environments.test.mjs — the Environment System's pure core (catalog + preference).
// Run from web/:  node --test lib/environments.test.mjs
// The synthesis builders need a live AudioContext and are exercised in the browser only;
// everything decision-shaped lives here.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ENVIRONMENTS, isEnvironmentId, parseEnvironmentPref, DEFAULT_VOLUME,
} from './environments.ts'

test('catalog stays curated: silent first, unique ids, a handful not a library', () => {
  assert.equal(ENVIRONMENTS[0].id, 'silent', 'silence is the first-class default')
  const ids = ENVIRONMENTS.map((e) => e.id)
  assert.equal(new Set(ids).size, ids.length, 'ids are unique')
  assert.ok(ENVIRONMENTS.length >= 4 && ENVIRONMENTS.length <= 8,
    `curation guard: ${ENVIRONMENTS.length} environments (a dozen would be decision fatigue)`)
  for (const e of ENVIRONMENTS) {
    assert.ok(e.name.trim().length > 0 && e.hint.trim().length > 0, `${e.id} has a name and a hint`)
  }
})

test('names describe atmosphere, never a brand, a real place, or a recording', () => {
  for (const e of ENVIRONMENTS) {
    assert.doesNotMatch(e.name, /[A-Z][a-z]+ (Café|Library|Beach|Park)/, `${e.name} names a specific place`)
    assert.doesNotMatch(`${e.name} ${e.hint}`, /recorded|recording|live from|spotify|youtube/i,
      `${e.name} implies a recording or a platform`)
  }
})

test('preference: valid stored value round-trips, volume clamped to [0,1]', () => {
  const p = parseEnvironmentPref(JSON.stringify({ env: 'rain', volume: 0.6 }))
  assert.deepEqual(p, { env: 'rain', volume: 0.6 })
  assert.equal(parseEnvironmentPref(JSON.stringify({ env: 'fire', volume: 4 })).volume, 1)
  assert.equal(parseEnvironmentPref(JSON.stringify({ env: 'fire', volume: -2 })).volume, 0)
})

test('preference: corrupt, unknown, or absent input falls back to silent — never throws', () => {
  for (const raw of [null, '', 'not json', '{"env":"lofi_beats","volume":0.4}', '{"env":42}',
    JSON.stringify({ env: 'rain', volume: 'loud' })]) {
    const p = parseEnvironmentPref(raw)
    assert.equal(p.env, 'silent', `raw ${JSON.stringify(raw)} must fall back`)
    assert.equal(p.volume, DEFAULT_VOLUME)
  }
})

test('legacy backdrop pref migrates: both noise colors → noise, volume carried over', () => {
  assert.deepEqual(
    parseEnvironmentPref(null, JSON.stringify({ kind: 'brown', volume: 0.45 })),
    { env: 'noise', volume: 0.45 },
  )
  assert.equal(parseEnvironmentPref(null, JSON.stringify({ kind: 'pink', volume: 0.2 })).env, 'noise')
  assert.equal(parseEnvironmentPref(null, JSON.stringify({ kind: 'off', volume: 0.2 })).env, 'silent')
  // The current pref always wins over the legacy one.
  assert.equal(
    parseEnvironmentPref(
      JSON.stringify({ env: 'ocean', volume: 0.5 }),
      JSON.stringify({ kind: 'brown', volume: 0.9 }),
    ).env,
    'ocean',
  )
})

test('isEnvironmentId accepts every catalog id and nothing else', () => {
  for (const e of ENVIRONMENTS) assert.ok(isEnvironmentId(e.id))
  for (const bad of ['lofi', '', 42, null, undefined, {}]) assert.equal(isEnvironmentId(bad), false)
})
