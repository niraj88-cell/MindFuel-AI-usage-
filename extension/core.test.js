// core.test.js — unit tests for the extension's pure logic. Run: `node --test` (from extension/).
// These lock down the exact integrity bugs found in the readiness audit so they can't regress.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hostnameOf, matchesDomain, isSensitive, isOwnApp, categoryFor,
  capDuration, parseSupabaseSession, selectAuthCookie, tokenExpiresSoon,
  nextNudge, NUDGE_AFTER_MIN,
  MAX_DWELL_S,
} from './core.js';

const REF = 'sztvvvphpawuxvvmuddm';
const KEY = `sb-${REF}-auth-token`;

test('hostnameOf: strips www, lowercases, rejects non-web schemes', () => {
  assert.equal(hostnameOf('https://www.GitHub.com/foo?x=1'), 'github.com');
  assert.equal(hostnameOf('http://localhost:3000/dashboard'), 'localhost');
  assert.equal(hostnameOf('chrome://extensions'), null);
  assert.equal(hostnameOf('about:blank'), null);
  assert.equal(hostnameOf('file:///C:/notes.txt'), null);
  assert.equal(hostnameOf('view-source:https://x.com'), null);
  assert.equal(hostnameOf(''), null);
  assert.equal(hostnameOf('not a url'), null);
});

test('matchesDomain: exact + subdomain only, never substring', () => {
  assert.equal(matchesDomain('x.com', 'x.com'), true);
  assert.equal(matchesDomain('mobile.x.com', 'x.com'), true);
  assert.equal(matchesDomain('netflix.com', 'x.com'), false); // the classic substring bug
  assert.equal(matchesDomain('notx.com', 'x.com'), false);
});

test('categoryFor: fixes netflix<-x.com mislabel; emits productive (L3)', () => {
  assert.equal(categoryFor('x.com'), 'distraction');
  assert.equal(categoryFor('mobile.twitter.com'), 'distraction');
  assert.equal(categoryFor('netflix.com'), 'distraction'); // now correct *for the right reason*
  assert.equal(categoryFor('github.com'), 'productive');   // L3: productive path now exists
  assert.equal(categoryFor('gist.github.com'), 'productive');
  assert.equal(categoryFor('example.com'), 'neutral');
  assert.equal(categoryFor(null), 'neutral');
});

test('isSensitive: precise suffixes, no false drops (riverbank, menshealth)', () => {
  assert.equal(isSensitive('chase.com'), true);
  assert.equal(isSensitive('secure.chase.com'), true);
  assert.equal(isSensitive('mail.google.com'), true);
  assert.equal(isSensitive('riverbank.com'), false);   // was dropped by 'bank' substring
  assert.equal(isSensitive('menshealth.com'), false);  // was dropped by 'health' substring
  assert.equal(isSensitive('mypassword-manager-blog.com'), false); // was dropped by 'password'
});

test('isOwnApp: never times our own dashboard', () => {
  assert.equal(isOwnApp('satyashift.vercel.app'), true);
  assert.equal(isOwnApp('localhost'), true);
  assert.equal(isOwnApp('github.com'), false);
});

test('capDuration: clamps to MAX_DWELL_S, floors negatives/NaN (H1 poison-batch guard)', () => {
  assert.equal(capDuration(42.6), 43);
  assert.equal(capDuration(-5), 0);         // clock moved backwards
  assert.equal(capDuration(NaN), 0);
  assert.equal(capDuration(Infinity), 0);
  assert.equal(capDuration(999_999), MAX_DWELL_S); // would 400 the whole batch uncapped
  assert.ok(MAX_DWELL_S < 86_400);
});

test('parseSupabaseSession: plain JSON, base64-, base64url, url-encoded, chunk-joined', () => {
  const session = { access_token: 'ey.abc', refresh_token: 'r1', expires_at: 111 };
  const json = JSON.stringify(session);

  // plain JSON cookie
  assert.deepEqual(parseSupabaseSession(json), session);

  // base64- prefixed (standard base64)
  const b64 = 'base64-' + Buffer.from(json).toString('base64');
  assert.deepEqual(parseSupabaseSession(b64), session);

  // base64url (— and _ instead of + and /, no padding)
  const b64url = 'base64-' + Buffer.from(json).toString('base64url');
  assert.deepEqual(parseSupabaseSession(b64url), session);

  // URL-encoded value
  assert.deepEqual(parseSupabaseSession(encodeURIComponent(json)), session);

  // malformed -> null (must not throw / must not look "signed in")
  assert.equal(parseSupabaseSession('base64-@@@notbase64@@@'), null);
  assert.equal(parseSupabaseSession('{ broken'), null);
  assert.equal(parseSupabaseSession(''), null);
  assert.equal(parseSupabaseSession('{"foo":1}'), null); // no access_token
});

test('parseSupabaseSession: chunk-joined base64 halves reconstruct the session', () => {
  const session = { access_token: 'ey.' + 'z'.repeat(50), refresh_token: 'r', expires_at: 222 };
  const full = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64');
  const mid = Math.floor(full.length / 2);
  // Simulate sb-<ref>-auth-token.0 + .1 concatenation done by the caller.
  assert.deepEqual(parseSupabaseSession(full.slice(0, mid) + full.slice(mid)), session);
});

test('selectAuthCookie: unchunked cookie is used as-is', () => {
  const cookies = [{ name: KEY, value: 'base64-abc' }, { name: 'other', value: 'x' }];
  assert.equal(selectAuthCookie(cookies, REF), 'base64-abc');
});

test('selectAuthCookie: joins numeric chunks in order (not localeCompare order)', () => {
  // .10 must come after .2, which localeCompare got wrong.
  const cookies = [];
  for (let i = 0; i < 12; i++) cookies.push({ name: `${KEY}.${i}`, value: `<${i}>` });
  const shuffled = cookies.slice().reverse(); // chrome returns arbitrary order
  const expected = cookies.map((c) => c.value).join('');
  assert.equal(selectAuthCookie(shuffled, REF), expected);
});

test('selectAuthCookie: ignores the PKCE code-verifier sibling (the login bug)', () => {
  // An OAuth/Google sign-in leaves sb-<ref>-auth-token-code-verifier on the domain. The old
  // startsWith+sort prepended it to the chunks and corrupted the session -> false "Not signed in".
  const session = { access_token: 'ey.real', refresh_token: 'r', expires_at: 999 };
  const full = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64');
  const mid = Math.floor(full.length / 2);
  const cookies = [
    { name: `${KEY}-code-verifier`, value: 'pkce-verifier-would-corrupt-json' },
    { name: `${KEY}.1`, value: full.slice(mid) },
    { name: `${KEY}.0`, value: full.slice(0, mid) },
  ];
  const raw = selectAuthCookie(cookies, REF);
  assert.deepEqual(parseSupabaseSession(raw), session); // verifier excluded -> valid session
});

test('selectAuthCookie: null when no auth cookie present', () => {
  assert.equal(selectAuthCookie([{ name: `${KEY}-code-verifier`, value: 'v' }], REF), null);
  assert.equal(selectAuthCookie([], REF), null);
});

test('nextNudge: fires only after sustained minutes on one distraction domain', () => {
  const cfg = { afterMin: 5, cooldownMin: 10 };
  const dist = (now) => ({ domain: 'facebook.com', counting: true, category: 'distraction', now });
  let s = { domain: null, minutes: 0, lastNudgeAt: 0 };
  let fired = false;
  for (let m = 1; m <= 5; m++) {
    const r = nextNudge(s, dist(m * 60000), cfg);
    s = r.state;
    if (r.fire) { fired = fired || (m === 5); assert.equal(r.minutes, 5); assert.equal(r.domain, 'facebook.com'); }
    else assert.ok(m < 5, `should not fire before minute 5 (fired at ${m})`);
  }
  assert.ok(fired, 'should fire exactly at the 5th sustained minute');
  assert.equal(s.minutes, 0); // streak reset after firing
});

test('nextNudge: respects cooldown (no second nudge inside the quiet window)', () => {
  const cfg = { afterMin: 5, cooldownMin: 10 };
  const dist = (now) => ({ domain: 'facebook.com', counting: true, category: 'distraction', now });
  // Already nudged 3 minutes ago, streak has climbed back to threshold.
  const s = { domain: 'facebook.com', minutes: 4, lastNudgeAt: 3 * 60000 };
  const r = nextNudge(s, dist(4 * 60000), cfg); // now minute reaches 5 again but only 1 min since last
  assert.equal(r.fire, false);
});

test('nextNudge: resets streak off distraction, on idle, and on domain change', () => {
  const base = { domain: 'facebook.com', minutes: 4, lastNudgeAt: 0 };
  // Productive domain -> reset, no fire.
  assert.deepEqual(
    nextNudge(base, { domain: 'github.com', counting: true, category: 'productive', now: 5 * 60000 }),
    { state: { domain: null, minutes: 0, lastNudgeAt: 0 }, fire: false });
  // Not counting (idle/blur/pause) -> reset, no fire.
  assert.equal(nextNudge(base, { domain: 'facebook.com', counting: false, category: 'distraction', now: 5 * 60000 }).fire, false);
  // Switch to a different distraction domain -> streak restarts at 1.
  assert.equal(nextNudge(base, { domain: 'reddit.com', counting: true, category: 'distraction', now: 5 * 60000 }).state.minutes, 1);
});

test('nextNudge: default threshold is exported and sane', () => {
  assert.ok(NUDGE_AFTER_MIN >= 3 && NUDGE_AFTER_MIN <= 15);
});

test('tokenExpiresSoon: honors the skew window', () => {
  const now = 1_000_000_000_000;
  const soon = { access_token: 't', expires_at: Math.floor(now / 1000) + 30 };  // 30s left
  const fresh = { access_token: 't', expires_at: Math.floor(now / 1000) + 3600 }; // 1h left
  assert.equal(tokenExpiresSoon(soon, 60, now), true);   // inside 60s skew -> refresh
  assert.equal(tokenExpiresSoon(fresh, 60, now), false); // plenty of runway
  assert.equal(tokenExpiresSoon(null, 60, now), true);
  assert.equal(tokenExpiresSoon({ expires_at: 999 }, 60, now), true); // no access_token
});
