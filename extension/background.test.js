// background.test.js — integration tests for the REAL service worker (background.js) driven
// through a faithful chrome.* stub. Run: `node --test` (from extension/). No dependencies.
//
// Why this exists: core.test.js proves the nudge DECISION is correct, but the intervention
// pipeline died in the field at stages the unit tests can't see — a lost alarm, a muted
// notification, a swallowed exception. These tests execute background.js end to end:
//   tab activated → attention gate → 1-min alarm ticks → threshold → chrome.notifications.create
// and prove the reliability claims: survives worker restarts, browser restarts, lost alarms,
// blur gaps, multi-tab/multi-window switches — and never touches the network to nudge.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// chrome.* stub — just enough of the extension platform, semantics-faithful.
// ---------------------------------------------------------------------------
function makeEvent() {
  const listeners = [];
  return {
    addListener: (fn) => listeners.push(fn),
    // Returns the handlers' promises so tests can await completion deterministically.
    emit: (...args) => Promise.all(listeners.map((fn) => fn(...args))),
  };
}

function makeStorageArea() {
  let data = {};
  return {
    async get(keys) {
      const arr = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys ?? data);
      const out = {};
      for (const k of arr) if (k in data) out[k] = structuredClone(data[k]);
      return out;
    },
    async set(obj) { for (const [k, v] of Object.entries(obj)) data[k] = structuredClone(v); },
    async remove(keys) { for (const k of (Array.isArray(keys) ? keys : [keys])) delete data[k]; },
    _raw: () => data,
    _replace(d) { data = d; },
  };
}

// options.local / options.session carry storage across a simulated restart:
//   worker restart  -> reuse BOTH areas (chrome keeps storage.session across SW deaths)
//   browser restart -> reuse local only (storage.session and alarms are gone)
function makeChrome({ local, session, tabs: tabList = [], permissionLevel = 'granted' } = {}) {
  const tabs = new Map(tabList.map((t) => [t.id, { incognito: false, active: true, audible: false, windowId: 1, ...t }]));
  const created = [];   // chrome.notifications.create calls
  const openedTabs = []; // chrome.tabs.create calls
  const focusedTabs = [];    // chrome.tabs.update calls with { active: true } (Sutra re-entry)
  const focusedWindows = []; // chrome.windows.update calls with { focused: true }
  const alarms = new Map();
  const state = { permissionLevel, focused: true };
  const chrome = {
    runtime: {
      id: 'test-extension-id',
      getURL: (p) => `chrome-extension://test/${p}`,
      onInstalled: makeEvent(), onStartup: makeEvent(), onMessage: makeEvent(), onConnect: makeEvent(),
    },
    storage: { local: local ?? makeStorageArea(), session: session ?? makeStorageArea() },
    tabs: {
      onActivated: makeEvent(), onUpdated: makeEvent(),
      async get(id) { const t = tabs.get(id); if (!t) throw new Error('no such tab'); return t; },
      async query() { return [...tabs.values()].filter((t) => t.active); },
      async create({ url }) { openedTabs.push(url); },
      async update(id, props) {
        const t = tabs.get(id); if (!t) throw new Error('no such tab');
        if (props.active) { for (const other of tabs.values()) other.active = (other === t); focusedTabs.push(id); }
        Object.assign(t, props);
        return t;
      },
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: makeEvent(),
      async getLastFocused() { return { focused: state.focused }; },
      async update(id, props) { if (props.focused) focusedWindows.push(id); },
    },
    idle: { setDetectionInterval() {}, onStateChanged: makeEvent() },
    alarms: {
      onAlarm: makeEvent(),
      async get(name) { return alarms.get(name); },
      async create(name, info) { alarms.set(name, { name, ...info }); },
    },
    notifications: {
      onClicked: makeEvent(), onButtonClicked: makeEvent(),
      async create(id, opts) { created.push({ id, opts }); return id; },
      async clear() {},
      async getPermissionLevel() { return state.permissionLevel; },
    },
    cookies: { async getAll() { return []; } },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
  };
  return { chrome, created, openedTabs, focusedTabs, focusedWindows, alarms, tabs, state };
}

// Per-name async mutex — the real Web Locks semantics background.js depends on.
const lockQueues = new Map();
const locks = {
  request(name, fn) {
    const prev = lockQueues.get(name) || Promise.resolve();
    const next = prev.then(() => fn());
    lockQueues.set(name, next.catch(() => {}));
    return next;
  },
};
try {
  Object.defineProperty(globalThis, 'navigator', { value: { locks }, configurable: true });
} catch {
  globalThis.navigator.locks = locks;
}

// The nudge pipeline must be fully local: any fetch during these tests is a failure.
let fetchCalls = 0;
globalThis.fetch = () => { fetchCalls++; return Promise.reject(new Error('network disabled in tests')); };

const settle = () => new Promise((r) => setTimeout(r, 0));

let bootCount = 0;
// "Start the service worker": install the stub as the global chrome and evaluate a FRESH
// instance of the real background.js (unique query string defeats the module cache), exactly
// like MV3 re-running the worker script on wake.
async function boot(env) {
  globalThis.chrome = env.chrome;
  await import(`./background.js?boot=${++bootCount}`);
  await settle(); await settle(); // let top-level seedActiveTab / ensureAlarm finish
}

async function tickNudge(env, times = 1) {
  for (let i = 0; i < times; i++) {
    await env.chrome.alarms.onAlarm.emit({ name: 'satyashift_nudge' });
    await settle(); await settle();
  }
}

const YT = { id: 1, url: 'https://www.youtube.com/watch?v=abc', active: true };

async function getSessionValue(env, key) {
  const o = await env.chrome.storage.session.get(key);
  return o[key];
}
async function getDiag(env) {
  const o = await env.chrome.storage.local.get('nudge_diag');
  return o.nudge_diag;
}

// ---------------------------------------------------------------------------

test('pipeline: 5 sustained minutes on YouTube fires exactly one gentle notification, offline', async () => {
  const env = makeChrome({ tabs: [YT] });
  await boot(env);

  // seedActiveTab picked up the already-open tab without any user event (worker-wake path).
  const active = await getSessionValue(env, 'active');
  assert.equal(active?.domain, 'youtube.com', 'seedActiveTab must start timing the current tab');
  assert.ok(active.segmentStart != null, 'gate open (focused, active) -> counting');

  await tickNudge(env, 4);
  assert.equal(env.created.length, 0, 'no nudge before the 5th sustained minute');
  const midDiag = await getDiag(env);
  assert.equal(midDiag.counting, true);
  assert.equal(midDiag.streak, 4, 'diag proves the ticks are running and the streak is climbing');

  await tickNudge(env, 1);
  assert.equal(env.created.length, 1, 'exactly one nudge at the threshold');
  const { opts } = env.created[0];
  assert.equal(opts.title, 'A quiet check-in');
  assert.match(opts.message, /youtube\.com/);
  assert.match(opts.message, /5/);
  assert.equal(opts.buttons.length, 2);
  assert.equal((await getDiag(env)).lastFire.result, 'fired');
  assert.equal(fetchCalls, 0, 'the intervention is fully local — no network involved');
});

test('pipeline: fragmentation — rapid switching across distraction domains still nudges (the fix)', async () => {
  // The regression this proves: a channel-surfing user (new distraction site every minute) used
  // to accrue a streak of 1 forever and was NEVER nudged. The block is now category-scoped, so a
  // fragmented spiral crosses the threshold like a single-domain one — end to end, through the
  // real worker: tab switches -> gate -> 1-min alarm -> nextNudge -> chrome.notifications.create.
  const tabList = [
    { id: 1, url: 'https://www.youtube.com/watch?v=a', active: true },
    { id: 2, url: 'https://instagram.com/p/x', active: false },
    { id: 3, url: 'https://reddit.com/r/x', active: false },
    { id: 4, url: 'https://x.com/x', active: false },
    { id: 5, url: 'https://tiktok.com/@x', active: false },
  ];
  const env = makeChrome({ tabs: tabList });
  await boot(env);

  const order = [1, 2, 3, 4, 5]; // a different distraction domain each minute
  for (const id of order) {
    for (const t of tabList) env.tabs.get(t.id).active = (t.id === id);
    await env.chrome.tabs.onActivated.emit({ tabId: id });
    await settle();
    await tickNudge(env, 1);
  }

  assert.equal(env.created.length, 1, 'a fragmented 5-minute spiral fires exactly one nudge');
  const diag = await getDiag(env);
  assert.equal(diag.decision, 'fire');
  assert.ok(diag.distinctDomains >= 3, 'the diag records that the block was fragmented');
  assert.ok(diag.switches >= 3, 'the diag records the domain switches inside the block');
  const { opts } = env.created[0];
  assert.equal(opts.title, 'A quiet check-in');
  // Scatter copy names the pattern, never over-claims one site it barely visited.
  assert.doesNotMatch(opts.message, /youtube\.com|instagram\.com|reddit\.com|x\.com|tiktok\.com/);
  assert.equal(fetchCalls, 0, 'the intervention is fully local — no network involved');
});

test('cooldown: streak past threshold stays quiet until the window elapses', async () => {
  const env = makeChrome({ tabs: [YT] });
  await boot(env);
  await tickNudge(env, 5);
  assert.equal(env.created.length, 1);

  await tickNudge(env, 6); // streak rebuilds past 5 but the 10-min cooldown holds
  assert.equal(env.created.length, 1, 'no second nudge inside the cooldown');

  // Rewind the last nudge 11 minutes into the past; the next attended tick past the
  // threshold may fire again.
  const nudgeState = await getSessionValue(env, 'nudge_state');
  nudgeState.lastNudgeAt = Date.now() - 11 * 60_000;
  await env.chrome.storage.session.set({ nudge_state: nudgeState });
  await tickNudge(env, 1);
  assert.equal(env.created.length, 2, 'nudges resume after the cooldown');
});

test('non-distraction domains never nudge', async () => {
  const env = makeChrome({ tabs: [{ id: 1, url: 'https://github.com/foo', active: true }] });
  await boot(env);
  await tickNudge(env, 8);
  assert.equal(env.created.length, 0);
});

test('blur pauses the streak; a short gap is forgiven; refocus completes the nudge', async () => {
  const env = makeChrome({ tabs: [YT] });
  await boot(env);
  await tickNudge(env, 4);

  await env.chrome.windows.onFocusChanged.emit(-1); // left the browser
  await settle();
  await tickNudge(env, 2); // within NUDGE_GRACE_TICKS
  assert.equal(env.created.length, 0, 'no nudge while attention is elsewhere');
  assert.equal((await getDiag(env)).counting, false, 'diag shows the gate closed');
  assert.equal((await getSessionValue(env, 'nudge_state')).minutes, 4, 'streak held through the grace');

  await env.chrome.windows.onFocusChanged.emit(1); // back to the same tab
  await settle();
  await tickNudge(env, 1);
  assert.equal(env.created.length, 1, 'fires on the 5th attended minute after the gap');
});

test('a gap longer than the grace resets the streak', async () => {
  const env = makeChrome({ tabs: [YT] });
  await boot(env);
  await tickNudge(env, 4);
  await env.chrome.windows.onFocusChanged.emit(-1);
  await settle();
  await tickNudge(env, 3); // > NUDGE_GRACE_TICKS
  assert.equal((await getSessionValue(env, 'nudge_state')).minutes, 0, 'streak reset');
  assert.equal(env.created.length, 0);
});

test('multi-tab / multi-window: switching between two YouTube tabs keeps the streak (same domain)', async () => {
  const env = makeChrome({ tabs: [YT, { id: 2, url: 'https://youtube.com/shorts/x', active: false }] });
  await boot(env);
  await tickNudge(env, 3);

  env.tabs.get(1).active = false;
  env.tabs.get(2).active = true;
  await env.chrome.tabs.onActivated.emit({ tabId: 2 });
  await settle();

  await tickNudge(env, 2);
  assert.equal(env.created.length, 1, 'same-domain tab switch does not reset the streak');
});

test('worker restart mid-streak: state in chrome.storage carries the streak across SW death', async () => {
  const env = makeChrome({ tabs: [YT] });
  await boot(env);
  await tickNudge(env, 3);

  // The MV3 worker dies; a new one boots with the SAME storage (session survives SW death).
  const env2 = makeChrome({
    tabs: [YT],
    local: env.chrome.storage.local,
    session: env.chrome.storage.session,
  });
  await boot(env2);
  await tickNudge(env2, 2);
  assert.equal(env2.created.length, 1, 'nudge fires on schedule despite the worker restart');
});

test('browser restart: alarms + session storage gone, onStartup never fires — still self-heals', async () => {
  const env = makeChrome({ tabs: [YT] });
  await boot(env);
  await tickNudge(env, 4);

  // Full browser restart: storage.session cleared, alarms cleared. We deliberately do NOT
  // emit onStartup (it is not guaranteed) — the top-level ensureAlarm must recover alone.
  const env2 = makeChrome({ tabs: [YT], local: env.chrome.storage.local });
  await boot(env2);
  assert.ok(env2.alarms.get('satyashift_nudge'), 'nudge alarm recreated without onStartup');
  assert.ok(env2.alarms.get('satyashift_flush'), 'flush alarm recreated without onStartup');

  await tickNudge(env2, 5); // fresh streak (session state is gone by design)
  assert.equal(env2.created.length, 1, 'pipeline fully functional after browser restart');
});

test('lost alarms are recreated on any worker wake, without resetting a live countdown', async () => {
  const env = makeChrome({ tabs: [YT] });
  await boot(env);
  assert.ok(env.alarms.get('satyashift_nudge'));

  env.alarms.delete('satyashift_nudge'); // Chrome dropped the alarm (crash, bug, whatever)
  env.alarms.delete('satyashift_flush');

  // Any event (here: a tab switch) wakes the worker; its top-level runs again.
  const env2 = makeChrome({
    tabs: [YT], local: env.chrome.storage.local, session: env.chrome.storage.session,
  });
  await boot(env2);
  assert.ok(env2.alarms.get('satyashift_nudge'), 'self-healed');
  assert.ok(env2.alarms.get('satyashift_flush'), 'self-healed');

  // And ensureAlarm never clobbers an existing alarm (the C2 countdown-reset regression):
  const before = env2.alarms.get('satyashift_nudge');
  await boot(env2); // another worker wake against the same chrome
  assert.equal(env2.alarms.get('satyashift_nudge'), before, 'existing alarm object untouched');
});

test('muted notifications: detected, recorded, surfaced in status — and no ghost nudge', async () => {
  const env = makeChrome({ tabs: [YT], permissionLevel: 'denied' });
  await boot(env);
  await tickNudge(env, 5);

  assert.equal(env.created.length, 0, 'nothing rendered');
  const diag = await getDiag(env);
  assert.equal(diag.permission, 'denied', 'every tick records the permission level');
  assert.equal(diag.lastFire.result, 'blocked', 'the swallowed failure is now evidence');

  // The popup asks for status and is told nudges are muted.
  const status = await new Promise((resolve) => {
    env.chrome.runtime.onMessage.emit({ type: 'GET_STATUS' }, { id: 'test-extension-id' }, resolve);
  });
  assert.equal(status.nudgesMuted, true);
  assert.equal(fetchCalls, 0);

  // The user re-enables notifications: the flag clears on the next tick.
  env.state.permissionLevel = 'granted';
  await tickNudge(env, 1);
  const status2 = await new Promise((resolve) => {
    env.chrome.runtime.onMessage.emit({ type: 'GET_STATUS' }, { id: 'test-extension-id' }, resolve);
  });
  assert.equal(status2.nudgesMuted, false);
});

test('media exemption end-to-end: idle + audible video still nudges; silent idle pauses', async () => {
  // This was historical root cause #1 of the dead nudge: chrome.idle reports 'idle' after
  // 5 min without input, which is exactly when a YouTube WATCHER would earn the nudge.
  const watching = makeChrome({ tabs: [{ ...YT, audible: true }] });
  await boot(watching);
  await watching.chrome.idle.onStateChanged.emit('idle');
  await settle();
  await tickNudge(watching, 5);
  assert.equal(watching.created.length, 1, 'an audible tab counts through idle and nudges');

  const silent = makeChrome({ tabs: [YT] }); // not audible
  await boot(silent);
  await silent.chrome.idle.onStateChanged.emit('idle');
  await settle();
  await tickNudge(silent, 5);
  assert.equal(silent.created.length, 0, 'silent idle means gone — no counting, no nudge');
  assert.equal((await getDiag(silent)).counting, false);
});

test('STOP_SESSION flushes the queue BEFORE asking the server for the verdict', async () => {
  // /api/focus/stop computes quality + behavioral signals from domain_logs at stop time;
  // the queue can hold up to 5 minutes of dwell. Stopping without flushing made the
  // session's final stretch invisible to its own verdict.
  const env = makeChrome({ tabs: [YT] });
  const session = { access_token: 'tok', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600 };
  env.chrome.cookies.getAll = async () => [
    { name: 'sb-sztvvvphpawuxvvmuddm-auth-token', value: JSON.stringify(session) },
  ];
  await boot(env);

  await env.chrome.storage.local.set({
    satyashift_queue: [{ domain: 'youtube.com', duration_s: 120, category: 'distraction' }],
    focus_session: { id: 'sess-1', startedAt: Date.now() - 10 * 60_000 },
  });

  const urls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => (String(url).includes('/api/focus/stop')
        ? { success: true, session: { duration_s: 600, session_quality: 'focused' } }
        : { success: true }),
    };
  };
  try {
    const res = await new Promise((resolve) => {
      env.chrome.runtime.onMessage.emit({ type: 'STOP_SESSION' }, { id: 'test-extension-id' }, resolve);
    });
    const ingestAt = urls.findIndex((u) => u.endsWith('/api/ingest'));
    const stopAt = urls.findIndex((u) => u.endsWith('/api/focus/stop'));
    assert.ok(ingestAt !== -1, 'the queued dwell was flushed');
    assert.ok(stopAt !== -1, 'the stop reached the server');
    assert.ok(ingestAt < stopAt, 'flush happens BEFORE the verdict is computed');
    assert.equal(res.ended.durationS, 600, 'the server verdict is relayed to the popup seal');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('clicking the nudge with no thread opens the dashboard and clears the stored target', async () => {
  // Only a YouTube tab was ever attended, so there is no work thread to return to — the
  // click falls back to the app's Today page, exactly as before Sutra existed.
  const env = makeChrome({ tabs: [YT] });
  await boot(env);
  await tickNudge(env, 5);
  const { id, opts } = env.created[0];
  assert.equal(opts.buttons[0].title, 'Return to focus', 'no thread -> the generic way back');
  assert.equal((await getSessionValue(env, id))?.domain, 'youtube.com', 'target domain remembered');

  await env.chrome.notifications.onClicked.emit(id);
  await settle();
  assert.deepEqual(env.openedTabs, ['https://satyashift.vercel.app/dashboard']);
  assert.equal(await getSessionValue(env, id), undefined, 'target cleaned up');
});

// ---------------------------------------------------------------------------
// Sutra — the thread (re-entry) — end to end through the real worker.
// ---------------------------------------------------------------------------

const GH = { id: 10, url: 'https://github.com/foo/bar/pull/7', active: true, windowId: 2 };

// Work on GitHub for `workTicks` minutes, then drift to YouTube until the nudge fires.
async function driftAfterWork(env, workTicks = 2) {
  await tickNudge(env, workTicks); // thread anchors to the GitHub tab
  env.tabs.get(GH.id).active = false;
  env.tabs.get(1).active = true;
  await env.chrome.tabs.onActivated.emit({ tabId: 1 });
  await settle();
  await tickNudge(env, 5); // distraction block crosses the threshold
}

test('sutra: after real work, the nudge offers the way back — and the click returns to the work tab', async () => {
  const env = makeChrome({ tabs: [{ ...YT, active: false }, GH] });
  await boot(env);
  await driftAfterWork(env);

  assert.equal(env.created.length, 1, 'the drift still earns exactly one gentle nudge');
  const { id, opts } = env.created[0];
  assert.equal(opts.buttons[0].title, 'Back to github.com', 'the first button IS the way back');
  const target = await getSessionValue(env, id);
  assert.equal(target.thread.domain, 'github.com');
  assert.equal(target.thread.tabId, GH.id);
  assert.ok(!('url' in target.thread), 'the thread stores NO url — domain + integer ids only');

  await env.chrome.notifications.onButtonClicked.emit(id, 0);
  await settle();
  assert.deepEqual(env.focusedTabs, [GH.id], 'the click focuses the exact tab the work lives in');
  assert.deepEqual(env.focusedWindows, [2], 'and brings its window forward');
  assert.deepEqual(env.openedTabs, [], 'no dashboard tab — the work itself is the destination');
  assert.equal(await getSessionValue(env, id), undefined, 'target cleaned up');
  assert.equal(fetchCalls, 0, 'sutra is fully local — no network involved');
});

test('sutra: a closed work tab means a cold thread — the click falls back to the dashboard', async () => {
  const env = makeChrome({ tabs: [{ ...YT, active: false }, GH] });
  await boot(env);
  await driftAfterWork(env);
  const { id, opts } = env.created[0];
  assert.equal(opts.buttons[0].title, 'Back to github.com');

  env.tabs.delete(GH.id); // the user closed the work tab while drifting
  await env.chrome.notifications.onButtonClicked.emit(id, 0);
  await settle();
  assert.deepEqual(env.focusedTabs, [], 'never "returns" to a tab that no longer exists');
  assert.deepEqual(env.openedTabs, ['https://satyashift.vercel.app/dashboard'], 'honest fallback');
});

test('sutra: a work tab that navigated to another domain is not offered as the way back', async () => {
  const env = makeChrome({ tabs: [{ ...YT, active: false }, GH] });
  await boot(env);
  await driftAfterWork(env);
  const { id } = env.created[0];

  env.tabs.get(GH.id).url = 'https://reddit.com/r/all'; // the "work" tab wandered off too
  await env.chrome.notifications.onButtonClicked.emit(id, 0);
  await settle();
  assert.deepEqual(env.focusedTabs, [], 'domain re-verified at click time — stale context never restored');
  assert.deepEqual(env.openedTabs, ['https://satyashift.vercel.app/dashboard']);
});

test('sutra: the popup offers the thread during a drift, stays quiet while working, and OPEN_THREAD returns', async () => {
  const env = makeChrome({ tabs: [{ ...YT, active: false }, GH] });
  await boot(env);
  await tickNudge(env, 2); // thread anchors to GitHub

  // While working, the popup offers nothing — the thread is where they already are.
  let status = await new Promise((resolve) => {
    env.chrome.runtime.onMessage.emit({ type: 'GET_STATUS' }, { id: 'test-extension-id' }, resolve);
  });
  assert.equal(status.thread, null, 'no offer while attention is on non-distraction ground');

  // Drift to YouTube: the popup now holds the way back.
  env.tabs.get(GH.id).active = false;
  env.tabs.get(1).active = true;
  await env.chrome.tabs.onActivated.emit({ tabId: 1 });
  await settle();
  await tickNudge(env, 1);
  status = await new Promise((resolve) => {
    env.chrome.runtime.onMessage.emit({ type: 'GET_STATUS' }, { id: 'test-extension-id' }, resolve);
  });
  assert.equal(status.thread?.domain, 'github.com');
  assert.match(status.thread.line, /^Your thread: github\.com · (moments|\d+ min) ago$/);

  // "Pick it back up" focuses the work tab.
  const res = await new Promise((resolve) => {
    env.chrome.runtime.onMessage.emit({ type: 'OPEN_THREAD' }, { id: 'test-extension-id' }, resolve);
  });
  assert.equal(res.ok, true);
  assert.deepEqual(env.focusedTabs, [GH.id]);
  assert.equal(fetchCalls, 0, 'the entire thread lifecycle is local');
});
