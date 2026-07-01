// popup.js — SatyaShift popup. Vanilla JS (the extension has no build step).
// Asks the service worker for status over chrome.runtime messaging and renders it.
// No inline JS anywhere, so it satisfies the MV3 default content-security-policy.

const $ = (id) => document.getElementById(id);

let current = null; // last status, so the pause toggle knows what to flip to

function timeAgo(ts) {
  if (!ts) return 'never';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.floor(h / 24)} d ago`;
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return 'the app'; }
}

// A calm, human line for a transient sync failure. Only shown when work is actually waiting.
function transientNote(s) {
  if (!s || !s.lastError || !s.queued) return null;
  const host = hostOf(s.baseUrl);
  switch (s.lastError.kind) {
    case 'network': return `Offline — your ${s.queued} pending event(s) are saved and will sync when you reconnect.`;
    case 'server':  return `${host} is briefly unavailable — will retry automatically.`;
    case 'rate_limit': return 'Syncing is briefly throttled — will resume shortly.';
    case 'rejected': return 'A malformed batch was discarded so syncing could continue.';
    default: return null;
  }
}

function render(s) {
  current = s;

  // Status line
  let dot = 'off', state, detail;
  if (!s) {
    dot = 'off'; state = 'Not connected'; detail = 'The tracker is starting up. Reopen in a moment.';
  } else if (s.sessionExpired) {
    dot = 'warn'; state = 'Session expired';
    detail = `Sign in again at ${hostOf(s.baseUrl)} to resume verifying your focus.`;
  } else if (!s.signedIn) {
    dot = 'off'; state = 'Not signed in';
    detail = `Sign in at ${hostOf(s.baseUrl)} to start verifying your focus.`;
  } else if (s.paused) {
    dot = 'off'; state = 'Paused';
    detail = 'Tracking is off. Resume whenever you want.';
  } else if (s.counting && s.activeDomain) {
    dot = 'ok'; state = 'Tracking';
    detail = `Timing ${s.activeDomain}.`;
  } else {
    dot = 'ok'; state = 'Connected';
    detail = 'Waiting for a focused tab.';
  }
  $('dot').className = 'dot ' + dot;
  $('state').textContent = state;
  $('detail').textContent = detail;

  // Quiet sync reassurance — no counts, no environment, nothing to manage. Shown only when
  // things are healthy; real problems are surfaced by the note below instead.
  const showSynced = s && s.signedIn && !s.paused && !s.sessionExpired && s.lastSync && !transientNote(s);
  $('synced').textContent = showSynced ? `Synced ${timeAgo(s.lastSync)}` : '';
  if (s) $('open').href = s.baseUrl;

  // Transient note
  const note = transientNote(s);
  $('note').style.display = note ? 'block' : 'none';
  $('note').textContent = note || '';

  // Pause toggle
  const pauseBtn = $('pause');
  pauseBtn.textContent = s && s.paused ? 'Resume tracking' : 'Pause tracking';
  pauseBtn.disabled = false;
}

async function refresh() {
  try {
    render(await chrome.runtime.sendMessage({ type: 'GET_STATUS' }));
  } catch {
    render(null);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refresh();

  $('open').addEventListener('click', (e) => {
    e.preventDefault();
    const url = $('open').getAttribute('href');
    if (url && url !== '#') chrome.tabs.create({ url });
  });

  $('pause').addEventListener('click', async () => {
    const btn = $('pause');
    btn.disabled = true;
    try {
      const next = !(current && current.paused);
      render(await chrome.runtime.sendMessage({ type: 'SET_PAUSED', paused: next }));
    } catch {
      btn.disabled = false;
    }
  });
});
