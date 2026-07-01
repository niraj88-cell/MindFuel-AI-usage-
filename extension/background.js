// background.js — SatyaShift ambient tracker (MV3 module service worker).
//
// Promise: a focus record you can trust. We time how long the ACTIVE tab's bare DOMAIN is
// genuinely being attended to, queue it locally, and flush an idempotent batch to /api/ingest
// every 5 minutes using the user's Supabase session. We never read page content or full URLs.
//
// Integrity (why the numbers are honest):
//   - Timing pauses when Chrome loses OS focus (you're in another app) and when the machine
//     goes idle/locked. The idle threshold is 5 minutes, so reading without typing is not
//     penalized (the "BALANCED" attention policy).
// Reliability (why it survives a hostile world):
//   - All state lives in chrome.storage (the worker can be killed at any moment).
//   - Web Locks serialize every read-modify-write, so concurrent events never corrupt state.
//   - A poison batch is dropped instead of stalling the queue forever; transient failures retry.
//   - Expired tokens are refreshed even when the web app is closed.

import {
  PROJECT_REF, SUPABASE_URL, SUPABASE_ANON_KEY,
  MIN_DWELL_S, MAX_QUEUE, MAX_BATCH,
  hostnameOf, isSensitive, isOwnApp, categoryFor,
  capDuration, parseSupabaseSession, selectAuthCookie, tokenExpiresSoon,
  nextNudge,
} from './core.js';

const PRODUCTION_URL = 'https://satyashift.vercel.app';
const DEV_URL = 'http://localhost:3000';

const FLUSH_MINUTES = 5;
const FLUSH_ALARM = 'satyashift_flush';
const NUDGE_ALARM = 'satyashift_nudge'; // 1-min tick that drives the distraction nudge policy
const IDLE_SECONDS = 300; // 5 min — do not penalize reading without keyboard input (BALANCED)

// chrome.storage.local — survives browser restarts.
const QUEUE_KEY = 'satyashift_queue';
const ENV_KEY = 'satyashift_env';
const PAUSED_KEY = 'satyashift_paused';
const PENDING_KEY = 'pending_batch';       // in-flight batch marker; in LOCAL so dedupe survives restart (M3)
const LAST_SYNC_KEY = 'last_sync';
const LAST_ERROR_KEY = 'last_error';
const TOKEN_KEY = 'satyashift_token';      // extension-refreshed session (H3)
const FORCE_REFRESH_KEY = 'force_refresh'; // set after a 401 so the next cycle refreshes

// chrome.storage.session — cleared when the browser closes.
const ACTIVE_KEY = 'active';               // { domain, segmentStart, accumulatedMs }
const GATE_KEY = 'gate';                   // { blurred, idle }
const NUDGE_STATE_KEY = 'nudge_state';     // { domain, minutes, lastNudgeAt } — distraction streak
const NUDGE_TARGET_PREFIX = 'nudge_tgt_';  // per-notification: the domain to deep-link into /intercept

// Web Locks (available in service workers) serialize concurrent handlers.
const LOCK_STATE = 'satyashift_state';     // guards active-tab state + queue writes
const LOCK_FLUSH = 'satyashift_flush';     // guarantees a single in-flight flush
const LOCK_TOKEN = 'satyashift_token';     // serializes token refresh (rotating refresh tokens)

function withStateLock(fn) { return navigator.locks.request(LOCK_STATE, fn); }

async function getBaseUrl() {
  const { [ENV_KEY]: env } = await chrome.storage.local.get(ENV_KEY);
  return env === 'dev' ? DEV_URL : PRODUCTION_URL;
}

// ---------------------------------------------------------------------------
// Active-tab timing state (segment model)
//   segmentStart === null  -> paused (its time already banked into accumulatedMs)
//   segmentStart === <ts>  -> counting since that timestamp
// Transitions (tab switch, blur, idle, pause) all wake the worker and are applied here.
// ---------------------------------------------------------------------------
async function getActive() {
  const { [ACTIVE_KEY]: a } = await chrome.storage.session.get(ACTIVE_KEY);
  return a || { domain: null, segmentStart: null, accumulatedMs: 0 };
}
async function setActive(a) { await chrome.storage.session.set({ [ACTIVE_KEY]: a }); }

async function getGate() {
  const { [GATE_KEY]: g } = await chrome.storage.session.get(GATE_KEY);
  return g || { blurred: false, idle: false };
}
async function setGate(g) { await chrome.storage.session.set({ [GATE_KEY]: g }); }

async function isPaused() {
  const { [PAUSED_KEY]: p } = await chrome.storage.local.get(PAUSED_KEY);
  return !!p;
}
// We only accrue focus time when the window is focused, the machine is active, and the
// user hasn't paused tracking.
async function shouldCount() {
  const g = await getGate();
  return !g.blurred && !g.idle && !(await isPaused());
}

function elapsedMs(a, now) {
  return (a.accumulatedMs || 0) + (a.segmentStart != null ? now - a.segmentStart : 0);
}

// --- Queue a finished dwell (caller holds LOCK_STATE) ---
async function enqueue(domain, durationS) {
  const capped = capDuration(durationS); // H1: never emit a duration the server would reject
  if (!domain || capped < MIN_DWELL_S) return;
  const { [QUEUE_KEY]: q = [] } = await chrome.storage.local.get(QUEUE_KEY);
  q.push({ domain, duration_s: capped, category: categoryFor(domain) });
  const trimmed = q.length > MAX_QUEUE ? q.slice(q.length - MAX_QUEUE) : q;
  await chrome.storage.local.set({ [QUEUE_KEY]: trimmed });
}

// Bank the current dwell into the queue; keep timing the same domain if it's still counting.
async function finalizeActive() {
  const a = await getActive();
  if (!a.domain) return;
  const now = Date.now();
  await enqueue(a.domain, elapsedMs(a, now) / 1000);
  await setActive({
    domain: a.domain,
    accumulatedMs: 0,
    segmentStart: a.segmentStart != null ? now : null, // preserve running/paused state
  });
}

async function startTiming(domain) {
  await setActive({ domain, accumulatedMs: 0, segmentStart: (await shouldCount()) ? Date.now() : null });
}

// Pause or resume the running segment to match the current gate.
async function applyGate() {
  const a = await getActive();
  if (!a.domain) return;
  const counting = await shouldCount();
  const now = Date.now();
  if (counting && a.segmentStart == null) {
    await setActive({ ...a, segmentStart: now });
  } else if (!counting && a.segmentStart != null) {
    await setActive({
      domain: a.domain,
      accumulatedMs: (a.accumulatedMs || 0) + (now - a.segmentStart),
      segmentStart: null,
    });
  }
}

// ---------------------------------------------------------------------------
// Tab + window + idle listeners (registered synchronously at top level so they
// re-attach on every worker wake).
// ---------------------------------------------------------------------------
async function handleTab(tabId) {
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch { return; } // closed mid-lookup
  const h = hostnameOf(tab.url || '');
  await withStateLock(async () => {
    await finalizeActive(); // bank whatever we were timing before the context switch
    if (!h || tab.incognito || isSensitive(h) || isOwnApp(h)) {
      await setActive({ domain: null, segmentStart: null, accumulatedMs: 0 });
      return;
    }
    await startTiming(h);
  });
}

chrome.tabs.onActivated.addListener(({ tabId }) => handleTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active) handleTab(tabId);
});

async function handleFocusChange(windowId) {
  const blurred = windowId === chrome.windows.WINDOW_ID_NONE;
  await withStateLock(async () => {
    await setGate({ ...(await getGate()), blurred });
    await applyGate();
  });
  if (!blurred) {
    // Focus returned to a Chrome window — the active tab may have changed while we were away.
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab && tab.id != null) await handleTab(tab.id);
    } catch { /* ignore */ }
  }
}
chrome.windows.onFocusChanged.addListener(handleFocusChange);

chrome.idle.setDetectionInterval(IDLE_SECONDS);
chrome.idle.onStateChanged.addListener((state) => {
  const idle = state !== 'active'; // 'idle' (no input for 5 min) or 'locked'
  withStateLock(async () => {
    await setGate({ ...(await getGate()), idle });
    await applyGate();
  });
});

// ---------------------------------------------------------------------------
// Auth: a valid Supabase access token, refreshed even when the web app is closed (H3).
// ---------------------------------------------------------------------------
// Read the app's Supabase session cookie. We query BOTH by url and by domain and union the
// results: depending on Chrome build and how host access was granted, a host-only cookie can be
// returned by one query but not the other, and relying on `{ domain }` alone was the failure mode
// that showed a signed-in user as "Not signed in". De-dupe by name; selectAuthCookie ignores any
// sibling cookies.
async function fetchCookieSession() {
  const baseUrl = await getBaseUrl();
  const domain = new URL(baseUrl).hostname;
  const lists = await Promise.all([
    chrome.cookies.getAll({ url: baseUrl }).catch(() => []),
    chrome.cookies.getAll({ domain }).catch(() => []),
  ]);
  const byName = new Map();
  for (const list of lists) for (const c of list) byName.set(c.name, c);
  const raw = selectAuthCookie([...byName.values()], PROJECT_REF);
  return raw ? parseSupabaseSession(raw) : null;
}

async function getStoredSession() {
  const { [TOKEN_KEY]: s } = await chrome.storage.local.get(TOKEN_KEY);
  return s || null;
}
async function setStoredSession(s) {
  if (s) await chrome.storage.local.set({ [TOKEN_KEY]: s });
  else await chrome.storage.local.remove(TOKEN_KEY);
}

// POST the refresh grant to Supabase. Returns { session } | { dead:true } | { error }.
async function refreshSession(refreshToken) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return { error: 'network' };
  }
  if (!res.ok) {
    // 4xx => the refresh token is invalid/rotated/revoked: the session is truly dead.
    return res.status >= 400 && res.status < 500 ? { dead: true } : { error: res.status };
  }
  const data = await res.json().catch(() => null);
  if (!data || !data.access_token) return { dead: true };
  return {
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    },
  };
}

// Best refresh token we hold. Prefer our own refreshed copy (it's the newest).
async function pickRefreshToken() {
  const stored = await getStoredSession();
  if (stored?.refresh_token) return stored.refresh_token;
  const cookie = await fetchCookieSession().catch(() => null);
  return cookie?.refresh_token || null;
}

// Returns a usable access token, or null when the user is genuinely signed out.
// Serialized by LOCK_TOKEN so two callers (e.g. a flush and a popup opening at once) can
// never both consume the same rotating refresh token and race each other into a false logout.
function getAccessToken() {
  return navigator.locks.request(LOCK_TOKEN, resolveAccessToken);
}

async function resolveAccessToken() {
  // After a 401 we don't trust any cached access token — force a single refresh.
  const { [FORCE_REFRESH_KEY]: force } = await chrome.storage.local.get(FORCE_REFRESH_KEY);
  if (force) {
    await chrome.storage.local.remove(FORCE_REFRESH_KEY);
    const rt = await pickRefreshToken();
    if (rt) {
      const r = await refreshSession(rt);
      if (r.session) { await setStoredSession(r.session); await clearError(); return r.session.access_token; }
      if (r.dead) { await setStoredSession(null); await recordError('auth', 401, 'session_expired'); return null; }
    }
    // transient — fall through and use whatever we have
  }

  // 1. The app cookie is the source of truth while its token is still valid.
  const cookieSession = await fetchCookieSession().catch(() => null);
  if (cookieSession && !tokenExpiresSoon(cookieSession)) {
    await setStoredSession(null); // cookie is fresh; drop any stale extension copy
    return cookieSession.access_token;
  }

  // 2. A still-valid token we refreshed earlier.
  const stored = await getStoredSession();
  if (stored && !tokenExpiresSoon(stored)) return stored.access_token;

  // 3. Refresh with the newest refresh token we hold.
  const rt = stored?.refresh_token || cookieSession?.refresh_token;
  if (!rt) return cookieSession?.access_token || null; // nothing to refresh with
  const r = await refreshSession(rt);
  if (r.session) { await setStoredSession(r.session); return r.session.access_token; }
  if (r.dead) { await setStoredSession(null); await recordError('auth', 401, 'session_expired'); return null; }
  return stored?.access_token || cookieSession?.access_token || null; // transient; try existing token
}

// ---------------------------------------------------------------------------
// Error observability (M4)
// ---------------------------------------------------------------------------
async function recordError(kind, status, message) {
  await chrome.storage.local.set({
    [LAST_ERROR_KEY]: { kind, status: status ?? null, message: message ?? null, at: Date.now() },
  });
}
async function clearError() { await chrome.storage.local.remove(LAST_ERROR_KEY); }

// ---------------------------------------------------------------------------
// Nudge (domain-only JITAI). A 1-minute alarm ticks the pure nextNudge() policy against the tab
// you're actively attending. When you've stayed on a distraction domain long enough, we fire one
// gentle local notification that deep-links into the app's /intercept flow. We never block, never
// read page content, and pass only the bare domain. Paused/blurred/idle => not counting => no nudge.
// ---------------------------------------------------------------------------
async function getNudgeState() {
  const { [NUDGE_STATE_KEY]: s } = await chrome.storage.session.get(NUDGE_STATE_KEY);
  return s || { domain: null, minutes: 0, lastNudgeAt: 0 };
}

async function checkNudge() {
  const a = await getActive();
  const counting = a.domain != null && a.segmentStart != null;
  const ctx = {
    domain: a.domain,
    counting,
    category: a.domain ? categoryFor(a.domain) : 'neutral',
    now: Date.now(),
  };
  const { state, fire, domain, minutes } = nextNudge(await getNudgeState(), ctx);
  await chrome.storage.session.set({ [NUDGE_STATE_KEY]: state });
  if (fire) await fireNudge(domain, minutes);
}

async function fireNudge(domain, minutes) {
  if (!chrome.notifications) return; // permission missing (shouldn't happen — declared in manifest)
  const id = `${NUDGE_TARGET_PREFIX}${Date.now()}`;
  await chrome.storage.session.set({ [id]: domain }); // remember where to send them on click
  try {
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: `Still on ${domain}?`,
      message: `You've been on ${domain} for about ${minutes} min. Take a breath and choose on purpose.`,
      buttons: [{ title: 'Refocus' }, { title: 'Keep scrolling' }],
      priority: 2,
    });
  } catch { /* notifications unavailable — skip silently */ }
}

// Open the existing /intercept friction flow for the nudged domain (domain-only in the query).
async function openIntercept(notificationId) {
  const { [notificationId]: domain } = await chrome.storage.session.get(notificationId);
  await chrome.storage.session.remove(notificationId);
  const base = await getBaseUrl();
  const url = domain ? `${base}/intercept?target=${encodeURIComponent(domain)}` : base;
  try { await chrome.tabs.create({ url }); } catch { /* ignore */ }
  try { await chrome.notifications.clear(notificationId); } catch { /* ignore */ }
}
if (chrome.notifications) {
  chrome.notifications.onClicked.addListener(openIntercept);
  chrome.notifications.onButtonClicked.addListener((id, idx) => {
    if (idx === 0) openIntercept(id); // "Refocus"
    else { chrome.storage.session.remove(id); chrome.notifications.clear(id); } // "Keep scrolling"
  });
}

// ---------------------------------------------------------------------------
// Flush: one idempotent batch, single-flight, with a real retry/quarantine policy.
// ---------------------------------------------------------------------------
async function trimQueue(count) {
  await withStateLock(async () => {
    const { [QUEUE_KEY]: current = [] } = await chrome.storage.local.get(QUEUE_KEY);
    await chrome.storage.local.set({ [QUEUE_KEY]: current.slice(count) });
  });
}

async function flush() {
  await navigator.locks.request(LOCK_FLUSH, async () => {
    // Chunk the in-progress dwell into this batch so a long single-tab session still syncs.
    await withStateLock(finalizeActive);

    const { [QUEUE_KEY]: q = [] } = await chrome.storage.local.get(QUEUE_KEY);
    if (!q.length) return;

    const token = await getAccessToken();
    if (!token) {
      // Keep the queue; distinguish "never signed in" from an expired session for the popup.
      const { [LAST_ERROR_KEY]: err } = await chrome.storage.local.get(LAST_ERROR_KEY);
      if (err?.message !== 'session_expired') await recordError('auth', null, 'not_signed_in');
      return;
    }

    // Reuse a persisted batch_id across retries (incl. across browser restart) so a
    // lost-response delivery dedupes via the processed_batches primary key (M3).
    const { [PENDING_KEY]: pending } = await chrome.storage.local.get(PENDING_KEY);
    const batch_id = pending?.batch_id || crypto.randomUUID();
    const count = pending?.count || Math.min(q.length, MAX_BATCH);
    const events = q.slice(0, count);
    if (!pending) await chrome.storage.local.set({ [PENDING_KEY]: { batch_id, count, at: Date.now() } });

    let res;
    try {
      res = await fetch(`${await getBaseUrl()}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batch_id, events }),
      });
    } catch {
      await recordError('network', null, 'offline'); // keep queue + pending, retry next cycle
      return;
    }

    if (res.ok) {
      await trimQueue(count);
      await chrome.storage.local.set({ [LAST_SYNC_KEY]: Date.now() });
      await chrome.storage.local.remove(PENDING_KEY);
      await clearError();
      return;
    }

    if (res.status === 401 || res.status === 403) {
      await chrome.storage.local.set({ [FORCE_REFRESH_KEY]: true }); // refresh before next attempt
      await recordError('auth', res.status, 'token_rejected');       // keep queue + pending
      return;
    }
    if (res.status === 429) {
      await recordError('rate_limit', 429, 'rate_limited');          // keep queue + pending
      return;
    }
    if (res.status >= 400 && res.status < 500) {
      // Poison batch (malformed / permanently rejected). Retrying forever would block every
      // later event, so drop just this batch and move on (H1).
      await trimQueue(count);
      await chrome.storage.local.remove(PENDING_KEY);
      await recordError('rejected', res.status, 'batch_dropped');
      return;
    }
    await recordError('server', res.status, 'server_error');         // 5xx — keep + retry
  });
}

// ---------------------------------------------------------------------------
// Lifecycle: create the flush alarm ONCE (not on every worker wake), which is what let the
// 5-minute countdown reset forever for active users (C2).
// ---------------------------------------------------------------------------
async function ensureAlarm() {
  if (!(await chrome.alarms.get(FLUSH_ALARM))) {
    await chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: FLUSH_MINUTES });
  }
  if (!(await chrome.alarms.get(NUDGE_ALARM))) {
    await chrome.alarms.create(NUDGE_ALARM, { periodInMinutes: 1 });
  }
}

// Grab the tab you're already looking at. onActivated/onUpdated only fire on a switch or a
// navigation, so after an install, browser start, or MV3 worker restart we'd never begin timing
// the current tab until you touched another one ("Waiting for a focused tab" forever). Seed it
// here. Guarded to only start when we're not already timing something, so it never double-banks.
async function seedActiveTab() {
  try {
    if ((await getActive()).domain) return;
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id != null) await handleTab(tab.id);
  } catch { /* no focused window / tab closed — ignore */ }
}

chrome.runtime.onInstalled.addListener((details) => {
  ensureAlarm();
  seedActiveTab();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }); // U2: explain the permissions once
  }
});
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); seedActiveTab(); });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === FLUSH_ALARM) flush();
  else if (a.name === NUDGE_ALARM) checkNudge();
});

// ---------------------------------------------------------------------------
// Popup <-> worker messaging (status, manual sync, pause toggle)
// ---------------------------------------------------------------------------
async function setBadge(paused) {
  try {
    await chrome.action.setBadgeText({ text: paused ? 'OFF' : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#9CA3AF' });
  } catch { /* action may be unavailable during teardown */ }
}

async function buildStatus() {
  const store = await chrome.storage.local.get(
    [QUEUE_KEY, ENV_KEY, LAST_SYNC_KEY, LAST_ERROR_KEY, PAUSED_KEY],
  );
  const active = await getActive();
  const token = await getAccessToken().catch(() => null);
  const err = store[LAST_ERROR_KEY] || null;
  return {
    env: store[ENV_KEY] === 'dev' ? 'dev' : 'prod',
    baseUrl: await getBaseUrl(),
    signedIn: !!token,
    sessionExpired: !token && err?.message === 'session_expired',
    paused: !!store[PAUSED_KEY],
    counting: active.domain != null && active.segmentStart != null,
    queued: (store[QUEUE_KEY] || []).length,
    activeDomain: active.domain || null,
    lastSync: store[LAST_SYNC_KEY] || null,
    lastError: err,
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // The page bridge (content script on our own domain) forwards the app's Supabase session.
  // This is the reliable auth path: document.cookie in the page is the source of truth, whereas
  // chrome.cookies from the SW proved flaky. We store it so getAccessToken can use it even when
  // the app tab is closed, and refresh it from the held refresh_token as needed.
  if (msg?.type === 'SESSION_FROM_PAGE') {
    (async () => {
      const raw = selectAuthCookie(msg.cookies || [], PROJECT_REF);
      const session = raw ? parseSupabaseSession(raw) : null;
      if (session?.access_token) {
        await setStoredSession(session);
        if (!tokenExpiresSoon(session)) await clearError(); // healthy session — drop stale errors
      }
      sendResponse({ ok: !!session?.access_token });
    })();
    return true;
  }
  if (msg?.type === 'GET_STATUS') {
    seedActiveTab().then(buildStatus).then(sendResponse); // start timing the current tab if idle
    return true;
  }
  if (msg?.type === 'FLUSH_NOW') {
    flush().then(buildStatus).then(sendResponse);
    return true;
  }
  if (msg?.type === 'SET_PAUSED') {
    (async () => {
      const paused = !!msg.paused;
      await chrome.storage.local.set({ [PAUSED_KEY]: paused });
      await withStateLock(async () => {
        if (paused) await finalizeActive(); // bank the current dwell before stopping
        await applyGate();
      });
      await setBadge(paused);
      sendResponse(await buildStatus());
    })();
    return true;
  }
});

// On every worker (re)start: reflect the paused badge and begin timing the tab you're already on.
isPaused().then(setBadge);
seedActiveTab();
