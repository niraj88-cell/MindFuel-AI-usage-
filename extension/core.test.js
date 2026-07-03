// core.test.js — unit tests for the extension's pure logic. Run: `node --test` (from extension/).
// These lock down the exact integrity bugs found in the readiness audit so they can't regress.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hostnameOf, matchesDomain, isSensitive, isOwnApp, categoryFor,
  capDuration, parseSupabaseSession, selectAuthCookie, tokenExpiresSoon,
  nextNudge, NUDGE_AFTER_MIN, NUDGE_GRACE_TICKS, nudgeCopy, gateAllowsCounting,
  nextWelcome, WELCOME_WINDOW_MIN,
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

test('nudgeCopy: gentle, non-judgmental, includes domain + minutes, rotates, no shame words', () => {
  const a = nudgeCopy('youtube.com', 7, 7);
  assert.equal(a.title, 'A quiet check-in');
  assert.match(a.message, /youtube\.com/);
  assert.match(a.message, /7/);
  // Tone guard: never the old callout/shaming language.
  for (const seed of [0, 1, 2, 7, 42]) {
    const { message } = nudgeCopy('reddit.com', 5, seed);
    assert.doesNotMatch(message, /still on|keep scrolling|stop|wasting|should/i);
  }
  // Rotation: different seeds can produce different phrasings.
  const set = new Set([0, 1, 2].map((s) => nudgeCopy('x.com', 5, s).message));
  assert.equal(set.size, 3);
});

test('nudgeCopy: a scattered block names the pattern, not one domain, and stays gentle', () => {
  // >=3 distinct distraction domains => naming a single site would be a lie; name the scatter.
  const scattered = nudgeCopy('tiktok.com', 6, 0, { distinctDomains: 5 });
  assert.equal(scattered.title, 'A quiet check-in');
  assert.match(scattered.message, /6/);
  assert.doesNotMatch(scattered.message, /tiktok\.com/, 'a fragmented block must not over-claim one domain');
  // Tone guard on the scattered register too — no shame, no callout.
  for (const seed of [0, 1, 2, 9]) {
    const { message } = nudgeCopy('x.com', 7, seed, { distinctDomains: 4 });
    assert.doesNotMatch(message, /still on|keep scrolling|stop|wasting|should|lazy|procrastinat/i);
  }
  // Rotates across three scattered phrasings.
  assert.equal(new Set([0, 1, 2].map((s) => nudgeCopy('x.com', 5, s, { distinctDomains: 3 }).message)).size, 3);
  // Two distinct domains is not yet "scattered" -> still the single-domain register (names it).
  assert.match(nudgeCopy('youtube.com', 5, 0, { distinctDomains: 2 }).message, /youtube\.com/);
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

test('nextNudge: a brief work glance holds the block; a sustained return is recovery and resets', () => {
  const cfg = { afterMin: 5, cooldownMin: 10, graceTicks: 2 };
  const base = { domain: 'facebook.com', minutes: 4, gap: 0, domains: ['facebook.com'], switches: 0, lastNudgeAt: 0 };
  // One productive tick (a quick tab-check) is inside the grace -> the block HOLDS, no reset.
  const glance = nextNudge(base, { domain: 'github.com', counting: true, category: 'productive', now: 5 * 60000 }, cfg);
  assert.equal(glance.fire, false);
  assert.equal(glance.decision, 'grace');
  assert.equal(glance.state.minutes, 4, 'a brief glance must not erase a real block');
  // A sustained return (grace exhausted) is genuine recovery -> reset.
  let s = base;
  for (let t = 0; t < 3; t++) {
    s = nextNudge(s, { domain: 'github.com', counting: true, category: 'productive', now: (5 + t) * 60000 }, cfg).state;
  }
  assert.equal(s.minutes, 0, 'three ticks of real work reset the block');
  assert.equal(s.domain, null);
});

test('nextNudge: fragmentation — switching between distraction domains CONTINUES the block (the fix)', () => {
  const cfg = { afterMin: 5, cooldownMin: 10, graceTicks: 2 };
  // The channel-surfer the check-in exists for: a new distraction domain every minute. The OLD
  // logic reset to 1 on each switch and never nudged; the block must now climb and fire at min 5.
  const surf = ['youtube.com', 'instagram.com', 'reddit.com', 'x.com', 'tiktok.com'];
  let s = { domain: null, minutes: 0, gap: 0, domains: [], switches: 0, lastNudgeAt: 0 };
  let fired = null;
  for (let m = 0; m < surf.length; m++) {
    const r = nextNudge(s, { domain: surf[m], counting: true, category: 'distraction', now: (m + 1) * 60000 }, cfg);
    s = r.state;
    if (r.fire) fired = r;
  }
  assert.ok(fired, 'a fragmented 5-minute spiral fires (it did not before the fix)');
  assert.equal(fired.minutes, 5);
  assert.equal(fired.distinctDomains, 5, 'the block spanned five distinct sites');
  assert.equal(fired.switches, 4, 'four domain switches inside the block');
  assert.equal(fired.domain, 'tiktok.com', 'names where attention is right now');
});

// The mission's acceptance matrix, run minute-by-minute through the REAL policy. A distracted
// user reliably earns a timely check-in; a brief or intentional detour never does. counting=false
// models blur / idle / another app (e.g. VS Code in the foreground). Kept table-driven so a new
// scenario is one line, and a regression names the exact scenario that broke.
test('mission scenarios: fragmentation intervenes; brief/intentional detours stay quiet', () => {
  const cfg = { afterMin: 5, cooldownMin: 10, graceTicks: 2 };
  const run = (timeline) => {
    let s = { domain: null, minutes: 0, gap: 0, domains: [], switches: 0, lastNudgeAt: 0 };
    let fires = 0;
    let minute = 0;
    for (const step of timeline) {
      minute += 1;
      const category = step.domain ? categoryFor(step.domain) : 'neutral';
      const r = nextNudge(s, { domain: step.domain, counting: step.counting, category, now: minute * 60000 }, cfg);
      s = r.state;
      if (r.fire) fires += 1;
    }
    return fires;
  };
  const on = (domain, n, counting = true) => Array.from({ length: n }, () => ({ domain, counting }));

  const scenarios = [
    { name: '15 min single-domain YouTube', timeline: on('youtube.com', 15), intervene: true },
    { name: 'fragmentation: YouTube→IG→Reddit→X→TikTok→… 12 min', intervene: true,
      timeline: Array.from({ length: 12 }, (_, i) =>
        ({ domain: ['youtube.com', 'instagram.com', 'reddit.com', 'x.com', 'tiktok.com', 'facebook.com'][i % 6], counting: true })) },
    { name: 'VS Code→Docs→YouTube(2m)→VS Code (intentional short detour)', intervene: false,
      timeline: [...on('github.com', 3), ...on('developer.mozilla.org', 3), ...on('youtube.com', 2), ...on('github.com', 4)] },
    { name: 'intentional short distraction (2 min) then back to work', intervene: false,
      timeline: [...on('github.com', 2), ...on('youtube.com', 2), ...on('github.com', 4)] },
    { name: 'long single-domain distraction (12 min reddit)', timeline: on('reddit.com', 12), intervene: true },
    { name: 'fragmentation interleaved with brief work glances', intervene: true,
      timeline: [...on('youtube.com', 2), { domain: 'slack.com', counting: true }, ...on('instagram.com', 2),
        { domain: 'github.com', counting: false }, ...on('reddit.com', 3)] },
  ];

  for (const sc of scenarios) {
    const fires = run(sc.timeline);
    assert.equal(fires > 0, sc.intervene,
      `${sc.name}: expected ${sc.intervene ? 'an intervention' : 'silence'}, got ${fires} nudge(s)`);
  }
});

test('nextNudge: a short non-counting gap pauses the streak instead of erasing it', () => {
  const cfg = { afterMin: 5, cooldownMin: 10, graceTicks: 2 };
  const dist = (now) => ({ domain: 'reddit.com', counting: true, category: 'distraction', now });
  const gap = (now) => ({ domain: 'reddit.com', counting: false, category: 'distraction', now });

  // 4 attended minutes, then a 2-tick gap (alt-tab), then back: fires on the 5th attended minute.
  let s = { domain: null, minutes: 0, gap: 0, lastNudgeAt: 0 };
  for (let m = 1; m <= 4; m++) s = nextNudge(s, dist(m * 60000), cfg).state;
  assert.equal(s.minutes, 4);
  s = nextNudge(s, gap(5 * 60000), cfg).state;   // gap tick 1
  s = nextNudge(s, gap(6 * 60000), cfg).state;   // gap tick 2 (still within grace)
  assert.equal(s.minutes, 4, 'streak held through the grace window');
  const r = nextNudge(s, dist(7 * 60000), cfg);
  assert.equal(r.fire, true, 'fires on the 5th attended minute after the gap');

  // A gap LONGER than the grace resets the streak.
  let s2 = { domain: 'reddit.com', minutes: 4, gap: 0, lastNudgeAt: 0 };
  for (let t = 1; t <= 3; t++) s2 = nextNudge(s2, gap(t * 60000), cfg).state; // 3 > graceTicks
  assert.equal(s2.domain, null);
  assert.equal(s2.minutes, 0);
});

test('nextNudge: grace default is short and sane', () => {
  assert.ok(NUDGE_GRACE_TICKS >= 1 && NUDGE_GRACE_TICKS <= 3);
});

test('gateAllowsCounting: BALANCED policy with the media exemption', () => {
  const active = { blurred: false, idleState: 'active' };
  const idle = { blurred: false, idleState: 'idle' };
  const locked = { blurred: false, idleState: 'locked' };
  const blurred = { blurred: true, idleState: 'active' };

  assert.equal(gateAllowsCounting(active, {}), true);
  // The core fix: watching a video (no input, tab audible) still counts as attention...
  assert.equal(gateAllowsCounting(idle, { audible: true }), true);
  // ...but silent idle, a locked machine, and a blurred window never do.
  assert.equal(gateAllowsCounting(idle, { audible: false }), false);
  assert.equal(gateAllowsCounting(locked, { audible: true }), false);
  assert.equal(gateAllowsCounting(blurred, { audible: true }), false);
  // Paused wins over everything.
  assert.equal(gateAllowsCounting(active, { audible: true, paused: true }), false);
  // Tolerates the pre-2.6 gate shape ({ idle: bool }).
  assert.equal(gateAllowsCounting({ blurred: false, idle: true }, { audible: false }), false);
  assert.equal(gateAllowsCounting({ blurred: false, idle: false }, {}), true);
  assert.equal(gateAllowsCounting(undefined, {}), true);
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

test('nextWelcome: fires exactly once when a nudge is heeded', () => {
  const NUDGE_AT = 100 * 60000;
  let s = { ackedNudgeAt: 0 };

  // Still on the distraction right after the nudge: no welcome.
  let r = nextWelcome(s, { lastNudgeAt: NUDGE_AT, counting: true, category: 'distraction', now: NUDGE_AT + 60000 });
  assert.equal(r.fire, false);
  s = r.state;

  // Not counting at all (blur / idle / own app): still waiting, no welcome.
  r = nextWelcome(s, { lastNudgeAt: NUDGE_AT, counting: false, category: 'neutral', now: NUDGE_AT + 2 * 60000 });
  assert.equal(r.fire, false);
  s = r.state;

  // Attention lands on productive ground inside the window: welcome, once.
  r = nextWelcome(s, { lastNudgeAt: NUDGE_AT, counting: true, category: 'productive', now: NUDGE_AT + 3 * 60000 });
  assert.equal(r.fire, true);
  s = r.state;

  // Same nudge never greets twice.
  r = nextWelcome(s, { lastNudgeAt: NUDGE_AT, counting: true, category: 'neutral', now: NUDGE_AT + 4 * 60000 });
  assert.equal(r.fire, false);
});

test('nextWelcome: a return outside the window expires silently', () => {
  const NUDGE_AT = 100 * 60000;
  const late = NUDGE_AT + (WELCOME_WINDOW_MIN + 1) * 60000;
  const r = nextWelcome({ ackedNudgeAt: 0 }, { lastNudgeAt: NUDGE_AT, counting: true, category: 'productive', now: late });
  assert.equal(r.fire, false);
  assert.equal(r.state.ackedNudgeAt, NUDGE_AT, 'expired nudge is resolved so it can never greet later');
});

test('nextWelcome: a NEW nudge re-arms the greeting', () => {
  const FIRST = 100 * 60000;
  const SECOND = 200 * 60000;
  // First nudge heeded and acked.
  let s = nextWelcome({ ackedNudgeAt: 0 }, { lastNudgeAt: FIRST, counting: true, category: 'neutral', now: FIRST + 60000 }).state;
  // Second nudge later, heeded again: fires again.
  const r = nextWelcome(s, { lastNudgeAt: SECOND, counting: true, category: 'neutral', now: SECOND + 2 * 60000 });
  assert.equal(r.fire, true);
});

test('nextWelcome: no nudge, no greeting, tolerant of missing state', () => {
  assert.equal(nextWelcome(undefined, { lastNudgeAt: 0, counting: true, category: 'neutral', now: 1000 }).fire, false);
  assert.equal(nextWelcome(null, { lastNudgeAt: 0, counting: false, category: 'neutral', now: 1000 }).fire, false);
});
