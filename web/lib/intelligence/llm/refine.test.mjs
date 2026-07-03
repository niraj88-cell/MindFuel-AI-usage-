// refine.test.mjs — the dormant Claude seam's safety contract.
// Run from web/:  node --test lib/intelligence/llm/refine.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { llmEnabled, applyRefinement, refineMessage } from './refine.ts'

test('the seam is dormant by default (no key ⇒ disabled)', () => {
  delete process.env.ANTHROPIC_API_KEY
  assert.equal(llmEnabled(), false)
})

test('refineMessage is the identity function while dormant', async () => {
  delete process.env.ANTHROPIC_API_KEY
  const base = 'Mornings are quietly your best hours.'
  assert.equal(await refineMessage({ intent: 'insight:morning_strength', register: 'encouraging', text: base, evidence: [] }), base)
})

test('applyRefinement keeps a safe rephrase but discards unsafe / empty ones', () => {
  const base = 'You drifted and found your way back within the session.'
  // A kind, valid rephrase is accepted.
  assert.equal(applyRefinement(base, 'You wandered off, then came back. That return is the part that counts.'),
    'You wandered off, then came back. That return is the part that counts.')
  // Shame, a leaked domain, and empty all fall back to the template.
  assert.equal(applyRefinement(base, 'You wasted the whole session.'), base)
  assert.equal(applyRefinement(base, 'You spent it all on youtube.com.'), base)
  assert.equal(applyRefinement(base, '   '), base)
  assert.equal(applyRefinement(base, null), base)
})
