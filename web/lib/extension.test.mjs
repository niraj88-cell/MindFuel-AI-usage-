// node --test lib/extension.test.mjs
//
// The store-URL resolver is the switch that turns the whole install flow from
// "load unpacked" into "Add to Chrome" — and it gets flipped by pasting a value into a
// dashboard, months after this code was written, by someone who cannot read the branch.
// So the guard is tested: a good value must arm it, and a wrong value must NOT.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveStoreUrl } from './extension.ts'

const ID = 'abcdefghijklmnopabcdefghijklmnop' // 32 letters, a-p — a valid extension id

test('unset stays unpublished', () => {
  assert.equal(resolveStoreUrl(''), '')
  assert.equal(resolveStoreUrl('   '), '')
})

test('a full store URL arms the button', () => {
  const url = `https://chromewebstore.google.com/detail/satyashift-verified-focus/${ID}`
  assert.equal(resolveStoreUrl(url), url)
})

test('the legacy store host is accepted too', () => {
  const url = `https://chrome.google.com/webstore/detail/${ID}`
  assert.equal(resolveStoreUrl(url), url)
})

test('a bare extension id is enough', () => {
  assert.equal(resolveStoreUrl(ID), `https://chromewebstore.google.com/detail/${ID}`)
})

test('surrounding whitespace from a paste is forgiven', () => {
  assert.equal(resolveStoreUrl(`  ${ID}  `), `https://chromewebstore.google.com/detail/${ID}`)
})

test('anything not the Chrome Web Store is refused', () => {
  // Sending users somewhere else would be worse than the honest download path.
  assert.equal(resolveStoreUrl('https://example.com/detail/abc'), '')
  assert.equal(resolveStoreUrl('http://chromewebstore.google.com/detail/x'), '') // not https
  assert.equal(resolveStoreUrl('https://chromewebstore.google.com.evil.tld/x'), '')
  assert.equal(resolveStoreUrl('SatyaShift — Verified Focus'), '') // the name, not the link
  assert.equal(resolveStoreUrl('TODO'), '')
  assert.equal(resolveStoreUrl('abc'), '') // too short to be an id
  assert.equal(resolveStoreUrl('z'.repeat(32)), '') // 32 chars but outside a-p
})
