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
  nextNudge, nudgeCopy, gateAllowsCounting, nextWelcome, NUDGE_AFTER_MIN, NUDGE_COOLDOWN_MIN,
  emptyNudgeProfile, updateNudgeOutcome, nudgeCooldownMultiplier, nudgeRegister,
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
const SESSION_KEY = 'focus_session';       // { id, startedAt } — active deep session started here
const NUDGE_DIAG_KEY = 'nudge_diag';       // liveness proof for the nudge pipeline (see checkNudge)
const NUDGE_PROFILE_KEY = 'nudge_profile'; // { responsiveness, consecutiveIgnored, ... } — LOCAL
                                           // nudge-tone/fatigue learning. Never transmitted.

// chrome.storage.session — cleared when the browser closes.
const ACTIVE_KEY = 'active';               // { domain, segmentStart, accumulatedMs }
const GATE_KEY = 'gate';                   // { blurred, idle }
const NUDGE_STATE_KEY = 'nudge_state';     // { domain, minutes, lastNudgeAt } — distraction streak
const NUDGE_TARGET_PREFIX = 'nudge_tgt_';  // per-notification: the nudged domain (cleared on click)
const POPUP_OPEN_KEY = 'popup_open';       // true while the action popup is on-screen (Windows blur guard)
const WELCOME_STATE_KEY = 'welcome_state'; // { ackedNudgeAt } — nudges already welcomed/expired
const WELCOME_PENDING_KEY = 'welcome_pending'; // one-shot: next popup open says "Welcome back."
const PRESENCE_CACHE_KEY = 'presence_cache';   // { at, data } — circle presence, cached briefly

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
//   audible                -> the tab is playing sound (drives the media exemption to idle)
// Transitions (tab switch, blur, idle, audio start/stop, pause) all wake the worker here.
// ---------------------------------------------------------------------------
async function getActive() {
  const { [ACTIVE_KEY]: a } = await chrome.storage.session.get(ACTIVE_KEY);
  return a || { domain: null, segmentStart: null, accumulatedMs: 0, audible: false };
}
async function setActive(a) { await chrome.storage.session.set({ [ACTIVE_KEY]: a }); }

async function getGate() {
  const { [GATE_KEY]: g } = await chrome.storage.session.get(GATE_KEY);
  return g || { blurred: false, idleState: 'active' };
}
async function setGate(g) { await chrome.storage.session.set({ [GATE_KEY]: g }); }

async function isPaused() {
  const { [PAUSED_KEY]: p } = await chrome.storage.local.get(PAUSED_KEY);
  return !!p;
}
// We only accrue focus time when the window is focused, the machine is active (or the active
// tab is audibly playing — watching a video is attention without input), and the user hasn't
// paused tracking. The exact policy is the pure, tested gateAllowsCounting in core.js.
async function shouldCount(a) {
  return gateAllowsCounting(await getGate(), { audible: !!(a && a.audible), paused: await isPaused() });
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
    audible: !!a.audible,
  });
}

async function startTiming(domain, audible = false) {
  const a = { domain, accumulatedMs: 0, segmentStart: null, audible: !!audible };
  a.segmentStart = (await shouldCount(a)) ? Date.now() : null;
  await setActive(a);
}

// Pause or resume the running segment to match the current gate.
async function applyGate() {
  const a = await getActive();
  if (!a.domain) return;
  const counting = await shouldCount(a);
  const now = Date.now();
  if (counting && a.segmentStart == null) {
    await setActive({ ...a, segmentStart: now });
  } else if (!counting && a.segmentStart != null) {
    await setActive({
      domain: a.domain,
      accumulatedMs: (a.accumulatedMs || 0) + (now - a.segmentStart),
      segmentStart: null,
      audible: !!a.audible,
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
      await setActive({ domain: null, segmentStart: null, accumulatedMs: 0, audible: false });
      return;
    }
    await startTiming(h, tab.audible);
  });
}

// The active tab started or stopped playing sound. This drives the media exemption: an
// audible tab keeps counting through chrome.idle's 'idle' (watching a video is attention
// without input), and when the sound stops the normal idle gate takes over again.
async function handleAudible(tab) {
  const h = hostnameOf(tab.url || '');
  await withStateLock(async () => {
    const a = await getActive();
    if (!a.domain || a.domain !== h) return; // not the tab we're timing
    await setActive({ ...a, audible: !!tab.audible });
    await applyGate();
  });
}

chrome.tabs.onActivated.addListener(({ tabId }) => handleTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active) handleTab(tabId);
  else if (info.audible !== undefined && tab.active) handleAudible(tab);
});

async function handleFocusChange(windowId) {
  const blurred = windowId === chrome.windows.WINDOW_ID_NONE;
  // Opening our own action popup makes Chrome report WINDOW_ID_NONE on some platforms (notably
  // Windows). That is the user glancing at our popup, NOT leaving the browser — so while the popup
  // is open we ignore a blur. Otherwise merely checking the popup would pause timing and show
  // "Waiting for a focused tab" (the exact symptom users reported). The popup port sets this flag.
  if (blurred) {
    const { [POPUP_OPEN_KEY]: popupOpen } = await chrome.storage.session.get(POPUP_OPEN_KEY);
    if (popupOpen) return;
  }
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
  // 'active' | 'idle' (no input for 5 min) | 'locked'. We keep the distinction: 'idle' is
  // exempted for an audibly-playing tab (media), 'locked' always pauses (gateAllowsCounting).
  withStateLock(async () => {
    await setGate({ ...(await getGate()), idleState: state });
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

// The LOCAL nudge-learning profile (tone + fatigue). storage.local so it survives restarts;
// it is never sent anywhere — the intervention is private by design.
async function getNudgeProfile() {
  const { [NUDGE_PROFILE_KEY]: p } = await chrome.storage.local.get(NUDGE_PROFILE_KEY);
  return p || emptyNudgeProfile();
}

// Liveness proof. Every stage of the nudge pipeline used to fail silently (a lost alarm, a
// muted notification, a thrown handler) and was indistinguishable from "working, just quiet".
// This one small record in storage.local makes the pipeline auditable in the field:
//   chrome.storage.local.get('nudge_diag')  in the SW console answers "did it tick, was it
// counting, what's the streak, did the last fire render or get blocked".
async function noteNudgeDiag(patch) {
  const { [NUDGE_DIAG_KEY]: d } = await chrome.storage.local.get(NUDGE_DIAG_KEY);
  await chrome.storage.local.set({ [NUDGE_DIAG_KEY]: { ...(d || {}), ...patch } });
}

// 'granted' | 'denied' — Chrome lets the user mute one extension's notifications with a
// single click; after that create() silently renders nothing, forever. We check so the
// popup can say so instead of the product promise just evaporating.
async function notificationPermission() {
  if (!chrome.notifications) return 'denied';
  if (!chrome.notifications.getPermissionLevel) return 'granted';
  try { return await chrome.notifications.getPermissionLevel(); } catch { return 'granted'; }
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
  // Local intelligence: repeated ignores space check-ins further apart (cooldown only — the
  // 5-min fire threshold is never touched). afterMin/graceTicks stay at their defaults.
  const nudgeProfile = await getNudgeProfile();
  const cfg = { cooldownMin: NUDGE_COOLDOWN_MIN * nudgeCooldownMultiplier(nudgeProfile) };
  const { state, fire, decision, domain, minutes, distinctDomains, switches } = nextNudge(await getNudgeState(), ctx, cfg);
  await chrome.storage.session.set({ [NUDGE_STATE_KEY]: state });
  // Liveness + decision trace: one record per tick makes the whole pipeline auditable in the
  // field (chrome.storage.local.get('nudge_diag')). It answers, deterministically, WHY this tick
  // did or did not intervene — the block minutes vs the threshold, how fragmented it was, and the
  // decision the pure policy reached — so a silent miss can never again be mistaken for "quiet".
  await noteNudgeDiag({
    tickAt: ctx.now,
    counting: ctx.counting,
    domain: ctx.domain,
    category: ctx.category,
    streak: state.minutes,          // distraction-block minutes carried forward
    threshold: NUDGE_AFTER_MIN,
    // Prefer the signal the policy returned (it reflects the block AT decision time; on a fire
    // tick the carried-forward state has already been zeroed), else fall back to the live state.
    distinctDomains: distinctDomains ?? (state.domains ? state.domains.length : 0),
    switches: switches ?? (state.switches ?? 0),
    decision,                       // building | fire | cooldown | grace | reset | idle
    permission: await notificationPermission(),
    // Observability for the local learning layer (all local, never sent).
    responsiveness: Math.round((nudgeProfile.responsiveness ?? 0.5) * 100) / 100,
    cooldownX: Math.round(nudgeCooldownMultiplier(nudgeProfile) * 100) / 100,
  });
  // HOW the check-in speaks is chosen from the local profile + the block's shape.
  if (fire) await fireNudge(domain, minutes, distinctDomains, nudgeRegister(nudgeProfile, { distinctDomains }));

  // Welcome-back + outcome learning. nextWelcome resolves each nudge exactly once: fire=true
  // means it was HEEDED (attention returned within the window); an advance of ackedNudgeAt
  // WITHOUT a fire means the window lapsed untouched — an IGNORED outcome. Either way we fold
  // it into the local nudge profile. This is the only place the loop closes, and it stays local.
  const { [WELCOME_STATE_KEY]: w } = await chrome.storage.session.get(WELCOME_STATE_KEY);
  const prevAcked = (w && w.ackedNudgeAt) || 0;
  const wr = nextWelcome(w, {
    lastNudgeAt: state.lastNudgeAt,
    counting: ctx.counting,
    category: ctx.category,
    now: ctx.now,
  });
  await chrome.storage.session.set({ [WELCOME_STATE_KEY]: wr.state });
  if (wr.fire) await chrome.storage.session.set({ [WELCOME_PENDING_KEY]: true });

  const resolvedNudge = (wr.state && wr.state.ackedNudgeAt) || 0;
  if (resolvedNudge > prevAcked) {
    const next = updateNudgeOutcome(nudgeProfile, wr.fire, ctx.now); // fire=true heeded, else ignored
    await chrome.storage.local.set({ [NUDGE_PROFILE_KEY]: next });
  }
}

async function fireNudge(domain, minutes, distinctDomains = 1, register = 'curious') {
  const level = await notificationPermission();
  if (level !== 'granted') {
    // The user (or a missing API) muted us. Don't pretend we nudged — record it so the
    // popup can surface "check-ins are muted" instead of failing silently forever.
    await noteNudgeDiag({ lastFire: { at: Date.now(), domain, result: 'blocked', permission: level } });
    return;
  }
  const id = `${NUDGE_TARGET_PREFIX}${Date.now()}`;
  await chrome.storage.session.set({ [id]: domain }); // remember where to send them on click
  // Seed the rotation with the block minutes; hand the scatter count so the copy names a
  // fragmented block ("a few different places") instead of over-claiming one domain.
  const { title, message } = nudgeCopy(domain, minutes, minutes, { distinctDomains, register });
  try {
    await chrome.notifications.create(id, {
      type: 'basic',
      // Fully-qualified extension URL so the OS notification always resolves its icon, in any
      // worker context (a bare relative path can fail to render on some Chrome builds).
      iconUrl: chrome.runtime.getURL('icon128.png'),
      title,
      message,
      // "Return to focus" opens the intercept flow; "Stay, on purpose" honors their choice and closes.
      buttons: [{ title: 'Return to focus' }, { title: 'Stay, on purpose' }],
      priority: 2,
    });
    await noteNudgeDiag({ lastFire: { at: Date.now(), domain, minutes, distinctDomains, result: 'fired' } });
  } catch (e) {
    await noteNudgeDiag({ lastFire: { at: Date.now(), domain, result: 'error', error: String((e && e.message) || e) } });
  }
}

// "Return to focus" opens the app's Today page (the old /intercept flow was retired; its
// route now just redirects there anyway). We deliberately pass nothing in the URL.
async function openIntercept(notificationId) {
  await chrome.storage.session.remove(notificationId); // drop the remembered domain
  const base = await getBaseUrl();
  try { await chrome.tabs.create({ url: `${base}/dashboard` }); } catch { /* ignore */ }
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
    // Prefer the last-focused normal window's active tab. When the popup holds focus this query can
    // come back empty, so fall back to any active tab in a normal window.
    let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      const tabs = await chrome.tabs.query({ active: true });
      tab = tabs.find((t) => t.url && /^https?:/.test(t.url)) || tabs[0];
    }
    if (tab?.id != null) await handleTab(tab.id);
  } catch { /* no focused window / tab closed — ignore */ }
}

// Re-derive the blur gate from the real window state. Used after the popup closes, since a
// popup-induced blur was ignored while it was open — now we need the true focus state back.
async function reconcileFocus() {
  let focused = false;
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    focused = !!(win && win.focused);
  } catch { focused = false; }
  await withStateLock(async () => {
    await setGate({ ...(await getGate()), blurred: !focused });
    await applyGate();
  });
}

// The popup opens a long-lived port so the worker knows it is on-screen. While it is, a
// WINDOW_ID_NONE focus change is treated as popup-induced rather than "left the browser"
// (see handleFocusChange). On disconnect (popup closed) we re-derive the real focus state.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'popup') return;
  chrome.storage.session.set({ [POPUP_OPEN_KEY]: true });
  port.onDisconnect.addListener(() => {
    chrome.storage.session.remove(POPUP_OPEN_KEY).then(reconcileFocus);
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  ensureAlarm();
  seedActiveTab();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }); // U2: explain the permissions once
  }
});
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); seedActiveTab(); });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === FLUSH_ALARM) { reconcileSession(); flush(); }
  // A thrown tick must leave a trace: an unhandled rejection here is invisible in the field,
  // and "nudges just stopped" would have no evidence trail without it.
  else if (a.name === NUDGE_ALARM) {
    checkNudge().catch((e) =>
      noteNudgeDiag({ lastFire: { at: Date.now(), result: 'error', error: String((e && e.message) || e) } })
        .catch(() => {}));
  }
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

// ---------------------------------------------------------------------------
// Deep session (started/ended from the popup). The session lives server-side in focus_sessions;
// we only keep { id, startedAt } locally so the popup can show it and survive a worker restart.
// Verification is free: the same passive domain_logs we already flush are what /api/focus/stop
// reads to compute the session's quality. Bearer-authed, so it's exempt from the CSRF origin gate.
// ---------------------------------------------------------------------------
const SESSION_MAX_MS = 4 * 60 * 60 * 1000; // matches the server's forgotten-session cap

async function getSession() {
  const { [SESSION_KEY]: s } = await chrome.storage.local.get(SESSION_KEY);
  return s || null;
}

// A session the user forgot to end (closed the laptop, walked away) must not show
// "In deep work" forever. Past the same 4h cap the server uses, end it — the server
// marks it abandoned/capped, and the popup returns to idle honestly.
async function reconcileSession() {
  const s = await getSession();
  if (s && s.startedAt && Date.now() - s.startedAt > SESSION_MAX_MS) await stopSession();
}

async function startSession() {
  const token = await getAccessToken();
  if (!token) return { error: 'not_signed_in' };
  let res;
  try {
    res = await fetch(`${await getBaseUrl()}/api/focus/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}), // no intention, no squad_id => the helper notifies ALL of your squads
    });
  } catch { return { error: 'offline' }; }
  if (!res.ok) return { error: `http_${res.status}` };
  const data = await res.json().catch(() => null);
  if (!data?.session_id) return { error: 'bad_response' };
  const session = {
    id: data.session_id,
    startedAt: data.started_at ? new Date(data.started_at).getTime() : Date.now(),
  };
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return { session };
}

async function stopSession() {
  const current = await getSession();
  // Flush FIRST: /api/focus/stop computes the session's quality and behavioral signals from
  // domain_logs at the moment of stopping, and our queue can hold up to five minutes of
  // dwell (plus the in-progress one). Without this, the session's final stretch was
  // invisible to its own verdict. flush() is single-flight and safe when signed out/offline.
  await flush();
  const token = await getAccessToken();
  // The server's verdict (it computed duration + quality from domain_logs) — the popup shows
  // it as a settled seal: "44 min · verified ✓". Null when the stop didn't reach the server.
  let ended = null;
  if (token) {
    try {
      const res = await fetch(`${await getBaseUrl()}/api/focus/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(current?.id ? { session_id: current.id } : {}),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const s = data?.session;
        if (s && typeof s.duration_s === 'number') {
          ended = {
            durationS: s.duration_s,
            verified: !!s.session_quality && s.session_quality !== 'unverified',
          };
        }
      }
    } catch { /* clear locally regardless so the UI is never stuck in a session */ }
  }
  await chrome.storage.local.remove(SESSION_KEY);
  return { session: null, ended };
}

// ---------------------------------------------------------------------------
// Circle presence for the popup: one GET, cached briefly so opening the popup twice in a
// minute costs one request. Returns { circle, live: { name, started_at } | null } or null
// when we can't know (signed out / offline) — the popup shows nothing rather than guessing.
// ---------------------------------------------------------------------------
const PRESENCE_TTL_MS = 60_000;

async function getPresence() {
  const { [PRESENCE_CACHE_KEY]: cached } = await chrome.storage.session.get(PRESENCE_CACHE_KEY);
  if (cached && Date.now() - cached.at < PRESENCE_TTL_MS) return cached.data;
  const token = await getAccessToken().catch(() => null);
  if (!token) return null;
  let res;
  try {
    res = await fetch(`${await getBaseUrl()}/api/presence`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return cached?.data ?? null; // offline — serve the stale line rather than a blank flicker
  }
  if (!res.ok) return cached?.data ?? null;
  const data = await res.json().catch(() => null);
  if (data) await chrome.storage.session.set({ [PRESENCE_CACHE_KEY]: { at: Date.now(), data } });
  return data;
}

async function buildStatus() {
  const store = await chrome.storage.local.get(
    [QUEUE_KEY, ENV_KEY, LAST_SYNC_KEY, LAST_ERROR_KEY, PAUSED_KEY, NUDGE_DIAG_KEY],
  );
  const active = await getActive();
  const session = await getSession();
  const token = await getAccessToken().catch(() => null);
  const err = store[LAST_ERROR_KEY] || null;
  const { [WELCOME_PENDING_KEY]: welcomePending } = await chrome.storage.session.get(WELCOME_PENDING_KEY);
  return {
    welcomePending: !!welcomePending,
    // The one silent-delivery failure we can detect: the user muted this extension's Chrome
    // notifications, so nudges would render nothing. The popup says so instead of staying quiet.
    nudgesMuted: store[NUDGE_DIAG_KEY]?.permission === 'denied',
    session,
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

// Origins allowed to hand us a session via SESSION_FROM_PAGE. Only our own app.
const TRUSTED_MESSAGE_ORIGINS = new Set([PRODUCTION_URL, DEV_URL]);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Defense in depth: onMessage (unlike onMessageExternal) is only reachable by this
  // extension's own content scripts and pages, and there is no externally_connectable
  // entry — so web pages cannot reach here. We still hard-verify that the token-bearing
  // SESSION_FROM_PAGE came from our OWN extension AND from a content script running on our
  // own app origin, so a compromised/injected script on any other site can never seed a
  // forged session. Messages from the popup (sender.url is an extension:// URL) skip the
  // origin check but must still originate from this extension.
  if (sender.id !== chrome.runtime.id) return; // not from us — ignore entirely

  // The page bridge (content script on our own domain) forwards the app's Supabase session.
  // This is the reliable auth path: document.cookie in the page is the source of truth, whereas
  // chrome.cookies from the SW proved flaky. We store it so getAccessToken can use it even when
  // the app tab is closed, and refresh it from the held refresh_token as needed.
  if (msg?.type === 'SESSION_FROM_PAGE') {
    const origin = sender.origin || (sender.url ? new URL(sender.url).origin : '');
    if (!TRUSTED_MESSAGE_ORIGINS.has(origin)) {
      sendResponse({ ok: false });
      return true;
    }
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
    (async () => {
      // The popup is now on-screen. Undo any popup-induced blur so a glance never reads as paused,
      // then start timing the current tab if we weren't already.
      await withStateLock(async () => { await setGate({ ...(await getGate()), blurred: false }); await applyGate(); });
      await seedActiveTab();
      await reconcileSession(); // never show a forgotten session as "In deep work"
      const status = await buildStatus();
      // "Welcome back." is a one-shot: consumed by this popup open, never repeated.
      if (status.welcomePending) await chrome.storage.session.remove(WELCOME_PENDING_KEY);
      sendResponse(status);
    })();
    return true;
  }
  if (msg?.type === 'GET_PRESENCE') {
    getPresence().then(sendResponse);
    return true;
  }
  if (msg?.type === 'FLUSH_NOW') {
    flush().then(buildStatus).then(sendResponse);
    return true;
  }
  if (msg?.type === 'START_SESSION') {
    (async () => {
      const r = await startSession();
      sendResponse({ ...(await buildStatus()), actionError: r.error || null });
    })();
    return true;
  }
  if (msg?.type === 'STOP_SESSION') {
    (async () => {
      const r = await stopSession();
      // `ended` carries the server verdict so the popup can seal the moment of completion.
      sendResponse({ ...(await buildStatus()), ended: r.ended || null });
    })();
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
// ensureAlarm here is the self-heal for lost alarms: onInstalled/onStartup are NOT guaranteed to
// cover every path back to life (a crashed profile, an onStartup that never fires), and a missing
// NUDGE_ALARM/FLUSH_ALARM previously meant the whole intervention + sync loop stayed dead until a
// full browser restart. ensureAlarm checks existence before creating, so this can never reset a
// live countdown (the C2 regression this guard was written against).
isPaused().then(setBadge);
seedActiveTab();
ensureAlarm();
