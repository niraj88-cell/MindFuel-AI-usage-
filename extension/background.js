// background.js — SatyaShift ambient tracker.
// Principle: passive, domain-only, zero manual input. Track how long the active tab's
// DOMAIN is focused, queue it locally, and flush a batch to /api/ingest every 5 minutes
// using the user's Supabase session (read from the app's auth cookie). We never read page
// content or full URLs, and we never block navigation.
//
// MV3 note: the service worker can unload at any time, so ALL state (the active tab and
// the pending batch) is persisted in chrome.storage.session, never in memory.

const PRODUCTION_URL = 'https://getmindfuel.vercel.app';
const DEV_URL = 'http://localhost:3000';
const PROJECT_REF = 'sztvvvphpawuxvvmuddm';

const MIN_DWELL_S = 15;          // ignore tab flicks shorter than this
const MAX_QUEUE = 2000;          // bound local storage if the user is logged out
const MAX_BATCH = 500;           // endpoint accepts up to 500 events per batch
const FLUSH_MINUTES = 5;
const FLUSH_ALARM = 'satyashift_flush';

const QUEUE_KEY = 'satyashift_queue';   // chrome.storage.local — survives browser restarts
const ACTIVE_KEY = 'active';             // chrome.storage.session — current tab being timed
const PENDING_KEY = 'pending_batch';     // chrome.storage.session — in-flight batch (for retries)

async function getBaseUrl() {
  const { satyashift_env } = await chrome.storage.local.get('satyashift_env');
  return satyashift_env === 'dev' ? DEV_URL : PRODUCTION_URL;
}

// Domains we never track, for privacy.
const SENSITIVE_DOMAINS = [
  'bank', 'chase', 'wellsfargo', 'paypal', 'venmo',
  'health', 'doctor', 'patient', 'medical',
  'mail.google.com', 'outlook.live.com',
  'password', '1password', 'lastpass', 'bitwarden'
];

// Lightweight local heuristic (the "local Ext heuristics first" rule).
const DOOMSCROLL_DOMAINS = ['tiktok.com', 'instagram.com', 'youtube.com', 'reddit.com', 'twitter.com', 'x.com'];

function hostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}
function isSensitive(h) { return !!h && SENSITIVE_DOMAINS.some((s) => h.includes(s)); }
function isOwnApp(h) { return !!h && (h.includes('getmindfuel.vercel.app') || h === 'localhost'); }
function categoryFor(h) { return DOOMSCROLL_DOMAINS.some((d) => h.includes(d)) ? 'doomscroll' : 'neutral'; }

// --- Persisted active-tab state (survives service-worker unloads) ---
async function getActive() {
  const { [ACTIVE_KEY]: a } = await chrome.storage.session.get(ACTIVE_KEY);
  return a || { domain: null, startTime: null };
}
async function setActive(a) {
  await chrome.storage.session.set({ [ACTIVE_KEY]: a });
}

// --- Queue a finished dwell ---
async function enqueue(domain, durationS) {
  if (!domain || durationS < MIN_DWELL_S) return;
  const { [QUEUE_KEY]: q = [] } = await chrome.storage.local.get(QUEUE_KEY);
  q.push({ domain, duration_s: Math.round(durationS), category: categoryFor(domain) });
  const trimmed = q.length > MAX_QUEUE ? q.slice(q.length - MAX_QUEUE) : q;
  await chrome.storage.local.set({ [QUEUE_KEY]: trimmed });
}

async function finalizeActive() {
  const a = await getActive();
  if (a.domain && a.startTime) {
    await enqueue(a.domain, (Date.now() - a.startTime) / 1000);
  }
}

async function handleTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const h = hostnameOf(tab.url || '');

    // Finalize whatever we were timing before switching context.
    await finalizeActive();

    if (!h || tab.incognito || isSensitive(h) || isOwnApp(h)) {
      await setActive({ domain: null, startTime: null });
      return;
    }
    await setActive({ domain: h, startTime: Date.now() });
  } catch {
    /* tab was closed mid-lookup — ignore */
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => handleTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active) handleTab(tabId);
});

// --- Read the Supabase access token from the app's auth cookie ---
async function getAccessToken() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: 'getmindfuel.vercel.app' });
    // @supabase/ssr stores the session in `sb-<ref>-auth-token`, sometimes chunked (.0/.1).
    const parts = cookies
      .filter((c) => c.name.startsWith(`sb-${PROJECT_REF}-auth-token`))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!parts.length) return null;

    let raw = parts.map((c) => c.value).join('');
    if (raw.startsWith('base64-')) raw = atob(raw.slice('base64-'.length));
    const session = JSON.parse(raw);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

// --- Flush the queue as one idempotent batch ---
async function flush() {
  // Capture the in-progress dwell, then restart its timer so we don't double-count it.
  await finalizeActive();
  const a = await getActive();
  if (a.domain) await setActive({ domain: a.domain, startTime: Date.now() });

  const { [QUEUE_KEY]: q = [] } = await chrome.storage.local.get(QUEUE_KEY);
  if (!q.length) return;

  const token = await getAccessToken();
  if (!token) return; // not signed in — keep the queue and try next cycle

  // Reuse a pending batch_id across retries so the server can dedupe a lost-response
  // delivery via the processed_batches primary key. Only mint a new one when none is pending.
  const { [PENDING_KEY]: pending } = await chrome.storage.session.get(PENDING_KEY);
  const batch_id = pending?.batch_id || crypto.randomUUID();
  const count = pending?.count || Math.min(q.length, MAX_BATCH);
  const events = q.slice(0, count);
  if (!pending) await chrome.storage.session.set({ [PENDING_KEY]: { batch_id, count } });

  try {
    const res = await fetch(`${await getBaseUrl()}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ batch_id, events }),
    });
    if (res.ok) {
      // Success (or server-side duplicate no-op): drop the sent events and clear the pending marker.
      const { [QUEUE_KEY]: current = [] } = await chrome.storage.local.get(QUEUE_KEY);
      await chrome.storage.local.set({ [QUEUE_KEY]: current.slice(count) });
      await chrome.storage.session.remove(PENDING_KEY);
    }
    // On non-OK (401 expired token, 429 rate limited) keep queue + pending and retry next cycle.
  } catch {
    /* offline — keep queue + pending */
  }
}

chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: FLUSH_MINUTES });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === FLUSH_ALARM) flush(); });
